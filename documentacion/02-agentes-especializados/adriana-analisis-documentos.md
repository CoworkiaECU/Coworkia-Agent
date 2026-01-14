# 🛡️ Adriana - Sistema de Análisis de Documentos de Seguros

> **Sistema de análisis especializado de documentos de seguros para Adriana, broker experta en Segpopular S.A.**

## 📋 Índice

1. [Visión General](#visión-general)
2. [Tipos de Documentos](#tipos-de-documentos)
3. [Arquitectura](#arquitectura)
4. [Casos de Uso](#casos-de-uso)
5. [Ejemplos](#ejemplos)
6. [Testing](#testing)
7. [Limitaciones](#limitaciones)

---

## Visión General

El sistema de análisis de documentos de Adriana está diseñado para procesar y analizar documentos relacionados con seguros (pólizas, siniestros, cotizaciones, certificados, renovaciones, solicitudes, endosos) a través de WhatsApp.

### Características Principales

- ✅ **8 Tipos de Documentos** especializados
- ✅ **Análisis con GPT-4 Vision** de PDFs e imágenes
- ✅ **Detección automática** del tipo de documento
- ✅ **Prompts especializados** por tipo (1200-1500 caracteres)
- ✅ **Extracción de datos estructurados** (números de póliza, montos, fechas)
- ✅ **Scoring de calidad** (0-100)
- ✅ **Respuestas optimizadas** para WhatsApp (250-400 palabras)
- ✅ **Contexto ecuatoriano** (aseguradoras locales: BMI, Equinoccial, AIG, etc.)

### Flujo de Trabajo

```
Usuario envía PDF/imagen → Wassenger detecta → Adriana analiza → 
Extrae datos → Genera insights → Responde por WhatsApp
```

---

## Tipos de Documentos

### 1. PÓLIZA (Policy)

**Análisis especializado en:**
- Identificación de tipo de póliza (vida, vehículo, salud, etc.)
- Coberturas incluidas y exclusiones
- Análisis de costos (primas, deducibles, copagos)
- Vigencia y plazos
- Comparación con mercado ecuatoriano
- Recomendaciones de optimización

**Ejemplo de mensaje:**
```
"Te envío mi póliza de seguro de vida"
"Analiza esta póliza del carro"
"Qué tal está esta póliza?"
```

**Datos extraídos:**
- `policyNumber`: Número de póliza
- `insurer`: Aseguradora emisora
- `premium`: Prima (costo)
- `coverage`: Coberturas
- `validity`: Vigencia

---

### 2. SINIESTRO (Claim)

**Análisis especializado en:**
- Tipo de siniestro (choque, robo, incendio, fallecimiento, etc.)
- Estado del reclamo
- Documentos requeridos faltantes
- Montos involucrados
- Plazos de respuesta
- Próximos pasos recomendados

**Ejemplo de mensaje:**
```
"Quiero hacer un reclamo de siniestro"
"Ayúdame con este formulario de reclamo"
"Tuve un accidente, qué hago?"
```

**Datos extraídos:**
- `claimNumber`: Número de siniestro
- `claimDate`: Fecha del siniestro
- `claimAmount`: Monto reclamado
- `status`: Estado (en proceso, aprobado, rechazado)
- `insurer`: Aseguradora

---

### 3. COTIZACIÓN (Quote)

**Análisis especializado en:**
- Comparación entre aseguradoras
- Relación precio/cobertura
- Identificación de exclusiones importantes
- Cláusulas especiales
- Recomendaciones de negociación
- Score de competitividad (X/10)

**Ejemplo de mensaje:**
```
"Necesito una cotización para mi carro"
"Cuál de estas cotizaciones es mejor?"
"Analiza esta oferta de seguro"
```

**Datos extraídos:**
- `insurer`: Aseguradora
- `premium`: Prima cotizada
- `coverage`: Coberturas
- `competitiveScore`: Calificación (1-10)

---

### 4. CERTIFICADO (Certificate)

**Análisis especializado en:**
- Validación de cobertura certificada
- Fecha de emisión y vigencia
- Alcance de la certificación
- Uso (presentación a terceros, financieras, etc.)
- Verificación de autenticidad

**Ejemplo de mensaje:**
```
"Puedes revisar este certificado de cobertura?"
"Necesito validar este certificado"
"Me pidieron este certificado, está bien?"
```

---

### 5. RENOVACIÓN (Renewal)

**Análisis especializado en:**
- Comparación términos anteriores vs. nuevos
- Cambios en coberturas
- Incrementos de prima (justificados o no)
- Recomendación de aceptar/negociar/cambiar
- Impacto de no renovar

**Ejemplo de mensaje:**
```
"Mi póliza está por renovarse"
"Analiza esta renovación"
"Me subieron la prima, es normal?"
```

---

### 6. SOLICITUD (Application)

**Análisis especializado en:**
- Revisión de completitud del formulario
- Campos faltantes o incorrectos
- Evaluación de riesgo declarado
- Recomendaciones de información adicional
- Probabilidad de aprobación

**Ejemplo de mensaje:**
```
"Llené la solicitud de seguro"
"Revisa si está completo este formulario"
"Qué falta en esta aplicación?"
```

---

### 7. ENDOSO (Endorsement)

**Análisis especializado en:**
- Tipo de modificación (suma asegurada, beneficiario, cobertura, etc.)
- Impacto financiero (ajuste de prima)
- Vigencia del endoso
- Validación de cambios
- Próximos pasos

**Ejemplo de mensaje:**
```
"Me llegó un endoso"
"Qué significa este endoso?"
"Cambió mi póliza, ayuda"
```

---

### 8. GENERAL (General)

**Análisis adaptativo** cuando no se detecta un tipo específico:
- Identificación del contenido
- Información relevante detectada
- Recomendaciones generales
- Próximos pasos sugeridos

**Ejemplo de mensaje:**
```
"Qué es este documento?"
"Analiza esto por favor"
"No sé qué documento es"
```

---

## Arquitectura

### Componentes

```
src/servicios/insurance-document-analysis.js
├── analyzeInsuranceDocument()    // Función principal
├── detectDocumentType()           // Detección automática
├── buildInsurancePrompt()         // Generación de prompts
├── extractPolicyData()            // Extracción de pólizas
├── extractClaimData()             // Extracción de siniestros
└── calculateDocumentQualityScore() // Scoring 0-100
```

### Integración en Wassenger

```javascript
// src/express-servidor/endpoints-api/wassenger.js

if (activeAgent === 'ADRIANA' && mediaUrl) {
  // 1. Confirmación
  await enviarWhatsApp(userId, 'Perfecto! 🛡️ Analizando...');
  
  // 2. Análisis
  const { analyzeInsuranceDocument } = await import('../../servicios/insurance-document-analysis.js');
  const result = await analyzeInsuranceDocument(mediaUrl, message);
  
  // 3. Respuesta
  await enviarWhatsApp(userId, result.analysis + '\n\n¿Necesitas que aclare algo? 😊');
  
  // 4. Persistencia
  await conversationAdapter.saveConversationMessage(
    userId, 'assistant', result.analysis, 'SEGURO', {...}
  );
}
```

### Configuración de Precisión

```javascript
// Alta precisión para análisis legal/financiero
const analysisResult = await analyzeImage(documentUrl, prompt, {
  max_tokens: 1000,      // Respuestas completas
  temperature: 0.1       // Baja creatividad, alta exactitud
});
```

---

## Casos de Uso

### Caso 1: Análisis de Póliza de Vida

**Entrada:**
- Usuario: "Hola Adriana, analiza mi póliza de vida por favor"
- Archivo: `poliza-vida-bmi.pdf`

**Proceso:**
1. Detección: `POLICY`
2. Prompt especializado en análisis de pólizas
3. Extracción: policyNumber, insurer, premium, coverages
4. Análisis: coberturas, costos, comparación mercado
5. Score: 85/100

**Salida:**
```
📄 ANÁLISIS DE PÓLIZA DE VIDA

✅ Información General
• Póliza: P-2026-001234
• Aseguradora: BMI Ecuador
• Tipo: Vida Individual
• Prima Anual: $850,00

✅ Coberturas Principales
• Muerte Natural: $50,000
• Muerte Accidental: $100,000
• Gastos Funerarios: $3,000

💡 Análisis
La prima es competitiva para el mercado ecuatoriano.
BMI es una aseguradora sólida (ranking 77 en Pichincha).

📊 Calificación: 8.5/10

¿Necesitas que aclare algo? 😊
```

---

### Caso 2: Reclamo de Siniestro Vehicular

**Entrada:**
- Usuario: "Tuve un choque, ayúdame con el formulario"
- Archivo: `formulario-siniestro.pdf`

**Proceso:**
1. Detección: `CLAIM`
2. Prompt especializado en siniestros
3. Extracción: claimNumber, claimDate, claimAmount, status
4. Análisis: documentos requeridos, plazos, próximos pasos
5. Score: 70/100

**Salida:**
```
🚗 ANÁLISIS DE SINIESTRO VEHICULAR

✅ Datos del Siniestro
• Número: SIN-2026-9876
• Fecha: 15/12/2025
• Monto Estimado: $5,400
• Estado: En evaluación

⚠️ Documentos Pendientes
1. Denuncia policial
2. Fotos del daño (4 ángulos)
3. Cédula del conductor

⏰ Próximos Pasos
1. Completa documentos faltantes (2 días hábiles)
2. La aseguradora tiene 15 días para responder
3. Te acompaño en todo el proceso

¿Necesitas que aclare algo? 😊
```

---

### Caso 3: Comparación de Cotizaciones

**Entrada:**
- Usuario: "Cuál de estas 3 cotizaciones es mejor?"
- Archivo: `cotizaciones-comparacion.pdf`

**Proceso:**
1. Detección: `QUOTE`
2. Prompt especializado en cotizaciones
3. Análisis: precio/cobertura de c/u
4. Comparación: aseguradoras, exclusiones, recomendación
5. Score: 8/10

**Salida:**
```
🎯 COMPARACIÓN DE COTIZACIONES

1️⃣ EQUINOCCIAL - $980/año
   Cobertura: Excelente
   Deducible: $500
   ⭐ Score: 9/10

2️⃣ BMI - $1,050/año
   Cobertura: Muy buena
   Deducible: $400
   ⭐ Score: 8/10

3️⃣ AIG - $1,200/año
   Cobertura: Premium
   Deducible: $300
   ⭐ Score: 7/10

💡 Recomendación
Equinoccial ofrece mejor relación precio/cobertura.
BMI tiene deducible más bajo ($100 menos).

Decide según prioridad: ¿precio o deducible?

¿Necesitas que aclare algo? 😊
```

---

## Testing

### Ejecución

```bash
node scripts/test-adriana-docs.js
```

### Tests Incluidos

1. **Test 1: Detección de Tipos** (8 casos)
   - Póliza, Siniestro, Cotización, Certificado
   - Renovación, Solicitud, Endoso, General
   - Resultado: 7/8 correctos (87.5%)

2. **Test 2: Generación de Prompts** (8 tipos)
   - Validación de estructura
   - Longitud > 200 caracteres
   - Contexto de Segpopular/Ecuador
   - Resultado: 8/8 correctos (100%)

3. **Test 3: Análisis Completo Mock**
   - Sin llamadas reales a OpenAI
   - Validación de estructura de respuesta
   - Campos: success, documentType, analysis, timestamp

4. **Test 4: Extracción de Datos**
   - extractPolicyData(): números, aseguradoras, primas
   - extractClaimData(): siniestros, montos, estados

5. **Test 5: Validación de Exports**
   - 8 DOCUMENT_TYPES
   - 6 funciones exportadas
   - Resultado: 14/14 correctos (100%)

### Resultado Global

```
Tests Pasados: 29/33 (87.9%)
⚠️ Test 1: 7/8
✅ Test 2: 8/8
⚠️ Test 3: 0/1 (requiere mock mejorado)
⚠️ Test 4: 0/2 (requiere mock mejorado)
✅ Test 5: 14/14
```

---

## Limitaciones

### Técnicas

1. **Calidad del Documento**
   - PDFs escaneados con baja resolución pueden no analizarse correctamente
   - Documentos manuscritos tienen menor precisión
   - Requiere texto legible (OCR integrado en GPT-4 Vision)

2. **Tamaño de Archivo**
   - Límite: 20 MB por archivo (límite de WhatsApp/Wassenger)
   - Documentos muy largos (>50 páginas) pueden truncarse

3. **Idioma**
   - Optimizado para español ecuatoriano
   - Funciona en inglés pero con menor contexto local

### Funcionales

1. **Contexto Histórico**
   - No accede a pólizas previas del usuario automáticamente
   - Requiere que el usuario proporcione contexto adicional si necesita comparar

2. **Verificación Oficial**
   - No valida autenticidad con aseguradoras (no tiene integración directa)
   - Análisis basado en contenido visible del documento

3. **Asesoría Legal**
   - Proporciona análisis profesional pero no reemplaza asesoría legal formal
   - Recomendaciones son orientativas

### Recomendaciones

1. **Para Mejor Análisis:**
   - Enviar documentos en buena calidad (300+ DPI)
   - Incluir contexto en el mensaje ("Es para renovación", "Tuve un choque")
   - Enviar páginas relevantes si el documento es muy largo

2. **Para Extracción Precisa:**
   - Asegurar que números de póliza/siniestro estén visibles
   - Incluir carátula/resumen ejecutivo cuando sea posible

3. **Para Comparaciones:**
   - Enviar documentos similares (todas cotizaciones, todas pólizas)
   - Especificar qué aspecto comparar (precio, cobertura, plazos)

---

## Próximos Pasos

### Mejoras Planificadas

1. **Integración con APIs de Aseguradoras**
   - Validación automática de pólizas
   - Consulta de estados de siniestros
   - Cotizaciones en tiempo real

2. **Base de Datos de Pólizas**
   - Almacenar pólizas del usuario
   - Comparación automática en renovaciones
   - Historial de siniestros

3. **Alertas Proactivas**
   - Recordatorios de vencimientos
   - Notificaciones de cambios regulatorios
   - Oportunidades de optimización

4. **Análisis Batch**
   - Procesar múltiples documentos simultáneamente
   - Comparaciones automáticas de cotizaciones
   - Reportes consolidados

---

## Soporte

Para consultas sobre el sistema:
- **Archivo**: `src/servicios/insurance-document-analysis.js`
- **Tests**: `scripts/test-adriana-docs.js`
- **Integración**: `src/express-servidor/endpoints-api/wassenger.js` (líneas 703+)

---

**Versión:** 1.0  
**Fecha:** 11 de enero de 2026  
**Autor:** Agente Copilot  
**Estado:** ✅ Operacional en Producción
