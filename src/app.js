const express = require("express");

const { pool: postgresPool, pingPostgres } = require("./postgres");

const indexRouter = require("./routes/index.route");
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

  authorizationMiddleware(req, res, next) {
    const providedKey = req.header("x-api-key");
    if (providedKey != process.env.API_KEY) {
      res.status(401).json({ message: "No autorizado. Necesitas la llave de la API" });
    } else {
      next();
    }
  }

  registerMiddlewares() {
    const cors = require("cors");
    this.app.use(cors());
    this.app.use(this.loggerMiddleware).use(express.json());
  }

  registerRoutes() {
    this.app
      .use("/swagger/json", (req, res) => res.send(swaggerSpec))
      .use("/swagger/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))
      .use(route("/ordenes"), this.authorizationMiddleware, ordenesRouter)
      .use(route("/platos"), this.authorizationMiddleware, platosRouter)
      .use(route("/mesas"), this.authorizationMiddleware, mesasRouter)
      .use(route("/clientes"), this.authorizationMiddleware, clientesRouter)
      .use(route("/registro-cliente"), this.authorizationMiddleware, clientesRouter)
      .use(route("/facturas"), this.authorizationMiddleware, facturasRouter)
      .use(route("/inventario"), this.authorizationMiddleware, inventarioRouter)
      .use(
        route("/proveedores"),
        this.authorizationMiddleware,
        require("./routes/proveedores.route.js")
      )
      .use(route("/reportes"), this.authorizationMiddleware, reportesRouter)
      .use(route("/"), this.authorizationMiddleware, indexRouter);
  }

  async bootstrap() {
    await pingPostgres();
    this.registerMiddlewares();
    this.registerRoutes();

    this.app.listen(process.env.PORT, () => {
      console.log(`App listening in port: ${process.env.PORT}`);
    });
  }
}

module.exports = App;
