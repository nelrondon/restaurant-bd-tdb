const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const SEGUNDOS_POR_DIA = 24 * 60 * 60;

function accessTtlSegundos() {
  return Number(process.env.JWT_ACCESS_TTL) || 900;
}

function refreshTtlDias() {
  return Number(process.env.REFRESH_TTL_DIAS) || 30;
}

function bcryptCost() {
  return Number(process.env.BCRYPT_COST) || 12;
}

function secretoAccess() {
  const secreto = process.env.JWT_ACCESS_SECRET;
  if (!secreto) {
    throw new Error("Falta la variable de entorno JWT_ACCESS_SECRET");
  }
  return secreto;
}

// Firma el access token. Solo lleva lo que no puede quedar obsoleto en 15 minutos:
// el estado "activo" y cualquier otro dato mutable se consulta contra la BD.
function firmarAccessToken(usuario) {
  return jwt.sign(
    {
      sub: usuario.id_usuario,
      usuario: usuario.usuario,
      rol: usuario.rol
    },
    secretoAccess(),
    { algorithm: "HS256", expiresIn: accessTtlSegundos() }
  );
}

function verificarAccessToken(token) {
  return jwt.verify(token, secretoAccess(), { algorithms: ["HS256"] });
}

// Refresh token opaco: 256 bits aleatorios en hexadecimal.
function generarRefreshToken() {
  return crypto.randomBytes(32).toString("hex");
}

// El refresh token es un secreto aleatorio de alta entropía, no una contraseña:
// SHA-256 basta para guardarlo sin poder revertirlo. Devuelve 64 caracteres hex.
function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function expiracionRefresh() {
  return new Date(Date.now() + refreshTtlDias() * SEGUNDOS_POR_DIA * 1000);
}

async function hashClave(clave) {
  return bcrypt.hash(clave, bcryptCost());
}

// Hash de un secreto aleatorio que nadie conoce. Se usa para comparar contra algo
// cuando el usuario no existe, de forma que el tiempo de respuesta sea el mismo
// que el de una contraseña incorrecta y no se filtre qué usuarios están registrados.
let hashSeñuelo = null;
function obtenerHashSeñuelo() {
  if (!hashSeñuelo) {
    hashSeñuelo = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), bcryptCost());
  }
  return hashSeñuelo;
}

async function verificarClave(clave, hash) {
  return bcrypt.compare(clave, hash || obtenerHashSeñuelo());
}

module.exports = {
  accessTtlSegundos,
  refreshTtlDias,
  bcryptCost,
  secretoAccess,
  firmarAccessToken,
  verificarAccessToken,
  generarRefreshToken,
  hashRefreshToken,
  expiracionRefresh,
  hashClave,
  verificarClave
};
