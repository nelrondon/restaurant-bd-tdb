const { Router } = require("express");
const AuthController = require("../controllers/auth.controller");
const { requiereAuth } = require("../auth/middleware");
const { limiteLoginPorIp, limiteLoginPorUsuario } = require("../auth/rate-limit");

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UsuarioSesion:
 *       type: object
 *       properties:
 *         id_usuario:
 *           type: integer
 *           example: 12
 *         usuario:
 *           type: string
 *           example: jperez
 *         nombre:
 *           type: string
 *           example: Juan Pérez
 *         rol:
 *           type: string
 *           enum: [admin, gerente, empleado]
 *           example: gerente
 *         activo:
 *           type: boolean
 *           example: true
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: >
 *       Valida las credenciales de un empleado y entrega un access token (JWT de
 *       15 minutos) y un refresh token opaco (30 días). Es el punto de entrada:
 *       no requiere sesión previa.
 *     tags: [Autenticación]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usuario
 *               - contrasena
 *             properties:
 *               usuario:
 *                 type: string
 *                 example: jperez
 *               contrasena:
 *                 type: string
 *                 format: password
 *                 example: "••••••••"
 *     responses:
 *       200:
 *         description: Sesión iniciada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   example: eyJhbGciOi...
 *                 refresh_token:
 *                   type: string
 *                   example: 9f8c1d...
 *                 expires_in:
 *                   type: integer
 *                   description: Vida del access token, en segundos
 *                   example: 900
 *                 usuario:
 *                   $ref: '#/components/schemas/UsuarioSesion'
 *       400:
 *         description: Falta el usuario o la contraseña
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                         example: El usuario es obligatorio
 *                       path:
 *                         type: string
 *                         example: usuario
 *       401:
 *         description: >
 *           Credenciales incorrectas. Se responde lo mismo si el usuario no existe
 *           que si la contraseña es incorrecta, para no revelar qué usuarios existen.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuario o contraseña incorrectos
 *       403:
 *         description: La cuenta existe pero está desactivada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: La cuenta está desactivada
 *       429:
 *         description: Demasiados intentos fallidos (por IP o por usuario)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Demasiados intentos. Intente en unos minutos
 *       500:
 *         description: Error interno al intentar iniciar sesión
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ha ocurrido un error interno al iniciar sesión
 */
router.post("/login", limiteLoginPorIp, limiteLoginPorUsuario, AuthController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renovar el access token
 *     description: >
 *       Canjea un refresh token por un access token nuevo. El refresh token se rota:
 *       el recibido queda invalidado y se devuelve uno nuevo. Si llega un refresh token
 *       ya canjeado se asume robo de credenciales y se revocan todas las sesiones del
 *       usuario. No requiere access token válido: existe justamente porque venció.
 *     tags: [Autenticación]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 example: 9f8c1d...
 *     responses:
 *       200:
 *         description: Tokens renovados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   example: eyJhbGciOi...
 *                 refresh_token:
 *                   type: string
 *                   example: 3b7e40...
 *                 expires_in:
 *                   type: integer
 *                   example: 900
 *       400:
 *         description: Falta el refresh token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                         example: El refresh token es obligatorio
 *                       path:
 *                         type: string
 *                         example: refresh_token
 *       401:
 *         description: Token desconocido, expirado, revocado o ya usado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: La sesión expiró. Inicie sesión de nuevo
 *       403:
 *         description: La cuenta está desactivada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: La cuenta está desactivada
 *       500:
 *         description: Error interno al intentar renovar la sesión
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ha ocurrido un error interno al renovar la sesión
 */
router.post("/refresh", AuthController.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: >
 *       Revoca el refresh token recibido. Es idempotente: si el token ya no existe o
 *       ya estaba revocado, responde 200 igual.
 *     tags: [Autenticación]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 example: 9f8c1d...
 *     responses:
 *       200:
 *         description: Sesión cerrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sesión cerrada
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Error interno al intentar cerrar la sesión
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ha ocurrido un error interno al cerrar la sesión
 */
router.post("/logout", requiereAuth, AuthController.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obtener el usuario de la sesión actual
 *     description: >
 *       Devuelve el usuario dueño del access token, leído de la base de datos y no del
 *       JWT, de forma que se detecte una cuenta desactivada o con el rol cambiado.
 *       El frontend la llama al cargar la aplicación para validar el token guardado.
 *     tags: [Autenticación]
 *     responses:
 *       200:
 *         description: Usuario de la sesión
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsuarioSesion'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get("/me", requiereAuth, AuthController.me);

module.exports = router;
