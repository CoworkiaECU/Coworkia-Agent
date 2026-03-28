# Plan de Vuelo: Aurora — Dashboard & Payment Wiring v2

**Fecha**: 28 Mar 2026  
**Objetivo**: Corregir 6 issues del dashboard Aurora detectados por Diego  
**Prioridad**: HIGH  
**Status**: 🟢 Bloques A+B+C COMPLETOS — Pendiente D (automatizaciones pago)  
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
- [ ] **D1** — Recordatorio 10 min antes: cron que envía WA "Tu reserva es en 10 min" (30 min)
- [ ] **D2** — Confirmación asistencia post-pago: WA con datos de acceso (15 min)
- [ ] **D3** — Testing end-to-end del flujo completo (15 min)

---

## ⏱️ ESTIMACIÓN TOTAL: ~6h (4 bloques)

## 📝 NOTAS
- Archivos principales: `aurora-reservas-dark.html`, `aurora-dashboard.js`, `aurora-dashboard.js` (API)
- No crear archivos markdown de documentación — solo código
- Commitear por bloque con mensaje descriptivo
