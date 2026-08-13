const { withTransaction } = require("../postgres");

// Columnas que se pueden devolver al cliente. "hash_clave" nunca sale de este módulo.
const COLUMNAS_PUBLICAS = "id_usuario, usuario, nombre, rol, activo";

class UsuariosModel {
  /** Incluye el hash de la contraseña: solo para el login. */
  static async buscarPorUsuarioConHash(usuario) {
    return withTransaction(async client => {
      const result = await client.query(
        `SELECT ${COLUMNAS_PUBLICAS}, hash_clave FROM usuarios WHERE usuario = $1`,
        [usuario]
      );
      return result.rows[0] ?? null;
    });
  }

  /** Consulta barata por llave primaria: la usan requiereAuth y GET /auth/me. */
  static async buscarPorId(idUsuario) {
    return withTransaction(async client => {
      const result = await client.query(
        `SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id_usuario = $1`,
        [idUsuario]
      );
      return result.rows[0] ?? null;
    });
  }

  static async registrarLogin(idUsuario) {
    return withTransaction(async client => {
      await client.query(
        "UPDATE usuarios SET ultimo_login = NOW() WHERE id_usuario = $1",
        [idUsuario]
      );
    });
  }

  /** No hay ruta de registro: los usuarios se crean por seed o migración. */
  static async crear({ usuario, nombre, hash_clave, rol }) {
    return withTransaction(async client => {
      const result = await client.query(
        `INSERT INTO usuarios (usuario, nombre, hash_clave, rol)
         VALUES ($1, $2, $3, $4)
         RETURNING ${COLUMNAS_PUBLICAS}`,
        [usuario, nombre, hash_clave, rol]
      );
      return result.rows[0];
    });
  }

  /**
   * Al desactivar una cuenta se revocan todas sus sesiones abiertas, de modo que el
   * refresh token deje de servir de inmediato. La base de datos lo garantiza también
   * por trigger (ver sql/auth_usuarios_sesiones.sql), esto lo deja explícito en la API.
   */
  static async cambiarActivo(idUsuario, activo) {
    return withTransaction(async client => {
      const result = await client.query(
        `UPDATE usuarios SET activo = $2 WHERE id_usuario = $1 RETURNING ${COLUMNAS_PUBLICAS}`,
        [idUsuario, activo]
      );
      if (result.rowCount === 0) return null;

      if (!activo) {
        await client.query(
          "UPDATE sesiones SET revocada = TRUE WHERE fk_id_usuario = $1 AND revocada = FALSE",
          [idUsuario]
        );
      }

      return result.rows[0];
    });
  }
}

module.exports = UsuariosModel;
