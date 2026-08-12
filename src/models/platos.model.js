const { withTransaction } = require("../postgres");

class PlatosModel {
  static async getAll() {
    return withTransaction(async client => {
      const result = await client.query("SELECT * FROM plato ORDER BY id_plato");
      return result.rows;
    });
  }

  static async getById(idPlato) {
    return withTransaction(async client => {
      const result = await client.query("SELECT * FROM plato WHERE id_plato = $1", [
        idPlato
      ]);
      return result.rows[0] ?? null;
    });
  }

  static async create({ nombre, descripcion, precio, categoria }) {
    return withTransaction(async client => {
      const result = await client.query(
        "INSERT INTO plato (nombre, descripcion, precio, categoria) VALUES ($1, $2, $3, $4) RETURNING *",
        [nombre, descripcion, precio, categoria]
      );
      return result.rows[0];
    });
  }

  static async delete(idPlato) {
    return withTransaction(async client => {
      const result = await client.query(
        "DELETE FROM plato WHERE id_plato = $1 RETURNING *",
        [idPlato]
      );
      return result.rows[0] ?? null;
    });
  }
}

module.exports = PlatosModel;
