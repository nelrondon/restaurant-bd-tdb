const PlatosModel = require("../models/platos.model");
const { platoIdParamSchema, createPlatoSchema, formatZodErrors } = require("../schemas");

class PlatosController {
  static async getAll(req, res) {
    try {
      const platos = await PlatosModel.getAll();
      res.send(platos);
    } catch (error) {
      console.log(error);
      res.status(500).send({
        message: "Ha ocurrido un error interno al consultar los platos",
        error: error.message
      });
    }
  }

  static async getById(req, res) {
    const parsedId = platoIdParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      res.status(400).send({ message: "ID de plato inválida" });
      return;
    }

    try {
      const plato = await PlatosModel.getById(parsedId.data);
      if (!plato) {
        res.status(404).send({ message: "Plato no encontrado" });
        return;
      }

      res.send(plato);
    } catch (error) {
      console.log(error);
      res.status(500).send({
        message: "Ha ocurrido un error interno al consultar el plato",
        error: error.message
      });
    }
  }

  static async create(req, res) {
    const parsedBody = createPlatoSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ errors: formatZodErrors(parsedBody.error) });
    }

    try {
      const plato = await PlatosModel.create(parsedBody.data);
      res.send({
        message: "El plato ha sido creado satisfactoriamente",
        data: plato
      });
    } catch (error) {
      console.log(error);
      res.status(500).send({
        message: "Ha ocurrido un error interno al crear el plato",
        error: error.message
      });
    }
  }

  static async remove(req, res) {
    const parsedId = platoIdParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      res.status(400).send({ message: "ID de plato inválida" });
      return;
    }

    try {
      const plato = await PlatosModel.delete(parsedId.data);
      if (!plato) {
        res.status(404).send({ message: "Plato no encontrado" });
        return;
      }

      res.send({
        message: "El plato ha sido eliminado satisfactoriamente",
        data: plato
      });
    } catch (error) {
      console.log(error);

      // Postgres code 23503: Violación de llave foránea (detalle_pedido, receta)
      if (error.code === "23503") {
        res.status(409).send({
          message:
            "No se puede eliminar el plato porque está asociado a órdenes o recetas existentes"
        });
        return;
      }

      res.status(500).send({
        message: "Ha ocurrido un error interno al eliminar el plato",
        error: error.message
      });
    }
  }
}

module.exports = PlatosController;
