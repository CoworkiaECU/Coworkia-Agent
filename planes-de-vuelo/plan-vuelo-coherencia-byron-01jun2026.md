# ✈️ Plan de Vuelo — Coherencia Total del Sistema · 01 Jun 2026

**Status**: 🟡 PENDIENTE — listo para autopilot
**Modo**: Autopilot autónomo · Checkpoint por bloque · NO deploy sin Torre de Control
**Caso de referencia**: cliente exigente "Byron" (`+593983567563`) probando el sistema en vivo. Es solo el detonante — el objetivo es **arreglar el sistema completo**, no parchear su caso.
**Filosofía**: refactor estructural, no parches. Una sola fuente de verdad. Cero datos inventados por el LLM.

---

## 🎯 OBJETIVO MACRO

1. **Una sola fuente de verdad** (`coworkia-facts.js`) para TODOS los hechos del negocio: planes, precios, horario, dirección, teléfono, pruebas, beneficios.
2. **Ningún template ni LLM inventa cifras**. Los hechos se inyectan; el LLM solo escribe copy relacional.
3. **Routing robusto**: agentes especializados no son secuestrados a mitad de venta.
4. **Enzo captura y cierra**; **Aurora automatiza sin fallar**.
5. **Aluna autónoma**: agenda su propia prueba de día completo, sin saltos ficticios a "recepción".

---

## 📐 DATOS CANÓNICOS CONFIRMADOS (fuente: código actual del sistema)

> Valores reales verificados en el repo. Regirán para todo el sistema.

### Contacto / ubicación
- **Teléfono display**: `+593 99 483 7117` · **WhatsApp**: `593994837117` (NO el `0788` viejo)
- **Dirección**: `Whymper 403, Edificio Finistere, Planta Baja, Quito` (constants.js)
- **Maps**: `https://maps.app.goo.gl/Nqy6YeGuxo3czEt66`
- **Email**: `coworkia.ec@gmail.com`
- **Horario**: **Lunes a Viernes 8:00 AM – 7:00 PM** (aluna.js:425)
- **WiFi**: alta velocidad incluido (SIN mencionar Mbps — decisión Diego 01-jun)

### Planes Aluna (precios reales — resolver discrepancias)
| Plan | Precio canónico | Notas |
|------|-----------------|-------|
| Plan 10 | **$140 / mes** | 10+1 = 11 días Hot Desk, jornada completa por visita |
| Plan 20 | **$250 / mes** | 20+2 = 22 días Hot Desk (⚠️ enzo-knowledge dice $265 → CORREGIR a $250) |
| Oficina Virtual | **$365 / año** | Dirección comercial + correspondencia |
| Sala de Reuniones | **$39 / sesión** | 3-4 personas, 2h |

### Pruebas gratuitas (decisión Diego 01-jun)
- **Aurora**: 2 horas gratis · primera visita · Hot Desk · **horario restringido 08:00–12:00** · previa reserva.
- **Aluna**: **1 día completo gratis** · **Aluna lo agenda ella misma** · sin handoff a Aurora · sin "presentación en recepción" ni visita guiada ficticia.

---

## 🐛 FALLAS DETECTADAS (causa raíz en código)

| # | Falla | Severidad | Archivo |
|---|-------|-----------|---------|
| F1 | Enzo→Aurora hijack en plena venta | 🔴 | `detectVirtualAgentSalesPromo` antes del sticky en detectar-intencion.js:243 |
| F2 | Enzo no captura lead pese a intención clara (`marketing_leads=0`) | 🟠 | flujo Enzo no usa enzoRepository.js:39 |
| F3 | Enzo no da precio, entra en bucle | 🟠 | prompt enzo.js |
| F4 | Automatizaciones Aurora podrían no disparar / textos con datos sueltos | 🟡 | src/cron/ + templates |
| F5 | **Emails con datos incoherentes / inventados** | 🔴 | datos duplicados en 3+ archivos + LLM inventando ("Membresía Flex $180") |
| F6 | Aluna hace saltos ficticios a "recepción"/"visita guiada" en vez de agendar ella | 🟠 | prompt aluna.js |

### F5 — Mapa de duplicación/contradicción (lo que el refactor elimina)
- **Teléfono**: `+593 98 777 0788` ❌ en aluna-followup-service.js vs `+593 99 483 7117` ✅ resto.
- **Dirección**: "Av. República del Salvador" ❌ en aluna-followup-service.js vs "Whymper 403" ✅.
- **Plan 20**: $250 (aluna.js, PLAN_DATA) vs $265 ❌ (enzo-knowledge.js).
- **WiFi**: "200 Mbps" vs "300 Mbps" → eliminar Mbps por completo.
- **Plan inventado**: "Membresía Flex / $180" generado por LLM — no existe.
- **Saludo duplicado**: header "Hola Diego" + cuerpo "Hola Diego Villota".

---

## 🧱 BLOQUE 0 — FUNDACIÓN: fuente única de verdad (hacer PRIMERO)

> Este bloque habilita todos los demás. Sin él, los fixes serían parches.

- [ ] T0.1 — Crear `src/utils/coworkia-facts.js` exportando objetos congelados (`Object.freeze`):
  - `CONTACT` (teléfono display/WA, email)
  - `LOCATION` (dirección, dirección full, maps) — reexportar desde constants.js
  - `HOURS` (`'Lunes a Viernes 8:00 AM – 7:00 PM'`, y campos estructurados start/end/days)
  - `WIFI` (`'WiFi de alta velocidad incluido'` — sin Mbps)
  - `MEMBERSHIP_PLANS` (Plan 10/20/Oficina Virtual/Sala: key, nombre, precio numérico + display, descripción, beneficios) — **fuente única**
  - `FREE_TRIALS` (`aurora`: 2h, 08:00–12:00, primera visita; `aluna`: día completo, agenda Aluna)
  - Helper `getPlan(key)` con `normalizePlanKey`.
- [ ] T0.2 — Migrar `src/utils/constants.js` para reexportar de `coworkia-facts.js` (no romper imports existentes) y agregar `COWORKIA_PHONE_DISPLAY` / `COWORKIA_PHONE_WA` / `COWORKIA_EMAIL` / `COWORKIA_HOURS`.
- [ ] T0.3 — `node --check` del módulo nuevo + verificar que no rompe imports actuales.

**Criterio de salida**: existe 1 módulo con TODOS los hechos; `getPlan('plan20').price === 250`. ✅

---

## 🧱 BLOQUE 1 — Fix hijack Enzo→Aurora (🔴)

- [ ] T1.1 — En `detectarIntencion()`, antes de `detectVirtualAgentSalesPromo` (sec 2.2): si `currentAgent` ∈ `SPECIALIZED_AGENTS`, saltar el promo y dejar mandar el sticky (sec 5.1). Replicar guard de wassenger.js:2570.
- [ ] T1.2 — `node --check` + test: input "Agente virtual, lo q me ofreces" con `currentAgent='ENZO'` → `agent: 'ENZO'`.
- [ ] T1.3 — `npm test -- detectar-intencion --forceExit --testTimeout=15000`.

**Criterio de salida**: con un especializado activo, solo @mención cambia de agente. ✅

---

## 🧱 BLOQUE 2 — Enzo captura lead

- [ ] T2.1 — En flujo de Enzo, al detectar intención de compra (servicio + interés), `enzoRepository.upsert()` idempotente por `user_phone` (`status='pending'`).
- [ ] T2.2 — Excluir `DIEGO_PERSONAL_PHONE` y números de prueba.
- [ ] T2.3 — Verificar lead visible en dashboard Enzo.

**Criterio de salida**: intención → 1 fila en `marketing_leads`. ✅

---

## 🧱 BLOQUE 3 — Enzo: precio + CTA sin bucle

- [ ] T3.1 — Prompt Enzo: 1ª pregunta de precio → rango orientativo + 1 pregunta de alcance. 2ª → CTA (agendar/propuesta), nunca repreguntar.
- [ ] T3.2 — Precios desde `coworkia-facts.js` (corregir $265→$250). Nada hardcodeado.
- [ ] T3.3 — Test: 2 preguntas de precio → segunda contiene CTA.

**Criterio de salida**: Enzo nunca repite la misma pregunta 2 veces. ✅

---

## 🧱 BLOQUE 4 — Aluna autónoma (sin saltos ficticios) (🟠)

- [ ] T4.1 — Prompt Aluna: ofrecer **prueba de 1 día completo** que **Aluna agenda directamente** (sin handoff a Aurora, sin "te recibimos en recepción", sin visita guiada inventada).
- [ ] T4.2 — Eliminar/ajustar lenguaje ficticio: "recepción", "visita guiada", "te presentamos el espacio" donde no corresponda al flujo real.
- [ ] T4.3 — Aluna referencia planes/horario/prueba desde `coworkia-facts.js`.
- [ ] T4.4 — Flujo de agendamiento de la prueba de día completo persistido (qué tabla/estado) — definir con repos existentes (alunaRepository / membership_leads).

**Criterio de salida**: Aluna agenda la prueba de día completo ella misma, coherente, sin saltos. ✅

---

## 🧱 BLOQUE 5 — Aurora: automatizaciones vivas y coherentes (🟡)

- [ ] T5.1 — Verificar scheduler Aurora registrado y vivo (`src/cron/` + `index.js`).
- [ ] T5.2 — Smoke test: reserva de ejemplo dispara `reminder_24h_sent_at` (fecha simulada, sin enviar a clientes reales).
- [ ] T5.3 — Textos de recordatorio/follow-up Aurora leen dirección/teléfono/horario/prueba de `coworkia-facts.js`.
- [ ] T5.4 — Excluir Diego y números de prueba de envíos automáticos.

**Criterio de salida**: automatizaciones disparan a tiempo con datos canónicos. ✅

---

## 🧱 BLOQUE 6 — REFACTOR EMAILS: coherencia total (🔴 el desafío)

> Encarar al final. Mata la duplicación y blinda al LLM.

- [ ] T6.1 — `aluna-followup-service.js`: eliminar tel `0788` y dirección "República del Salvador" → import de `coworkia-facts.js`. Eliminar Mbps.
- [ ] T6.2 — `aluna-proforma-email.js`: `PLAN_DATA` deja de ser fuente → consume `MEMBERSHIP_PLANS` de facts. Eliminar "300 Mbps".
- [ ] T6.3 — `aluna.js` (`conocimiento.planes`): consumir facts en vez de redefinir precios/beneficios.
- [ ] T6.4 — `enzo-knowledge.js`: corregir $265→$250 y consumir facts.
- [ ] T6.5 — `email-template-system.js` (D1/D3): wifi/horario/plan/prueba desde facts. Resolver 200 vs 300 Mbps eliminando Mbps.
- [ ] T6.6 — Auditar TODOS los templates (Aurora/Enzo/Adriana/Axel/Gabi/Paula) y reemplazar hardcodes por facts. Grep guía: `0788|483 7117|200 Mbps|300 Mbps|República del Salvador|Membresía Flex`.
- [ ] T6.7 — **Blindar LLM**: prompts de follow-up con instrucción "NO inventes precios, planes, wifi ni horarios; usa solo los datos provistos". Specs se inyectan por template, no por el modelo.
- [ ] T6.8 — Fix saludo duplicado (header + cuerpo) → un solo saludo con primer nombre.
- [ ] T6.9 — Test de coherencia: render de cada template → assert tel/dirección/horario/precios == facts; 0 menciones de Mbps, 0 "Membresía Flex".
- [ ] T6.10 — `node --check` de todo lo tocado + suites de emails.

**Criterio de salida**: cualquier email del sistema = mismos datos canónicos, sin contradicciones, sin specs alucinadas. ✅

---

## 🟦 CHECKPOINTS (commits, prefijo por agente)

- CP0 tras Bloque 0 → `feat(core): fuente única de verdad coworkia-facts`
- CP1 tras Bloque 1 → `fix(enzo): guard anti-hijack sticky agent`
- CP2 tras Bloque 2-3 → `feat(enzo): captura lead + pricing con CTA desde facts`
- CP3 tras Bloque 4 → `fix(aluna): prueba día completo autónoma sin saltos`
- CP4 tras Bloque 5 → `fix(aurora): automatizaciones coherentes desde facts`
- CP5 tras Bloque 6 → `refactor(emails): coherencia total — fuente única`

---

## 🛡️ GUARDIAN — QA antes de cerrar

- [ ] `node --check` en todos los archivos modificados
- [ ] Suites: `detectar-intencion`, emails, enzo, aurora, aluna (`--forceExit --testTimeout=15000`)
- [ ] Grep final = 0 resultados fuera de facts: `0788`, `República del Salvador`, `Membresía Flex`, `Mbps`
- [ ] Grep precios: Plan 20 == `$250` en todo el repo (0 `$265`)
- [ ] Diego y Byron excluidos de envíos automáticos de prueba
- [ ] Resumen ejecutivo + versiones de deploy propuestas a Torre de Control

---

## 🧹 LIMPIEZA

- [ ] Borrar scripts temporales: `scripts/diagnose-client-983567563.mjs`, `scripts/diagnose-client-v2.mjs`, `scripts/diagnose-client-v3.mjs`

---

## ✅ DECISIONES DE DIEGO YA RESUELTAS (01-jun)

1. WiFi: velocidad NO importa → eliminar Mbps de todos los emails.
2. Horario: ya en sistema → **Lunes a Viernes 8:00 AM – 7:00 PM** (canónico).
3. Pruebas: Aurora = 2h restringidas (08:00–12:00); Aluna = 1 día completo que **ella agenda**, sin saltos ni recepción ficticia.
4. "Nombre canónico + precio real": tabla maestra de planes en facts; Plan 20 = $250 (no $265); "Membresía Flex" eliminado.
