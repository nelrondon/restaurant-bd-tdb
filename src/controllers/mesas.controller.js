const MesasModel = require("../models/mesas.model");
const {
  mesaIdParamSchema,
  createMesaSchema,
  updateMesaSchema,
  formatZodErrors
} = require("../schemas");

class MesasController {
  static async getAll(req, res) {
    try {
      const mesas = await MesasModel.getAll();
      res.send(mesas);
    } catch (error) {
      console.log(error);
      res.status(500).send({
        message: "Ha ocurrido un error interno al consultar las mesas",
        error: error.message
      });
    }
  }

  static async getById(req, res) {
    const parsedId = mesaIdParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      res.status(400).send({ message: "ID de mesa inválida" });
      return;
    }

    try {
      const mesa = await MesasModel.getById(parsedId.data);
      if (!mesa) {
        res.status(404).send({ message: "Mesa no encontrada" });
        return;
      }

      res.send(mesa);
    } catch (error) {
      console.log(error);
      res.status(500).send({
        message: "Ha ocurrido un error interno al consultar la mesa",
        error: error.message
      });
    }
  }

  static async create(req, res) {
    const parsedBody = createMesaSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ errors: formatZodErrors(parsedBody.error) });
    }

    try {
      const mesa = await MesasModel.create(parsedBody.data);
      res.send({
        message: "La mesa ha sido creada satisfactoriamente",
        data: mesa
      });
    } catch (error) {
      console.log(error);
      res.status(500).send({
        message: "Ha ocurrido un error interno al crear la mesa",
        error: error.message
      });
    }
  }

  static async update(req, res) {
    const parsedId = mesaIdParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      res.status(400).send({ message: "ID de mesa inválida" });
      return;
    }

    const parsedBody = updateMesaSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ errors: formatZodErrors(parsedBody.error) });
    }

    if (Object.keys(parsedBody.data).length === 0) {
      return res.status(400).json({
        errors: [{ msg: "Se debe proveer al menos un campo para actualizar", path: "" }]
      });
    }

    try {
      const mesa = await MesasModel.update(parsedId.data, parsedBody.data);
      if (!mesa) {
        res.status(404).send({ message: "Mesa no encontrada" });
        return;
      }

      res.send({
        message: "La mesa ha sido actualizada satisfactoriamente",
        data: mesa
      });
    } catch (error) {
      console.log(error);
      res.status(500).send({
        message: "Ha ocurrido un error interno al actualizar la mesa",
        error: error.message
      });
    }
  }

  static async remove(req, res) {
    const parsedId = mesaIdParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      res.status(400).send({ message: "ID de mesa inválida" });
      return;
    }

    try {
      const mesa = await MesasModel.delete(parsedId.data);
      if (!mesa) {
        res.status(404).send({ message: "Mesa no encontrada" });
        return;
      }

      res.send({
        message: "La mesa ha sido eliminada satisfactoriamente",
        data: mesa
      });
    } catch (error) {
      console.log(error);

      // Postgres code 23503: Violación de llave foránea (pedido)
      if (error.code === "23503") {
        res.status(409).send({
          message:
            "No se puede eliminar la mesa porque está asociada a pedidos existentes"
        });
        return;
      }

      res.status(500).send({
        message: "Ha ocurrido un error interno al eliminar la mesa",
        error: error.message
      });
    }
  }
}

module.exports = MesasController;
