const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL || "http://n8n:5678/webhook/orden-estatus";

class N8nService {
  /**
   * Envía una notificación de cambio de estatus al servidor de automatización n8n de forma
   * asíncrona no bloqueante (fire-and-forget seguro). Si el webhook falla (por ejemplo si n8n
   * está apagado o en mantenimiento), se captura el error y se registra en los logs sin interrumpir
   * el flujo del cocinero ni provocar rollback en la base de datos.
   */
  static async notificarCambioEstatus({
    idPedido,
    numTicket,
    nuevoEstado,
    clienteNombre,
    clienteTelefono
  }) {
    if (!clienteTelefono) {
      console.log(
        `[n8n Service] Orden #${numTicket} sin teléfono de cliente registrado. Se omite notificación WhatsApp.`
      );
      return;
    }

    const payload = {
      event: "ORDER_STATUS_UPDATED",
      timestamp: new Date().toISOString(),
      order_id: idPedido,
      num_ticket: numTicket,
      new_status: nuevoEstado,
      customer: {
        name: clienteNombre || "Cliente Valioso",
        phone: clienteTelefono
      },
      message: `Hola ${clienteNombre || ""}, tu pedido #${numTicket} cambió de estatus a: ${nuevoEstado.toUpperCase()}. ¡Gracias por tu preferencia!`
    };

    console.log(
      `[n8n Service] Enviando notificación Webhook para orden #${numTicket} a n8n (${N8N_WEBHOOK_URL})...`
    );

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(
          `[n8n Service] Webhook entregado con éxito a n8n (Status: ${response.status})`
        );
      } else {
        console.log(
          `[n8n Service] El Webhook regresó estado HTTP no exitoso desde n8n: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.log(
        `[n8n Service] Aviso: No se pudo conectar con el servidor n8n (${N8N_WEBHOOK_URL}): ${error.message}`
      );
    }
  }
}

module.exports = N8nService;
