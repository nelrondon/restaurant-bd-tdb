const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

async function runMigration() {
  const files = [
    "equipo_1_tablas_mesas_pedidos.sql",
    "equipo_2_clientes_facturas.sql",
    "equipo_3_inventario.sql",
    "equipo_3_triggers.sql",
    "equipo_4_actualizar_platos.sql",
    "auth_usuarios_sesiones.sql"
  ];

  try {
    console.log("Restaurando esquema public...");
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    for (const file of files) {
      const sqlPath = path.join(__dirname, "../sql", file);
      const sql = fs.readFileSync(sqlPath, "utf8");

      console.log(`Ejecutando migración: ${file}...`);
      await pool.query(sql);
      console.log(`Migración ${file} completada exitosamente.`);
    }
  } catch (error) {
    console.error("Error al ejecutar la migración:", error);
  } finally {
    await pool.end();
  }
}

runMigration();
