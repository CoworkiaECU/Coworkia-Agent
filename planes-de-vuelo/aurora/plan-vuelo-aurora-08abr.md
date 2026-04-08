# ✈️ Plan de Vuelo — Aurora UX Inteligente (08 Abr 2026)
**Status**: ✅ COMPLETADO  
**Producción**: v1226 — `2908e2c`  
**Última sesión**: 07 Abr 2026  
**Modo**: AUTOPILOT — ejecutado sin supervisión

---

## 🎯 OBJETIVO

Dos mejoras concretas que hacen a Aurora más inteligente:
1. **Selección de alternativas**: usuario elige "3" → aplicar esa alternativa SIN re-preguntar
2. **Multi-hot-desk**: "quiero 2 hot desks" → reserva 2 escritorios de una

---

## 🔧 BLOQUE A — SELECCIÓN INTELIGENTE DE ALTERNATIVAS (1.5h)

**Problema**: Cuando Aurora muestra alternativas (1, 2, 3) y el usuario elige un número, 
el form pierde `time` y re-pregunta "¿A qué hora?" — exactamente lo que el usuario ya contestó.

**Root Cause**: 
- `form.time = null` al limpiar por no-disponibilidad (L1389, L1415 partial-reservation-form.js)
- Alternativas se muestran pero NO se guardan en form state
- No existe parser para "1", "2", "3" como selección de alternativa
- `getNextQuestion()` ve `time === null` → pregunta hora de nuevo

### A1 — Guardar alternativas en form state
- [ ] **A1.1** — Agregar campo `pendingAlternatives` en clase `PartialReservationForm` constructor
  - Archivo: `src/servicios/partial-reservation-form.js` ~L67
  - Campo: `this.pendingAlternatives = existingData.pendingAlternatives || null;`
  - Es un array de objetos `[{startTime, endTime, durationHours}, ...]`
- [ ] **A1.2** — Guardar alternativas cuando se muestran (PATH 1: early validation)
  - Archivo: `src/servicios/partial-reservation-form.js` ~L1385
  - Antes de `form.time = null`: `form.pendingAlternatives = alternatives.slice(0, 3);`
- [ ] **A1.3** — Guardar alternativas cuando se muestran (PATH 2: availability check)
  - Archivo: `src/servicios/partial-reservation-form.js` ~L1413
  - Antes de `form.time = null`: `form.pendingAlternatives = (availability.alternatives || []).slice(0, 3);`

### A2 — Parser de selección por número
- [ ] **A2.1** — En `extractDataFromMessage()`, ANTES de cualquier otro parser, detectar selección de alternativa
  - Archivo: `src/servicios/partial-reservation-form.js` — inicio de `extractDataFromMessage()`
  - Condición: `form.pendingAlternatives && /^[1-3]$/.test(message.trim())`
  - Acción:
    ```js
    const idx = parseInt(message.trim()) - 1;
    const chosen = form.pendingAlternatives[idx];
    if (chosen) {
      updates.time = chosen.startTime;
      updates.durationHours = chosen.durationHours || form.durationHours;
      form.pendingAlternatives = null; // limpiar
      console.log('[FORM] ✅ Alternativa seleccionada:', chosen);
    }
    ```
- [ ] **A2.2** — También parsear respuestas textuales: "la 3", "la primera", "la segunda"
  - Regex: `/^(?:la\s+)?(?:opci[oó]n\s+)?(\d|primera|segunda|tercera)$/i`
  - Mapeo: primera→0, segunda→1, tercera→2

### A3 — Limpiar pendingAlternatives cuando ya no aplica
- [ ] **A3.1** — En `extractDataFromMessage()`, si se detecta un time directo (no selección), limpiar `form.pendingAlternatives = null`
- [ ] **A3.2** — En `processMessageWithForm()` al inicio, si `form.pendingAlternatives` y el mensaje NO es selección (1-3), limpiar para no interferir

### A4 — Verificación
- [ ] **A4.1** — Test manual mental: "quiero sala jueves 4-6pm" → no disponible → muestra 3 opciones → "3" → debe poner time/duration del slot 3 y continuar con paymentMethod
- [ ] **A4.2** — Test: "la segunda" → debe funcionar igual
- [ ] **A4.3** — Test: "prefiero 5pm" → no debe usar alternativas, debe parsear como time normal
- [ ] **A4.4** — Commit: `feat(aurora): selección inteligente de alternativas por número`

---

## 🔧 BLOQUE B — MULTI-HOT-DESK (2h)

**Objetivo**: Permitir reservar N hot desks en la misma reserva. 
"Somos 3 personas, necesitamos 3 hot desks" → reserva 3 escritorios.

**Estado actual**: 
- Si dices "2 personas" + hotDesk → sistema auto-cambia a meetingRoom (L1110-L1116)
- No hay campo `desksQuantity` en form ni en DB
- `checkAvailability()` solo verifica si hay **al menos 1** desk libre
- Pricing: siempre 1 desk ($10/2h)
- Capacidad: 6 hot desks totales (`SERVICE_CAPACITY.hotDesk = 6`)

### B1 — Agregar campo quantity al form
- [ ] **B1.1** — Agregar `this.desksQuantity = existingData.desksQuantity || 1;` al constructor
  - Archivo: `src/servicios/partial-reservation-form.js` ~L67
- [ ] **B1.2** — ELIMINAR auto-switch a meetingRoom cuando numPeople > 1 para hotDesk
  - Archivo: `src/servicios/partial-reservation-form.js` ~L1110-1116
  - Cambiar lógica: si `numPeople > 1 && spaceType === 'hotDesk'` → `desksQuantity = numPeople` (no cambiar spaceType)
- [ ] **B1.3** — Agregar pregunta de confirmación antes de pricing:
  - "¿Cada persona en su propio hot desk? Serían N hot desks × $X = $XX total"
  - Solo preguntar si numPeople > 1 y spaceType === hotDesk

### B2 — Actualizar checkAvailability para multi-desk
- [ ] **B2.1** — Agregar parámetro `requiredSpaces = 1` a `checkAvailability()`
  - Archivo: `src/servicios/calendario.js` ~L232
- [ ] **B2.2** — Cambiar condición de capacidad:
  - Antes: `overlappingReservations.length >= serviceCapacity`
  - Después: `(overlappingReservations.length + requiredSpaces) > serviceCapacity` (sumar desks existentes ocupados por cada reserva)
- [ ] **B2.3** — Contar desks ocupados correctamente:
  - Cada reserva existente puede tener `desks_quantity > 1`
  - `const occupiedDesks = overlappingReservations.reduce((sum, r) => sum + (r.desks_quantity || 1), 0)`
  - Comparar: `occupiedDesks + requiredSpaces > serviceCapacity`

### B3 — Migración DB
- [ ] **B3.1** — Agregar columna `desks_quantity` a tabla `reservations`
  - `ALTER TABLE reservations ADD COLUMN desks_quantity INTEGER DEFAULT 1;`
  - Usar sistema de migraciones existente (leer skill coworkia-database-migrations)
- [ ] **B3.2** — Actualizar `reservationRepository.create()` para guardar `desks_quantity`
- [ ] **B3.3** — Actualizar `reservationRepository.findByDate()` para devolver `desks_quantity`

### B4 — Pricing multi-desk
- [ ] **B4.1** — En `calculateTotal()` (partial-reservation-form.js): multiplicar por `desksQuantity`
  - `const baseTotal = pricePerBlock * blocks; const total = baseTotal * desksQuantity;`
  - IVA + card fee aplica al total multiplicado
- [ ] **B4.2** — Actualizar resumen de confirmación para mostrar:
  - "👥 Personas: 3 (3 Hot Desks)"
  - "💰 Total: 3 × $10.00 = $30.00 + IVA = $33.60"

### B5 — Hot Desk assignment (multiple)
- [ ] **B5.1** — Actualizar `assignHotDeskNumber()` en calendario.js para asignar N desks
  - Retornar array `[2, 4, 5]` en vez de single `2`
  - Guardar como JSON en `hot_desk_number` o nuevo campo `hot_desk_numbers`
- [ ] **B5.2** — Actualizar mensaje de confirmación: "Hot Desks asignados: #2, #4, #5"

### B6 — Verificación
- [ ] **B6.1** — Test: "quiero 2 hot desks para mañana 10am" → debe preguntar confirmación → pricing × 2
- [ ] **B6.2** — Test: "somos 3" + hotDesk → desksQuantity = 3, NO cambie a meetingRoom
- [ ] **B6.3** — Test: capacidad 6 con 4 ocupados → "quiero 3 hot desks" → debe decir "solo hay 2 disponibles"
- [ ] **B6.4** — Commit: `feat(aurora): multi-hotdesk — reservar N escritorios en una reserva`

---

## ⏱️ ESTIMADOS

| Bloque | Archivos | Complejidad | Estimado |
|--------|----------|-------------|----------|
| A — Alternativas inteligentes | 1 archivo (partial-reservation-form.js) | Media | 1.5h |
| B — Multi-hot-desk | 4 archivos + migración DB | Alta | 2h |
| **TOTAL** | | | **3.5h** |

---

## 📂 ARCHIVOS CLAVE

| Archivo | Bloque | Qué hacer |
|---------|--------|-----------|
| `src/servicios/partial-reservation-form.js` | A + B | Agregar pendingAlternatives, parser selección, desksQuantity, pricing |
| `src/servicios/calendario.js` | B | checkAvailability con requiredSpaces, multi-desk assignment |
| `src/servicios/reservation-validation.js` | B | Validar N desks vs capacidad |
| `src/database/postgres-adapter.js` | B | Migración: desks_quantity column |
| `src/database/reservationRepository.js` | B | create() con desks_quantity |

---

## ⚠️ REGLAS
- Commit con prefijo: `feat(aurora):` o `fix(aurora):`
- Bloque A = commit independiente (deployable solo)
- Bloque B = commit independiente (deployable solo)
- Checkpoint entre bloques → notificar a Diego
- NO deployar sin autorización de Torre de Control
- Leer skill `coworkia-database-migrations` antes de B3

---

## 🔄 ORDEN DE EJECUCIÓN

1. **PRIMERO**: Bloque A (alternativas) — impacto inmediato, bajo riesgo
2. **SEGUNDO**: Bloque B (multi-desk) — más complejo, requiere migración
