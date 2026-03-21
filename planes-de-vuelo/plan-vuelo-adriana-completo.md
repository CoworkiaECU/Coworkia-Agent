# ✈️ Plan de Vuelo — ADRIANA COMPLETO v2
## Agente: Adriana | Producto: Seguro Vehicular SegPopular × VAZ

> **Sesión**: 22 Mar 2026 en adelante  
> **Contexto**: Construido con documentos reales de VAZ: Formulario KYC "Conozca a su Cliente" + Cotización VH Hyundai Creta + Términos de Asistencia Vial  
> **Estado base**: Vision AI ✅ · Calculadora VAZ ✅ · Email template ✅ · Dashboard parcial ✅

---

## 🧠 LO QUE APRENDIMOS DE LOS DOCUMENTOS VAZ

### Documento 1: Cotización VH Hyundai Creta (Javier Troya)
- VAZ genera un PDF de cotización con: marca/modelo/año, valor asegurado, prima anual, coberturas incluidas
- El PDF real es la fuente de verdad para el **email comparativo de Adriana**
- Formato: logo VAZ + datos del vehículo + tabla de coberturas + prima
- **→ El email HTML que construimos debe replicar este formato**

### Documento 1b: LIVIANOS 1710244409.pdf + COTIZADOR AFEX VEHICULOS JORGE JAVIER TROYA.pdf
Estos son los documentos de cotización REAL de Javier Troya para el Hyundai Creta 2021 por $42,000:
- Valor asegurado: $42,000 → Tasa 2.20% (Ensigna, Sierra Norte) → Prima base: $924
- + IVA 15% → $1,062.60 + emisión ~$38.50 = **~$1,101/año**
- El "COTIZADOR AFEX" es la herramienta que VAZ usa internamente (NO el cotizador de SegPopular)
- **→ Usar $42,000 × 2.20% = $924 como ejemplo canónico de cálculo en tests**

### Documento 2: Formulario "Conozca a Su Cliente" (KYC VAZ)
Este es el formulario que VAZ REQUIERE para **emitir la póliza** (no solo cotizar). Tiene 7 secciones:

| Sección | Datos requeridos | ¿Tenemos? |
|---------|-----------------|-----------|
| 1. Datos del Asegurado | Cédula, Nombres, Apellidos, Nac., Lugar nacimiento, Fecha nacimiento, Dirección, Email, Teléfono, Sexo | ⚠️ Parcial (cédula sí, fecha nacimiento NO) |
| 1b. Estado Civil | SOLTERO/CASADO/DIVORCIADO/VIUDO/UNIÓN LIBRE | ❌ No recopilamos |
| 1c. Datos Cónyuge | Si CASADO: cédula, nombre, teléfono cónyuge | ❌ No recopilamos |
| 2. Propósito Comercial | RAMO: VEHICULOS, Valor Suma Asegurada | ✅ Sí (del formulario) |
| 3. Información Laboral | Empresa, dirección, cargo, email laboral | ❌ No recopilamos |
| 4. Información Financiera | Ingresos, egresos, activos, pasivos, banco, tipo cuenta, número | ❌ No recopilamos |
| 5. Declaración PEP | 3 preguntas sobre cargos públicos | ❌ No recopilamos |
| 7. Documentos | Cédula adjunta, impuesto renta | ⚠️ Parcial |

**→ CONCLUSIÓN: El flujo actual genera COTIZACIÓN pero nunca EMITE la póliza. Para emitir: necesitamos recopilar los datos KYC vía WhatsApp.**

### Documento 3: Términos de Asistencia Vial VAZ
- Asistencia vial incluida en coberturas STANDARD y PREMIUM
- Servicios: grúa, auxilio mecánico, taxi, cerrajero, hospedaje
- Límite: 4 eventos/año, radio 80km
- **→ Esto debe mencionarse como diferenciador en el mensaje de presentación de cobertura**

### Bug Crítico Identificado:
El flow actual pide **LICENCIA DE CONDUCIR** pero VAZ necesita **CÉDULA DE IDENTIDAD**. 
- Licencia: tipo A/B/C, fecha expiración → solo útil para validar que conduce
- Cédula: número, nombres completos, fecha nacimiento, lugar → eso es lo que KYC necesita
- **→ CAMBIAR `analyzeLicenciaImages()` → `analyzeCedulaImages()` reusando `analyzeIDCard()` de `insurance-document-analysis.js`**

### Corrección Mayor: Producto VAZ es TODO RIESGO por tramo de valor (no BASIC/STANDARD/PREMIUM por edad)
- El `insurance-rates-vaz.js` anterior tenía tasas por antigüedad (0.45%-3.60%) que eran INVENTADAS
- Las tasas REALES son por TRAMO DE VALOR:
  - $30k-$35k → **2.40%** (Sierra Norte/Sur igual)
  - $35k-$70k → **2.20%** (Sierra Norte/Sur igual)
  - $20k-$25k → 3.80% Sierra Norte | 3.50% Sierra Sur
- Solo hay UN producto: Todo Riesgo. DOS opciones de deducible:
  - **Taller Designado**: 7% del daño, repuestos alternos → más económico por siniestro
  - **Libre Designación**: 10% del daño, repuestos originales, taller propio → más libertad
- Para Ensigna ($20k-$70k): Amparo Patrimonial INCLUIDO en la tasa base
- ✅ `insurance-rates-vaz.js` actualizado con todos estos datos oficiales (commit pendiente)
- **→ Adriana ahora ofrece DOS opciones, no tres**:
  - Opción 1: Todo Riesgo + Taller Designado (más económico por siniestro)
  - Opción 2: Todo Riesgo + Libre Designación (taller propio, repuestos originales)

---

## 📊 INVENTARIO ACTUAL (Pre-trabajo)

### ✅ Ya existe y funciona
| Archivo | Qué hace |
|---------|----------|
| `insurance-form.js` | Flujo: city → value → fotos → Vision AI → quote → confirm |
| `insurance-document-analysis.js` | Extrae datos de VEHICLE_REGISTRATION, ID_CARD, CAR_APPRAISAL, COMPETITOR_QUOTE |
| `adriana-quote-calculator.js` | `calculateVehiclePremium()`, `calculateAllCoverages()`, `inferVehicleCategory()` |
| `insurance-rates-vaz.js` | Tasas BASIC/STANDARD/PREMIUM por antigüedad (approx, pendiente tasas oficiales) |
| `adrianaRepository.js` | `saveInsuranceLead()`, `getInsuranceLead()`, `upsertQuoteLead()` |
| `insurance-confirmation.js` | Procesa SI → guarda lead → envía email |
| `adriana-cotizacion-email.js` | Email desde comando del jefe (modo JEFE, no cliente) |
| `adriana-quote-comparison.html` | Template standalone HTML preview |
| `email-template-system.js` | `buildEmailTemplate('ADRIANA', 'COMPARISON', data)` |
| Wassenger.js handler | Procesa ADRIANA flows, líneas 1817, 2539-2764 |
| `adriana-seguros.html` | Dashboard básico |

### ❌ Gaps identificados
1. **`adriana_quote_leads` table** — no existe. Se usa `insurance_leads` sin campos KYC
2. **Solicita licencia en lugar de cédula** — cambio critico para KYC
3. **Sin recopilación financiera/KYC** — el flujo termina en cotización, nunca en binding
4. **`calculateAllCoverages()` no está conectado al WA flow** — solo calcula 1 cobertura
5. **Dashboard sin columnas nuevas**: form_step, avalúo, coverage seleccionada, KYC status

---

## 🗓️ BLOQUES DE TRABAJO

---

### 🔵 BLOQUE 1 — Base de Datos (backend chat, ~20 min)
**Objetivo**: Crear tabla `adriana_quote_leads` que soporte el flujo completo incluyendo KYC

**Archivo**: `src/database/migrations/` + `src/database/adrianaRepository.js`

```sql
-- Tabla adriana_quote_leads
CREATE TABLE IF NOT EXISTS adriana_quote_leads (
  id               TEXT PRIMARY KEY,
  quote_code       TEXT UNIQUE NOT NULL,
  user_phone       TEXT NOT NULL,
  
  -- Form step tracking
  form_step        TEXT DEFAULT 'start',
  -- start → city → value → matricula_photos → cedula_photos 
  -- → analyzing → coverage_selection → quote_sent 
  -- → kyc_civil_status → kyc_spouse → kyc_work → kyc_finance 
  -- → kyc_bank → kyc_pep → kyc_complete → binding_sent
  
  -- Vehicle data (from matrícula Vision AI)
  vehicle_data     JSON,      -- {plate, brand, model, year, motor, chasis, originCountry}
  commercial_value NUMERIC,
  
  -- Client data (from cédula Vision AI)
  cedula_data      JSON,      -- {cedula, nombres, apellidos, fechaNacimiento, lugarNacimiento, nacionalidad}
  client_name      TEXT,
  cedula           TEXT,
  email            TEXT,
  
  -- Photo URLs
  matricula_images  JSON,     -- []
  cedula_images     JSON,     -- []
  
  -- Quote result
  selected_coverage TEXT,     -- 'basic' | 'standard' | 'premium'
  quoted_premium    NUMERIC,
  premium_breakdown JSON,
  
  -- KYC data (collected conversationally)
  kyc_data         JSON,
  /* kyc_data structure:
  {
    "sexo": "M",
    "estadoCivil": "CASADO",
    "conyuge": {
      "cedula": "1803090651",
      "nombre": "PAMELA AVALOS COBO",
      "telefono": "0994153468"
    },
    "direccion": "PASAJE VERONA ...",
    "profesion": "Actividades profesionales, técnicas y administrativas",
    "detActividadEconomica": "Actividades de administración de empresas",
    "empresa": "NUBE",
    "cargo": "GERENTE GENERAL",
    "emailLaboral": "jota@nube.ec",
    "telefonoLaboral": "0994153468",
    "ingresosMensuales": 2500,
    "egresosMensuales": 2000,
    "otrosIngresos": 0,
    "activos": 200000,
    "pasivos": 80000,
    "patrimonio": 120000,
    "bancoNombre": "PRODUBANCO",
    "tipoCuenta": "AHORROS",
    "numeroCuenta": "12050142319",
    "pep_cargo_publico": false,
    "pep_familiar_pep": false,
    "pep_colaborador_pep": false
  }
  */
  
  -- Admin
  status           TEXT DEFAULT 'lead',
  -- lead → quoted → kyc_pending → kyc_complete → binding_sent → policy_issued → cancelled
  
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  quote_sent_at    TIMESTAMP,
  kyc_sent_at      TIMESTAMP,
  binding_sent_at  TIMESTAMP
);
```

**Deliverables**:
- [ ] Migration `adriana_quote_leads` en `src/database/` con IF NOT EXISTS
- [ ] `adrianaRepository.js` → nuevas funciones: `upsertQuoteLead()`, `getLeadByPhone()`, `updateFormStep()`, `updateKYCData()`, `updateCoverageSelection()`
- [ ] Mantener `insurance_leads` para backward compat (no borrar)

---

### 🔵 BLOQUE 2 — Vision AI: Licencia → Cédula (backend chat, ~20 min)
**Objetivo**: Cambiar extracción de LICENCIA por CÉDULA (lo que VAZ KYC requiere)

**Archivo**: `src/servicios/insurance-form.js`

**Cambios**:
- `analyzeLicenciaImages()` → `analyzeCedulaImages()`
- Prompt nuevo para cédula ecuatoriana:
  ```json
  {
    "cedula": "1710244409",
    "nombres": "JORGE JAVIER",
    "apellidos": "TROYA PORTILLA",
    "fechaNacimiento": "1978-07-07",
    "lugarNacimiento": "QUITO",
    "nacionalidad": "ECUATORIANA",
    "sexo": "M"
  }
  ```
- Eliminar validación `validateLicenseExpiry()` — cédulas no expiran (renovación ≥2028)
- Actualizar mensajes al cliente: "📸 Envíame la foto de tu **cédula de identidad** (anverso)" 
- Actualizar `buildInsuranceSummary()` para usar nombre completo de cédula

**Nota**: `insurance-document-analysis.js` ya tiene `analyzeIDCard()` que extrae estos campos. Reusar esa función.

**Tests**:
- [ ] Test: analyzeCedulaImages() extrae todos los campos
- [ ] Test: cédula con datos parciales no bloquea el flujo

---

### 🔵 BLOQUE 3 — Coverage Selection Step (backend chat, ~30 min)
**Objetivo**: Adriana presenta 2 opciones de deducible y cliente elige antes de confirmar

> ⚠️ VAZ ofrece UN SOLO producto Todo Riesgo con DOS opciones de deducible.
> El precio ANUAL es el MISMO. La diferencia está en el deducible por siniestro.

**El menú de coberturas** (después de Vision AI analysis):

```
🛡️ *COTIZACIÓN SEGURO VEHICULAR — VAZ ENSIGNA*
Toyota RAV4 2022 | Valor asegurado: $42,000 | Quito

Prima anual: *$1,101* (incluye IVA + emisión)
Cuota mensual: *$110* × 10 meses

━━━━━━━━━━━━━━━━━━━━━━━━━━
Elige tu opción de deducible:

*1️⃣ TALLER DESIGNADO* — Paga 7% del daño
  Repuestos de calidad equivalente
  Mínimo deducible: $150
  💡 Mejor si quieres pagar menos por siniestro

*2️⃣ LIBRE DESIGNACIÓN* ⭐ — Paga 10% del daño
  Elige TÚ el taller | Repuestos originales
  Mínimo deducible: $200
  💡 Mejor si quieres libertad y calidad original
━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 Todas las opciones incluyen:
✅ RC $40,000 | Gastos médicos $6,000 | Muerte accidental $3,000
✅ Robo total, vandalismo, eventos naturales, vidrios
✅ VAZAsistencia: grúa, auxilio vial, cerrajería, conductor elegido

Responde *1* o *2* 👆
```

**Cálculo con tasas reales VAZ**:
- $42,000 → Ensigna → Sierra Norte → 2.20%
- Prima base: $42,000 × 0.0220 = $924
- IVA: $924 × 0.15 = $138.60
- Emisión + super + admin: $38.50
- **Total: $1,101/año | $110/mes × 10**

**Implementación**:
- `insurance-form.js` → nuevo estado `coverage_selection` después de Vision AI
- Llamar `calculateVazPremiumOfficial(value, 'light', region)` desde `insurance-rates-vaz.js`
- Determinar región desde ciudad: Sierra Norte (Quito/Ibarra/Ambato/Riobamba) vs Sierra Sur (Cuenca/Loja)
- Parsear respuesta 1/2 o texto "taller designado"/"libre designación"
- Guardar: `selected_deductible_option: 'TALLER_DESIGNADO' | 'LIBRE_DESIGNACION'`

**Tests**:
- [ ] Test: $42,000 Quito liviano → tasa 2.20%, total $1,101
- [ ] Test: $32,000 Cuenca liviano → tasa 2.40%, total correcto
- [ ] Test: cliente responde "1" → guarda TALLER_DESIGNADO
- [ ] Test: cliente responde "libre" → infiere LIBRE_DESIGNACION
- [ ] Test: respuesta inválida → repite menu

---

### 🔵 BLOQUE 4 — KYC Conversacional (backend chat, ~60 min)
**Objetivo**: После cotización aceptada, recopilar datos KYC de manera conversacional

**Estados del formulario KYC** (flujo WhatsApp):

```
quote_sent → [cliente escribe "SI o quiero proceder"]
  → kyc_civil_status
    Adriana: "Para completar tu póliza necesito algunos datos. 
              ¿Cuál es tu estado civil?
              1️⃣ Soltero/a  2️⃣ Casado/a  3️⃣ Divorciado/a  
              4️⃣ Unión libre  5️⃣ Viudo/a"
  
  → kyc_spouse (solo si CASADO o UNIÓN LIBRE)
    "¿La cédula de tu cónyuge o pareja? (Ej: 1234567890)"
    "¿Su nombre completo?"
    "¿Su teléfono?"
  
  → kyc_profession
    "¿Cuál es tu profesión o actividad económica principal?"
    (texto libre, no validar)
  
  → kyc_work
    "¿Nombre de la empresa donde trabajas?"
    "¿Tu cargo?"
    "¿Email laboral? (o el mismo correo personal)"
  
  → kyc_finance
    "Para el trámite bancario, ¿cuál es tu ingreso mensual aprox? 
     Solo el rango está bien: ej. $2.500"
    → Adriana captura solo ingresos (egresos los puede estimar 60% del ingreso)
    → Activos: valor del vehículo + otros (simplificado)
  
  → kyc_bank (OPCIONAL)
    "¿Banco, tipo de cuenta y número? 
     Ejemplo: Produbanco / Ahorros / 12345678
     (Solo necesario para reembolsos, puedes omitir)"
  
  → kyc_pep
    "Una pregunta de ley: ¿Tú o algún familiar cercano tiene 
    o ha tenido algún cargo en el sector público ecuatoriano? SI/NO"
  
  → kyc_complete
    Adriana: "✅ ¡Listo! Tengo todos los datos.
              Envió la cotización y formulario de vinculación 
              a tu email [email] para firma electrónica.
              💬 ¿Alguna pregunta sobre la póliza?"
```

**Implementación**:
- Nuevo servicio: `src/servicios/adriana-kyc-form.js`
  - `processKYCStep(userId, message, currentStep, kycData)` → `{ nextStep, kycData, waMessage }`
  - `parseStateSelection(message)` → SOLTERO/CASADO/etc.
  - `buildKYCComplete(leadData, kycData)` → completo para email
- Agrupa pasos similares (work: empresa + cargo en la misma conversación)
- Actualiza `adriana_quote_leads.kyc_data` en cada paso
- Al completar → llama `buildEmailTemplate('ADRIANA', 'KYC_FORM', data)` → envía email

**Tests para `adriana-kyc-form.js`**:
- [ ] Test: estado civil 1→SOLTERO, 2→CASADO, ...
- [ ] Test: CASADO activa flujo cónyuge
- [ ] Test: PEP NO → default false
- [ ] Test: banco OPCIONAL → puede omitir
- [ ] Test: `buildKYCComplete()` → objeto completo para email

---

### 🔵 BLOQUE 5 — Email KYC + Template (backend + frontend)
**Objetivo**: Generar y enviar el formulario KYC de VAZ como HTML para firma

**Opción A (MVP)**: Email HTML con todos los datos pre-llenados
- Template: `email-templates/adriana-kyc-vaz.html`
- Muestra todos los datos del KYC en formato del formulario VAZ
- Botón "Ver formulario completo" → link a versión web
- Asunto: "📋 Tu formulario de vinculación VAZ — [NOMBRE VEHÍCULO]"

**Opción B (Completo)**: HTML interactivo que envías al cliente para revisión + firma digital
- Formulario pre-llenado editable
- Botón "Firmar electrónicamente" → genera PDF
- (⚠️ Requiere backend para PDF generation → Fase posterior)

**¿Cuál implementar primero?** → **Opción A** es suficiente para el MVP y Adriana puede cerrar ventas con esto.

**`email-template-system.js` agregar**:
```js
case 'ADRIANA_KYC_FORM':
  return buildAdrianaKYCFormHTML(data);
```

**Template datos para `buildAdrianaKYCFormHTML(data)`**:
- `data.client` → {nombre, cedula, email, telefono, fechaNac, lugarNac, sexo, ...}
- `data.vehicle` → {plate, brand, model, year, commercial_value}
- `data.kyc` → {estadoCivil, conyuge, empresa, cargo, ingresos, banco, pep}
- `data.quote` → {coverage, premium_annual, premium_monthly, deductible}

**Deliverables**:
- [ ] `email-templates/adriana-kyc-vaz.html` — template con logo VAZ + datos pre-llenados
- [ ] `buildAdrianaKYCFormHTML(data)` en `email-template-system.js`
- [ ] Dispatcher case `ADRIANA_KYC_FORM` en `sendEmail()`

---

### 🔵 BLOQUE 6 — Dashboard `adriana-seguros.html` (frontend chat, ~40 min)
**Objetivo**: Actualizar dashboard para mostrar el nuevo flujo completo

**Columnas actuales** (estimadas): código, teléfono, vehículo, prima, estado, fecha, acciones

**Columnas nuevas a agregar**:
| Columna | Valores | Color |
|---------|---------|-------|
| `form_step` | start → quote_sent → kyc_complete → binding_sent | chips colores |
| `cobertura` | BÁSICO / TODO RIESGO / PREMIUM | pill naranja/azul/oro |
| `valor asegurado` | "$42,000" | texto |
| `prima cotizada` | "$1,350/año" | texto verde |

**Botones de acción a agregar**:
- 📋 **Ver KYC** → abre modal con datos KYC del lead
- 📧 **Re-enviar formulario** → `POST /api/adriana/leads/:code/resend-kyc`
- 📲 **WA** → ya existe (con ADMIN_PHONE guard) ✅

**Diseño**:
- Colores Adriana: `#1E3A5F` azul marino, `#F5A623` ámbar VAZ, `#FFFFFF`
- Header logo: logo adriana SVG (ya existe en `/public/images/logos/adriana.svg`)
- KPI nuevos: Total Leads | Cotizaciones Enviadas | KYC Completo | Pólizas Emitidas

---

### 🔵 BLOQUE 7 — Pruebas End-to-End (backend + frontend)
**Objetivo**: Suite de tests que cubre el flujo completo Adriana

**Tests a crear** en `tests/unit/adriana-full-flow.test.js`:
- [ ] Ciudad Sierra → acepta Quito
- [ ] Ciudad Costera → rechaza Guayaquil
- [ ] Valor $42,000 → válido
- [ ] Valor $60,000 → rechaza (>$55k)
- [ ] Foto matrícula → extrae datos correctamente
- [ ] Foto cédula → extrae datos correctamente (no licencia)
- [ ] Coverage selection "1" → BASIC
- [ ] Coverage selection "todo riesgo" → STANDARD
- [ ] Quote enviado → calcula prima STANDARD correcta
- [ ] KYC: estado civil CASADO → activa paso cónyuge
- [ ] KYC: estado civil SOLTERO → salta paso cónyuge
- [ ] KYC: PEP "NO" → marca false
- [ ] KYC completo → genera email con todos los datos
- [ ] DB: upsertQuoteLead() actualiza form_step en cada paso

---

## 📋 CHECKLIST NUEVO FLUJO COMPLETO

### Flujo WhatsApp Adriana v2 (paso a paso):

```
1. Usuario: Hola Adriana / quiero cotizar seguro
   → Adriana: Presentación + "¿En qué ciudad está el vehículo?"

2. Ciudad → Valida Sierra √
   → Adriana: "✅ Quito está en nuestra zona. ¿Cuál es el valor comercial del vehículo (precio actual de mercado)?"

3. Valor $30k-$55k → Válido  
   → Adriana: "📸 Envíame las fotos de la MATRÍCULA del vehículo (anverso y reverso)"

4. Fotos matrícula ×2 → Almacena URLs
   → Adriana: "✅ Recibida! Ahora necesito tu CÉDULA DE IDENTIDAD (anverso)"

5. Fotos cédula ×1-2 → Almacena URLs
   → Adriana: "⏳ Analizando documentos..." (30 seg Vision AI)

6. Vision AI: matrícula + cédula → extrae datos
   → Adriana: Muestra resumen + 3 opciones de cobertura:
   
   "📊 *Toyota RAV4 2022 | María González | $42,000*
    
    ¿Qué cobertura prefieres?
    1️⃣ BÁSICO — $X/año
    2️⃣ TODO RIESGO ⭐ — $X/año
    3️⃣ TODO RIESGO PREMIUM — $X/año"

7. Cliente elige cobertura (1/2/3)
   → Adriana: "Perfecto. ¿A qué email te envío la cotización?"

8. Email → Envía HTML comparativo + guarda lead
   → Adriana: "📧 Enviado! ¿Todo correcto? Responde *PROCEDER* para completar la póliza."

9. Cliente: PROCEDER / SI QUIERO
   → Adriana inicia flujo KYC:
   
   "Para completar tu póliza necesito algunos datos adicionales.
    ¿Cuál es tu estado civil?
    1️⃣ Soltero/a  2️⃣ Casado/a  3️⃣ Divorciado/a  4️⃣ Unión libre"

10-16. Pasos KYC conversacionales (ver BLOQUE 4)

17. KYC completo → Envía formulario pre-llenado por email
    → Adriana: "✅ ¡Listo! El formulario de vinculación ya está en tu email.
                Revísalo y fírmalo electrónicamente para activar la póliza.
                ¿Tienes alguna pregunta?"
```

---

## 🎯 PRIORIZACIÓN

| Prioridad | Bloque | Chat | Tiempo | Impacto |
|-----------|--------|------|--------|---------|
| 🔴 1 | BLOQUE 2: Licencia → Cédula | Backend | 20 min | Alto — bug crítico |
| 🔴 2 | BLOQUE 3: Coverage Selection | Backend | 30 min | Alto — flujo incompleto |
| 🟡 3 | BLOQUE 1: DB adriana_quote_leads | Backend | 20 min | Medio — sin esto no persiste bien |
| 🟡 4 | BLOQUE 4: KYC Conversacional | Backend | 60 min | Medio-Alto — diferenciador clave |
| 🟡 5 | BLOQUE 5: Email KYC | Frontend | 30 min | Medio — cierra el loop |
| 🟢 6 | BLOQUE 6: Dashboard update | Frontend | 40 min | Bajo-Medio — visibilidad |
| 🟢 7 | BLOQUE 7: Tests E2E | Backend | 30 min | Medio — calidad |

**Orden de ejecución recomendado**:
```
Backend chat: BLOQUE 1 → BLOQUE 2 → BLOQUE 3 → BLOQUE 4 → BLOQUE 7
Frontend chat (paralelo): BLOQUE 5 → BLOQUE 6
```

---

## 🔑 CONSTANTES Y DATOS CLAVE

```js
// Branding Adriana / SegPopular
const ADRIANA_COLORS = {
  primary: '#1E3A5F',    // azul marino SegPopular
  secondary: '#F5A623',  // ámbar VAZ
  accent: '#FFFFFF'
};

// ─── TASAS OFICIALES VAZ 2026 (por tramo de valor) ───
// Sierra Norte: Quito, Ibarra, Tulcán, Latacunga, Ambato, Riobamba, Guaranda, Baños
// Sierra Sur: Cuenca, Loja, Azogues, Cariamanga, Catamayo, Gualaceo

// EJEMPLO REAL: Hyundai Creta 2021, $42,000, Quito
// → Ensigna, Sierra Norte → tasa 2.20%
// → Prima base: $924 | IVA: $138.60 | Fees: $38.50 | TOTAL: ~$1,101/año | $110/mes

// Tramos clave para el TARGET de Adriana ($30k-$55k):
// $30,000-$34,999 → 2.40% (Sierra Norte y Sur igual)
// $35,000-$69,999 → 2.20% (Sierra Norte y Sur igual)
// Todas incluyen: RC $40k, Med $6k, Muerte $3k + Amparo Patrimonial

// ─── PRODUCTO VAZ ───
// UN solo producto: TODO RIESGO
// DOS opciones de deducible:
const DEDUCTIBLE_OPTIONS = {
  TALLER_DESIGNADO: { pct: '7%', min: '$150', label: 'Taller Designado' },
  LIBRE_DESIGNACION: { pct: '10%', min: '$200', label: 'Libre Designación' }
};

// VAZAsistencia siempre incluida:
// Grúa accidente: $300 sin límite eventos
// Grúa avería: $300 / 3 eventos/año  
// Auxilio vial (llanta/combustible/corriente): $200 / 3 eventos/año
// Cerrajería: $200 / 3 eventos/año
// Llave protegida: $250 / 1 evento/año
// Conductor elegido: sin límite / 3 eventos/año (pedir 2h antes)
// Defensa legal: sin límite

// Rangos permitidos para cotización
const MIN_COMMERCIAL_VALUE = 15000;  // Revisa si bajar de $30k aplica (antes era $30k)
const MAX_COMMERCIAL_VALUE = 70000;  // $70k = máximo Ensigna (arriba inicia Gama Alta)

// COSTA: NO operar hasta recibir PPTX correcto de VAZ
```

---

## ⚠️ NOTAS TÉCNICAS

1. **Tasas VAZ son aproximadas** → archivo `insurance-rates-vaz.js` tiene comentario `// NOTA: Tasas aproximadas`. Cuando Diego reciba la tabla tarifaria oficial de VAZ, reemplazar en ese archivo.

2. **La cédula reemplaza la licencia COMPLETAMENTE** — No pedir las dos. El VAZ form usa cédula, no licencia. El único caso donde necesitas licencia es para validar que tiene licencia activa → low priority, omitir en MVP.

3. **KYC complejo → hacerlo conversacional no invasivo** — datos financieros pueden dar miedo. Adriana debe encuadrar como: "Son datos de requisito legal de la aseguradora, no los compartimos con nadie más"

4. **`analyzeIDCard()` en `insurance-document-analysis.js`** ya extrae cédulas. REUSAR esta función en `insurance-form.js` en lugar de `analyzeLicenciaImages()` para no duplicar código.

5. **wassenger.js** — al agregar estados nuevos (kyc_*), agregar cases correspondientes en el handler de ADRIANA (líneas ~2539-2764)

---

## 📝 PROMPTS PARA INICIAR CADA BLOQUE

### Prompt BACKEND (Bloques 1-4, 7):
```
Retoma el plan de adriana completo. Trabaja en este orden:
BLOQUE 1: Tabla adriana_quote_leads (20 min)
BLOQUE 2: arreglar insurance-form para pedir cédula en lugar 
de licencia, reusando analyzeIDCard() de insurance-document-analysis.js
BLOQUE 3: menú de 3 coberturas después de Vision AI
BLOQUE 4: flujo KYC conversacional después de cotización aceptada
Lee el plan: /planes-de-vuelo/plan-vuelo-adriana-completo.md
```

### Prompt FRONTEND (Bloques 5-6):
```
Trabaja en el plan de Adriana, bloques frontend:
BLOQUE 5: template email adriana-kyc-vaz.html 
BLOQUE 6: actualizar adriana-seguros.html con nuevas columnas
Lee el plan: /planes-de-vuelo/plan-vuelo-adriana-completo.md
```

---

## 🏁 DEFINITION OF DONE

Adriana está "perfeccionada" cuando:
- [ ] El cliente puede pasar de "hola quiero seguro" → cotización → KYC → formulario email en 1 conversación de WhatsApp
- [ ] El formulario KYC de VAZ llega pre-llenado al email del cliente
- [ ] El cliente firma → Adriana registra `binding_sent` en BD
- [ ] Dashboard muestra el estado en cada momento
- [ ] Tasas VAZ oficiales están cargadas (pendiente Diego confirmar)
- [ ] Suite de tests cubre flujo completo (≥15 tests)

---
*Generado: 21 Mar 2026 | Basado en: Formulario KYC VAZ + Cotización Hyundai Creta Javier Troya + Términos Asistencia Vial VAZ*
