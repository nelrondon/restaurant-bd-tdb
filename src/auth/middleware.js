const UsuariosModel = require("../models/usuarios.model");
const { verificarAccessToken } = require("./tokens");

function leerBearer(req) {
  const cabecera = req.get("authorization") || "";
  if (!cabecera.startsWith("Bearer ")) return null;

  const token = cabecera.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Exige una sesión válida. Deja el usuario (tal como está en la BD, no como estaba
 * cuando se firmó el token) en req.usuario.
 *
 * La distinción entre 401 y 403 es parte del contrato con el frontend:
 * - 401 = no hay sesión válida (token ausente, mal firmado o vencido). El cliente
 *   renueva con /auth/refresh y reintenta la petición una sola vez.
 * - 403 = la sesión es válida pero no alcanza (cuenta desactivada, rol insuficiente).
 *   El cliente no reintenta, muestra el error.
 *
 * Es la única credencial de la API: cualquier ruta que no lo lleve es pública.
 */
async function requiereAuth(req, res, next) {
  const token = leerBearer(req);
  if (!token) {
    return res.status(401).json({ message: "Se requiere iniciar sesión" });
  }

  let payload;
  try {
    payload = verificarAccessToken(token);
  } catch {
    // Incluye TokenExpiredError: siempre 401, nunca 403.
    return res.status(401).json({ message: "La sesión expiró" });
  }

  try {
    const usuario = await UsuariosModel.buscarPorId(Number(payload.sub));
    if (!usuario || !usuario.activo) {
      return res.status(403).json({ message: "La cuenta está desactivada" });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Ha ocurrido un error interno al validar la sesión"
    });
  }
}

/** Se coloca encima de requiereAuth para exigir además un rol concreto. */
const requiereRol =
  (...roles) =>
  (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ message: "Se requiere iniciar sesión" });
    }

    return roles.includes(req.usuario.rol)
      ? next()
      : res.status(403).json({ message: "No tiene permisos para esta acción" });
  };

module.exports = { requiereAuth, requiereRol, leerBearer };
