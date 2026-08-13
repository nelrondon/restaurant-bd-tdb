const { withTransaction } = require("../postgres");

class MesasModel {
  static async getAll() {
    return withTransaction(async client => {
      const result = await client.query("SELECT * FROM mesa ORDER BY id_mesa");
      return result.rows;
    });
  }

  static async getById(idMesa) {
    return withTransaction(async client => {
      const result = await client.query("SELECT * FROM mesa WHERE id_mesa = $1", [
        idMesa
      ]);
      return result.rows[0] ?? null;
    });
  }

  static async create({ capacidad, estado, ubicacion }) {
    return withTransaction(async client => {
      const result = await client.query(
        "INSERT INTO mesa (capacidad, estado, ubicacion) VALUES ($1, $2, $3) RETURNING *",
        [capacidad, estado, ubicacion]
      );
      return result.rows[0];
    });
  }

  static async update(idMesa, fields) {
    return withTransaction(async client => {
      const keys = Object.keys(fields);
      if (keys.length === 0) return null;

      const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(", ");
      const values = Object.values(fields);

      const result = await client.query(
        `UPDATE mesa SET ${setClause} WHERE id_mesa = $${keys.length + 1} RETURNING *`,
        [...values, idMesa]
      );
      return result.rows[0] ?? null;
    });
  }

  static async delete(idMesa) {
    return withTransaction(async client => {
      const result = await client.query(
        "DELETE FROM mesa WHERE id_mesa = $1 RETURNING *",
        [idMesa]
      );
      return result.rows[0] ?? null;
    });
  }
}

module.exports = MesasModel;
