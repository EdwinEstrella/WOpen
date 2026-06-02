# 🤖 Agente WhatsApp Local Multimodal con DeepSeek

Este es un agente de WhatsApp local de nivel empresarial estructurado bajo **Clean/Hexagonal Architecture** y **Spec-Driven Development (SDD)**. Utiliza la librería `@whiskeysockets/baileys` para conectarse a un número real escaneando un código QR y delega el procesamiento inteligente a la API oficial de **DeepSeek Chat**.

---

## 🛠️ Stack Tecnológico

- **Core**: Next.js 16 (App Router) + TypeScript + React 19 (con Turbopack).
- **Styling**: Tailwind CSS v4 Vanilla (diseño minimalista de alta gama, micro-interacciones responsivas).
- **WhatsApp Web API**: `@whiskeysockets/baileys` v6.7+ (conexión estable a nivel protocolo, sin APIs oficiales costosas).
- **Base de Datos**: PostgreSQL (`pg` node-postgres para persistencia robusta de conversaciones, mensajes y configuración).
- **Caché y Turnos**: Redis (`ioredis` para locks distribuidos, deduplicación de eventos y debouncing).
- **Notificaciones**: API de Telegram (Alertas en tiempo real al dueño del bot).
- **Orquestación**: Docker & Docker Compose.

---

## 💡 Características Principales

1. **Gestión de Turnos y Lock Concurrente**: Redis controla atómicamente que el bot no procese mensajes duplicados ni colisione con intervenciones manuales del operador humano.
2. **Control por Palabras Clave del Dueño (Owner Control)**: Envía desde tu WhatsApp personal palabras clave configuradas como `bot off` (para pasar a modo `HUMAN` y suspender la IA) u `ok.` (para reactivar el modo `AI`).
3. **Reactivación Automática tras Inactividad**: Si un operador humano interviene en una conversación y esta permanece inactiva por más de 3 días, el bot se reactivará automáticamente a modo `AI`.
4. **Respuestas Humanizadas Segmentadas**: La IA responde en partes, aplicando retrasos inteligentes proporcionales a la longitud del texto para simular la escritura de un ser humano.
5. **Detección Automática de Handoff**: DeepSeek analiza la conversación y delega el chat a atención humana si detecta frustración, preguntas fuera del alcance, intenciones de compra o solicitud explícita de un asesor, notificando inmediatamente al dueño por Telegram.
6. **Seguimientos Programados (Follow-Ups)**: Tarea cron periódica inteligente que evalúa usuarios inactivos en modo `AI` tras el último mensaje de la IA, aplicando controles estrictos (evita enviar mensajes free-form fuera de la ventana de 24 horas para cumplir las políticas de WhatsApp).
7. **CRUD de System Prompts**: Dashboard visual para alternar en tiempo real qué prompt del sistema guiará a la IA.

---

## 🚀 Guía de Arranque Rápido con Docker Compose

La forma recomendada de desplegar el proyecto es usando **Docker Compose**, ya que levanta la aplicación Next.js, el proceso bot, la base de datos PostgreSQL y la caché Redis de forma integrada.

### 1. Requisitos Previos

- Tener instalado **Docker** y **Docker Compose**.
- Contar con una cuenta de **DeepSeek** con créditos cargados (las cuentas gratuitas están limitadas por velocidad y darán errores `429 Too Many Requests`).

### 2. Configurar Variables de Entorno

Creá un archivo `.env.local` en la raíz del proyecto basándote en `.env.example`:

```bash
DEEPSEEK_API_KEY=tu-api-key-de-deepseek
DEEPSEEK_MODEL=deepseek-chat
DATABASE_URL=postgresql://user:password@db:5432/whatsapp_bot
REDIS_URL=redis://redis:6379
TELEGRAM_BOT_TOKEN=tu-bot-token-de-telegram # Opcional
TELEGRAM_CHAT_ID=tu-chat-id-de-telegram # Opcional
```

### 3. Levantar la Aplicación

Corré el siguiente comando en tu terminal:

```bash
docker-compose up -d --build
```

Esto descargará las imágenes oficiales, compilará la aplicación Next.js y levantará los servicios. Podrás acceder al dashboard en `http://localhost:3000`.

### Persistencia de WhatsApp en deploy

La sesión de WhatsApp se guarda con Baileys en el directorio configurado por `WHATSAPP_AUTH_DIR` (`/app/auth` en Docker). Ese directorio **debe ser persistente**: si se borra o queda dentro de un contenedor efímero, WhatsApp va a pedir QR otra vez después de cada deploy.

El `docker-compose.yml` usa volúmenes nombrados para conservar credenciales y datos entre rebuilds/recreates:

```yaml
whatsapp_auth:/app/auth
bot_data:/app/data
```

No borres esos volúmenes salvo que quieras desvincular WhatsApp manualmente. El botón de desconexión del dashboard es destructivo por diseño: elimina la sesión y fuerza un nuevo QR.

---

## 💻 Desarrollo Local (Sin Docker)

Si preferís correr la aplicación localmente paso a paso para depuración:

1. **Instalar Dependencias**:
   ```bash
   npm install
   ```
2. **Iniciar base de datos PostgreSQL y Redis** en tu máquina (y actualizar sus URLs en `.env.local`).
3. **Correr en modo desarrollo**:
   ```bash
   npm run dev
   ```
   Esto levantará el dashboard Next.js.
4. **Correr el proceso del bot de WhatsApp**:
   ```bash
   npm run start:bot
   ```
5. **Correr todo junto en modo producción**:
   ```bash
   npm run start:all
   ```

---

## ⚙️ Personalización del System Prompt Inicial

El comportamiento de la inteligencia artificial puede configurarse de dos formas:

1. **A través de la base de datos**: En la pestaña **System Prompts** del dashboard podés crear, editar y activar nuevos perfiles en tiempo real sin reiniciar el bot.
2. **Archivo Físico Fallback**: Si la base de datos no tiene prompts cargados, usará el prompt configurado por defecto en `src/lib/system-prompt.ts`. Podés personalizar esta plantilla modificando directamente dicho archivo.

---

## 🔒 Seguridad Crítica Obligatoria

> [!WARNING]
> **DASHBOARD SIN AUTENTICACIÓN INTEGRADA**
>
> Por diseño y simplicidad del stack, el dashboard no incluye un sistema de Login integrado. Si vas a desplegar esta aplicación a internet (fuera de `localhost`), **ES OBLIGATORIO** colocar una capa de autenticación a nivel de red antes de exponerla.
> 
> Si no lo hacés, cualquiera que encuentre la URL podrá leer el historial completo de tus mensajes de WhatsApp y enviar mensajes haciéndose pasar por vos.
>
> **Soluciones Recomendadas**:
> - Colocar **Basic Auth** a nivel Proxy (Nginx, Caddy o EasyPanel).
> - Configurar **Cloudflare Access** (Zero Trust) delante de tu dominio para restringir el acceso únicamente a correos autorizados.

---

## 🧪 Pruebas Unitarias e Integración

Contamos con una suite de tests robusta y deterministicos escritos sobre el test runner nativo de Node.js. Para correr la suite completa de tests ejecutá:

```bash
npm test
```

Para validar la correcta tipificación de TypeScript en todo el proyecto:

```bash
npx tsc --noEmit
```
