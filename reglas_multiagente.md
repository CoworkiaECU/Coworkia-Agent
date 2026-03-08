# Reglas Multiagente — Coworkia Aurora
> Referencia rápida del ecosistema. Se lee antes de cualquier intervención.  
> Última actualización: **08 Mar 2026**

---

## 0. Filosofía de trabajo

- **Lupa antes que escalpelo.** Leer antes de tocar.
- **Un fix a la vez.** Presentar plan → esperar "verde nena" → ejecutar → verificar errores.
- **Sin tecnicismos en el plan.** Lenguaje humano. Código solo tras aprobación.
- **No toques lo que funciona.** Nada de refactorizar "de paso".
- **"verde nena" = gas.** Sin esa frase, solo analizar y proponer.

---

## 1. Mapa del ecosistema

| Agente    | Empresa            | Especialidad                              | Tipo     |
|-----------|--------------------|--------------------------------------------|----------|
| AURORA    | Coworkia           | Hub central, reservas y coordinación       | Coworking|
| ALUNA     | Coworkia           | Membresías y planes mensuales              | Coworking|
| GABI      | GR Consulting      | Legal, finanzas, RRHH y compliance         | Externo  |
| ENZO      | MarketingLab       | Marketing, publicidad e IA para negocios   | Externo  |
| PAULA     | PropElite          | Bienes raíces Ecuador y Rep. Dominicana    | Externo  |
| AXEL      | PaintBull          | Reparación vehicular y cotizaciones        | Externo  |
| ANGELA    | MedBeneficios      | Salud y bienestar                          | Externo  |
| ADRIANA   | SegPopular         | Seguros y coberturas                       | Externo  |

**Regla de oro:** AURORA y ALUNA son agentes de coworking — reciben contexto de reservas y formularios. El resto son externos — no deben recibir ese contexto, es ruido para ellos.

---

## 2. Grupos de agentes (cómo el orquestador los trata)

```
isCoworkingAgent = ['AURORA', 'ALUNA']
isExternalAgent  = ['GABI', 'ENZO', 'PAULA', 'AXEL', 'ANGELA', 'ADRIANA']
```

**Consecuencias de cada grupo:**
- **Coworking:** recibe formulario de reservas, contexto de membresías, historial completo (hasta 15 mensajes).
- **Externo:** recibe historial reducido (hasta 8 mensajes), sin formulario de reservas, sin ruido de coworking.

---

## 3. Cómo se activan los agentes

| Mecanismo         | Quién lo usa                  | Comportamiento               |
|-------------------|-------------------------------|-------------------------------|
| `@mención`        | Todos                         | Handoff inmediato y prioritario |
| Keywords automáticas | AURORA → ALUNA, AURORA → PAULA | Handoff automático sin menciones |
| Sticky (mantener) | Todos los especializados      | Una vez activo, no cambia hasta nueva `@mención` |

---

## 4. Flujo de handoff estándar

1. Usuario escribe `@agente` (con o sin pregunta).
2. `detectar-intencion.js` detecta la mención → flag `agentHandoff`.
3. `wassenger.js` evalúa:
   - **Con consulta** (`@enzo quiero marketing`): handoff silencioso → LLM responde directo.
   - **Solo mención** (`@enzo`): `executeHandoff()` envía saludo personalizado → espera.
4. `activeAgent` se actualiza en el perfil.

**Timing correcto del handoff** (corregido 08 Mar 2026):
```
Aurora dice adiós → esperar 7s → nuevo agente entra
```
*(Antes el adiós llegaba después del delay — bug corregido en `handoff-manager.js`)*

---

## 5. Historial y filtros de mensajes

- **Todos los agentes:** máximo 15 mensajes (unificado).
- **@menciones puras** (`@aurora` sin texto): se eliminan del historial — son ruido de navegación.
- **@menciones con contenido** (`@enzo quiero marketing`): **NO se eliminan** — son el trigger más importante.
- **ALUNA activa + keywords Aurora** (`hot desk`, `reserva`, `sala`...): se limpia el form de membresía y cae al orquestador para el handoff natural ALUNA→AURORA.

---

## 6. handoffContext — la memoria del porqué

- Se crea solo cuando hay cambio de agente.
- Se persiste en `perfil.lastHandoffContext` para que el agente lo reciba en TODOS sus mensajes siguientes (no solo el primero).
- Se inyecta como `🧠 MEMORIA DE SESIÓN` (no "TRANSFERENCIA" — suena a robot barato).
- Se borra cuando el usuario cambia a otro agente.

---

## 7. Log de trabajo (sesiones anteriores)

### 08 Mar 2026

| Item | Descripción | Archivos | Estado |
|------|-------------|----------|--------|
| A1 | ALUNA: recordatorio renovación membresía (día 25 + día 30) | `alunaRepository.js`, `follow-up-service.js`, `cron-scheduler.js`, `postgres-adapter.js` | ✅ |
| A2 | AURORA: sugerencia re-reserva (día anterior, cron 5pm) | `reservationRepository.js`, `follow-up-service.js`, `cron-scheduler.js`, `postgres-adapter.js` | ✅ |
| F2 | `handoffContext` se pierde tras 1er mensaje | `orquestador.js` | ✅ |
| F3 | Filtro `@` borraba el mensaje de activación | `orquestador.js` | ✅ |
| F5 | Saludo genérico con `@mención` pura como contexto | `handoff-messages.js` | ✅ |
| F6 | Historial externo 3 mensajes → 15 unificado | `orquestador.js` | ✅ |
| B1 | Aurora despedida llegaba DESPUÉS del delay de 7s | `handoff-manager.js` | ✅ |
| B2 | Form de ALUNA bloqueaba switch automático a AURORA | `wassenger.js` | ✅ |
| KW | ALUNA→AURORA automático por keywords (bidireccional) | `detectar-intencion.js` | ✅ |
| EZ | ENZO system prompt: metodología de brief creativo, 9 ejes, máx 7 preguntas | `enzo.js` | ✅ |
| ML | ENZO emails: logo PNG real de MarketingLab en cotizaciones del jefe | `enzo-cotizacion-email.js` | ✅ |

### Antes del 08 Mar 2026

| Item | Descripción | Estado |
|------|-------------|--------|
| F1 | GABI estaba en grupo coworking (recibía ruido de reservas) | ✅ |
| F4 | PAULA sin keywords automáticas — descartado (se mantiene `@mención`) | ❌ Descartado |



**Nuevas funciones a agregar:**
- `alunaRepository.js` → `findMembersForRenewalReminder1()`, `findMembersForRenewalReminder2()`, `markRenewalReminder1Sent(phone)`, `markRenewalReminder2Sent(phone)`
- `follow-up-service.js` → `processMembershipRenewalReminders()` — consulta ambas rondas, envía, registra en `interactions`

**Cron:** Diario a las 9:00am Ecuador (horario de oficina, tranquilo).

---

#### A2 — AURORA: sugerencia de re-reserva Hot Desk / Sala

**Lógica de negocio:**
- Buscar reservas `status = 'confirmed'` y `payment_status = 'paid'` que se realizaron exactamente hace 7 días (mismo día de semana).
- Enviar el aviso el día anterior a ese aniversario semanal, a las **5pm Ecuador** — para que el usuario pueda responder con tiempo y no se lo pierdas si la sesión es a primera hora del día siguiente.
- Ejemplo: reserva el miércoles → aviso el martes a las 5pm.
- Si el usuario ya tiene una reserva confirmada esa misma semana → no se envía.
- Si ya se envió el recordatorio para esa reserva específica → no se vuelve a enviar (control por `rebook_reminder_sent_at`).

**Mensaje de referencia:**
> "Hola [Nombre] 👋 La semana pasada reservaste el *[Hot Desk / Sala]* el [día]. ¿Lo agendamos para esta semana también? Solo dime y lo dejamos listo 😊"

**Cambios de base de datos:**
- Agregar 1 columna nueva a `reservations` (migración idempotente en `postgres-adapter.js`):
  - `rebook_reminder_sent_at TIMESTAMP`

**Nuevas funciones a agregar:**
- `reservationRepository.js` → `findReservationsForRebookReminder()` — retorna reservas de hace 7 días sin recordatorio enviado aún y sin reserva activa esa semana
- `follow-up-service.js` → `processAuroraRebookReminders()` — consulta, envía, registra en `interactions`, marca `rebook_reminder_sent_at`

**Cron:** Diario a las **17:00 Ecuador** (5pm), separado del cron de ALUNA.

---

## 8. Protocolo de intervención quirúrgica

Antes de tocar cualquier archivo crítico:

1. **Leer el archivo completo** — nunca editar sin contexto total.
2. **Identificar todas las referencias** al código que se va a cambiar (grep antes de operar).
3. **Describir el cambio en humano** — si no se puede explicar sin código, no está listo.
4. **Recibir "verde nena"** — solo entonces se ejecuta.
5. **Verificar errores** tras cada cambio (`get_errors`).
6. **Actualizar esta tabla** cuando un pendiente se resuelva.

---

## 9. Archivos críticos — tocar con máxima precaución

| Archivo                                          | Rol en el sistema                                      |
|--------------------------------------------------|--------------------------------------------------------|
| `src/deteccion-intenciones/orquestador.js`       | Cerebro: decide agente, construye contexto, rutas LLM  |
| `src/express-servidor/endpoints-api/wassenger.js`| Sistema nervioso: recibe WhatsApp, ejecuta handoffs    |
| `src/deteccion-intenciones/detectar-intencion.js`| Detector de intenciones y routing de agentes           |
| `src/servicios/handoff-manager.js`               | Ejecuta la experiencia UX de transición entre agentes  |
| `src/deteccion-intenciones/handoff-messages.js`  | Mensajes de bienvenida/despedida centralizados         |
| `src/deteccion-intenciones/agent-keywords.js`    | Keywords y triggers de todos los agentes               |

---

*Última actualización: 08 Mar 2026 — Especificaciones detalladas de los 6 fixes + automatizaciones A1 y A2.*
