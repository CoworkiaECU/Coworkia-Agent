/**
 * 🛡️ Insurance Document Analysis Service
 * 
 * Servicio especializado para analizar documentos de seguros:
 * - Pólizas de seguros (vida, vehículos, salud, etc.)
 * - Reportes de siniestros
 * - Cotizaciones
 * - Formularios de reclamación
 * - Certificados de cobertura
 * - Documentos de renovación
 * 
 * Utiliza OpenAI GPT-4 Vision para análisis profesional de documentos
 * 
 * @author Adriana - Segpopular S.A.
 * @date 2026-01-11
 */

import { analyzeImage } from '../servicios-ia/openai.js';

/**
 * 📋 Tipos de documentos de seguros
 */
export const DOCUMENT_TYPES = {
  POLICY: 'policy',              // Póliza de seguro
  CLAIM: 'claim',                // Reporte de siniestro
  QUOTE: 'quote',                // Cotización
  CERTIFICATE: 'certificate',     // Certificado de cobertura
  RENEWAL: 'renewal',            // Renovación
  APPLICATION: 'application',     // Solicitud/formulario
  ENDORSEMENT: 'endorsement',    // Endoso/modificación
  GENERAL: 'general'             // Documento general
};

/**
 * 🔍 Detectar tipo de documento automáticamente
 */
export function detectDocumentType(userMessage = '', fileType = '') {
  const msg = userMessage.toLowerCase();
  
  if (msg.match(/póliza|poliza|policy|seguro contratado|cobertura actual/)) {
    return DOCUMENT_TYPES.POLICY;
  }
  if (msg.match(/siniestro|reclam|claim|accidente|daño|pérdida/)) {
    return DOCUMENT_TYPES.CLAIM;
  }
  if (msg.match(/cotización|cotizacion|quote|presupuesto|propuesta/)) {
    return DOCUMENT_TYPES.QUOTE;
  }
  if (msg.match(/certificado|certificate|constancia|comprobante de cobertura/)) {
    return DOCUMENT_TYPES.CERTIFICATE;
  }
  if (msg.match(/renovación|renovacion|renewal|vencimiento/)) {
    return DOCUMENT_TYPES.RENEWAL;
  }
  if (msg.match(/solicitud|aplicación|application|formulario/)) {
    return DOCUMENT_TYPES.APPLICATION;
  }
  if (msg.match(/endoso|modificación|modificacion|cambio|actualización/)) {
    return DOCUMENT_TYPES.ENDORSEMENT;
  }
  
  return DOCUMENT_TYPES.GENERAL;
}

/**
 * 🛡️ Construir prompt especializado según tipo de documento
 */
export function buildInsurancePrompt(documentType, userContext = '') {
  const baseIntro = `Eres Adriana, broker de seguros de Segpopular S.A. con 17 años de experiencia en el mercado ecuatoriano.

Analiza este documento de seguros con ojo profesional de broker.`;

  const prompts = {
    [DOCUMENT_TYPES.POLICY]: `${baseIntro}

📋 ANÁLISIS DE PÓLIZA DE SEGURO:

Extrae y analiza la siguiente información:

1. **INFORMACIÓN BÁSICA**:
   - Aseguradora
   - Número de póliza
   - Tipo de seguro (vida/vehículo/salud/hogar/etc)
   - Tomador/Asegurado
   - Vigencia (desde/hasta)

2. **COBERTURAS**:
   - Coberturas principales incluidas
   - Montos asegurados (suma asegurada)
   - Deducibles (si aplica)
   - Exclusiones importantes

3. **COSTOS**:
   - Prima anual/mensual
   - Forma de pago
   - Descuentos aplicados (si hay)

4. **EVALUACIÓN PROFESIONAL**:
   - ✅ Fortalezas de la póliza
   - ⚠️ Puntos de atención/limitaciones
   - 💡 Recomendaciones de mejora u optimización

5. **COMPARACIÓN** (si aplica):
   - ¿Cómo se compara con el mercado ecuatoriano?
   - ¿Precio competitivo? (bajo/medio/alto)
   - ¿Coberturas completas?

TONO: Profesional, consultivo, protector
FORMATO: Estructurado, bullets, fácil de leer
LONGITUD: 300-400 palabras`,

    [DOCUMENT_TYPES.CLAIM]: `${baseIntro}

🚨 ANÁLISIS DE REPORTE DE SINIESTRO:

Extrae y evalúa:

1. **DATOS DEL SINIESTRO**:
   - Número de reclamo/siniestro
   - Fecha del evento
   - Tipo de siniestro
   - Descripción del evento
   - Monto reclamado

2. **INFORMACIÓN DE PÓLIZA**:
   - Número de póliza asociada
   - Aseguradora
   - Cobertura aplicable
   - Deducible correspondiente

3. **ESTADO DEL RECLAMO**:
   - Estado actual (pendiente/en proceso/aprobado/rechazado)
   - Documentos requeridos
   - Plazos de respuesta
   - Observaciones de la aseguradora

4. **EVALUACIÓN PROFESIONAL**:
   - ✅ Documentación completa (sí/no)
   - ⚠️ Alertas o problemas identificados
   - 📋 Documentos faltantes (si aplica)
   - 💡 Recomendaciones para agilizar

5. **PRÓXIMOS PASOS**:
   - Acciones inmediatas recomendadas
   - Seguimiento necesario
   - Tiempo estimado de resolución

TONO: Empático, orientado a solución, claro
FORMATO: Estructurado, accionable
LONGITUD: 250-350 palabras`,

    [DOCUMENT_TYPES.QUOTE]: `${baseIntro}

💰 ANÁLISIS DE COTIZACIÓN DE SEGURO:

Evalúa la cotización profesionalmente:

1. **INFORMACIÓN BÁSICA**:
   - Aseguradora
   - Tipo de seguro
   - Nombre del solicitante
   - Fecha de la cotización
   - Vigencia propuesta

2. **COBERTURAS Y COSTOS**:
   - Coberturas incluidas
   - Sumas aseguradas
   - Prima mensual/anual
   - Deducibles
   - Forma de pago

3. **ANÁLISIS COMPETITIVO**:
   - Precio: ¿Competitivo en el mercado ecuatoriano? (bajo/medio/alto)
   - Coberturas: ¿Completas o limitadas?
   - Relación precio-beneficio: [Excelente/Buena/Regular]
   - Score: X/10

4. **COMPARACIÓN**:
   - ¿Falta alguna cobertura importante?
   - ¿Deducibles razonables?
   - ¿Exclusiones preocupantes?

5. **RECOMENDACIÓN FINAL**:
   - ✅ Contratar tal cual
   - ⚠️ Contratar con ajustes [especificar]
   - ❌ Buscar mejor opción
   - 💡 Alternativas disponibles en Segpopular

TONO: Consultivo, comparativo, orientado a decisión
FORMATO: Estructurado con score
LONGITUD: 300-400 palabras`,

    [DOCUMENT_TYPES.CERTIFICATE]: `${baseIntro}

📜 ANÁLISIS DE CERTIFICADO DE COBERTURA:

Valida el certificado:

1. **INFORMACIÓN DEL CERTIFICADO**:
   - Aseguradora emisora
   - Número de certificado
   - Número de póliza matriz
   - Asegurado/beneficiario
   - Vigencia

2. **COBERTURAS CERTIFICADAS**:
   - Tipo de cobertura
   - Montos asegurados
   - Limitaciones
   - Ámbito territorial

3. **VALIDACIÓN**:
   - ✅ Certificado vigente (sí/no)
   - ✅ Datos completos (sí/no)
   - ⚠️ Observaciones o alertas
   - 📋 Verificaciones adicionales requeridas

4. **USO DEL CERTIFICADO**:
   - ¿Para qué sirve este certificado?
   - ¿Es suficiente para el propósito?
   - ¿Requiere documentación adicional?

TONO: Verificador, preciso, profesional
FORMATO: Checklist + validación
LONGITUD: 200-300 palabras`,

    [DOCUMENT_TYPES.RENEWAL]: `${baseIntro}

🔄 ANÁLISIS DE RENOVACIÓN DE PÓLIZA:

Evalúa la renovación:

1. **DATOS DE RENOVACIÓN**:
   - Póliza a renovar (número)
   - Aseguradora
   - Fecha de vencimiento actual
   - Nueva vigencia propuesta
   - Cambios en la prima

2. **COMPARACIÓN AÑO ANTERIOR**:
   - Prima anterior vs nueva
   - % de ajuste
   - Cambios en coberturas
   - Cambios en deducibles

3. **EVALUACIÓN DEL AJUSTE**:
   - Incremento: [bajo/medio/alto] (X%)
   - ¿Justificado? (siniestralidad, inflación, etc)
   - ¿Competitivo con el mercado?

4. **DECISIÓN RECOMENDADA**:
   - ✅ Renovar con aseguradora actual
   - 🔄 Renovar con ajustes/negociación
   - 🔍 Cotizar con otras aseguradoras
   - 💡 Oportunidades de ahorro

5. **PRÓXIMOS PASOS**:
   - Plazo para decisión
   - Documentos requeridos (si renueva)
   - Alternativas disponibles

TONO: Consultivo, comparativo, estratégico
FORMATO: Antes/Después + recomendación
LONGITUD: 250-350 palabras`,

    [DOCUMENT_TYPES.APPLICATION]: `${baseIntro}

📝 ANÁLISIS DE SOLICITUD/FORMULARIO DE SEGURO:

Revisa el formulario:

1. **DATOS DEL SOLICITANTE**:
   - Información personal completa
   - Datos de contacto
   - Información del bien a asegurar

2. **COMPLETITUD DEL FORMULARIO**:
   - ✅ Campos obligatorios llenos
   - ⚠️ Campos faltantes o incompletos
   - 📋 Información adicional requerida
   - 🔍 Inconsistencias detectadas

3. **DOCUMENTOS ADJUNTOS**:
   - Documentos presentados
   - Documentos faltantes
   - Calidad de la documentación

4. **EVALUACIÓN DE RIESGO** (preliminar):
   - Nivel de riesgo aparente: [bajo/medio/alto]
   - Factores que afectan el riesgo
   - Información adicional necesaria

5. **PRÓXIMOS PASOS**:
   - Correcciones necesarias
   - Documentos a solicitar
   - Tiempo estimado de procesamiento

TONO: Orientador, detallista, facilitador
FORMATO: Checklist + pasos
LONGITUD: 250-350 palabras`,

    [DOCUMENT_TYPES.ENDORSEMENT]: `${baseIntro}

📄 ANÁLISIS DE ENDOSO/MODIFICACIÓN:

Analiza el endoso:

1. **INFORMACIÓN DEL ENDOSO**:
   - Número de endoso
   - Número de póliza base
   - Fecha de emisión
   - Vigencia del cambio

2. **TIPO DE MODIFICACIÓN**:
   - ¿Qué se está modificando?
   - Cambio en beneficiarios
   - Cambio en coberturas
   - Cambio en suma asegurada
   - Cambio en datos del asegurado

3. **IMPACTO FINANCIERO**:
   - Cambio en la prima (aumento/disminución)
   - Monto del ajuste
   - ¿Genera devolución o cargo adicional?

4. **VALIDACIÓN**:
   - ✅ Cambio correctamente reflejado
   - ⚠️ Alertas o inconsistencias
   - 📋 Confirmaciones pendientes

5. **RECOMENDACIÓN**:
   - ¿Endoso correcto y completo?
   - ¿Requiere seguimiento?
   - ¿Genera nuevas necesidades de cobertura?

TONO: Verificador, preciso, preventivo
FORMATO: Antes/Después del endoso
LONGITUD: 200-300 palabras`,

    [DOCUMENT_TYPES.GENERAL]: `${baseIntro}

🔍 ANÁLISIS GENERAL DE DOCUMENTO DE SEGUROS:

Analiza el documento identificando:

1. **TIPO DE DOCUMENTO**:
   - ¿Qué tipo de documento es?
   - Propósito del documento
   - Contexto relevante

2. **INFORMACIÓN CLAVE**:
   - Datos principales extraídos
   - Cifras importantes
   - Fechas relevantes
   - Partes involucradas

3. **EVALUACIÓN PROFESIONAL**:
   - ✅ Información completa
   - ⚠️ Puntos de atención
   - 📋 Información faltante
   - 💡 Insights relevantes

4. **RECOMENDACIONES**:
   - Acciones sugeridas
   - Documentación complementaria
   - Próximos pasos

TONO: Profesional, adaptativo, claro
FORMATO: Estructurado, accionable
LONGITUD: 250-350 palabras`
  };

  let prompt = prompts[documentType] || prompts[DOCUMENT_TYPES.GENERAL];
  
  // Agregar contexto del usuario si lo proporcionó
  if (userContext && userContext.trim().length > 0) {
    prompt += `\n\n📝 CONTEXTO ADICIONAL DEL USUARIO:\n"${userContext}"\n\nConsidera este contexto en tu análisis.`;
  }
  
  // Recordatorio de mercado ecuatoriano
  prompt += `\n\n🇪🇨 CONTEXTO ECUADOR:\nAseguradoras principales: BMI, Equinoccial, AIG, Chubb, Seguros Sucre, QBE, Liberty, AIG, Mapfre.\nSegpopular: Broker con 17 años experiencia, 32 licencias, puesto 77 Pichincha.`;
  
  return prompt;
}

/**
 * 🛡️ Analizar documento de seguros con Vision AI
 * 
 * @param {string} documentUrl - URL del documento (imagen o PDF)
 * @param {string} userMessage - Mensaje del usuario
 * @param {object} options - Opciones adicionales
 * @returns {object} - Resultado del análisis
 */
export async function analyzeInsuranceDocument(documentUrl, userMessage = '', options = {}) {
  try {
    console.log('[INSURANCE-DOC] 🛡️ Iniciando análisis...');
    console.log(`[INSURANCE-DOC] 📄 Documento: ${documentUrl}`);
    console.log(`[INSURANCE-DOC] 💬 Contexto: ${userMessage.substring(0, 100)}...`);
    
    // Detectar tipo de documento
    const documentType = options.documentType || detectDocumentType(userMessage, options.fileType);
    console.log(`[INSURANCE-DOC] 🔍 Tipo detectado: ${documentType}`);
    
    // Construir prompt especializado
    const prompt = buildInsurancePrompt(documentType, userMessage);
    
    // Analizar con Vision AI
    const analysis = await analyzeImage(documentUrl, prompt, {
      max_tokens: 1000, // Documentos de seguros pueden ser extensos
      temperature: 0.1  // Precisión alta para datos legales/financieros
    });
    
    if (!analysis || !analysis.success) {
      throw new Error('No se pudo analizar el documento');
    }
    
    console.log('[INSURANCE-DOC] ✅ Análisis completado');
    
    return {
      success: true,
      documentType,
      analysis: analysis.content,
      documentUrl,
      timestamp: new Date().toISOString(),
      confidence: 'high'
    };
    
  } catch (error) {
    console.error('[INSURANCE-DOC] ❌ Error:', error.message);
    
    return {
      success: false,
      error: error.message,
      documentType: options.documentType || DOCUMENT_TYPES.GENERAL,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 📋 Extraer datos estructurados de póliza
 * Intenta extraer campos clave del análisis
 */
export function extractPolicyData(analysis) {
  const data = {
    policyNumber: null,
    insurer: null,
    policyType: null,
    premium: null,
    coverage: null,
    validity: null
  };
  
  // Buscar número de póliza
  const policyMatch = analysis.match(/(?:póliza|poliza|policy).*?[:：]\s*([A-Z0-9-]+)/i);
  if (policyMatch) data.policyNumber = policyMatch[1];
  
  // Buscar aseguradora
  const insurers = ['BMI', 'Equinoccial', 'AIG', 'Chubb', 'Seguros Sucre', 'QBE', 'Liberty', 'Mapfre', 'Latina Seguros', 'Sweaden'];
  for (const insurer of insurers) {
    if (analysis.includes(insurer)) {
      data.insurer = insurer;
      break;
    }
  }
  
  // Buscar prima
  const premiumMatch = analysis.match(/prima.*?[:：]\s*\$?\s*([\d,]+\.?\d*)/i);
  if (premiumMatch) data.premium = premiumMatch[1];
  
  return data;
}

/**
 * 🚨 Extraer datos de siniestro
 */
export function extractClaimData(analysis) {
  const data = {
    claimNumber: null,
    claimDate: null,
    claimAmount: null,
    status: null,
    policyNumber: null
  };
  
  // Buscar número de siniestro/reclamo
  const claimMatch = analysis.match(/(?:siniestro|reclamo|claim).*?[:：]\s*([A-Z0-9-]+)/i);
  if (claimMatch) data.claimNumber = claimMatch[1];
  
  // Buscar monto reclamado
  const amountMatch = analysis.match(/monto.*?[:：]\s*\$?\s*([\d,]+\.?\d*)/i);
  if (amountMatch) data.claimAmount = amountMatch[1];
  
  // Buscar estado
  const statuses = ['aprobado', 'rechazado', 'pendiente', 'en proceso', 'cerrado'];
  for (const status of statuses) {
    if (analysis.toLowerCase().includes(status)) {
      data.status = status;
      break;
    }
  }
  
  return data;
}

/**
 * 📊 Calcular score de calidad del documento (0-100)
 */
export function calculateDocumentQualityScore(analysis) {
  let score = 50; // Base
  
  // Palabras positivas (+5 cada una, max +30)
  const positiveWords = ['completo', 'vigente', 'válido', 'en regla', 'aprobado', 'correcto', 'suficiente'];
  positiveWords.forEach(word => {
    if (analysis.toLowerCase().includes(word)) score = Math.min(100, score + 5);
  });
  
  // Palabras negativas (-5 cada una, max -30)
  const negativeWords = ['faltante', 'incompleto', 'vencido', 'rechazado', 'insuficiente', 'error'];
  negativeWords.forEach(word => {
    if (analysis.toLowerCase().includes(word)) score = Math.max(0, score - 5);
  });
  
  return Math.round(score);
}

export default {
  analyzeInsuranceDocument,
  detectDocumentType,
  buildInsurancePrompt,
  extractPolicyData,
  extractClaimData,
  calculateDocumentQualityScore,
  DOCUMENT_TYPES
};
