const { Router } = require("express");
const ProveedoresController = require("../controllers/proveedores.controller");

const proveedoresRouter = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Proveedor:
 *       type: object
 *       properties:
 *         id_proveedor:
 *           type: integer
 *           example: 3
 *         nombre_empresa:
 *           type: string
 *           example: Distribuidora La Montaña C.A.
 *         identificacion_rif:
 *           type: string
 *           example: J-30456789-1
 *         ciudad:
 *           type: string
 *           example: Caracas
 *         telefono_empresa:
 *           type: string
 *           example: "+58 212-5551234"
 *         email_empresa:
 *           type: string
 *           example: ventas@lamontana.com
 *         direccion:
 *           type: string
 *           example: Av. Libertador, Galpón 5, Zona Industrial
 *         nombre_encargado:
 *           type: string
 *           example: Pedro Ramírez
 *
 *     ProveedorInput:
 *       type: object
 *       required:
 *         - nombre_empresa
 *         - identificacion_rif
 *         - ciudad
 *         - telefono_empresa
 *         - email_empresa
 *         - direccion
 *         - nombre_encargado
 *       properties:
 *         nombre_empresa:
 *           type: string
 *           maxLength: 150
 *           example: Distribuidora La Montaña C.A.
 *         identificacion_rif:
 *           type: string
 *           maxLength: 30
 *           example: J-30456789-1
 *         ciudad:
 *           type: string
 *           maxLength: 100
 *           example: Caracas
 *         telefono_empresa:
 *           type: string
 *           maxLength: 30
 *           example: "+58 212-5551234"
 *         email_empresa:
 *           type: string
 *           format: email
 *           maxLength: 100
 *           example: ventas@lamontana.com
 *         direccion:
 *           type: string
 *           maxLength: 255
 *           example: Av. Libertador, Galpón 5, Zona Industrial
 *         nombre_encargado:
 *           type: string
 *           example: Pedro Ramírez
 */

/**
 * @swagger
 * /proveedores:
 *   get:
 *     summary: Listar todos los proveedores
 *     description: Retorna el listado completo de proveedores ordenados de forma ascendente por su ID.
 *     tags: [Proveedores]
 *     responses:
 *       200:
 *         description: Listado de proveedores
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Proveedor'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Error interno del servidor
 */
proveedoresRouter.get("/", ProveedoresController.getAll);

/**
 * @swagger
 * /proveedores/{id}:
 *   get:
 *     summary: Obtener un proveedor por ID
 *     description: Busca un proveedor específico según su ID numérico.
 *     tags: [Proveedores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del proveedor (columna "id_proveedor")
 *         example: 3
 *     responses:
 *       200:
 *         description: Proveedor encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Proveedor'
 *       400:
 *         description: El ID proporcionado no es un entero positivo válido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: El ID del proveedor debe ser un número
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: No existe un proveedor con ese ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Proveedor no encontrado
 *       500:
 *         description: Error interno del servidor
 */
proveedoresRouter.get("/:id", ProveedoresController.getById);

/**
 * @swagger
 * /proveedores:
 *   post:
 *     summary: Registrar un nuevo proveedor
 *     description: >
 *       Crea un nuevo proveedor en la base de datos tras validar sus campos.
 *       Tanto el RIF como el email deben ser únicos.
 *     tags: [Proveedores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProveedorInput'
 *     responses:
 *       201:
 *         description: Proveedor creado satisfactoriamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Proveedor'
 *       400:
 *         description: Error de validación en alguno de los campos enviados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Se debe proveer el nombre de la empresa
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         description: Ya existe un proveedor registrado con ese RIF o email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Ya existe un proveedor registrado con ese RIF o Email
 *       500:
 *         description: Error interno al intentar crear el proveedor
 */
proveedoresRouter.post("/", ProveedoresController.create);

/**
 * @swagger
 * /proveedores/{id}:
 *   put:
 *     summary: Actualizar un proveedor existente
 *     description: >
 *       Permite modificar de forma parcial o total los datos de un proveedor.
 *       Se debe enviar al menos un campo en el body.
 *     tags: [Proveedores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del proveedor a actualizar
 *         example: 3
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_empresa:
 *                 type: string
 *                 example: Distribuidora La Montaña C.A.
 *               identificacion_rif:
 *                 type: string
 *                 example: J-30456789-1
 *               ciudad:
 *                 type: string
 *                 example: Valencia
 *               telefono_empresa:
 *                 type: string
 *                 example: "+58 241-5559876"
 *               email_empresa:
 *                 type: string
 *                 format: email
 *                 example: compras@lamontana.com
 *               direccion:
 *                 type: string
 *                 example: Av. Bolívar Norte, Galpón 12
 *               nombre_encargado:
 *                 type: string
 *                 example: Pedro Ramírez
 *     responses:
 *       200:
 *         description: Proveedor actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Proveedor'
 *       400:
 *         description: ID inválido, body vacío o error de validación en los campos enviados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Debe enviar al menos un campo para actualizar
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: No existe un proveedor con el ID proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Proveedor no encontrado
 *       409:
 *         description: El RIF o el email entran en conflicto con otro proveedor existente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Ya existe un proveedor registrado con ese RIF o Email
 *       500:
 *         description: Error interno al intentar actualizar el proveedor
 */
proveedoresRouter.put("/:id", ProveedoresController.update);

/**
 * @swagger
 * /proveedores/{id}:
 *   delete:
 *     summary: Eliminar un proveedor
 *     description: >
 *       Elimina un proveedor de la base de datos siempre que no tenga
 *       compras o insumos asociados.
 *     tags: [Proveedores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del proveedor a eliminar
 *         example: 3
 *     responses:
 *       200:
 *         description: Proveedor eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Proveedor eliminado correctamente
 *       400:
 *         description: El ID proporcionado no es un entero positivo válido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: El ID del proveedor debe ser un número
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: No existe un proveedor con ese ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Proveedor no encontrado
 *       409:
 *         description: El proveedor tiene compras registradas y no puede eliminarse
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: No se puede eliminar el proveedor porque tiene compras registradas
 *       500:
 *         description: Error interno al intentar eliminar el proveedor
 */
proveedoresRouter.delete("/:id", ProveedoresController.remove);

module.exports = proveedoresRouter;
