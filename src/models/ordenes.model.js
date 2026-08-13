const { withTransaction } = require("../postgres");
const { ESTADOS_ACTIVOS } = require("../schemas/orden.schema");

const IVA = 0.16;

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function redondear(valor) {
  return Math.round(valor * 100) / 100;
}

function mapearItem(row) {
  return {
    id_producto: row.id_plato,
    nombre: row.nombre,
    cantidad: row.cantidad,
    precio_unitario: Number(row.precio_unitario),
    subtotal: Number(row.subtotal),
    notas: row.notas ?? ""
  };
}

function mapearOrden(row, items) {
  const subtotal = redondear(items.reduce((suma, item) => suma + item.subtotal, 0));
  const iva = redondear(subtotal * IVA);

  return {
    id_pedido: row.id_pedido,
    num_ticket: row.num_ticket,
    hora_creacion: row.hora_creacion,
    cliente_nombre: row.cliente_nombre ?? "",
    cliente_cedula: row.cedula_cliente,
    cliente_telefono: row.cliente_telefono ?? "",
    tipo: row.tipo_pedido,
    mesa: row.id_mesa,
    direccion: row.direccion_envio ?? "",
    subtotal,
    iva,
    total: redondear(subtotal + iva),
    Estatus_Orden: row.estado_orden,
    items
  };
}

const SELECT_ORDEN = `
  SELECT
    pedido.id_pedido,
    pedido.num_ticket,
    pedido.hora_creacion,
    pedido.tipo_pedido,
    pedido.estado_orden,
    pedido.id_mesa,
    pedido.cedula_cliente,
    pedido.direccion_envio,
    cliente.nombre AS cliente_nombre,
    cliente.telefono AS cliente_telefono
  FROM pedido
  LEFT JOIN cliente ON cliente.cedula_cliente = pedido.cedula_cliente`;

async function obtenerItemsPorTicket(client, tickets) {
  if (tickets.length === 0) return new Map();

  const result = await client.query(
    `SELECT
       detalle_pedido.num_ticket,
       detalle_pedido.id_plato,
       detalle_pedido.cantidad,
       detalle_pedido.precio_unitario,
       detalle_pedido.subtotal,
       detalle_pedido.notas,
       plato.nombre
     FROM detalle_pedido
     JOIN plato ON plato.id_plato = detalle_pedido.id_plato
     WHERE detalle_pedido.num_ticket = ANY($1)
     ORDER BY detalle_pedido.num_ticket, detalle_pedido.id_plato`,
    [tickets]
  );

  const porTicket = new Map(tickets.map(ticket => [ticket, []]));
  for (const row of result.rows) {
    porTicket.get(row.num_ticket).push(mapearItem(row));
  }
  return porTicket;
}

async function buscarOrden(client, idPedido) {
  const result = await client.query(`${SELECT_ORDEN} WHERE pedido.id_pedido = $1`, [
    idPedido
  ]);
  if (result.rows.length === 0) return null;

  const orden = result.rows[0];
  const items = await obtenerItemsPorTicket(client, [orden.num_ticket]);

  return mapearOrden(orden, items.get(orden.num_ticket) ?? []);
}

class OrdenesModel {
  static async getAll({ estatus } = {}) {
    return withTransaction(async client => {
      let sql = SELECT_ORDEN;
      const params = [];

      if (estatus === "activo") {
        sql += ` WHERE pedido.estado_orden = ANY($1)`;
        params.push(ESTADOS_ACTIVOS);
      } else if (estatus) {
        sql += ` WHERE pedido.estado_orden = $1`;
        params.push(estatus);
      }

      sql += ` ORDER BY pedido.hora_creacion DESC, pedido.id_pedido DESC`;

      const result = await client.query(sql, params);
      const items = await obtenerItemsPorTicket(
        client,
        result.rows.map(row => row.num_ticket)
      );

      return result.rows.map(row => mapearOrden(row, items.get(row.num_ticket) ?? []));
    });
  }

  static async getById(idPedido) {
    return withTransaction(client => buscarOrden(client, idPedido));
  }

  /**
   * Consulta pública acotada: devuelve solo los pedidos de una cédula y solo los
   * campos que el cliente necesita para seguirlos (ticket, hora, estatus y total).
   * No incluye datos personales ni el detalle de los ítems.
   */
  static async consultarPorCedula(cedula) {
    return withTransaction(async client => {
      const result = await client.query(
        `SELECT
           pedido.num_ticket,
           pedido.hora_creacion,
           pedido.estado_orden,
           COALESCE(SUM(detalle_pedido.subtotal), 0) AS subtotal
         FROM pedido
         LEFT JOIN detalle_pedido ON detalle_pedido.num_ticket = pedido.num_ticket
         WHERE pedido.cedula_cliente = $1
         GROUP BY pedido.id_pedido
         ORDER BY pedido.hora_creacion DESC, pedido.id_pedido DESC`,
        [cedula]
      );

      return result.rows.map(row => {
        const subtotal = redondear(Number(row.subtotal));
        return {
          num_ticket: row.num_ticket,
          hora_creacion: row.hora_creacion,
          Estatus_Orden: row.estado_orden,
          total: redondear(subtotal + redondear(subtotal * IVA))
        };
      });
    });
  }

  static async create({
    cliente_nombre,
    cliente_cedula,
    cliente_telefono,
    tipo,
    mesa,
    direccion,
    items
  }) {
    return withTransaction(async client => {
      if (tipo === "mesa") {
        const mesaResult = await client.query(
          "SELECT id_mesa FROM mesa WHERE id_mesa = $1",
          [mesa]
        );
        if (mesaResult.rows.length === 0) {
          throw httpError(404, `La mesa ${mesa} no existe`);
        }
      }

      const idsProducto = items.map(item => item.id_producto);
      const platosResult = await client.query(
        "SELECT id_plato, precio, disponible FROM plato WHERE id_plato = ANY($1)",
        [idsProducto]
      );
      const platos = new Map(platosResult.rows.map(row => [row.id_plato, row]));

      for (const id of idsProducto) {
        const plato = platos.get(id);
        if (!plato) {
          throw httpError(404, `El producto ${id} no existe en el menú`);
        }
        if (!plato.disponible) {
          throw httpError(400, `El producto ${id} no está disponible actualmente`);
        }
      }

      await client.query(
        `INSERT INTO cliente (cedula_cliente, nombre, telefono)
         VALUES ($1, $2, $3)
         ON CONFLICT (cedula_cliente) DO NOTHING`,
        [cliente_cedula, cliente_nombre, cliente_telefono]
      );

      const pedidoResult = await client.query(
        `INSERT INTO pedido (tipo_pedido, id_mesa, cedula_cliente, direccion_envio)
         VALUES ($1, $2, $3, $4)
         RETURNING id_pedido, num_ticket`,
        [
          tipo,
          tipo === "mesa" ? mesa : null,
          cliente_cedula,
          tipo === "delivery" ? direccion : (direccion ?? null)
        ]
      );
      const { id_pedido, num_ticket } = pedidoResult.rows[0];

      for (const item of items) {
        const precioUnitario = Number(platos.get(item.id_producto).precio);
        await client.query(
          `INSERT INTO detalle_pedido (num_ticket, id_plato, cantidad, precio_unitario, subtotal, notas)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            num_ticket,
            item.id_producto,
            item.cantidad,
            precioUnitario,
            redondear(precioUnitario * item.cantidad),
            item.notas ?? null
          ]
        );
      }

      return buscarOrden(client, id_pedido);
    });
  }

  static async updateStatus(idPedido, estatus) {
    return withTransaction(async client => {
      const result = await client.query(
        `UPDATE pedido SET estado_orden = $1 WHERE id_pedido = $2
         RETURNING id_pedido, estado_orden`,
        [estatus, idPedido]
      );
      if (result.rows.length === 0) return null;

      return {
        id_pedido: result.rows[0].id_pedido,
        Estatus_Orden: result.rows[0].estado_orden
      };
    });
  }

  static async cancel(idPedido) {
    return withTransaction(async client => {
      const actual = await client.query(
        "SELECT estado_orden FROM pedido WHERE id_pedido = $1 FOR UPDATE",
        [idPedido]
      );
      if (actual.rows.length === 0) return null;

      const estadoActual = actual.rows[0].estado_orden;
      if (estadoActual === "cancelado") {
        throw httpError(409, `La orden ${idPedido} ya se encuentra cancelada`);
      }
      if (estadoActual === "entregado") {
        throw httpError(
          409,
          `La orden ${idPedido} ya fue entregada y no se puede cancelar`
        );
      }

      await client.query(
        "UPDATE pedido SET estado_orden = 'cancelado' WHERE id_pedido = $1",
        [idPedido]
      );

      return { id_pedido: idPedido, Estatus_Orden: "cancelado" };
    });
  }

  /**
   * Borrado duro: elimina la orden y su detalle de la base de datos.
   *
   * A diferencia de cancel(), aquí no queda rastro, así que se niega si la orden ya
   * tiene factura emitida: "factura" apunta a "pedido" por num_ticket y la
   * facturación no puede quedar huérfana. En ese caso lo correcto es cancelar.
   *
   * El detalle se borra a mano porque su llave foránea no está declarada
   * ON DELETE CASCADE.
   */
  static async remove(idPedido) {
    return withTransaction(async client => {
      const actual = await client.query(
        "SELECT id_pedido, num_ticket FROM pedido WHERE id_pedido = $1 FOR UPDATE",
        [idPedido]
      );
      if (actual.rows.length === 0) return null;

      const { num_ticket } = actual.rows[0];

      const factura = await client.query(
        "SELECT num_factura FROM factura WHERE num_ticket = $1",
        [num_ticket]
      );
      if (factura.rows.length > 0) {
        throw httpError(
          409,
          `La orden ${idPedido} ya tiene una factura emitida y no se puede eliminar. Cancélela en su lugar`
        );
      }

      await client.query("DELETE FROM detalle_pedido WHERE num_ticket = $1", [
        num_ticket
      ]);
      await client.query("DELETE FROM pedido WHERE id_pedido = $1", [idPedido]);

      return { id_pedido: idPedido, num_ticket };
    });
  }
}

module.exports = OrdenesModel;
