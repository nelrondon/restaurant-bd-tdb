const ReportesModel = require("../models/reportes.model");
const { reportesPedidosQuerySchema } = require("../schemas");

class ReportesController {
  // Obtener KPIs / Resumen ejecutivo
  static async getResumen(req, res) {
    try {
      const resumen = await ReportesModel.getResumen();

      if (!resumen) {
        return res
          .status(404)
          .json({ error: "No se encontraron datos para generar el resumen." });
      }

      return res.status(200).json(resumen);
    } catch (e) {
      console.error("Error al obtener resumen de reportes:", e);
      return res
        .status(500)
        .json({ error: "Fallo interno al generar el reporte de resumen." });
    }
  }

  // Obtener listado histórico de pedidos / compras
  static async getPedidos(req, res) {
    try {
      const validation = reportesPedidosQuerySchema.safeParse(req.query);

      if (!validation.success) {
        return res.status(400).json({
          error: "Parámetros de consulta inválidos",
          details: validation.error.format()
        });
      }

      const { estado } = validation.data;

      // Validación opcional de dominio para estados permitidos
      const estadosValidos = ["en proceso", "en camino", "recibido"];
      if (estado && !estadosValidos.includes(estado)) {
        return res.status(400).json({
          error: `El estado '${estado}' no es válido. Estados permitidos: En proceso, En camino, Recibido.`
        });
      }

      const pedidos = await ReportesModel.getPedidos(estado);
      return res.status(200).json(pedidos);
    } catch (e) {
      console.error("Error al obtener reporte de pedidos:", e);
      return res
        .status(500)
        .json({ error: "Fallo interno al generar el reporte de pedidos." });
    }
  }
}

module.exports = ReportesController;
