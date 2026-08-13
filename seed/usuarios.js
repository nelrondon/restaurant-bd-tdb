require("dotenv").config();

const crypto = require("node:crypto");

const { pool: postgresPool, pingPostgres } = require("../src/postgres");
const { hashClave, bcryptCost } = require("../src/auth/tokens");

// Usuario semilla para desarrollo. La contraseña se toma de SEED_ADMIN_PASSWORD;
// si no está definida se genera una aleatoria y se imprime UNA sola vez, para que
// nunca quede una clave fija escrita en el repositorio.
const USUARIO = process.env.SEED_ADMIN_USER || "admin";
const NOMBRE = process.env.SEED_ADMIN_NOMBRE || "Administrador";

(async () => {
  await pingPostgres();

  const existente = await postgresPool.query(
    "SELECT id_usuario FROM usuarios WHERE usuario = $1",
    [USUARIO]
  );

  if (existente.rowCount > 0) {
    console.log(
      `El usuario "${USUARIO}" ya existe (id ${existente.rows[0].id_usuario}). No se hace nada.`
    );
    await postgresPool.end();
    return;
  }

  const generada = !process.env.SEED_ADMIN_PASSWORD;
  const contrasena =
    process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(12).toString("base64url");

  const result = await postgresPool.query(
    `INSERT INTO usuarios (usuario, nombre, hash_clave, rol)
     VALUES ($1, $2, $3, 'admin')
     RETURNING id_usuario`,
    [USUARIO, NOMBRE, await hashClave(contrasena)]
  );

  console.log(
    `Usuario "${USUARIO}" creado con rol admin (id ${result.rows[0].id_usuario}, bcrypt cost ${bcryptCost()})`
  );

  if (generada) {
    console.log(`Contraseña generada: ${contrasena}`);
    console.log("Guárdela ahora: no se vuelve a mostrar y no queda almacenada en claro.");
  }

  console.log("Cámbiela antes de usar esto en producción.");

  await postgresPool.end();
})();
