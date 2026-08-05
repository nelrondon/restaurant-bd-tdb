# Guía del Equipo 4: DevOps, Infraestructura y Automatización (n8n)

> Documento de diagnóstico, auditoría de código actual y hoja de ruta orientada al cumplimiento de los requerimientos y entregas estipulados en el proyecto final de Teoría y Taller de Bases de Datos I2026.

---

## 1. 🎯 Rol del Equipo 4 y Alcance Técnico

Según las directrices académicas del proyecto (*Sistema de Restaurante - Hamburguesas y Pepitos*), las responsabilidades exclusivas del **Equipo 4** se centran en los pilares centrales de infraestructura y conectividad:

* **Infraestructura y Red:** Despliegue del servidor en la nube (VPS en Contabo), configuración del proxy inverso Nginx y administración general de los contenedores mediante Docker y Docker Compose para todo el curso/grupo.
* **Automatización de Mensajería:** Configuración del motor computacional **n8n** enlazado con la base de datos y la API oficial, para el envío automático de notificaciones vía WhatsApp cuando los clientes interactúan o la cocina cambia el estado de un pedido.
* **Exención de Frontend:** *Nota oficial de la sección 5:* Este equipo **NO programa Frontend (pantallas HTML/CSS/JS)**, lo que permite concentrar el 100% de la carga de trabajo en la estabilidad de los servidores, DevOps y flujos de automatización de eventos.

---

## 2. ✅ Auditoría del Código: Lo que YA está Listo en el Repositorio

A partir de una revisión profunda del repositorio actual, se evidencia un trabajo arquitectónico avanzado y maduro por parte de backend e infraestructura. Estos son los puntos ya cubiertos:

### 2.1 Orquesta de Contenedores (`docker-compose.yml`)
El archivo de configuración principal ya declara e intercomunica eficazmente los 4 servicios vitales en una red puente interna (`restaurant_network`):
1. `postgres`: Base de datos PostgreSQL (v16 sobre Alpine), con volúmenes para persistencia en `postgres_data` y montaje automático para la carga ordenada de scripts DDL ubicados en `/sql`.
2. `api`: Contenedor del backend, configurado para recibir variables de entorno claves como el `POSTGRES_URL`, puertos, claves secretas y la ruta de enlace con n8n (`N8N_WEBHOOK_URL`).
3. `nginx`: Proxy Inverso Nginx de alto rendimiento mapeado al puerto oficial `80`, sirviendo como única puerta de entrada hacia la API web.
4. `n8n`: Contenedor oficial de automatización (`docker.n8n.io/n8n/n8n`) escuchando de forma interna y vinculada en el puerto `5678`.

### 2.2 Seguridad del Servidor (Regla Obligatoria #4 del PDF)
* **Regla del proyecto:** *"Nunca expongan el puerto de la base de datos (ej. 3306 o 5432) de forma pública en Internet. La conexión debe ser interna a través de Docker."*
* **Estado en el Código:** 🟢 **100% Cumplido**. En la definición de `postgres` dentro de `docker-compose.yml`, se ha prescindido deliberadamente del mapeo de puertos hacia el host exterior (`ports: - "5432:5432"` no existe). Por ende, es imposible acceder al puerto 5432 desde fuera del clúster Docker; solo la API puede conectarse localmente de manera segura.

### 2.3 Servicio Asíncrono del Webhook (`n8n.service.js`)
* El repositorio incluye una implementación sólida del cliente emisor en `src/services/n8n.service.js`, enlazada de forma nativa a `src/models/ordenes.model.js`.
* **Manejo Seguro (Fire-and-Forget):** Cuando el Equipo 1 (Cocina) cambia el estatus del pedido, el método `N8nService.notificarCambioEstatus()` se invoca de forma asíncrona dentro de un bloque `setTimeout(..., 0)` no bloqueante. Esto garantiza que si n8n se encuentra en mantenimiento, apagado, o si falla la API de WhatsApp, la excepción es capturada y logueada sin colgar la petición HTTP de la cocina ni forzar un innecesario `ROLLBACK` en la transacción de la base de datos.
* **Payload Estandarizado:** El backend ya genera el paquete JSON estructurado completo que será recibido en n8n:
  ```json
  {
    "event": "ORDER_STATUS_UPDATED",
    "timestamp": "2026-08-05T22:00:00.000Z",
    "order_id": 1,
    "num_ticket": 105,
    "new_status": "preparando",
    "customer": {
      "name": "Cliente Valioso",
      "phone": "+584120000000"
    },
    "message": "Hola Cliente Valioso, tu pedido #105 cambió de estatus a: PREPARANDO. ¡Gracias por tu preferencia!"
  }
  ```

---

## 3. 🚨 Hoja de Ruta y Tareas Pendientes para el Equipo 4

A continuación se presenta el listado detallado de tareas que el Equipo 4 debe completar para concretar las entregas evaluadas por Sprint:

### 3.1 Infraestructura VPS en la Nube (Sprint 1) - ¡Misión Crítica!
* [ ] **Alquilar y Configurar VPS (Contabo):**
  * Asegurarse de tener aprovisionada una instancia VPS en la nube con un SO compatible (ej. Ubuntu Server 22.04 LTS).
* [ ] **Preparación del Entorno en la VPS:**
  * Instalar Git, Docker Engine y Docker Compose en la consola del servidor remoto:
    ```bash
    sudo apt update && sudo apt install git docker.io docker-compose-v2 -y
    ```
  * Clonar el repositorio oficial de GitHub del grupo de trabajo y arrancar el servidor en segundo plano:
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd restaurant-bd-tbd
    sudo docker compose up -d --build
    ```
* [ ] **Firewall y Proxy:** Validar que el firewall en el VPS (por ejemplo, `ufw`) mantenga bloqueados los accesos externos, permitiendo únicamente HTTP (80), HTTPS (443) y SSH (22).

---

### 3.2 Construcción y Respaldo del Workflow de n8n (Sprint 2 y 3)
Aunque el código de Node.js ya hace el envío `POST` al servicio computacional de n8n, **en este repositorio aún falta construir y almacenar la lógica que procesa ese webhook dentro de la propia aplicación n8n**.

* [ ] **Diseñar el Workflow Visual de n8n:**
  1. Ingresar a la consola gráfica de n8n al levantar Docker (ej. localmente en `http://localhost:5678`).
  2. Crear un nuevo flujo de trabajo (Workflow) agregando los siguientes nodos:
     * **Nodo 1: Webhook (Trigger)**
       * Método HTTP: `POST`
       * Ruta (Path): `/webhook/orden-estatus`
       * Respuesta HTTP: `200 OK` (Inmediata, para confirmar al backend su recepción).
     * **Nodo 2: Verificación (If / Filter)**
       * Condición: Comprobar que `{{ $json.body.customer.phone }}` no esté vacío.
     * **Nodo 3: Nodo de Integración de WhatsApp**
       * Conectar un proveedor para el envío de mensajes de WhatsApp (ej. *Evolution API*, *Twilio*, *Meta WhatsApp Cloud API*, *WAPi* o servicio análogo).
       * Mapeo del Destinatario: `{{ $json.body.customer.phone }}`
       * Mapeo del Mensaje de Texto: `{{ $json.body.message }}`
* [ ] **Exportación del Respaldo (Buenas Prácticas Git):**
  * Para mantener la trazabilidad de la contribución del Equipo 4 en el control de versiones, ir a **Menú > Export Workflow** dentro de n8n y guardar el archivo JSON exportado en el repositorio (por ejemplo, creando una carpeta `n8n/workflows/orden_estatus_whatsapp.json`) antes de subir cambios por Pull Request a la rama de DevOps.

---

### 3.3 Verificación y Simulación del Enlace (Sprint 2 y 3)
El Sprint 2 pide testear los flujos de mensajería sin tener que depender de las pantallas que programarán el resto de equipos.

* [ ] **Pruebas de Simulación de Webhooks:**
  * Realizar peticiones de prueba tipo `PATCH` dirigidas al endpoint del backend (ej. `/api/ordenes/:id/status`), cambiando el cuerpo JSON del estatus entre `"preparando"`, `"listo"` y `"entregado"`.
  * Verificar los registros de consola del contenedor backend mediante:
    ```bash
    docker logs -f restaurant_api
    ```
  * Confirmar que el registro imprima la salida exitosa:
    `[n8n Service] Webhook entregado con éxito a n8n (Status: 200)`.
  * Comprobar dentro del historial de ejecuciones (*Executions*) en n8n que el mensaje se procesa sin errores y que llega exitosamente al número de WhatsApp de prueba.

---

### 3.4 Estabilidad y Preparación para la Defensa Final (6/7 de Agosto)
* [ ] **Monitoreo de Carga Simpática y Optimización:**
  * Garantizar que la VPS de Contabo resista la conexión simultánea del panel del cocinero (Equipo 1), el carrito del cliente (Equipo 2) y la gestión de inventarios y triggers (Equipo 3).
  * Confirmar que las directivas `restart: unless-stopped` configuradas en el `docker-compose.yml` funcionen como red de seguridad ante caídas abruptas de procesos del sistema o desconexiones momentáneas del web service.
  * Tener preparada en la consola del servidor durante la defensa presencial/online una ventana de monitoreo en tiempo real:
    ```bash
    docker stats
    ```

---

## 4. 📋 Resumen Rápido de Tareas (To-Do List)

- [ ] Validar operatividad y despliegue inicial en **VPS de Contabo**.
- [ ] Construir en la consola visual de **n8n** (puerto `5678`) el nodo Webhook y la vinculación con el servicio del API de WhatsApp.
- [ ] Exportar el archivo `.json` de n8n y guardarlo dentro del repositorio Git para evidencia del equipo.
- [ ] Ejecutar simulación del cambio de estatus vía peticiones HTTP para comprobar la entrega automática del mensaje por WhatsApp.
- [ ] Monitorear en la VPS durante las pruebas integrales el consumo y la estabilidad de los contenedores Docker.
