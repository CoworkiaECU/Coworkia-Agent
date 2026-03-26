# ✈️ Plan de Vuelo — Adriana Multi-Document Recognition
**Fecha**: 25 Mar 2026  
**Objetivo**: Expandir Vision AI de Adriana para reconocer automáticamente 3 tipos de documentos ecuatorianos: Cédula, Matrícula Vehicular y Licencia de Conducir  
**Estimado**: 2.5 - 3h  
**Prioridad**: ALTA  
**Estado**: 🟡 PENDIENTE

---

## 🎯 Impacto de Negocio

**ANTES**: Cliente envía 1 foto (cédula) → sistema pide marca/modelo/año manual  
**DESPUÉS**: Cliente envía 2-3 fotos (matrícula + cédula + licencia opcional) → sistema extrae TODO automáticamente

**Beneficios**:
- ✅ Reduce fricción en onboarding (menos preguntas manuales)
- ✅ Auto-completa datos del vehículo desde matrícula
- ✅ Valida licencia de conducir automáticamente
- ✅ Calcula score de riesgo más preciso
- ✅ Mejora conversión (proceso más rápido)

---

## 📋 Arquitectura Propuesta

```
Cliente envía foto WhatsApp
    ↓
/api/adriana/extract-document (nuevo endpoint genérico)
    ↓
adriana-document-analyzer.js (nuevo servicio)
    ├── detectDocumentType() → quick pre-análisis
    ├── extractCedula() → ya existe, reutilizar
    ├── extractMatricula() → NUEVO (placa, marca, modelo, año)
    └── extractLicencia() → NUEVO (tipo, categoría, vigencia)
    ↓
Guardar en adriana_documents (nueva tabla)
    ↓
Form conversacional valida y avanza automáticamente
    ↓
Cotización generada con datos completos
```

---

## 📋 Tareas

### 🟥 Bloque 1: Servicio Document Analyzer + Detección de Tipo (45 min)

- [ ] **1.1** Crear `src/servicios/adriana-document-analyzer.js`:
  - Función `detectDocumentType(imageUrl)`: pre-análisis para clasificar
  - Función `extractCedula(imageUrl)`: mover lógica desde adriana.js
  - Función `extractMatricula(imageUrl)`: prompt especializado matrícula
  - Función `extractLicencia(imageUrl)`: prompt especializado licencia
  - Función `analyzeDocument(imageUrl, expectedType)`: orquestador principal

- [ ] **1.2** Prompts Vision AI especializados:
  ```javascript
  // PROMPT_DETECT_TYPE: clasificador simple (cedula|matricula|licencia|otro)
  // PROMPT_CEDULA: ya existe, copiar del endpoint actual
  // PROMPT_MATRICULA: extraer placa, marca, modelo, año, motor, chasis, etc.
  // PROMPT_LICENCIA: extraer tipo, categoría, vigencia, restricciones
  ```

- [ ] **1.3** Validaciones por tipo de documento:
  - Cédula: 10 dígitos exactos, provincia válida
  - Matrícula: placa formato Ecuador, marca/modelo present, año 1990-2026
  - Licencia: tipo válido (A/B/C/D/E), vigencia no vencida, categoría mínima

- [ ] **1.4** Response unificado:
  ```javascript
  {
    success: true,
    documentType: 'cedula|matricula|licencia',
    data: { ...campos según tipo... },
    confidence: 0.95,
    validations: { ...errores si hay... }
  }
  ```

---

### 🟧 Bloque 2: Endpoint Genérico + Tabla BD (30 min)

- [ ] **2.1** Crear endpoint `/api/adriana/extract-document` en `adriana.js`:
  - POST con body: `{ image: base64String, expectedType?: string }`
  - Llamar a `analyzeDocument()` del servicio nuevo
  - Mantener `/extract-cedula` por backward compatibility (deprecado)

- [ ] **2.2** Crear tabla `adriana_documents` en `postgres-adapter.js`:
  ```sql
  CREATE TABLE IF NOT EXISTS adriana_documents (
    id SERIAL PRIMARY KEY,
    user_phone TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('cedula', 'matricula', 'licencia')),
    image_url TEXT,
    extracted_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    quote_code TEXT,
    FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_adriana_documents_user ON adriana_documents(user_phone);
  CREATE INDEX IF NOT EXISTS idx_adriana_documents_type ON adriana_documents(document_type);
  CREATE INDEX IF NOT EXISTS idx_adriana_documents_quote ON adriana_documents(quote_code);
  ```

- [ ] **2.3** Funciones BD en `adrianaRepository.js`:
  - `saveDocumentAnalysis(userPhone, documentType, imageUrl, data, confidence)`
  - `getDocumentsByUser(userPhone, documentType?)`
  - `getDocumentsByQuote(quoteCode)`

---

### 🟨 Bloque 3: Form Conversacional Multi-Upload (45 min)

- [ ] **3.1** Modificar Paso 3 en `adriana-conversational-form.js`:
  - ANTES: "Envíame una foto de tu cédula"
  - DESPUÉS: "Envíame 2 fotos: 1️⃣ Matrícula de tu vehículo, 2️⃣ Tu cédula (opcional: licencia)"

- [ ] **3.2** Lógica estado multi-documento:
  ```javascript
  step3State: {
    documentsReceived: {
      cedula: false,
      matricula: false,
      licencia: false // opcional
    },
    extractedData: {
      cedula: null,
      matricula: null,
      licencia: null
    }
  }
  ```

- [ ] **3.3** Handler foto en Paso 3:
  - Detectar tipo de documento automáticamente
  - Si es matrícula → guardar datos vehículo + pedir cédula si falta
  - Si es cédula → guardar datos personales + pedir matrícula si falta
  - Si es licencia → validar vigencia/categoría + guardar como bonus
  - Avanzar a Paso 4 solo cuando tenga matrícula Y cédula

- [ ] **3.4** Auto-fill desde matrícula:
  - Si matrícula tiene marca/modelo/año → pre-llenar en conversation state
  - Saltar preguntas redundantes en siguientes pasos
  - Confirmar con usuario: "Detecté TOYOTA COROLLA 2020, ¿es correcto?"

---

### 🟦 Bloque 4: Validaciones de Negocio (30 min)

- [ ] **4.1** Score de Riesgo:
  ```javascript
  function calculateRiskScore(cedulaData, matriculaData, licenciaData) {
    let score = 100; // base
    
    // Edad conductor
    if (cedulaData.edad < 25) score -= 15; // joven
    if (cedulaData.edad > 60) score -= 10; // mayor
    
    // Antigüedad vehículo
    const vehicleAge = new Date().getFullYear() - matriculaData.anio;
    if (vehicleAge > 15) score -= 20; // muy viejo
    if (vehicleAge > 20) score -= 30; // antiguo crítico
    
    // Licencia
    if (!licenciaData) score -= 5; // no provista
    else if (licenciaData.vencida) score -= 40; // vencida crítico
    else if (!['B','C','D','E'].includes(licenciaData.tipoLicencia)) score -= 25; // tipo incorrecto
    
    return Math.max(0, Math.min(100, score));
  }
  ```

- [ ] **4.2** Validaciones licencia:
  - Si vencida → "⚠️ Tu licencia está vencida. Necesitas renovarla para el seguro."
  - Si categoría < B → "⚠️ Necesitas licencia tipo B mínimo para vehículos livianos."
  - Si no provista → continuar pero advertir en cotización

- [ ] **4.3** Validaciones matrícula:
  - Si año < 2000 → "⚠️ Vehículo antiguo, cobertura limitada disponible"
  - Si tipo = PESADO → "⚠️ Este es seguro para vehículos livianos, contacta a soporte"
  - Si placa no formato Ecuador → "⚠️ Placa no parece ecuatoriana, verifica"

---

### 🟩 Bloque 5: Tests + Deploy (30 min)

- [ ] **5.1** Test suite `tests/adriana-multi-document.test.js`:
  - Test detectar tipo documento (3 imágenes diferentes)
  - Test extraer matrícula completa con validaciones
  - Test extraer cédula (regresión del existente)
  - Test extraer licencia con validación vigencia
  - Test flujo multi-upload: matrícula → cédula → auto-avance
  - Test rechazar licencia vencida
  - Test rechazar licencia categoría A (motos) para seguro auto

- [ ] **5.2** Commit 1: Servicio + Endpoint
  ```bash
  git commit -m "feat(adriana): endpoint genérico extract-document + detección tipo automática"
  ```

- [ ] **5.3** Commit 2: Form Multi-Upload
  ```bash
  git commit -m "feat(adriana): form conversacional multi-upload matrícula + cédula + licencia"
  ```

- [ ] **5.4** Commit 3: Validaciones + Tests
  ```bash
  git commit -m "feat(adriana): validaciones negocio + score riesgo + tests completos"
  ```

- [ ] **5.5** Deploy a Heroku
  ```bash
  git push heroku main
  ```

- [ ] **5.6** Magic Todo + Notificación WA
  ```javascript
  POST /api/todos: "Adriana Multi-Document Recognition - COMPLETED"
  notifyAutopilotComplete() al celular de Diego
  ```

---

## 🗺️ Archivos a Crear/Modificar

| Archivo | Acción | Tiempo |
|---------|--------|--------|
| `src/servicios/adriana-document-analyzer.js` | **CREAR** — 5 funciones nuevas | 30min |
| `src/express-servidor/endpoints-api/adriana.js` | Añadir `/extract-document`, mantener legacy `/extract-cedula` | 15min |
| `src/database/postgres-adapter.js` | Tabla `adriana_documents` + índices | 10min |
| `src/database/adrianaRepository.js` | 3 funciones nuevas para documentos | 10min |
| `src/servicios/adriana-conversational-form.js` | Modificar Paso 3, añadir estado multi-doc | 30min |
| `tests/adriana-multi-document.test.js` | **CREAR** — 7 tests críticos | 20min |
| `README.md` o `CHANGELOG.md` | Documentar nueva funcionalidad | 5min |

**Total estimado**: 2h 30min (sin contar delays de OpenAI)

---

## 🎯 Resultado Esperado

### ANTES (flujo actual):
```
Cliente → Envía cédula
Sistema → ¿Qué vehículo?
Cliente → Toyota Corolla
Sistema → ¿Qué año?
Cliente → 2020
Sistema → Generando cotización...
```
**Fricciones**: 3-4 preguntas manuales, posible abandono

### DESPUÉS (flujo mejorado):
```
Cliente → Envía matrícula + cédula
Sistema → Detecté TOYOTA COROLLA 2020, conductor 35 años, ¿correcto?
Cliente → Sí
Sistema → Cotización lista!
```
**Fricciones**: 1 confirmación, conversión +40%

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| OpenAI Vision API falla en fotos borrosas | Alta | Medio | Validar confidence score, pedir nueva foto si < 0.8 |
| Formatos de matrícula varían por provincia | Media | Bajo | Regex flexible, aceptar variaciones AAA-#### o AA-####-AA |
| Licencia antigua (pre-2010) diferente formato | Baja | Bajo | Prompt menciona "formato moderno", fallback a null |
| Cliente envía 3 fotos diferentes del mismo documento | Baja | Bajo | Detectar duplicados por tipo, usar última foto |
| Breaking change en `/extract-cedula` | Baja | Alto | **Mantener endpoint legacy**, solo deprecar en docs |

---

## 📌 Notas Técnicas Críticas

### NO hacer:
❌ Romper funcionalidad existente de `/extract-cedula`  
❌ Reinventar `analyzeImage()` de openai.js (reutilizar)  
❌ Hardcodear prompts en endpoint (centralizar en servicio)  
❌ Olvidar logging en `loggers.adriana`  
❌ Deployar sin tests de regresión  

### SÍ hacer:
✅ Mantener backward compatibility con endpoint legacy  
✅ Cache documentos analizados en BD (no re-analizar si existe)  
✅ Validaciones estrictas: foto borrosa = rechazar y pedir nueva  
✅ Response siempre con `{ success, documentType, data, confidence, validations }`  
✅ Error handling robusto (foto borrosa, doc extranjero, etc)  
✅ Calcular score de riesgo para mejorar pricing futuro  

---

## 🚀 Comando de Activación

```
autopilot verde nena - ejecuta plan-vuelo-adriana-multi-doc-25mar.md completo
```

**Ejecutar con**: coworkia-autopilot skill  
**Checkpoints**: Cada bloque completado (5 checkpoints)  
**Notificar**: Diego por WA al terminar o si se bloquea
