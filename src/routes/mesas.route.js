const { Router } = require("express");
const MesasController = require("../controllers/mesas.controller");

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Mesa:
 *       type: object
 *       properties:
 *         id_mesa:
 *           type: integer
 *           example: 1
 *         capacidad:
 *           type: integer
 *           example: 4
 *         estado:
 *           type: string
 *           enum: [disponible, ocupada, reservada, fuera_de_servicio]
 *           example: disponible
 *         ubicacion:
 *           type: string
 *           example: Terraza
 */

/**
 * @swagger
 * /mesas:
 *   get:
 *     summary: Listar todas las mesas
 *     description: Devuelve todas las mesas registradas, sin filtrar por estado ni ubicación.
 *     tags: [Mesas]
 *     responses:
 *       200:
 *         description: Listado de mesas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Mesa'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/", MesasController.getAll);

/**
 * @swagger
 * /mesas/{id}:
 *   get:
 *     summary: Obtener una mesa por ID
 *     description: Busca una mesa específica según su ID numérico.
 *     tags: [Mesas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la mesa a consultar
 *     responses:
 *       200:
 *         description: Mesa encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mesa'
 *       400:
 *         description: El ID proporcionado no es un número válido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: ID de mesa inválida
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: No existe una mesa con ese ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mesa no encontrada
 */
router.get("/:id", MesasController.getById);

/**
 * @swagger
 * /mesas:
 *   post:
 *     summary: Crear una nueva mesa
 *     description: >
 *       Registra una nueva mesa en el sistema. Requiere capacidad (número entero
 *       mayor a 0), un estado válido y una ubicación.
 *     tags: [Mesas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - capacidad
 *               - estado
 *               - ubicacion
 *             properties:
 *               capacidad:
 *                 type: integer
 *                 example: 4
 *                 description: Debe ser un entero mayor a 0
 *               estado:
 *                 type: string
 *                 enum: [disponible, ocupada, reservada, fuera_de_servicio]
 *                 example: disponible
 *               ubicacion:
 *                 type: string
 *                 example: Terraza
 *     responses:
 *       200:
 *         description: Mesa creada satisfactoriamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: La mesa ha sido creada satisfactoriamente
 *                 data:
 *                   $ref: '#/components/schemas/Mesa'
 *       400:
 *         description: Error de validación en alguno de los campos enviados
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
 *                         example: Se debe proveer una capacidad para la mesa
 *                       path:
 *                         type: string
 *                         example: capacidad
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Error interno al intentar crear la mesa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ha ocurrido un error interno al crear la mesa
 *                 error:
 *                   type: string
 */
router.post("/", MesasController.create);

/**
 * @swagger
 * /mesas/{id}:
 *   put:
 *     summary: Actualizar una mesa
 *     description: >
 *       Actualiza parcialmente una mesa según su ID. Todos los campos son opcionales,
 *       pero se debe enviar al menos uno. Sirve tanto para editar la mesa completa
 *       como para cambiar únicamente su estado (enviando solo el campo "estado").
 *     tags: [Mesas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la mesa a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               capacidad:
 *                 type: integer
 *                 example: 4
 *                 description: Debe ser un entero mayor a 0
 *               estado:
 *                 type: string
 *                 enum: [disponible, ocupada, reservada, fuera_de_servicio]
 *                 example: ocupada
 *               ubicacion:
 *                 type: string
 *                 example: Terraza
 *           examples:
 *             soloEstado:
 *               summary: Cambiar únicamente el estado
 *               value:
 *                 estado: ocupada
 *             completo:
 *               summary: Actualizar varios campos
 *               value:
 *                 capacidad: 6
 *                 estado: disponible
 *                 ubicacion: Salón principal
 *     responses:
 *       200:
 *         description: Mesa actualizada satisfactoriamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: La mesa ha sido actualizada satisfactoriamente
 *                 data:
 *                   $ref: '#/components/schemas/Mesa'
 *       400:
 *         description: El ID no es válido o el cuerpo enviado no pasó la validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: ID de mesa inválida
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                         example: Se debe proveer al menos un campo para actualizar
 *                       path:
 *                         type: string
 *                         example: estado
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: No existe una mesa con ese ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mesa no encontrada
 *       500:
 *         description: Error interno al intentar actualizar la mesa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ha ocurrido un error interno al actualizar la mesa
 *                 error:
 *                   type: string
 */
router.put("/:id", MesasController.update);

/**
 * @swagger
 * /mesas/{id}:
 *   delete:
 *     summary: Eliminar una mesa
 *     description: >
 *       Elimina una mesa según su ID. No se podrá eliminar si la mesa ya está
 *       asociada a algún pedido registrado.
 *     tags: [Mesas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la mesa a eliminar
 *     responses:
 *       200:
 *         description: Mesa eliminada satisfactoriamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: La mesa ha sido eliminada satisfactoriamente
 *                 data:
 *                   $ref: '#/components/schemas/Mesa'
 *       400:
 *         description: El ID proporcionado no es un número válido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: ID de mesa inválida
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: No existe una mesa con ese ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mesa no encontrada
 *       409:
 *         description: La mesa está asociada a pedidos y no puede eliminarse
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No se puede eliminar la mesa porque está asociada a pedidos existentes
 *       500:
 *         description: Error interno al intentar eliminar la mesa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ha ocurrido un error interno al eliminar la mesa
 *                 error:
 *                   type: string
 */
router.delete("/:id", MesasController.remove);

module.exports = router;
