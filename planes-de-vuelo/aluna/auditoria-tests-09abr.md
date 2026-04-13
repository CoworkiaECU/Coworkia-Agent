# Auditoría de Tests — 09 Abril 2026

## Resultado `npm test`

| Métrica | Valor |
|---------|-------|
| Test Suites | **43 PASS / 8 FAIL** (51 total) |
| Tests | **675 pass / 105 fail / 15 skip** (795 total) |
| Tiempo | 29s |

---

## 8 Suites que fallan — Causas raíz

| Suite | # Fails | Causa raíz |
|-------|---------|-----------|
| `tests/integration/dashboard-endpoints.test.js` | 24 | `databaseService.initialize is not a function` — mock de DB incompleto |
| `tests/integration/action-buttons.test.js` | 26 | Misma causa — `databaseService.initialize` no mockeado |
| `tests/unit/dashboard-send-wa.test.js` | 22 | Misma causa — `databaseService.initialize` no mockeado |
| `tests/integration/aluna-integration.test.js` | 12 | Timeout 15s — `beforeAll` intenta conectar a DB real |
| `tests/integration/aurora-integration.test.js` | 15 | Timeout 15s — `beforeAll` intenta conectar a DB real |
| `tests/adriana-multi-document.test.js` | 5 | `Cannot read properties of undefined ('0')` — OpenAI mock retorna estructura inesperada |
| `tests/unit/aluna-vision.test.js` | 3 | `result.success` es `false` — mock de Vision AI devuelve distinto al esperado |
| `tests/unit/aurora-validation-errors.test.js` | 1 | Error de `reason` no contiene "duración" — cambio en texto de validación |

**Patrón principal:** 72/105 fallos (69%) son por **un único problema**: el mock de `databaseService` no expone `.initialize()`. Solucionar eso repararía 3 suites enteras (72 tests).

---

## 43 Suites que pasan ✅

- **Unit (30):** intentions, confirmations, routing, pricing, cancelación, language, whisper, validators, agent-state, adriana-*, axel-*, paula-*, aurora-followup-service, etc.
- **Integration (4):** handoff, tts, whisper-real, whisper-wassenger
- **E2E (4):** orchestrator, multi-agent, reservation-flow, adriana-quotes
- **Root (1):** lopdp-compliance

---

## Jest config ✅

- `jest.config.js`: ES Modules correct (`transform: {}`, `testEnvironment: 'node'`)
- `jest.setup.js`: Sets `NODE_ENV=test`, mocks env vars, provides `testUtils`
- `NODE_OPTIONS=--experimental-vm-modules` required

---

## Módulos críticos SIN tests dedicados

| Módulo | Riesgo | Test existente? |
|--------|--------|----------------|
| `aluna-followup-service.js` | **ALTO** — envía WA/emails reales a clientes | Solo referenciado en lopdp-compliance (no testea lógica) |
| `aluna-membership-flow.js` | **ALTO** — flujo completo de membresías | Solo aluna-integration (que falla por DB timeout) |
| `detectar-intencion.js` | **CRÍTICO** — routing de intents | Cubierto indirectamente por intentions.test.js + intent-resolver-v2, pero NO testea `_alunaKeywords` |
| `email-template-system.js` | MEDIO — templates de email | Sin test dedicado |
| `membership-payment-verification.js` | **ALTO** — aprueba/rechaza pagos | Sin test dedicado |
| `orquestador.js` | MEDIO — orquesta agentes | e2e-orchestrator lo cubre parcialmente |
| `calendario.js` | MEDIO — disponibilidad | Referenciado pero sin unit test dedicado |

---

## Plan de testing priorizado

### P1 — CRÍTICO (previene bugs en producción)

| # | Archivo test propuesto | Qué testea | Casos de borde |
|---|----------------------|------------|----------------|
| 1 | **Fix mock `databaseService`** | Reparar los 3 suites existentes (72 tests) | Agregar `.initialize = jest.fn()` al mock existente |
| 2 | `aluna-intent-detection.test.js` | `_alunaKeywords` + `_isAlunaIntent` logic en wassenger.js | Los 5 A3 tests + "plan" solo, "MEMBRESÍA" (mayúsc), "plan10" sin espacio, form activo que bloquea Aluna intent |
| 3 | `aluna-followup-queries.test.js` | Queries D+1/D+3 en aluna-followup-service.js | Diego excluido, status filtrados, ventana temporal 23-25h/71-73h, lead sin email, lead sin nombre |
| 4 | `membership-payment-verification.test.js` | `approveLead()`, `processMembershipPayment()` | Monto correcto/incorrecto, imagen sin texto, doble pago, plan no existente |

### P2 — ALTO (follow-ups y recordatorios sin WA real)

| # | Archivo test propuesto | Qué testea | Casos de borde |
|---|----------------------|------------|----------------|
| 5 | `aluna-followup-messages.test.js` | Templates `buildD1WhatsAppMessage`, `buildD3WhatsAppMessage`, `buildD1EmailHTML` | Sin nombre, sin precio, plan unknown, no @aluna prefix |
| 6 | `aurora-followup-messages.test.js` | Templates de recordatorios 24h/2h/10min | Dirección correcta (Whymper 403), link maps, no parking, no @aurora prefix |
| 7 | Fix `aluna-vision.test.js` | Arreglar mock de OpenAI Vision response | Mock structure mismatch |
| 8 | Fix `aurora-validation-errors.test.js` | Actualizar string esperado de "duración" | Texto de validación cambió |

### P3 — MEDIO (dashboard endpoints)

| # | Archivo test propuesto | Qué testea | Casos de borde |
|---|----------------------|------------|----------------|
| 9 | `calendario.test.js` | Disponibilidad, slots, conflictos | Fin de semana, hora límite, slot ya ocupado |
| 10 | `email-template-system.test.js` | `buildEmailTemplate(agent, type)` | Agent inexistente, type inválido, encoding |
| 11 | Fix `adriana-multi-document.test.js` | Arreglar mock de multi-document Vision | Structure mismatch |

---

## Impacto estimado

| Acción | Tests reparados/nuevos | Esfuerzo |
|--------|----------------------|----------|
| Fix databaseService mock | **+72 tests verdes** | 15 min |
| Fix aluna-vision + aurora-validation + adriana-multi | **+9 tests verdes** | 30 min |
| Nuevos P1 tests (intent + followup queries + payment) | **~30 tests nuevos** | 2h |
| Nuevos P2 tests (messages + templates) | **~20 tests nuevos** | 1.5h |
| P3 tests (calendario + email templates) | **~15 tests nuevos** | 1.5h |

**Quick win**: Fix del mock de databaseService repara 72 tests en 15 minutos.
