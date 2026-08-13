const express = require("express");

const { pool: postgresPool, pingPostgres } = require("./postgres");

const { requiereAuth } = require("./auth/middleware");
const { secretoAccess } = require("./auth/tokens");

const indexRouter = require("./routes/index.route");
const authRouter = require("./routes/auth.route");
const platosRouter = require("./routes/platos.route");
const mesasRouter = require("./routes/mesas.route");
const ordenesRouter = require("./routes/ordenes.route");
const clientesRouter = require("./routes/clientes.route");
const facturasRouter = require("./routes/facturas.route");
const inventarioRouter = require("./routes/inventario.route.js");
const reportesRouter = require("./routes/reportes.route.js");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

function route(segment) {
  return `/api/v1${segment}`;
}

class App {
  constructor() {
    this.app = express();
  }

  loggerMiddleware(req, res, next) {
    const start = Date.now();

    res.once("finish", () => {
      const duration = Date.now() - start;
      console.log(
        `${req.method} request at ${req.originalUrl} returned ${res.statusCode} - Processed in ${duration}ms`
      );
    });
    next();
  }

  registerMiddlewares() {
    const cors = require("cors");

    // La cabecera Authorization se debe permitir explícitamente o el navegador
    // bloquea la petición antes de enviarla. Al ir cors() antes que las rutas, el
    // preflight OPTIONS se responde con 204 sin pasar por requiereAuth.
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || "*",
        allowedHeaders: ["Content-Type", "Accept", "Authorization"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
      })
    );

    // Necesario para que el rate limit cuente la IP real del cliente y no la del
    // proxy (nginx). Se configura por entorno: 1 = un único proxy por delante.
    if (process.env.TRUST_PROXY) {
      this.app.set("trust proxy", Number(process.env.TRUST_PROXY));
    }

    this.app.use(this.loggerMiddleware).use(express.json());
  }

  // La sesión del empleado es ahora la única credencial de la API.
  // Los routers que se montan con "requiereAuth" están protegidos por completo;
  // los mixtos (auth, platos, ordenes) aplican el middleware ruta por ruta, porque el
  // menú digital del cliente consume algunas de sus rutas sin credenciales.
  registerRoutes() {
    this.app
      .use("/swagger/json", (req, res) => res.send(swaggerSpec))
      .use("/swagger/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))
      .use(route("/auth"), authRouter)
      .use(route("/ordenes"), ordenesRouter)
      .use(route("/platos"), platosRouter)
      .use(route("/mesas"), requiereAuth, mesasRouter)
      .use(route("/clientes"), requiereAuth, clientesRouter)
      .use(route("/registro-cliente"), requiereAuth, clientesRouter)
      .use(route("/facturas"), requiereAuth, facturasRouter)
      .use(route("/inventario"), requiereAuth, inventarioRouter)
      .use(route("/proveedores"), requiereAuth, require("./routes/proveedores.route.js"))
      .use(route("/reportes"), requiereAuth, reportesRouter)
      .use(route("/"), indexRouter);
  }

  // Falla al arrancar y no a mitad de una petición si falta un secreto.
  checkConfig() {
    secretoAccess();
  }

  async bootstrap() {
    this.checkConfig();
    await pingPostgres();
    this.registerMiddlewares();
    this.registerRoutes();

    this.app.listen(process.env.PORT, () => {
      console.log(`App listening in port: ${process.env.PORT}`);
    });
  }
}

module.exports = App;
