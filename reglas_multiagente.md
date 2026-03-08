# Reglas Multiagente — Coworkia Aurora
> Estándar de cirugía para intervenciones críticas en el ecosistema multi-agente.
> Cada vez que la cosa se pone importante, empezamos aquí.

---

## 0. Filosofía de trabajo

- **Lupa antes que escalpelo.** Leer y entender el código antes de tocar una sola línea.
- **Un problema a la vez.** Cada fix se presenta, se aprueba, y solo entonces se ejecuta.
- **Explicar sin tecnicismos.** El plan se describe en lenguaje humano. El código llega después del "verde nena".
- **No dañes lo que funciona.** Si algo ya opera bien, no lo refactorices "de paso".
- **La señal de gas es "verde nena".** Sin esa frase, el agente solo analiza, propone y espera.

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
2. `detectar-intencion.js` detecta la mención y activa el flag `agentHandoff`.
3. `wassenger.js` evalúa si hay consulta tras la mención.
   - **Con consulta** (ej: `@enzo quiero marketing`): handoff silencioso → respuesta directa del LLM con contexto.
   - **Sin consulta** (ej: `@enzo` solo): `executeHandoff()` envía saludo de bienvenida personalizado y espera.
4. Se actualiza `activeAgent` en el perfil del usuario.

---

## 5. Reglas de filtrado de historial

El historial se filtra antes de enviarse al agente. Las reglas actuales:

- **Agentes externos:** máximo 8 mensajes, se eliminan mensajes con datos de pago/reservas/fechas.
- **@menciones puras** (ej: `@aurora`): se eliminan del historial (son ruido de navegación).
- **@menciones con contenido** (ej: `@enzo quiero marketing`): NO se eliminan (son el trigger más importante de la sesión).
- **El mensaje que activó el handoff** NUNCA debe ser filtrado.

---

## 6. HandoffContext — la memoria del porqué

El `handoffContext` explica por qué el agente fue activado: quién mandó, qué dijo el usuario, cuándo. Esta información:

- Se crea SOLO cuando hay un cambio de agente en el mensaje actual.
- Se debe persistir en el perfil como `lastHandoffContext` para que el agente la reciba en TODOS sus mensajes, no solo el primero.
- Se borra cuando el usuario cambia de agente de nuevo.

---

## 7. Pendientes conocidos (estado al 08 Mar 2026)

### 🔧 Fixes estructurales del multiagente

| # | Problema                                     | Archivos afectados                            | Estado       |
|---|----------------------------------------------|-----------------------------------------------|--------------|
| 1 | GABI en grupo coworking (recibe ruido)       | `orquestador.js`                              | ✅ Resuelto  |
| 2 | handoffContext se pierde tras 1er mensaje    | `orquestador.js`                              | ✅ Resuelto  |
| 3 | Filtro `@` borra el mensaje de activación   | `orquestador.js`                              | ✅ Resuelto  |
| 4 | PAULA sin keywords automáticas              | `detectar-intencion.js`                       | 📋 Pendiente |
| 5 | Saludo genérico cuando no hay contexto real | `handoff-messages.js`                         | ✅ Resuelto  |
| 6 | Historial asimétrico (externo 3 vs 15)      | `orquestador.js`                              | ✅ Resuelto  |

---

#### Fix 2 — handoffContext se pierde tras el 1er mensaje

**Problema:** `handoffContext` se construye solo cuando hay un cambio de agente en el mensaje actual. En los mensajes siguientes (mismo agente activo) no se regenera, entonces el LLM ya no sabe por qué fue activado.

**Solución:** Guardar el contexto como `lastHandoffContext` en el perfil del usuario (tabla `users` o en memoria de sesión ya existente) cuando el agente cambia. En los mensajes siguientes, si no hay un handoff nuevo, inyectar `lastHandoffContext` como sustituto. Limpiar cuando el usuario haga `@otro-agente`.

**Archivos a tocar:**
- `src/deteccion-intenciones/orquestador.js` — donde se construye `handoffContext`, agregar save + retrieve de `lastHandoffContext`

**Criterio de éxito:** Si el usuario dice `@enzo quiero marketing` y luego escribe `cuánto cuesta`, ENZO en el 2do mensaje sigue sabiendo que el usuario quiere marketing.

---

#### Fix 3 — Filtro `@` elimina el mensaje que activó el handoff

**Problema:** El filtro de historial en `orquestador.js` (~línea 721-730) elimina cualquier mensaje que contenga `@`. Esto incluye el propio mensaje de activación del handoff (ej: `@enzo quiero marketing`), que es el más importante.

**Solución:** Cambiar la condición del filtro para que solo elimine mensajes que sean una `@mención pura` — es decir, cuyo contenido sea solo `@nombre` sin nada más después. Los mensajes con contenido real tras el `@` deben sobrevivir.

**Archivos a tocar:**
- `src/deteccion-intenciones/orquestador.js` — condición del filtro de historial

**Criterio de éxito:** `@enzo` sin nada más → se filtra. `@enzo quiero rediseñar mi marca` → NO se filtra, llega al LLM.

---

#### Fix 4 — PAULA sin keywords automáticas

**Problema:** `ALUNA` tiene keywords definidas en `agent-keywords.js` que disparan un handoff automático cuando el usuario menciona bienes raíces en AURORA. PAULA también es del sector inmobiliario pero no tiene ese mecanismo.

**Solución:** En `detectar-intencion.js`, en la misma sección donde se revisan keywords de ALUNA para auto-routing, agregar revisión de `PAULA_PROPERTY_KEYWORDS`. Si el usuario activo está en AURORA y escribe sobre propiedades/arriendos, enrutar automáticamente a PAULA.

**Archivos a tocar:**
- `src/deteccion-intenciones/detectar-intencion.js` — agregar bloque de auto-routing PAULA, igual al de ALUNA

**Criterio de éxito:** Usuario dice "quiero arrendar una oficina en Quito" estando en AURORA → se va automáticamente a PAULA.

---

#### Fix 5 — Saludo genérico cuando el contexto real es una @mención pura

**Problema:** Cuando el usuario escribe solo `@enzo` (sin consulta), el `handoffUserContext` que le llega al mensaje de bienvenida es literalmente el texto `"@enzo"`. Ese texto aparece en el saludo como si fuera el tema de la consulta, generando un mensaje ridículo.

**Solución:** Antes de construir el mensaje de bienvenida, verificar si `handoffUserContext` es solo una `@mención` sin contenido real. Si es así, usar un contexto vacío o genérico ("para continuar con tu consulta") en lugar de la mención literal.

**Archivos a tocar:**
- `src/servicios/handoff-manager.js` o `src/deteccion-intenciones/handoff-messages.js` — donde se construye el mensaje de bienvenida con el contexto

**Criterio de éxito:** `@enzo` → saludo normal sin mencionar `@enzo` como el "tema". `@enzo quiero marketing` → saludo que menciona "marketing" correctamente.

---

#### Fix 6 — Historial externo: cambiar 3 → 8 mensajes

**Problema:** Los agentes externos (`isExternalAgent`) reciben solo 3 mensajes de historial. Es demasiado poco — el agente pierde el hilo de conversación rápidamente.

**Solución:** Cambiar el límite de `3` a `8` en una sola línea.

**Archivo a tocar:**
- `src/deteccion-intenciones/orquestador.js` — `const historyLimit = 15` (unificado, todos los agentes igual)

**Criterio de éxito:** Un agente externo como GABI puede leer los últimos 8 intercambios y mantener contexto real de la conversación.

---

### 🤖 Automatizaciones nuevas

| # | Descripción                                        | Archivos afectados                                               | Estado       |
|---|-----------------------------------------------------|------------------------------------------------------------------|--------------|
| A1| ALUNA: recordatorio renovación membresía 30 días   | `postgres-adapter.js`, `alunaRepository.js`, `follow-up-service.js`, `cron-scheduler.js` | ✅ Resuelto  |
| A2| AURORA: sugerencia re-reserva (día anterior, 5pm)  | `postgres-adapter.js`, `reservationRepository.js`, `follow-up-service.js`, `cron-scheduler.js` | ✅ Resuelto  |

---

#### A1 — ALUNA: recordatorio de renovación de membresías

**Lógica de negocio:**
- Ciclo = 30 días desde el último pago registrado en `membership_payments` (campo `transaction_date`)
- **Recordatorio 1:** día 25 del ciclo (quedan 5 días). Tono suave, amigable, sin datos bancarios.
- **Recordatorio 2:** día 30 del ciclo (día de vencimiento). Urgencia amable, tampoco da datos bancarios a menos que el usuario los pida explícitamente en chat.
- Si ya se envió el recordatorio de ese ciclo específico → no se vuelve a enviar.
- Solo aplica a membresías con `status = 'accepted'` (miembros activos).

**Mensajes de referencia:**

*Recordatorio 1 (5 días antes):*
> "Hola [Nombre] 🌙 Tu *[Plan]* vence en 5 días. Cuando quieras renovar, me avisas y te ayudo con todo 😊"

*Recordatorio 2 (vencimiento):*
> "Hola [Nombre] 🌟 Hoy se cumple el mes de tu *[Plan]*. ¿Todo listo para renovar? Cuando digas, estoy aquí ✨"

**Cambios de base de datos:**
- Agregar 2 columnas nuevas a `membership_leads` (migraciones idempotentes en `postgres-adapter.js`):
  - `renewal_reminder_1_sent_at TIMESTAMP` — día del envío del 1er recordatorio del ciclo activo
  - `renewal_reminder_2_sent_at TIMESTAMP` — día del envío del 2do recordatorio del ciclo activo
- Ambas columnas se resetean a NULL cuando se aprueba un nuevo pago (inicio de ciclo nuevo)

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
