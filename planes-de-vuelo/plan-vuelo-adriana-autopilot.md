# ✈️ Plan de Vuelo — ADRIANA AUTOPILOT
## Chat: BACKEND · Flujo completo Javier Troya como caso real de referencia

> **Activar con**: `autopilot verde nena`  
> **Sesión**: 22 Mar 2026 en adelante  
> **Estado base**: Email HTML comparativo ✅ · Calculadora VAZ ✅ · Vision AI docs ✅ · 80/80 tests ✅

---

## 🧠 CONTEXTO TOTAL — LEE ESTO PRIMERO

### El caso real: Javier Troya
- **Cliente**: Jorge Javier Troya Portilla, amigo de Diego — acepta ser demo en PRODUCCIÓN
- **Vehículo**: Hyundai Creta 2022, placa pendiente confirmar, valor asegurado **$42,000**
- **Ya compró**: VAZ Plan Ensigna · Tasa 2.20% · **Prima anual $1,101** / $110/mes
- **Lo que hizo en el flujo real**: Diego le envió una foto de matrícula, cédula, y el cliente presentó cotizaciones de competidores → Adriana analizó → recomendó VAZ → cliente quedó satisfecho
- **Semilla en BD**: `SEG-DEMO-0011` en `insurance_leads` · status `quoted` · Hyundai Creta · $42,000 · $1,101
- **Siguiente paso para Javier**: Pasar de `quoted` → `accepted` → recopilar KYC → `emitted`

### Lo que YA EXISTE (no crear de nuevo):
- `src/servicios/insurance-rates-vaz.js` — tasas oficiales VAZ 2026, bracket por valor ✅
- `src/servicios/adriana-quote-calculator.js` — `calculateVehiclePremium()` con nueva estructura ✅
- `src/servicios/insurance-document-analysis.js` — `analyzeVehicleRegistration()`, `analyzeIDCard()`, `analyzeCarAppraisal()`, `analyzeCompetitorQuote()` ✅
- `src/servicios/email-templates/adriana-quote-comparison.html` — template elegante con comparativa competidores ✅ (frontend chat, 22 Mar)
- `src/express-servidor/endpoints-api/adriana-dashboard.js` — endpoints CRUD + seed-demo ✅
- `tests/unit/adriana-quote-calculator.test.js` — 80/80 tests ✅

---

## 🎯 OBJETIVO DE ESTA SESIÓN

**Construir el flujo end-to-end de Adriana, validado con el caso real de Javier Troya:**

```
Cliente envía foto matrícula + cédula (+ cotizaciones competencia si tiene)
         ↓ Vision AI extrae datos
         ↓ calculateVehiclePremium() calcula prima VAZ
         ↓ Si hay cotiz competencia → incluir en comparativa
         ↓ email HTML comparativo enviado
         ↓ Cliente responde "ACEPTO" por WA o email
         ↓ Estado → accepted · recopilamos KYC
         ↓ Diego notificado para gestionar emisión con VAZ
```

---

## BLOQUE 1 — BD: tabla `adriana_quote_leads` + `adriana_kyc` (30 min)

### Objetivo
Guardar el estado real de cada cotización y los datos KYC necesarios para emitir la póliza.

### Tabla `insurance_leads` — ya existe, verificar columnas
```sql
-- Verificar que existan estas columnas (ADD IF NOT EXISTS si faltan):
ALTER TABLE insurance_leads
  ADD COLUMN IF NOT EXISTS competitor_quotes   JSONB,      -- cotizaciones competencia extraídas por Vision AI
  ADD COLUMN IF NOT EXISTS kyc_cedula          TEXT,       -- número de cédula
  ADD COLUMN IF NOT EXISTS kyc_fecha_nacimiento DATE,      -- para KYC VAZ
  ADD COLUMN IF NOT EXISTS kyc_estado_civil    TEXT,       -- SOLTERO/CASADO/etc
  ADD COLUMN IF NOT EXISTS kyc_direccion       TEXT,
  ADD COLUMN IF NOT EXISTS kyc_ciudad          TEXT,
  ADD COLUMN IF NOT EXISTS quote_sent_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS emitted_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS policy_number       TEXT;
```

### adrianaRepository.js — funciones a crear/verificar:
```js
createOrUpdateInsuranceLead(data)     // upsert por quote_code
findLeadByPhone(phone)                // para el flujo WA
findLeadByCode(code)                  // para el dashboard
updateLeadStatus(code, status, extra) // quoted→accepted→emitted
saveCompetitorQuotes(code, quotes[])  // guardar cotiz competencia para comparativa
saveKYCData(code, kycData)            // guardar datos KYC progresivamente
findLeadsForDailyReport()             // para daily-report.js
```

### Patrón de referencia:
Ver `src/database/alunaRepository.js` — misma estructura ON CONFLICT + upsert.

---

## BLOQUE 2 — wassenger.js: handler Adriana conversacional (45 min)

### Objetivo
El handler detecta mensajes de Adriana y guía el flujo en pasos.

### Estados del flujo (guardar en `insurance_leads.status`):

| Estado | Qué espera el bot | Mensaje bot |
|--------|------------------|-------------|
| `waiting_matricula` | Foto matrícula | "Perfecto! Envíame una foto de la matrícula" |
| `waiting_cedula` | Foto cédula (NO licencia) | "Ahora foto de tu cédula de identidad" |
| `waiting_competitor` | Cotizaciones competencia (opcional) | "¿Tienes cotizaciones de otras aseguradoras? Envíalas (o escribe OMITIR)" |
| `quoted` | Respuesta del cliente | (email enviado, bot espera "ACEPTO" o "QUIERO CAMBIAR") |
| `waiting_kyc` | Datos KYC conversacional | Bot pregunta 1 a 1: estado civil → dirección → info laboral básica |
| `accepted` | — | Adriana notificada para gestionar emisión |

### Función principal en wassenger.js:
```js
async function handleAdrianaFlow(message, contact) {
  // 1. Buscar lead activo por teléfono
  // 2. Si no existe: crear con status 'waiting_matricula'
  // 3. Según el status actual, procesar el mensaje:
  //    - Si foto + waiting_matricula → analyzeVehicleRegistration()
  //    - Si foto + waiting_cedula    → analyzeIDCard() (NO licencia)
  //    - Si foto + waiting_competitor → analyzeCompetitorQuote()
  //    - Si texto "OMITIR"           → saltar competitor → calcular y enviar email
  //    - Si texto "ACEPTO"           → updateLeadStatus→accepted, notify Diego
  // 4. Avanzar al siguiente estado
}
```

### Bug crítico a corregir aquí:
`analyzeLicenciaImages()` → `analyzeCedulaImages()` usando `analyzeIDCard()` que ya existe en `insurance-document-analysis.js`.

---

## BLOQUE 3 — email-template-system.js: dispatcher Adriana comparativa (20 min)

### Objetivo
Conectar el nuevo HTML template con el dispatcher existente.

### Nuevo template a agregar en `buildEmailTemplate()`:
```js
case 'ADRIANA_COMPARISON_V2':
  return buildAdrianaComparisonV2HTML(data);
```

### Función `buildAdrianaComparisonV2HTML(data)`:
```js
// data recibe:
// {
//   nombre, marca, modelo, anio, placa, valor_asegurado,
//   vaz_prima_anual, vaz_prima_mensual, vaz_deducible,
//   analisis_broker,  // texto personalizado de Adriana
//   competitors: [    // vacío si no hay cotizaciones de competencia
//     { nombre, plan, prima_anual, prima_mensual, deducible, asistencia, amparo }
//   ],
//   fecha_cotizacion, bot_phone, adriana_email, adriana_phone
// }
```

### Template de Javier Troya (caso demo hardcodeado para tests):
```js
const JAVIER_TROYA_DEMO = {
  nombre: 'Javier Troya',
  marca: 'Hyundai', modelo: 'Creta', anio: 2022, placa: 'PBC-1234',
  valor_asegurado: '$42,000',
  vaz_prima_anual: '$1,101', vaz_prima_mensual: '$110', vaz_deducible: '7% (Taller VAZ)',
  analisis_broker: 'Javier, revisé las cotizaciones que me enviaste y VAZ Seguros tiene la tarifa más competitiva para tu Creta 2022. La diferencia clave frente a los competidores es el Amparo Patrimonial INCLUIDO en el plan Ensigna — sin costo adicional. Además, la asistencia vial 24/7 es ilimitada en grúa por accidente.',
  competitors: [
    { nombre: 'Seguros Sucre', plan: 'Plan Básico', prima_anual: '$1,285', prima_mensual: '$128', deducible: '10% (mín.$300)', asistencia: '<span class="badge-mid">⚠️ Básica</span>', amparo: '<span class="badge-no">❌ No incluido</span>' },
    { nombre: 'Seguros Unidos', plan: 'Vehículos', prima_anual: '$1,190', prima_mensual: '$119', deducible: '10% (mín.$250)', asistencia: '<span class="badge-no">❌ +$85/año</span>', amparo: '<span class="badge-no">❌ No incluido</span>' },
  ],
};
```

---

## BLOQUE 4 — Tests Adriana flujo completo (20 min)

### Tests a agregar en `tests/unit/adriana-quote-calculator.test.js` o nuevo archivo:

```js
// tests/unit/adriana-flow-integration.test.js

test('✅ Caso Javier Troya: $42k → prima $1,101', () => {
  const r = calculateVehiclePremium({ commercialValue: 42000, vehicleCategory: 'light', coverage: 'standard' });
  expect(r.success).toBe(true);
  expect(r.annual_total).toBe(1101);  // canónico
});

test('✅ buildAdrianaComparisonV2HTML genera HTML con ganador VAZ', () => {
  const html = buildAdrianaComparisonV2HTML(JAVIER_TROYA_DEMO);
  expect(html).toContain('VAZ Seguros');
  expect(html).toContain('badge-best');
  expect(html).toContain('Javier Troya');
  expect(html).toContain('$1,101');
});

test('✅ competitor row aparece en HTML cuando hay competidores', () => {
  const html = buildAdrianaComparisonV2HTML(JAVIER_TROYA_DEMO);
  expect(html).toContain('Seguros Sucre');
  expect(html).toContain('Seguros Unidos');
});

test('✅ competitor row NO aparece si competitors=[]', () => {
  const html = buildAdrianaComparisonV2HTML({ ...JAVIER_TROYA_DEMO, competitors: [] });
  expect(html).not.toContain('comp2-row');
});
```

---

## BLOQUE 5 — Notificaciones a Diego (10 min)

Cuando un lead acepta → Diego recibe WA inmediato via `notifyHighIntent()`:
```
🛡️ ADRIANA — Nuevo Seguro Aceptado!

Cliente: Javier Troya
Vehículo: Hyundai Creta 2022
Prima anual: $1,101
Aseguradora: VAZ Seguros

Siguiente paso: coordinar KYC y emisión
Dashboard: https://coworkia-agent.herokuapp.com/adriana-seguros.html
```

---

## 🚀 SECUENCIA DE EJECUCIÓN

```
1. [adrianaRepository.js]  → verificar/agregar columnas insurance_leads
2. [adrianaRepository.js]  → nuevas funciones CRUD
3. [wassenger.js]           → handleAdrianaFlow() + bug fix cédula
4. [email-template-system.js] → dispatcher ADRIANA_COMPARISON_V2 + builder
5. [tests]                  → tests flujo completo Javier Troya
6. [index.js]               → wiring si necesario
7. [notification-service.js] → notify Diego al aceptar
8. git commit + push heroku
9. notificar Diego por WA ✅
```

---

## ✅ CHECKLIST ANTES DE COMMITEAR (GUARDIAN)

- [ ] `insurance_leads` tiene todas las columnas nuevas con `IF NOT EXISTS`
- [ ] `analyzeIDCard()` se usa para cédulas (no `analyzeLicencia...`)
- [ ] `handleAdrianaFlow()` no se ejecuta si el mensaje no es de Adriana's leads
- [ ] Template variables: todos los `{{...}}` tienen fallback en el builder
- [ ] Tests pasan: `node --experimental-vm-modules npx jest tests/unit/adriana* --no-coverage`
- [ ] Javier Troya seed: `SEG-DEMO-0011` tiene `competitor_quotes` populadas

---

## 📊 ESTADO DE ENTREGABLES

| Entregable | Chat responsable | Estado |
|------------|-----------------|--------|
| Email HTML comparativa con competidores | FRONTEND | ✅ 22 Mar |
| Calculadora VAZ bracket rates | FRONTEND/BACKEND | ✅ 22 Mar |
| Vision AI extracción docs | BACKEND | ✅ v1020 |
| adrianaRepository columnas KYC | **BACKEND** | 🔵 Este bloque |
| wassenger handleAdrianaFlow | **BACKEND** | 🔵 Este bloque |
| email-template-system dispatcher V2 | **BACKEND** | 🔵 Este bloque |
| Tests flujo Javier Troya | **BACKEND** | 🔵 Este bloque |
| Deploy a Heroku | **BACKEND** | 🔵 Al final |
