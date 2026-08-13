const { z } = require("zod");

// Validar query param opcional para filtrar pedidos por estado
const reportesPedidosQuerySchema = z.object({
  estado: z.string().trim().toLowerCase().optional()
});

module.exports = { reportesPedidosQuerySchema };
