const UsuariosModel = require("../models/usuarios.model");
const SesionesModel = require("../models/sesiones.model");
const {
  accessTtlSegundos,
  firmarAccessToken,
  generarRefreshToken,
  hashRefreshToken,
  expiracionRefresh,
  verificarClave
} = require("../auth/tokens");
const {
  loginSchema,
  refreshSchema,
  logoutSchema,
  formatZodErrors
} = require("../schemas");

// Nunca se devuelve el hash de la contraseña, ni siquiera por descuido al esparcir la fila.
function usuarioPublico({ id_usuario, usuario, nombre, rol, activo }) {
  return { id_usuario, usuario, nombre, rol, activo };
}

class AuthController {
  static async login(req, res) {
    const parsedBody = loginSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ errors: formatZodErrors(parsedBody.error) });
    }

    const { usuario: nombreUsuario, contrasena } = parsedBody.data;

    try {
      const usuario = await UsuariosModel.buscarPorUsuarioConHash(nombreUsuario);

      // Se compara siempre, incluso si el usuario no existe (contra un hash señuelo),
      // para que el tiempo de respuesta no revele qué usuarios están registrados.
      const claveCorrecta = await verificarClave(contrasena, usuario?.hash_clave);

      if (!usuario || !claveCorrecta) {
        // Mismo código y mismo mensaje para "no existe" y "clave incorrecta".
        return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
      }

      if (!usuario.activo) {
        return res.status(403).json({ message: "La cuenta está desactivada" });
      }

      const refreshToken = generarRefreshToken();
      await SesionesModel.crear({
        idUsuario: usuario.id_usuario,
        hashRefresh: hashRefreshToken(refreshToken),
        expiraEn: expiracionRefresh(),
        userAgent: req.get("user-agent")
      });
      await UsuariosModel.registrarLogin(usuario.id_usuario);

      res.json({
        access_token: firmarAccessToken(usuario),
        refresh_token: refreshToken,
        expires_in: accessTtlSegundos(),
        usuario: usuarioPublico(usuario)
      });
    } catch (error) {
      // Ojo: nunca registrar req.body en esta ruta, lleva la contraseña en claro.
      console.log(error);
      res.status(500).json({
        message: "Ha ocurrido un error interno al iniciar sesión"
      });
    }
  }

  static async refresh(req, res) {
    const parsedBody = refreshSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ errors: formatZodErrors(parsedBody.error) });
    }

    const refreshToken = parsedBody.data.refresh_token;
    const nuevoRefreshToken = generarRefreshToken();

    try {
      const resultado = await SesionesModel.rotar({
        hashViejo: hashRefreshToken(refreshToken),
        hashNuevo: hashRefreshToken(nuevoRefreshToken),
        expiraEn: expiracionRefresh(),
        userAgent: req.get("user-agent")
      });

      if (resultado.estado === "inactivo") {
        return res.status(403).json({ message: "La cuenta está desactivada" });
      }

      if (resultado.estado !== "ok") {
        // Desconocido, expirado, revocado o reutilizado: para el cliente son lo mismo,
        // borra la sesión local y manda al login.
        return res
          .status(401)
          .json({ message: "La sesión expiró. Inicie sesión de nuevo" });
      }

      res.json({
        access_token: firmarAccessToken(resultado.usuario),
        refresh_token: nuevoRefreshToken,
        expires_in: accessTtlSegundos()
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        message: "Ha ocurrido un error interno al renovar la sesión"
      });
    }
  }

  static async logout(req, res) {
    const parsedBody = logoutSchema.safeParse(req.body ?? {});
    // Un cuerpo inválido tampoco es motivo para fallar: la ruta es idempotente y el
    // frontend limpia su estado local pase lo que pase.
    const refreshToken = parsedBody.success ? parsedBody.data.refresh_token : null;

    try {
      if (refreshToken) {
        await SesionesModel.revocar(hashRefreshToken(refreshToken));
      }

      res.json({ message: "Sesión cerrada" });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        message: "Ha ocurrido un error interno al cerrar la sesión"
      });
    }
  }

  // El usuario ya viene leído de la BD por requiereAuth (no del JWT), así que aquí
  // se detecta una cuenta desactivada o con el rol cambiado desde que se firmó el token.
  static async me(req, res) {
    res.json(usuarioPublico(req.usuario));
  }
}

module.exports = AuthController;
