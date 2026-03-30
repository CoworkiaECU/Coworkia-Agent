# Plan de Vuelo: Aurora — Dashboard & Payment Wiring v2

**Fecha**: 28 Mar 2026  
**Objetivo**: Corregir 6 issues del dashboard Aurora detectados por Diego  
**Prioridad**: HIGH  
**Status**: ✅ TODOS LOS BLOQUES COMPLETOS — Deployado v1170  
**Chat asignado**: Chat derecho (Aurora)

---

## 📊 ISSUES DETECTADOS

### ISSUE 1: Monto a cobrar no visible
- **Problema**: No se muestra el valor que el sistema debe cobrar al cliente
- **Ubicación**: Columna MONTO en tabla de reservas
- **Fix**: Mostrar `total_price` calculado por el sistema claramente. Si `was_free=true` → "🎁 Gratis". Si `total_price > 0` → mostrar `$X.XX`

### ISSUE 2: Flujo de pago completo roto
- **Problema**: Entrar $10 en el input no genera ninguna acción visible
- **Flujo esperado**:
  a) Sistema muestra monto a cobrar
  b) Admin ingresa monto recibido en input
  c) Admin aprieta check (gris → verde)
  d) Estado cambia "Por cobrar" → "Pagado"
  e) Gabi envía recibo de pago con datos del cliente
  f) Acciones automáticas: recordatorio 10min antes + confirmación asistencia
- **API**: `PATCH /api/aurora/reservations/{id}/register-payment` existe pero hay que verificar el wiring completo

### ISSUE 3: Tooltip recortado por capas
- **Problema**: Burbuja de info se recorta, está detrás de alguna capa CSS
- **Causa**: Falta CSS `[data-tip]::after` en dark version + `overflow:hidden` en `.wrap`
- **Fix**: Agregar tooltip CSS + quitar/ajustar overflow en contenedores padre

### ISSUE 4: Tab "Completadas" vacío y confuso
- **Problema**: Tab muestra 0 y no se entiende qué agrupa
- **Causa**: Filtra por `status='completed'` pero ninguna reserva se marca así
- **Fix**: Definir claramente cuándo una reserva es "completada" (pagada + asistió + fecha pasada) y aplicar esa lógica

### ISSUE 5: Agendar reserva manual desde dashboard
- **Problema**: No existe forma de crear reserva desde el dashboard
- **Fix**: Agregar botón "➕ Nueva Reserva" sutil (estilo boss command) con modal:
  - Cliente (nombre + teléfono)
  - Servicio (Hot Desk / Sala Reuniones)
  - Fecha + hora inicio/fin
  - Notas (opcional)
  - Tipo pago (efectivo/transferencia/gratis)

### ISSUE 6: Ingresos no suman pagos en efectivo
- **Problema**: Clientes con "Asistió" + "Efectivo" no suman en INGRESOS TOTAL
- **Causa**: Query suma `total_price` pero si el admin no ingresó el monto, `total_price=0`
- **Fix**: Revenue query debe sumar solo reservas donde `payment_status='paid' AND total_price > 0`

---

## 🎯 BLOQUES DE TRABAJO

### BLOQUE A: Payment Flow Completo (2h)

**Tareas:**
- [x] **A1** — Fix columna MONTO: input para TODOS los no pagados, badge verde ✅ para pagados
- [x] **A2** — Fix check button: gris por defecto → hover verde → PATCH API (unificado con A1)
- [x] **A3** — Estado actualiza: badge verde ✅ $X.XX en tiempo real tras pago (unificado con A1)
- [x] **A4** — Gabi ya envía recibo WA + email post-pago (ya existía en register-payment)
- [x] **A5** — Fix revenue query: `WHERE payment_status='paid' AND total_price > 0`

### BLOQUE B: Tooltip + Completadas + UX (1.5h)

**Tareas:**
- [x] **B1** — CSS `[data-tip]::after` con z-index:9999 + box-shadow
- [x] **B2** — `.table-wrap` overflow-y:visible + position:relative
- [x] **B3** — Completadas: `date < TODAY AND (paid OR attended)` + Follow-ups D+7 usa misma lógica
- [x] **B4** — Headers de tabla corregidos: 10 columnas (ID, Cliente, Servicio, Fecha, Horario, Monto, Asistió, Pago, Creada, Acciones)

### BLOQUE C: Reserva Manual Boss Command (1.5h)

**Tareas:**
- [x] **C1** — Endpoint `POST /api/aurora/reservations/manual` con upsert usuario + validación
- [x] **C2** — Modal dark theme: nombre, tel, servicio, fecha, hora inicio/fin, monto, tipo pago, notas
- [x] **C3** — Botón "➕ Nueva Reserva" en Quick Actions bar

### BLOQUE D: Automatizaciones Pago (1h)

**Tareas:**
- [x] **D1** — Recordatorio 10 min antes: cron WA cada 5min 7-20h con datos de acceso (WiFi, parking)
- [x] **D2** — WA post-pago incluye datos de acceso (WiFi, dirección, estacionamiento)
- [x] **D3** — node --check 5 archivos + deploy v1170 + migración 004 aplicada

### BLOQUE E: Auto-respuesta a emails de confirmación (2h) 🆕

> **Contexto**: Cuando Aurora envía email de confirmación de reserva, el cliente puede responder
> a ese email con dudas, cambios, o confirmación. Actualmente nadie lee esas respuestas.
> Necesitamos que Aurora lea SOLO los replies a emails del sistema y responda automáticamente.

**Restricción crítica — Aislamiento multi-agente:**
- Todos los agentes (Aurora, Aluna, Adriana, etc.) usan el **mismo correo Gmail**
- Cada agente usa **diferente membrete/template** en sus emails
- La lógica DEBE identificar a qué agente pertenece cada email original
- Aurora SOLO debe leer y responder replies a emails que **ella misma envió**
- Nunca cruzar respuestas entre agentes (ej: no responder un reply de Aluna como Aurora)

**Diseño propuesto:**
- Leer inbox con IMAP (o Gmail API) filtrando por `In-Reply-To` / `References` headers
- Matchear el `Message-ID` del email original con registros en `email_log` o tabla equivalente
- Cada email enviado debe registrar: `{ message_id, agent, reservation_id, user_phone, sent_at }`
- Al detectar reply → verificar que `agent === 'aurora'` → procesar
- Respuesta automática con GPT: contexto de la reserva + datos del cliente
- NO responder emails que no sean replies al sistema (spam, newsletters, etc.)

**Tareas:**
- [x] **E1** — Migración 004: tabla `email_sent_log` + columna `reminder_10min_sent_at` en reservations
- [x] **E2** — `sendEmail()` registra cada email enviado en `email_sent_log` (agent, message_id, to_email, subject)
- [x] **E3** — YA EXISTÍA: `email-reply-reader.js` lee inbox IMAP, filtra replies por `In-Reply-To`
- [x] **E4** — YA EXISTÍA: aislamiento con `extractAgentFromMessageId()` + 3 capas de filtro
- [x] **E5** — `autoReplyAuroraEmails()`: GPT con contexto de reserva, solo agent=aurora, max 5/batch
- [x] **E6** — YA EXISTÍA: cron cada 10min polling IMAP, ahora incluye auto-reply Aurora
- [x] **E7** — Deploy v1170 exitoso, migración 004 aplicada, app booteó limpio

---

## ⏱️ ESTIMACIÓN TOTAL: ~8h (5 bloques)

## 📝 NOTAS
- Archivos principales: `aurora-reservas.html` (PRODUCCIÓN), `aurora-dashboard.js`, `aurora-dashboard.js` (API)
- **aurora-reservas-dark.html** es la versión dark alternativa — NO es producción
- No crear archivos markdown de documentación — solo código
- Commitear por bloque con mensaje descriptivo
- **Bloque E**: requiere credenciales IMAP Gmail (app password) en env vars
