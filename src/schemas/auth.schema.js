const { z } = require("zod");

const ROLES_USUARIO = ["admin", "gerente", "empleado"];

const loginSchema = z.object({
  usuario: z
    .string({ error: "El usuario es obligatorio" })
    .trim()
    .min(1, { error: "El usuario es obligatorio" })
    .max(50, { error: "El usuario no puede superar los 50 caracteres" }),
  contrasena: z
    .string({ error: "La contraseña es obligatoria" })
    .min(1, { error: "La contraseña es obligatoria" })
    .max(200, { error: "La contraseña no puede superar los 200 caracteres" })
});

const refreshSchema = z.object({
  refresh_token: z
    .string({ error: "El refresh token es obligatorio" })
    .trim()
    .min(1, { error: "El refresh token es obligatorio" })
    .max(512, { error: "El refresh token no es válido" })
});

// En logout el refresh token es opcional: la sesión también se puede deducir del
// access token, y la ruta responde 200 igual (es idempotente).
const logoutSchema = z.object({
  refresh_token: z.string().trim().max(512).optional()
});

module.exports = { ROLES_USUARIO, loginSchema, refreshSchema, logoutSchema };
