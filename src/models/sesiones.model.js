const { withTransaction } = require("../postgres");

const COLUMNAS_USUARIO = "id_usuario, usuario, nombre, rol, activo";

function recortarUserAgent(userAgent) {
  if (typeof userAgent !== "string" || userAgent.length === 0) return null;
  return userAgent.slice(0, 255);
}

class SesionesModel {
  static async crear({ idUsuario, hashRefresh, expiraEn, userAgent }) {
    return withTransaction(async client => {
      const result = await client.query(
        `INSERT INTO sesiones (fk_id_usuario, hash_refresh, expira_en, user_agent)
         VALUES ($1, $2, $3, $4)
         RETURNING id_sesion`,
        [idUsuario, hashRefresh, expiraEn, recortarUserAgent(userAgent)]
      );
      return result.rows[0];
    });
  }

  /**
   * Canjea un refresh token por otro, en una sola transacción.
   *
   * El UPDATE inicial actúa como reclamo atómico: si dos peticiones llegan con el
   * mismo token a la vez, solo una encuentra la fila sin revocar y la otra cae al
   * camino de "ya usado". Devuelve un estado en vez de lanzar, porque cada caso
   * tiene un código HTTP distinto:
   *
   * - ok           -> se rotó, hay usuario
   * - desconocido  -> el token no existe (401)
   * - expirado     -> venció (401)
   * - revocado     -> se cerró sesión con ese token (401)
   * - reutilizado  -> el token ya se había canjeado: se asume robo de credenciales
   *                   y se revocan TODAS las sesiones del usuario (401)
   * - inactivo     -> la cuenta está desactivada (403)
   */
  static async rotar({ hashViejo, hashNuevo, expiraEn, userAgent }) {
    return withTransaction(async client => {
      const reclamo = await client.query(
        `UPDATE sesiones
         SET revocada = TRUE, rotada_en = NOW()
         WHERE hash_refresh = $1 AND revocada = FALSE AND expira_en > NOW()
         RETURNING id_sesion, fk_id_usuario`,
        [hashViejo]
      );

      if (reclamo.rowCount === 0) {
        const previa = await client.query(
          `SELECT fk_id_usuario, revocada, rotada_en, expira_en
           FROM sesiones
           WHERE hash_refresh = $1`,
          [hashViejo]
        );

        if (previa.rowCount === 0) return { estado: "desconocido" };

        const sesion = previa.rows[0];
        if (sesion.rotada_en) {
          await client.query(
            "UPDATE sesiones SET revocada = TRUE WHERE fk_id_usuario = $1 AND revocada = FALSE",
            [sesion.fk_id_usuario]
          );
          return { estado: "reutilizado" };
        }

        return { estado: sesion.revocada ? "revocado" : "expirado" };
      }

      const { fk_id_usuario: idUsuario } = reclamo.rows[0];
      const usuarioResult = await client.query(
        `SELECT ${COLUMNAS_USUARIO} FROM usuarios WHERE id_usuario = $1`,
        [idUsuario]
      );
      const usuario = usuarioResult.rows[0] ?? null;

      // La sesión vieja ya quedó revocada arriba: una cuenta desactivada no vuelve
      // a obtener tokens y además pierde la sesión que acaba de intentar renovar.
      if (!usuario || !usuario.activo) return { estado: "inactivo" };

      await client.query(
        `INSERT INTO sesiones (fk_id_usuario, hash_refresh, expira_en, user_agent)
         VALUES ($1, $2, $3, $4)`,
        [idUsuario, hashNuevo, expiraEn, recortarUserAgent(userAgent)]
      );

      return { estado: "ok", usuario };
    });
  }

  /**
   * Cierra una sesión. Es idempotente a propósito: si el token no existe o ya
   * estaba revocado no pasa nada, el frontend limpia su estado local igual.
   */
  static async revocar(hashRefresh) {
    return withTransaction(async client => {
      const result = await client.query(
        `UPDATE sesiones
         SET revocada = TRUE
         WHERE hash_refresh = $1 AND revocada = FALSE
         RETURNING id_sesion`,
        [hashRefresh]
      );
      return result.rowCount > 0;
    });
  }

  static async revocarTodasDeUsuario(idUsuario) {
    return withTransaction(async client => {
      const result = await client.query(
        "UPDATE sesiones SET revocada = TRUE WHERE fk_id_usuario = $1 AND revocada = FALSE",
        [idUsuario]
      );
      return result.rowCount;
    });
  }
}

module.exports = SesionesModel;
