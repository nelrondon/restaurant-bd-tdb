const { z } = require("zod");

const ESTADOS_ORDEN = ["recibido", "preparando", "listo", "entregado", "cancelado"];

const ESTADOS_ACTIVOS = ["recibido", "preparando", "listo"];

const ordenIdParamSchema = z.coerce.number().int().positive();

const listarOrdenesQuerySchema = z.object({
  estatus: z
    .string()
    .trim()
    .toLowerCase()
    .refine(value => value === "activo" || ESTADOS_ORDEN.includes(value), {
      error: `El estatus debe ser "activo" o uno de: ${ESTADOS_ORDEN.join(", ")}`
    })
    .optional()
});

// Consulta pública del menú digital: solo se acepta una cédula concreta, nunca un
// listado abierto (esa es la diferencia con GET /ordenes, que sí exige sesión).
const consultarOrdenesQuerySchema = z.object({
  cedula: z
    .string({ error: "Se debe indicar la cédula del cliente" })
    .trim()
    .min(1, { error: "Se debe indicar la cédula del cliente" })
    .max(20, { error: "La cédula no puede superar los 20 caracteres" })
});

const ordenItemSchema = z.object({
  id_producto: z.coerce
    .number({ error: "Cada ítem debe indicar un id_producto válido" })
    .int({ error: "Cada ítem debe indicar un id_producto válido" })
    .positive({ error: "Cada ítem debe indicar un id_producto válido" }),
  cantidad: z.coerce
    .number({ error: "La cantidad de cada ítem debe ser un entero mayor a 0" })
    .int({ error: "La cantidad de cada ítem debe ser un entero mayor a 0" })
    .positive({ error: "La cantidad de cada ítem debe ser un entero mayor a 0" }),
  notas: z
    .string()
    .max(255, { error: "Las notas no pueden superar los 255 caracteres" })
    .nullish()
});

const crearOrdenSchema = z
  .object({
    cliente_nombre: z
      .string({ error: "Se debe proveer el nombre del cliente" })
      .trim()
      .min(1, { error: "Se debe proveer el nombre del cliente" })
      .max(100, { error: "El nombre del cliente no puede superar los 100 caracteres" }),
    cliente_cedula: z
      .string({ error: "Se debe proveer la cédula del cliente" })
      .trim()
      .min(1, { error: "Se debe proveer la cédula del cliente" })
      .max(20, { error: "La cédula del cliente no puede superar los 20 caracteres" }),
    cliente_telefono: z
      .string({ error: "Se debe proveer el teléfono del cliente" })
      .trim()
      .min(1, { error: "Se debe proveer el teléfono del cliente" })
      .max(20, { error: "El teléfono del cliente no puede superar los 20 caracteres" }),
    tipo: z.enum(["mesa", "pickup", "delivery"], {
      error: "Se debe proveer un tipo de orden válido: mesa, pickup o delivery"
    }),
    mesa: z
      .union([z.null(), z.coerce.number().int().positive()], {
        error: "Se debe proveer un número de mesa válido"
      })
      .optional(),
    direccion: z
      .union([z.null(), z.string().max(255)], {
        error: "La dirección debe ser una cadena de máximo 255 caracteres"
      })
      .optional(),
    items: z
      .array(ordenItemSchema, { error: "Se debe proveer la lista de ítems de la orden" })
      .min(1, { error: "La orden debe contener al menos un ítem" })
  })
  .superRefine((data, ctx) => {
    if (data.tipo === "mesa" && (data.mesa === null || data.mesa === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["mesa"],
        message: "Se debe indicar la mesa para una orden de tipo mesa"
      });
    }

    if (data.tipo === "delivery" && !data.direccion) {
      ctx.addIssue({
        code: "custom",
        path: ["direccion"],
        message: "Se debe indicar la dirección para una orden de tipo delivery"
      });
    }

    const vistos = new Set();
    data.items.forEach((item, index) => {
      if (vistos.has(item.id_producto)) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, "id_producto"],
          message: `El producto ${item.id_producto} está repetido en la orden. Acumule la cantidad en una sola línea`
        });
      }
      vistos.add(item.id_producto);
    });
  });

function leerEstatus(data) {
  return (data.Estatus_Orden ?? data.estado_orden ?? "").trim().toLowerCase();
}

const actualizarEstadoOrdenSchema = z
  .object({
    Estatus_Orden: z.string().optional(),
    estado_orden: z.string().optional()
  })
  .superRefine((data, ctx) => {
    const estatus = leerEstatus(data);

    if (estatus.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["Estatus_Orden"],
        message: "Se requiere especificar el estatus de la orden"
      });
      return;
    }

    if (!ESTADOS_ORDEN.includes(estatus)) {
      ctx.addIssue({
        code: "custom",
        path: ["Estatus_Orden"],
        message: `El estatus de la orden debe ser uno de: ${ESTADOS_ORDEN.join(", ")}`
      });
    }
  })
  .transform(leerEstatus);

module.exports = {
  ESTADOS_ORDEN,
  ESTADOS_ACTIVOS,
  ordenIdParamSchema,
  listarOrdenesQuerySchema,
  consultarOrdenesQuerySchema,
  crearOrdenSchema,
  actualizarEstadoOrdenSchema
};
