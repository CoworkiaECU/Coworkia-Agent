# Plan de Vuelo: Aurora — Sistema de Automatizaciones Inteligentes

**Objetivo:** Perfeccionar el wiring completo de Aurora con las 7 automatizaciones + mensajes inteligentes + visibilidad en dashboard.

**Tiempo estimado:** 12-15 horas (dividido en bloques ejecutables)  
**Prioridad:** HIGH  
**Status:** 🟢 Ready para autopilot

---

## 📊 ESTADO ACTUAL (26 Mar 2026)

**✅ Funcionando (2/7):**
- Follow-up +1h post-reserva (every 15 min)
- Re-booking D+7 (10:00 AM daily) **⚠️ con bug de query window**

**❌ Faltantes (5/7):**
- D+1 follow-up
- D+3 follow-up (FOMO)
- Recordatorios pre-reserva (1 día antes, 2 horas antes)
- No-show detection + re-engagement
- Upselling Hot Desk → Membresía Aluna
- Confirmación pago automatizada
- Manejo de cancelaciones automático

**🔍 Issues detectados:**
- D+7 query demasiado precisa (`= CURRENT_DATE - 7 días`), pierde reservas de 8+ días
- Números hardcodeados en algunos botones del dash
- Automatizaciones no visibles en dashboard (no hay sección "Automatizaciones")

---

## 🎯 BLOQUES DE TRABAJO

### BLOQUE A: Infraestructura + Fixes (2h)

**Objetivos:**
- Arreglar bug D+7 query window
- Agregar campos BD necesarios para nuevas automatizaciones
- Crear sección "Automatizaciones" en dashboard Aurora
- Verificar y corregir números en todos los botones wa.me/

**Tareas:**

- [ ] **A1** — Migración BD: agregar campos tracking (30 min)
  ```sql
  ALTER TABLE reservations ADD COLUMN IF NOT EXISTS followup_d1_sent_at TIMESTAMP;
  ALTER TABLE reservations ADD COLUMN IF NOT EXISTS followup_d3_sent_at TIMESTAMP;
  ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMP;
  ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reminder_2h_sent_at TIMESTAMP;
  ALTER TABLE reservations ADD COLUMN IF NOT EXISTS payment_reminder_sent_at TIMESTAMP;
  ALTER TABLE reservations ADD COLUMN IF NOT EXISTS no_show_detected_at TIMESTAMP;
  ALTER TABLE reservations ADD COLUMN IF NOT EXISTS upsell_aluna_sent_at TIMESTAMP;
  ```

- [ ] **A2** — Fix bug D+7 query window (15 min)
  ```js
  // Antes: date = CURRENT_DATE - INTERVAL '7 days'
  // Después: date BETWEEN CURRENT_DATE - INTERVAL '9 days' AND CURRENT_DATE - INTERVAL '7 days'
  // Ventana de 3 días para no perder reservas
  ```
  - Archivo: `src/cron/aurora-followup-cron.js` línea ~140

- [ ] **A3** — Crear sección "Automatizaciones" en dashboard (45 min)
  - Archivo: `public/aurora-reservas-dark.html`
  - UI: 7 cards con:
    - Nombre automatización
    - Status (✅ activo / ⚠️ pendiente / 🔴 error)
    - Último envío (timestamp)
    - Total enviados hoy/semana
    - Botón "Ver detalles" (modal con logs recientes)
  - Diseño: grid 2x4 con iconos

- [ ] **A4** — Auditar números en botones WhatsApp (30 min)
  - Buscar `wa.me/` en todos los dashboards: aurora, aluna, adriana, enzo
  - Verificar que usen `process.env.BOT_PHONE` o `593994837117` (sistema)
  - NO debe aparecer `593987770788` (Diego personal) excepto en notificaciones admin
  - Crear lista de archivos modificados

---

### BLOQUE B: Follow-ups Post-Reserva D+1 y D+3 (3h)

**Objetivos:**
- Implementar follow-up D+1 (engagement + satisfacción)
- Implementar follow-up D+3 (FOMO + upselling suave)
- Mensajes inteligentes con variaciones según tipo de reserva

**Tareas:**

- [ ] **B1** — Crear `sendAuroraD1Followup()` en email.js (45 min)
  - Parámetros: `{ userName, serviceType, date, feedbackUrl }`
  - Template: buildEmailTemplate('AURORA', 'D1', data)
  - Subject: "¿Cómo estuvo tu experiencia en Coworkia? 🌟"
  - CTA: Link feedback form + invitación a volver

- [ ] **B2** — Crear template HTML `buildAuroraD1HTML()` en email-template-system.js (45 min)
  - Header verde Coworkia
  - Mensaje personalizado según serviceType:
    - Hot Desk: "Esperamos hayas tenido un día productivo"
    - Sala Reuniones: "¿Tu reunión fue exitosa?"
  - 3 CTAs:
    1. Dejar feedback (Google Form / TypeForm)
    2. Agendar próxima visita
    3. Conocer membresías (upselling suave)
  - Footer: WhatsApp directo al bot

- [ ] **B3** — Crear `sendAuroraD3Followup()` (FOMO) (30 min)
  - Mensaje: "Han pasado 3 días desde tu visita... ¿cuándo vuelves?"
  - Variaciones inteligentes:
    - Si `wasFree=true`: "Tu primera visita gratis caducó, pero tenemos 15% OFF esta semana"
    - Si `serviceType=hotDesk`: "¿Sabías que con Membresía Gold ahorras 40%?"
    - Si `serviceType=meetingRoom`: "Salas disponibles para mañana con 20% OFF"
  - CTA: Agendar ahora (wa.me link directo)

- [ ] **B4** — Agregar cron job D+1 y D+3 (45 min)
  - Archivo: `src/cron/aurora-followup-cron.js`
  - D+1 cron: ejecuta 10:00 AM diario
  - D+3 cron: ejecuta 14:00 PM diario (tarde para FOMO)
  - Query: `status=completed AND followup_d1_sent_at IS NULL AND date = CURRENT_DATE - 1 day`
  - Logs: `[AURORA-D1] ✅ Enviado a {userName} (#reservationId)`
  - Actualizar campos `followup_d1_sent_at`, `followup_d3_sent_at`

- [ ] **B5** — Tests unitarios follow-ups D+1/D+3 (15 min)
  - Mock sendEmail, verificar llamadas correctas
  - Test queries BD
  - Test variaciones inteligentes de mensajes

---

### BLOQUE C: Recordatorios Pre-Reserva (2.5h)

**Objetivos:**
- Recordatorio 24h antes (email + WhatsApp)
- Recordatorio 2h antes (solo WhatsApp, urgente)
- Manejo de cancelaciones desde recordatorio

**Tareas:**

- [ ] **C1** — Crear `sendPreReservationReminder24h()` (45 min)
  - Query: `status=confirmed AND date = CURRENT_DATE + 1 AND reminder_24h_sent_at IS NULL`
  - Email: "Mañana a las {startTime} te esperamos en Coworkia"
  - WhatsApp: Mensaje con:
    - Confirmación de horario
    - Ubicación (Google Maps link)
    - Instrucciones wifi/acceso
    - Botón "¿Necesitas cancelar?" → flujo cancelación
  - Cron: ejecuta 18:00 PM (tarde anterior)

- [ ] **C2** — Crear `sendPreReservationReminder2h()` (30 min)
  - Query: `status=confirmed AND date = CURRENT_DATE AND start_time <= NOW() + INTERVAL '2 hours' AND reminder_2h_sent_at IS NULL`
  - Solo WhatsApp (no email, muy urgente)
  - Mensaje: "🔔 ¡Recordatorio! En 2 horas te esperamos en Coworkia"
  - CTAs:
    - Confirmar asistencia (reply "OK")
    - Cancelar (reply "CANCELAR")
  - Cron: ejecuta cada 30 min desde 8:00 AM a 18:00 PM

- [ ] **C3** — Flujo cancelación desde recordatorio (45 min)
  - Detectar keyword "CANCELAR" / "NO VOY" / "NO PUEDO"
  - Actualizar BD: `status=cancelled`, `cancellation_reason=user_request`
  - Respuesta: "Entendido, tu reserva ha sido cancelada. ¿Quieres reagendar?"
  - Si reply "SÍ": trigger flujo Aurora normal
  - Log: `[AURORA-CANCEL] Usuario {phone} canceló reserva #{id}`

- [ ] **C4** — Dashboard: mostrar cancelaciones recientes (30 min)
  - Sección nueva: "Cancelaciones últimas 7 días"
  - Tabla: nombre, fecha original, razón, reagendó (sí/no)
  - Filtros: por razón de cancelación
  - Insight: "15% de cancelaciones reagendan dentro de 48h"

---

### BLOQUE D: No-Show Detection + Re-engagement (3h)

**Objetivos:**
- Detectar automáticamente no-shows (no llegó a reserva confirmada)
- Re-engagement inteligente (1 día después, 3 días después)
- Analytics de no-show rate

**Tareas:**

- [ ] **D1** — Query detección no-shows (1h)
  ```sql
  -- Reserva confirmada + fecha/hora pasó + sin followup_1h (= no llegó)
  SELECT * FROM reservations
  WHERE status = 'confirmed'
    AND CONCAT(date, ' ', start_time)::timestamp < NOW() - INTERVAL '3 hours'
    AND followup_1h_sent_at IS NULL
    AND no_show_detected_at IS NULL
  ORDER BY date DESC, start_time DESC;
  ```
  - Cron: ejecuta cada 4 horas
  - Marca: `no_show_detected_at = NOW(), status = 'no_show'`
  - Log: `[AURORA-NOSHOW] ⚠️ Detectado no-show: {userName} #{reservationId}`

- [ ] **D2** — Re-engagement D+1 después no-show (45 min)
  - Mensaje WhatsApp: "Hola {userName}, notamos que no pudiste venir ayer. ¿Todo bien? ¿Quieres reagendar?"
  - Tono: empático, no acusatorio
  - CTA: "Reagendar ahora" (link directo a flow Aurora)
  - Variación: si `wasFree=true` → "Tu visita gratis sigue disponible, reagenda cuando quieras"

- [ ] **D3** — Re-engagement D+3 FOMO (30 min)
  - Si no respondió a D+1
  - Mensaje: "Hola {userName}, ¿sigues interesado en Coworkia? Tenemos 20% OFF en tu próxima reserva"
  - CTA: código descuento único `VUELVE20-{reservationId}`
  - Aplicar descuento automáticamente si agenda con ese código

- [ ] **D4** — Analytics no-show en dashboard (45 min)
  - Card: "No-Show Rate: {X}% (últimos 30 días)"
  - Gráfico tendencia semanal
  - Top 3 razones de no-show (si capturamos)
  - Acción sugerida: "Enviar recordatorio 2h antes reduce no-shows 40%"

---

### BLOQUE E: Upselling Hot Desk → Aluna (2.5h)

**Objetivos:**
- Detectar usuarios frecuentes (3+ reservas en 30 días)
- Calcular ahorro potencial con membresía
- Envío automático propuesta Aluna personalizada

**Tareas:**

- [ ] **E1** — Query power users (1h)
  ```sql
  -- Usuarios con 3+ reservas en últimos 30 días, sin membresía
  SELECT user_phone, user_name, COUNT(*) as total_reservas,
         SUM(total_price) as total_gastado
  FROM reservations
  WHERE status IN ('confirmed', 'completed')
    AND date >= CURRENT_DATE - INTERVAL '30 days'
    AND upsell_aluna_sent_at IS NULL
  GROUP BY user_phone, user_name
  HAVING COUNT(*) >= 3
  ORDER BY total_gastado DESC;
  ```
  - Cron: ejecuta lunes 10:00 AM (inicio semana)
  - Identifica top 10 candidatos semanales

- [ ] **E2** — Calcular ahorro con membresía (30 min)
  ```js
  function calculateMembershipSavings(totalSpent, reservationCount) {
    const monthlyEstimate = (totalSpent / 30) * 30; // Proyección mensual
    const alunaGoldCost = 180; // $180/mes Gold
    const potentialSavings = monthlyEstimate - alunaGoldCost;
    
    return {
      currentSpending: monthlyEstimate,
      membershipCost: alunaGoldCost,
      monthlySavings: potentialSavings > 0 ? potentialSavings : 0,
      breakEvenDays: Math.ceil(alunaGoldCost / (totalSpent / reservationCount))
    };
  }
  ```

- [ ] **E3** — Email/WhatsApp propuesta Aluna (45 min)
  - Subject: "¡{userName}, ahorra ${monthlySavings} al mes con Membresía Gold!"
  - Comparativa:
    - Gastos actuales: ${currentSpending}/mes
    - Con Gold: $180/mes (acceso ilimitado)
    - Ahorro: ${monthlySavings}/mes
  - CTAs:
    1. Agendar llamada con Aluna (closer)
    2. Ver planes completos
    3. "No gracias, seguir pagando por visita"
  - Marca: `upsell_aluna_sent_at = NOW()`

- [ ] **E4** — Dashboard: Upselling pipeline (15 min)
  - Sección: "Candidatos Membresía Aluna"
  - Tabla: nombre, visitas/mes, gasto/mes, ahorro potencial, estado
  - Acciones: "Enviar propuesta", "Marcar como no interesado"
  - Filtro: por rango de ahorro ($50+, $100+, $150+)

---

### BLOQUE F: Confirmación Pago Automatizada (2h)

**Objetivos:**
- Recordatorio pago pendiente 24h después reserva
- Verificación automática pago (webhook Payphone)
- Cancelación automática si no paga en 48h

**Tareas:**

- [ ] **F1** — Recordatorio pago pendiente D+1 (45 min)
  - Query: `status=pending_payment AND date >= CURRENT_DATE AND payment_reminder_sent_at IS NULL AND created_at <= NOW() - INTERVAL '24 hours'`
  - Mensaje: "Hola {userName}, tu reserva para {date} está pendiente de pago"
  - Métodos pago:
    1. Transferencia (datos bancarios auto-copiados)
    2. Payphone link (generado dinámicamente)
    3. Efectivo en persona (confirmar con secretaria)
  - CTA: "Ya pagué" (trigger verificación manual)
  - Cron: ejecuta 11:00 AM diario

- [ ] **F2** — Webhook Payphone verificación automática (30 min)
  - Endpoint existente: `/webhooks/payphone`
  - Detectar pago exitoso → actualizar `status=confirmed, payment_verified_at=NOW()`
  - Envío automático email confirmación
  - Actualizar dashboard en tiempo real (WebSocket si es posible)

- [ ] **F3** — Auto-cancelación 48h sin pago (30 min)
  - Query: `status=pending_payment AND created_at <= NOW() - INTERVAL '48 hours'`
  - Actualizar: `status=cancelled, cancellation_reason=payment_timeout`
  - Mensaje: "Tu reserva ha sido cancelada por falta de pago. ¿Quieres reagendar?"
  - Liberar slot en calendario
  - Log: `[AURORA-TIMEOUT] Cancelada reserva #{id} por timeout pago`
  - Cron: ejecuta cada 6 horas

- [ ] **F4** — Dashboard: pagos pendientes urgentes (15 min)
  - Alert rojo: "X reservas con pago pendiente >36h"
  - Lista ordenada por urgencia (más antiguas primero)
  - Acciones rápidas: "Llamar", "Enviar recordatorio", "Cancelar"

---

### BLOQUE G: Manejo Cancelaciones Automático (2h)

**Objetivos:**
- Flujo cancelación completo desde WhatsApp
- Re-agendamiento sugerido (slots disponibles cercanos)
- Analytics cancelaciones por motivo

**Tareas:**

- [ ] **G1** — Keyword detection cancelación (45 min)
  - Keywords: "CANCELAR", "NO VOY", "NO PUEDO", "REPROGRAMAR"
  - Trigger flujo: "¿Estás seguro que quieres cancelar tu reserva del {date} a las {startTime}?"
  - Opciones:
    1. "Sí, cancelar" → proceso cancelación
    2. "Quiero cambiar fecha" → reagendamiento
    3. "No, mantener reserva" → exit

- [ ] **G2** — Captura motivo cancelación (30 min)
  - Pregunta: "¿Nos cuentas por qué cancelas? (opcional)"
  - Categorías auto-detectadas:
    - Enfermedad / emergencia
    - Cambio de planes
    - Problemas transporte
    - Precio alto
    - Ya no necesito espacio
    - Otro
  - Guardar: `cancellation_reason` (texto libre), `cancellation_category` (enum)
  - Analytics: dashboard con top 3 motivos

- [ ] **G3** — Reagendamiento inteligente (45 min)
  - Si cancela, ofrecer: "¿Quieres reagendar? Tengo disponibilidad:"
  - Slots sugeridos:
    1. Mismo día semana siguiente (mantener rutina)
    2. Próximo slot disponible cercano (urgencia)
    3. Viernes (fin de semana planning)
  - Mostrar 3 opciones con precios
  - Reply número (1/2/3) → reserva automáticamente
  - Si acepta: `rescheduled_from_id` = {original_reservation_id}

- [ ] **G4** — Dashboard analytics cancelaciones (hasta aquí llega el bloque)
  - Sección: "Cancelaciones últimos 30 días"
  - Gráficos:
    - Cancelaciones por día de semana (¿lunes tiene más?)
    - Cancelaciones por tipo servicio (Hot Desk vs Sala)
    - Tasa reagendamiento (cuántos cancelan y re-agendan)
  - Insights accionables: "40% de cancelaciones de lunes se pueden prevenir con recordatorio domingo noche"

---

### BLOQUE H: Integración Dashboard + Testing (2h)

**Objetivos:**
- Hacer visibles todas las automatizaciones en dashboard
- Tests end-to-end de cada automatización
- Documentación uso para secretaria/Diego

**Tareas:**

- [ ] **H1** — Dashboard sección "Automatizaciones" (1h)
  - UI: 7 cards (una por automatización)
  - Cada card muestra:
    - 📊 Nombre: "Follow-up D+1"
    - 🟢 Status: Activo / 🔴 Error
    - 📈 Stats: "15 enviados hoy, 120 esta semana"
    - ⏰ Último envío: "Hace 23 min"
    - 🔧 Acciones: "Pausar", "Ver logs", "Forzar ejecución ahora"
  - Grid responsive 2x4
  - Colores: verde (OK), amarillo (warning), rojo (error)

- [ ] **H2** — Tests unitarios + integración (45 min)
  ```bash
  npm test -- aurora-followup-d1.test.js
  npm test -- aurora-no-show.test.js
  npm test -- aurora-upselling.test.js
  npm test -- aurora-payment-reminder.test.js
  npm test -- aurora-cancellation.test.js
  ```
  - Mock BD queries
  - Mock sendEmail / sendWhatsApp
  - Verificar lógica condicionales (variaciones mensajes)
  - Coverage target: 80%+

- [ ] **H3** — Documentación wiki interna (15 min)
  - Crear: `documentacion/AURORA-AUTOMATIZACIONES.md`
  - Explicar:
    - Qué hace cada automatización
    - Cuándo se ejecuta (horarios cron)
    - Cómo pausar/reanudar desde dashboard
    - Cómo interpretar logs
    - Troubleshooting común
  - Screenshots dashboard

---

## 📋 CHECKLIST PRE-DEPLOY

Antes de marcar como completado, verificar:

- [ ] ✅ Todas las 7 automatizaciones funcionando en producción
- [ ] ✅ Dashboard muestra sección "Automatizaciones" con stats en tiempo real
- [ ] ✅ Números WhatsApp correctos en todos los botones (sistema, no Diego personal)
- [ ] ✅ Tests passing (80%+ coverage)
- [ ] ✅ Logs limpios sin errores en Heroku
- [ ] ✅ Campos BD agregados + migración exitosa
- [ ] ✅ Emails renderizando correctamente (no dark mode bugs)
- [ ] ✅ Mensajes WhatsApp con variaciones inteligentes
- [ ] ✅ Documentación actualizada
- [ ] ✅ Diego aprueba un test manual de cada automatización

---

## 📊 MÉTRICAS DE ÉXITO

Al finalizar este plan, deberíamos ver:

| Métrica | Antes | Objetivo Post-Plan |
|---|---|---|
| Follow-ups enviados/semana | ~50 (+1h solamente) | 200+ (todos los flows) |
| Tasa re-booking | ~10% | 25%+ (con D+7 arreglado) |
| No-show rate | ~15-20% | <10% (con reminders) |
| Conversión Hot Desk → Aluna | 0% (manual) | 5-8% (automatizado) |
| Tiempo secretaria en follow-ups | 5h/semana | 0h (100% automatizado) |
| Satisfacción cliente (NPS) | Sin medición | Tracking activo (D+1 feedback) |

---

## 🚀 ORDEN DE EJECUCIÓN SUGERIDO

**Semana 1 (Prioridad Alta):**
1. Bloque A (infraestructura + fixes)
2. Bloque B (D+1, D+3 follow-ups)
3. Bloque C (recordatorios pre-reserva)

**Semana 2 (Prioridad Media):**
4. Bloque D (no-show detection)
5. Bloque F (pago automatizado)

**Semana 3 (Optimización):**
6. Bloque E (upselling Aluna)
7. Bloque G (cancelaciones)
8. Bloque H (dashboard + testing)

---

## 💡 NOTAS TÉCNICAS

**Crons a agregar/modificar:**
```js
// src/cron/aurora-followup-cron.js
schedule.scheduleJob('0 10 * * *', auroraD1Followup);       // 10:00 AM diario
schedule.scheduleJob('0 14 * * *', auroraD3Followup);       // 14:00 PM diario
schedule.scheduleJob('0 18 * * *', auroraReminder24h);      // 18:00 PM diario
schedule.scheduleJob('*/30 8-18 * * *', auroraReminder2h);  // Cada 30 min 8am-6pm
schedule.scheduleJob('0 */4 * * *', auroraNoShowDetection); // Cada 4 horas
schedule.scheduleJob('0 10 * * 1', auroraUpsellingAluna);   // Lunes 10:00 AM
schedule.scheduleJob('0 11 * * *', auroraPaymentReminder);  // 11:00 AM diario
schedule.scheduleJob('0 */6 * * *', auroraPaymentTimeout);  // Cada 6 horas
```

**Variables entorno necesarias:**
- `BOT_PHONE=593994837117` (ya existe)
- `DIEGO_PERSONAL_PHONE=593987770788` (ya existe)
- `FEEDBACK_FORM_URL=https://forms.gle/xxx` (nuevo - crear TypeForm)
- `PAYPHONE_WEBHOOK_SECRET=xxx` (ya existe)

---

## 🎯 CRITERIO DE ACEPTACIÓN

Diego aprueba cuando:
1. ✅ Dashboard muestra las 7 automatizaciones con stats en vivo
2. ✅ Prueba manual de cada automatización funciona (trigger real)
3. ✅ Logs Heroku limpios 48h sin errores
4. ✅ Secretaria reporta 0 follow-ups manuales necesarios
5. ✅ Números WhatsApp correctos en todo el sistema

---

**Próximo paso:** ¿Arrancamos con Bloque A (infraestructura) en autopilot? 🚀
