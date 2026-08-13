const authSchemas = require("./auth.schema");
const mesaSchemas = require("./mesa.schema");
const platoSchemas = require("./plato.schema");
const ordenSchemas = require("./orden.schema");
const clienteSchemas = require("./cliente.schema");
const facturaSchemas = require("./factura.schema");

const inventarioSchemas = require("./inventario.schema");
const reporteSchemas = require("./reporte.schema");
const proveedoresSchemas = require("./proveedores.schema");

function formatZodErrors(error) {
  return error.issues.map(issue => ({
    msg: issue.message,
    path: issue.path.join(".")
  }));
}

module.exports = {
  ...authSchemas,
  ...mesaSchemas,
  ...platoSchemas,
  ...ordenSchemas,
  ...clienteSchemas,
  ...facturaSchemas,
  ...inventarioSchemas,
  ...reporteSchemas,
  ...proveedoresSchemas,
  formatZodErrors
};
