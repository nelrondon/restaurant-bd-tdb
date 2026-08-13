const swaggerJsdoc = require("swagger-jsdoc");
const path = require("node:path");

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API de Restaurante - Sistemas de Bases de Datos",
      version: "1.0.0",
      description:
        "Servicio de Backend para el proyecto final de la materia de Sistemas de Bases de Datos"
    },
    servers: [
      {
        url: `/api/v1`
      }
    ],
    tags: [
      { name: "Metadatos", description: "Información general de la API" },
      {
        name: "Autenticación",
        description:
          "Inicio de sesión de empleados. La mayoría de las rutas exige una sesión iniciada (cabecera Authorization: Bearer)"
      },
      { name: "Mesas", description: "Gestión de las mesas del restaurante" },
      { name: "Platos", description: "Gestión del menú de platos del restaurante" },
      {
        name: "Ordenes",
        description:
          "Equipo 1 - Core Operativo: comandas, órdenes POS y tablero de cocina"
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Access token devuelto por POST /auth/login. Se envía como 'Authorization: Bearer <access_token>'"
        }
      },
      responses: {
        UnauthorizedError: {
          description:
            "No hay una sesión válida: falta el access token, está mal firmado o venció. Ante un 401 el cliente debe renovar con /auth/refresh y reintentar una sola vez",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "Se requiere iniciar sesión"
                  }
                }
              }
            }
          }
        },
        ForbiddenError: {
          description:
            "Hay una sesión válida, pero no alcanza: la cuenta está desactivada o el rol es insuficiente. El cliente no debe reintentar",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "La cuenta está desactivada"
                  }
                }
              }
            }
          }
        }
      }
    },
    // Por defecto toda ruta exige una sesión iniciada. Las rutas públicas
    // (menú digital, login y refresh) lo sobrescriben con "security: []"
    // en su propia documentación.
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: ["src/routes/*.js"]
});

module.exports = swaggerSpec;
