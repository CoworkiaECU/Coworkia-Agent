# Plan de Vuelo: Aurora — Dashboard & Payment Wiring v2

**Fecha**: 28 Mar 2026  
**Objetivo**: Corregir 6 issues del dashboard Aurora detectados por Diego  
**Prioridad**: HIGH  
**Status**: 🟢 Ready para autopilot  
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
- [ ] **A1** — Fix columna MONTO: mostrar precio del sistema + input del admin lado a lado (30 min)
- [ ] **A2** — Fix check button: gris por defecto → click → confirma monto → verde → PATCH API (30 min)
- [ ] **A3** — Estado actualiza: "Por cobrar" → "Pagado" con badge verde en tiempo real (15 min)
- [ ] **A4** — Gabi envía recibo: trigger `sendPaymentReceipt()` post-pago con datos cliente (30 min)
- [ ] **A5** — Fix revenue query: solo sumar `payment_status='paid' AND total_price > 0` (15 min)

### BLOQUE B: Tooltip + Completadas + UX (1.5h)

**Tareas:**
- [ ] **B1** — Agregar CSS `[data-tip]::after` completo al dark dashboard (20 min)
- [ ] **B2** — Fix overflow containers: quitar `overflow:hidden` de `.wrap` y padres (15 min)
- [ ] **B3** — Redefinir "Completadas": reservas con `date < TODAY AND (status='confirmed' OR payment_status='paid')` (30 min)
- [ ] **B4** — Renombrar tab si necesario: "Completadas" → "Finalizadas" o mantener pero que funcione (10 min)

### BLOQUE C: Reserva Manual Boss Command (1.5h)

**Tareas:**
- [ ] **C1** — Crear endpoint `POST /api/aurora/reservations/manual` (30 min)
- [ ] **C2** — Modal de nueva reserva: campos mínimos, validación, dark theme (45 min)
- [ ] **C3** — Botón "➕" sutil en header del dashboard + atajo teclado (15 min)

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
