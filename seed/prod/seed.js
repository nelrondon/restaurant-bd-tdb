require("dotenv").config();

const { pool: postgresPool, pingPostgres } = require("../../src/postgres");
const format = require("pg-format");

const platos = require("./platos.json");

async function populateTable(table, parameters, values) {
  try {
    const result = await postgresPool.query(
      format(`INSERT INTO ${table} ${parameters} VALUES %L`, values)
    );
    console.log(`Successfully populated table "${table}" with ${result.rowCount} rows`);
  } catch (error) {
    console.log(
      `Couldn't populate table "${table}" due to an error (might already be populated): ${error.message}. Skipping table`
    );
  }
}

const ADMIN_USER = process.env.SEED_ADMIN_USER || "admin";
const ADMIN_USER_FULL_NAME = process.env.SEED_ADMIN_NOMBRE || "Administrador";

async function crearUsuarioAdmin() {
  const existente = await postgresPool.query(
    "SELECT id_usuario FROM usuarios WHERE usuario = $1",
    [ADMIN_USER]
  );

  if (existente.rowCount > 0) {
    console.log(
      `User "${ADMIN_USER}" already exists (id ${existente.rows[0].id_usuario}). No users will be added.`
    );
    return;
  }

  const generated = !process.env.SEED_ADMIN_PASSWORD;
  const contrasena =
    process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(12).toString("base64url");

  const result = await postgresPool.query(
    `INSERT INTO usuarios (usuario, nombre, hash_clave, rol)
     VALUES ($1, $2, $3, 'admin')
     RETURNING id_usuario`,
    [ADMIN_USER, ADMIN_USER_FULL_NAME, await hashClave(contrasena)]
  );

  console.log(
    `User "${ADMIN_USER}" has been created with admin role (id ${result.rows[0].id_usuario}, bcrypt cost ${bcryptCost()})`
  );

  if (generated) {
    console.log(`Generated password: ${contrasena}`);
  }
}

(async () => {
  await pingPostgres();
  await crearUsuarioAdmin();

  await populateTable(
    "plato",
    "(nombre, descripcion, precio, categoria)",
    platos.map(e => [e.nombre, e.descripcion, e.precio, e.categoria])
  );

  postgresPool.end();
})();
