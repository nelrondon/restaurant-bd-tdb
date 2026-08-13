const OrdenesModel = require("../models/ordenes.model");
const {
  ordenIdParamSchema,
  listarOrdenesQuerySchema,
  consultarOrdenesQuerySchema,
  crearOrdenSchema,
  actualizarEstadoOrdenSchema,
  formatZodErrors
} = require("../schemas");

function internalError(res, error) {
  const status = error.status ?? 500;
  if (status >= 500) console.log(error);
  return res.status(status).json({ error: error.message });
}

class OrdenesController {
  static async getAll(req, res) {
    const parsedQuery = listarOrdenesQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ errors: formatZodErrors(parsedQuery.error) });
    }

    try {
      const ordenes = await OrdenesModel.getAll(parsedQuery.data);
      return res.json(ordenes);
    } catch (error) {
      return internalError(res, error);
    }
  }

  static async consultarPorCedula(req, res) {
    const parsedQuery = consultarOrdenesQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ errors: formatZodErrors(parsedQuery.error) });
    }

    try {
      const ordenes = await OrdenesModel.consultarPorCedula(parsedQuery.data.cedula);
      return res.json(ordenes);
    } catch (error) {
      return internalError(res, error);
    }
  }

  static async getById(req, res) {
    const parsedId = ordenIdParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      return res.status(400).json({ error: "El ID de la orden no es válido" });
    }

    try {
      const orden = await OrdenesModel.getById(parsedId.data);
      if (!orden) {
        return res.status(404).json({ error: "Orden no encontrada" });
      }
      return res.json(orden);
    } catch (error) {
      return internalError(res, error);
    }
  }

  static async create(req, res) {
    const parsedBody = crearOrdenSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ errors: formatZodErrors(parsedBody.error) });
    }

    try {
      const orden = await OrdenesModel.create(parsedBody.data);
      return res.status(201).json(orden);
    } catch (error) {
      return internalError(res, error);
    }
  }

  static async updateStatus(req, res) {
    const parsedId = ordenIdParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      return res.status(400).json({ error: "El ID de la orden no es válido" });
    }

    const parsedBody = actualizarEstadoOrdenSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ errors: formatZodErrors(parsedBody.error) });
    }

    try {
      const actualizada = await OrdenesModel.updateStatus(parsedId.data, parsedBody.data);
      if (!actualizada) {
        return res.status(404).json({ error: "Orden no encontrada" });
      }

      return res.json({
        message: "Estado de la orden actualizado exitosamente",
        id_pedido: actualizada.id_pedido,
        Estatus_Orden: actualizada.Estatus_Orden
      });
    } catch (error) {
      return internalError(res, error);
    }
  }

  static async cancel(req, res) {
    const parsedId = ordenIdParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      return res.status(400).json({ error: "El ID de la orden no es válido" });
    }

    try {
      const cancelada = await OrdenesModel.cancel(parsedId.data);
      if (!cancelada) {
        return res.status(404).json({ error: "Orden no encontrada" });
      }

      return res.json({
        message: `La orden ${cancelada.id_pedido} ha sido cancelada correctamente.`
      });
    } catch (error) {
      return internalError(res, error);
    }
  }
}

module.exports = OrdenesController;
