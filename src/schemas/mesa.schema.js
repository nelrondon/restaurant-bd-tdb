const { z } = require("zod");

const mesaIdParamSchema = z.coerce.number().int();

const createMesaSchema = z.object({
  capacidad: z.coerce
    .number({ error: "Se debe proveer una capacidad para la mesa" })
    .int({ error: "Se debe proveer una capacidad para la mesa" })
    .positive({ error: "Se debe proveer una capacidad para la mesa" }),
  estado: z.enum(["disponible", "ocupada", "reservada", "fuera_de_servicio"], {
    error: "Se debe proveer un estado para la mesa"
  }),
  ubicacion: z
    .string({ error: "Se debe proveer una ubicación para la mesa" })
    .min(1, { error: "Se debe proveer una ubicación para la mesa" })
});

const updateMesaSchema = createMesaSchema.partial();

module.exports = { mesaIdParamSchema, createMesaSchema, updateMesaSchema };
