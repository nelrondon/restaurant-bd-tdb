const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const MINUTO = 60 * 1000;

function respuesta(mensaje) {
  return (req, res) => res.status(429).json({ message: mensaje });
}

const OPCIONES_COMUNES = {
  standardHeaders: "draft-7",
  legacyHeaders: false
};

/**
 * Fuerza bruta contra /auth/login, por IP.
 * Solo cuentan los intentos fallidos: si la contraseña era correcta no se descuenta,
 * para no bloquear a una oficina entera detrás de la misma IP pública.
 */
const limiteLoginPorIp = rateLimit({
  ...OPCIONES_COMUNES,
  windowMs: 15 * MINUTO,
  limit: 10,
  skipSuccessfulRequests: true,
  handler: respuesta("Demasiados intentos. Intente en unos minutos")
});

/** Contador por usuario: evita repartir el ataque entre muchas IPs. */
const limiteLoginPorUsuario = rateLimit({
  ...OPCIONES_COMUNES,
  windowMs: 15 * MINUTO,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: req => {
    const usuario = req.body?.usuario;
    return typeof usuario === "string" && usuario.trim().length > 0
      ? `usuario:${usuario.trim().toLowerCase()}`
      : ipKeyGenerator(req.ip);
  },
  handler: respuesta("Demasiados intentos. Intente en unos minutos")
});

/**
 * POST /ordenes es público por diseño (el cliente pide desde su teléfono, sin cuenta),
 * así que el límite por IP es lo que reemplaza a la sesión como freno de abuso.
 */
const limiteCrearOrden = rateLimit({
  ...OPCIONES_COMUNES,
  windowMs: 10 * MINUTO,
  limit: 5,
  handler: respuesta("Demasiados pedidos seguidos. Intente en unos minutos")
});

/** Evita que se recorra la ruta pública de consulta probando cédulas al azar. */
const limiteConsultaOrdenes = rateLimit({
  ...OPCIONES_COMUNES,
  windowMs: 10 * MINUTO,
  limit: 30,
  handler: respuesta("Demasiadas consultas seguidas. Intente en unos minutos")
});

module.exports = {
  limiteLoginPorIp,
  limiteLoginPorUsuario,
  limiteCrearOrden,
  limiteConsultaOrdenes
};
