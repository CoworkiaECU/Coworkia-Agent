/**
 * 🏥 ANGELA VISION AI - Análisis de Imágenes Médicas
 * Analiza imágenes de heridas, ojos, piel y otras condiciones médicas
 * NO diagnostica, solo proporciona información educativa
 */

import { analyzeImage } from '../servicios-ia/openai.js';

/**
 * 🔍 Tipos de análisis médico soportados
 */
export const MEDICAL_IMAGE_TYPES = {
  // Condiciones físicas visibles
  WOUND: 'wound',           // Heridas, cortes, quemaduras
  SKIN: 'skin',             // Condiciones de piel (erupciones, manchas)
  EYE: 'eye',               // Problemas oculares
  RASH: 'rash',             // Erupciones cutáneas
  BURN: 'burn',             // Quemaduras
  BRUISE: 'bruise',         // Moretones/hematomas
  BITE: 'bite',             // Picaduras/mordeduras
  
  // Documentos médicos
  PRESCRIPTION: 'prescription',   // Recetas médicas
  LAB_RESULTS: 'lab_results',     // Resultados de laboratorio
  XRAY: 'xray',                   // Radiografías
  IMAGING: 'imaging',             // Estudios de imagen (eco, TAC, RM)
  MEDICAL_REPORT: 'medical_report', // Informes médicos
  
  GENERAL: 'general'        // Análisis general
};

/**
 * 🔍 Detecta tipo de imagen médica según contexto del usuario
 */
function detectMedicalImageType(userMessage = '') {
  const text = userMessage.toLowerCase();
  
  // Heridas
  if (text.match(/\b(herida|cortad[ao]|cort[eé]|raspu[ñn]o|rasgu[ñn]o|lastimado|lastim[eé]|golpe|lesi[oó]n)/)) {
    return MEDICAL_IMAGE_TYPES.WOUND;
  }
  
  // Quemaduras
  if (text.match(/\b(quemadura|quem[eé]|quemad[ao]|ampolla|escaldadura)/)) {
    return MEDICAL_IMAGE_TYPES.BURN;
  }
  
  // Piel/erupciones
  if (text.match(/\b(piel|erupci[oó]n|sarpullido|roncha|mancha|lunar|verruga|acn[eé]|grano)\b/)) {
    return text.match(/\b(erupci[oó]n|sarpullido|roncha)\b/) 
      ? MEDICAL_IMAGE_TYPES.RASH 
      : MEDICAL_IMAGE_TYPES.SKIN;
  }
  
  // Ojos
  if (text.match(/\b(ojo|ojos|vista|conjuntivitis|p[aá]rpado|pupila|iris)\b/)) {
    return MEDICAL_IMAGE_TYPES.EYE;
  }
  
  // Moretones
  if (text.match(/\b(moret[oó]n|moreton|hematoma|morado|contusi[oó]n)\b/)) {
    return MEDICAL_IMAGE_TYPES.BRUISE;
  }
  
  // Picaduras/mordeduras
  if (text.match(/\b(picadura|mordedura|pic[oó]|mordi[oó]|insecto|ara[nñ]a|mosquito)\b/)) {
    return MEDICAL_IMAGE_TYPES.BITE;
  }
  
  // Recetas médicas
  if (text.match(/\b(receta|prescripci[oó]n|medicamento|medicina|pastilla|f[aá]rmaco|dosis)\b/)) {
    return MEDICAL_IMAGE_TYPES.PRESCRIPTION;
  }
  
  // Resultados de laboratorio
  if (text.match(/\b(examen|an[aá]lisis|laboratorio|resultado|sangre|orina|heces|biometr[ií]a|qu[ií]mica|gluc[eé]mia|colesterol|hemograma)\b/)) {
    return MEDICAL_IMAGE_TYPES.LAB_RESULTS;
  }
  
  // Radiografías
  if (text.match(/\b(radiograf[ií]a|rayos?\s*x|rx|placa)\b/)) {
    return MEDICAL_IMAGE_TYPES.XRAY;
  }
  
  // Estudios de imagen
  if (text.match(/\b(ecograf[ií]a|ultrasonido|tomograf[ií]a|tac|resonancia|rm|mri|ct|scan)\b/)) {
    return MEDICAL_IMAGE_TYPES.IMAGING;
  }
  
  // Informes médicos
  if (text.match(/\b(informe|reporte|epicrisis|diagn[oó]stico|consulta|historia\s+cl[ií]nica)\b/)) {
    return MEDICAL_IMAGE_TYPES.MEDICAL_REPORT;
  }
  
  return MEDICAL_IMAGE_TYPES.GENERAL;
}

/**
 * 🏥 Construye prompt especializado según tipo de imagen médica
 */
function buildMedicalPrompt(imageType, userContext = '') {
  const baseDisclaimer = `**IMPORTANTE:** Soy Ángela, asistente virtual de MedBeneficios. NO soy médico real y NO puedo diagnosticar. 
Solo proporciono información educativa para ayudarte a entender lo que observas.

🚨 **EMERGENCIAS:** Si hay dolor severo, sangrado intenso, dificultad para respirar o síntomas graves, llama al 911 o acude al hospital inmediatamente.`;

  const prompts = {
    [MEDICAL_IMAGE_TYPES.WOUND]: `${baseDisclaimer}

Eres Ángela, asistente médica virtual. Analiza esta imagen de una herida/lesión y proporciona información educativa.

**ESTRUCTURA DE RESPUESTA:**

📋 **LO QUE OBSERVO:**
- Tipo de lesión aparente (corte, raspón, laceración, etc.)
- Tamaño aproximado
- Características visibles (profundidad aparente, bordes, etc.)
- Signos de infección (enrojecimiento, hinchazón, pus, etc.)

⚠️ **SEÑALES DE ALERTA:**
Lista cualquier señal que requiera atención médica urgente

💡 **RECOMENDACIONES GENERALES:**
- Primeros auxilios básicos sugeridos
- Cuándo buscar atención médica profesional
- Cuidados generales para heridas

🏥 **PRÓXIMO PASO:**
Si necesitas una evaluación profesional, puedes usar el médico virtual de MedBeneficios: https://demo.doctorone.com/home/#

Contexto del usuario: ${userContext}

**Responde de forma clara, empática y educativa. NO diagnostiques.**`,

    [MEDICAL_IMAGE_TYPES.BURN]: `${baseDisclaimer}

Analiza esta imagen de una posible quemadura y proporciona información educativa.

**ESTRUCTURA DE RESPUESTA:**

📋 **LO QUE OBSERVO:**
- Grado aparente (primer grado: roja, segundo: ampollas, tercero: piel blanca/carbonizada)
- Área afectada aproximada
- Características visibles

⚠️ **SEÑALES DE ALERTA:**
- Quemaduras de tercer grado (URGENCIA MÉDICA)
- Área grande afectada (>3% cuerpo)
- Quemaduras en cara, manos, pies, genitales o articulaciones
- Signos de infección

💡 **PRIMEROS AUXILIOS PARA QUEMADURAS LEVES:**
- Enfríar con agua fresca (NO hielo) 10-15 minutos
- NO reventar ampollas
- Cubrir con gasa estéril
- Analgésicos de venta libre si necesario

🏥 **CUÁNDO IR AL MÉDICO:**
Lista criterios para buscar atención profesional

Contexto: ${userContext}`,

    [MEDICAL_IMAGE_TYPES.SKIN]: `${baseDisclaimer}

Analiza esta imagen de una condición de piel y proporciona información educativa.

**ESTRUCTURA DE RESPUESTA:**

📋 **LO QUE OBSERVO:**
- Tipo de lesión cutánea (mancha, lunar, verruga, erupción, etc.)
- Color, tamaño, textura
- Ubicación en el cuerpo
- Características adicionales

⚠️ **SEÑALES DE ALERTA (Regla ABCDE para lunares):**
- **A**simetría: formas irregulares
- **B**ordes: desiguales o borrosos
- **C**olor: varios colores o cambios
- **D**iámetro: >6mm
- **E**volución: cambios con el tiempo

💡 **POSIBLES EXPLICACIONES (educativas, NO diagnóstico):**
Lista condiciones comunes que podrían causar esto

🏥 **RECOMENDACIÓN:**
Cualquier lesión cutánea nueva, que cambie o preocupe debe evaluarse por dermatólogo

Contexto: ${userContext}`,

    [MEDICAL_IMAGE_TYPES.EYE]: `${baseDisclaimer}

Analiza esta imagen de un problema ocular y proporciona información educativa.

🚨 **ADVERTENCIA:** Los problemas oculares pueden ser serios. Si hay dolor, pérdida de visión o trauma, busca atención médica inmediata.

**ESTRUCTURA DE RESPUESTA:**

📋 **LO QUE OBSERVO:**
- Características visibles (enrojecimiento, hinchazón, secreción, etc.)
- Área afectada (párpado, conjuntiva, córnea visible)
- Síntomas aparentes

⚠️ **SEÑALES DE ALERTA:**
- Pérdida o cambios en la visión
- Dolor ocular intenso
- Trauma ocular
- Pupila irregular
- Secreción purulenta abundante

💡 **POSIBLES CAUSAS COMUNES (educativo):**
Lista condiciones comunes que podrían explicar los síntomas

🏥 **RECOMENDACIÓN:**
Los ojos son delicados - cualquier problema ocular debe evaluarse por oftalmólogo profesional

Contexto: ${userContext}`,

    [MEDICAL_IMAGE_TYPES.RASH]: `${baseDisclaimer}

Analiza esta imagen de una erupción cutánea.

**ESTRUCTURA DE RESPUESTA:**

📋 **LO QUE OBSERVO:**
- Tipo de erupción (macular, papular, vesicular, etc.)
- Distribución (localizada, generalizada, patrón)
- Color, textura, presencia de ampollas/costras

⚠️ **SEÑALES DE ALERTA:**
- Fiebre alta acompañante
- Dificultad respiratoria (reacción alérgica severa)
- Erupción que no palidece al presionar (petequias - URGENTE)
- Hinchazón de labios/lengua/garganta

💡 **POSIBLES CAUSAS:**
- Reacciones alérgicas (alimentos, medicamentos, contacto)
- Infecciones virales
- Dermatitis de contacto
- Otras condiciones dermatológicas

🏥 **RECOMENDACIÓN:**
Erupciones pueden tener muchas causas - evaluación médica ayuda a determinar tratamiento adecuado

Contexto: ${userContext}`,

    [MEDICAL_IMAGE_TYPES.BRUISE]: `${baseDisclaimer}

Analiza esta imagen de un moretón/hematoma.

**ESTRUCTURA DE RESPUESTA:**

📋 **LO QUE OBSERVO:**
- Tamaño y ubicación
- Color (nuevo: rojo/morado, sanando: verde/amarillo)
- Hinchazón asociada

⚠️ **SEÑALES DE ALERTA:**
- Moretones sin causa aparente (frecuentes)
- Muy grandes o dolorosos
- Sobre articulaciones con limitación de movimiento
- Acompañados de deformidad ósea

💡 **INFORMACIÓN SOBRE MORETONES:**
- Proceso normal de sanación: rojo → morado → verde → amarillo → marrón
- Duración típica: 2-4 semanas
- Cuidados: hielo primeras 48h, luego calor, elevación, descanso

🏥 **CUÁNDO CONSULTAR:**
Si hay sospecha de fractura, dolor severo o moretones inexplicables frecuentes

Contexto: ${userContext}`,

    [MEDICAL_IMAGE_TYPES.BITE]: `${baseDisclaimer}

Analiza esta imagen de una picadura/mordedura.

**ESTRUCTURA DE RESPUESTA:**

📋 **LO QUE OBSERVO:**
- Tipo aparente (insecto, arácnido, animal)
- Características (punturas, enrojecimiento, hinchazón)
- Signos de reacción (local vs sistémica)

⚠️ **SEÑALES DE ALERTA:**
- Reacción alérgica severa (anafilaxia): hinchazón facial, dificultad respiratoria
- Mordeduras de animales (riesgo de rabia)
- Picaduras de arañas venenosas o escorpiones
- Signos de infección (pus, líneas rojas, fiebre)

💡 **PRIMEROS AUXILIOS:**
- Lavar con agua y jabón
- Hielo para hinchazón
- Antihistamínicos de venta libre
- Elevar área afectada

🏥 **BUSCAR ATENCIÓN SI:**
- Mordedura de animal (vacuna antirrábica)
- Reacción alérgica
- Signos de infección
- Picadura de araña/escorpión identificado como venenoso

Contexto: ${userContext}`,

    [MEDICAL_IMAGE_TYPES.PRESCRIPTION]: `${baseDisclaimer}

Analiza esta receta médica y ayuda al usuario a entenderla.

**ESTRUCTURA DE RESPUESTA:**

📋 **LO QUE LEO EN LA RECETA:**
- Nombre del medicamento(s)
- Dosis prescrita
- Frecuencia (cada cuántas horas)
- Duración del tratamiento
- Vía de administración (oral, tópico, etc.)

💊 **EXPLICACIÓN EN LENGUAJE SIMPLE:**
Traducir términos médicos a lenguaje que cualquiera entienda

⚠️ **ADVERTENCIAS IMPORTANTES:**
- Interacciones medicamentosas conocidas
- Efectos secundarios comunes
- Precauciones especiales
- Contraindicaciones

💡 **RECOMENDACIONES GENERALES:**
- Cómo tomar correctamente
- Con o sin alimentos
- Qué evitar durante tratamiento
- Cuándo contactar al médico

🏥 **IMPORTANTE:**
Sigue EXACTAMENTE las indicaciones de tu médico. NO modifiques dosis ni suspendas sin consultar.

Contexto: ${userContext}`,

    [MEDICAL_IMAGE_TYPES.LAB_RESULTS]: `${baseDisclaimer}

Analiza estos resultados de laboratorio y ayuda al usuario a interpretarlos.

**ESTRUCTURA DE RESPUESTA:**

📋 **RESULTADOS PRINCIPALES:**
Lista los valores con sus rangos normales:
- Parámetro: Valor (Rango normal: X-X)
- Indicar si está ALTO, BAJO o NORMAL

⚠️ **VALORES FUERA DE RANGO:**
Señalar claramente cualquier valor anormal y su significado general

💡 **QUÉ PUEDEN INDICAR (educativo):**
- Posibles causas de valores alterados
- Relación entre diferentes parámetros
- Contexto clínico general

🏥 **PRÓXIMO PASO:**
Estos resultados DEBEN ser interpretados por tu médico quien conoce tu historial completo. Algunos valores pueden variar según:
- Edad, sexo, embarazo
- Medicamentos que tomas
- Hora del día del examen
- Ayuno previo

📞 **CUÁNDO CONSULTAR URGENTE:**
- Valores críticos (muy altos o muy bajos)
- Síntomas graves asociados

Contexto: ${userContext}`,

    [MEDICAL_IMAGE_TYPES.XRAY]: `${baseDisclaimer}

Analiza esta radiografía y proporciona información educativa.

🚨 **MUY IMPORTANTE:** NO puedo diagnosticar enfermedades. Solo puedo describir lo que se observa visualmente.

**ESTRUCTURA DE RESPUESTA:**

📋 **LO QUE OBSERVO:**
- Tipo de radiografía (tórax, hueso, abdomen, etc.)
- Estructuras visibles normales
- Cualquier característica llamativa

⚠️ **HALLAZGOS APARENTES:**
Describir hallazgos visibles sin diagnosticar:
- Densidades anormales
- Opacidades o radiolucencias
- Fracturas evidentes
- Desalineaciones
- Cuerpos extraños

💡 **INFORMACIÓN EDUCATIVA:**
Explicar qué se ve normalmente en este tipo de RX y qué podría significar lo observado (sin diagnosticar)

🏥 **ESENCIAL:**
Las radiografías DEBEN ser interpretadas por radiólogo certificado. La calidad de imagen, técnica, proyección y contexto clínico son cruciales para diagnóstico real.

📞 **BUSCAR ATENCIÓN SI:**
- Trauma reciente
- Dolor intenso
- Dificultad respiratoria (RX tórax)
- Deformidad visible

Contexto: ${userContext}`,

    [MEDICAL_IMAGE_TYPES.IMAGING]: `${baseDisclaimer}

Analiza este estudio de imagen (ecografía/TAC/resonancia) y proporciona información educativa.

🚨 **CRÍTICO:** Los estudios de imagen requieren interpretación especializada. NO puedo diagnosticar.

**ESTRUCTURA DE RESPUESTA:**

📋 **TIPO DE ESTUDIO:**
- Modalidad (ecografía, TAC, RM, etc.)
- Región anatómica estudiada
- Con o sin contraste (si aplica)

👁️ **LO QUE SE OBSERVA:**
- Estructuras anatómicas normales visibles
- Características de tejidos/órganos
- Medidas si están indicadas

⚠️ **HALLAZGOS LLAMATIVOS:**
Descripción objetiva sin diagnóstico:
- Masas o lesiones
- Colecciones líquidas
- Alteraciones en densidad/señal
- Cambios estructurales

💡 **INFORMACIÓN GENERAL:**
Explicar qué se evalúa con este tipo de estudio y su utilidad clínica

🏥 **INTERPRETACIÓN PROFESIONAL:**
Estos estudios requieren correlación con:
- Historia clínica completa
- Examen físico
- Otros estudios
- Experiencia del radiólogo

📋 **PRÓXIMO PASO:**
Lleva este estudio a tu médico tratante quien lo interpretará en tu contexto clínico completo.

Contexto: ${userContext}`,

    [MEDICAL_IMAGE_TYPES.MEDICAL_REPORT]: `${baseDisclaimer}

Analiza este informe médico y ayuda al usuario a entenderlo.

**ESTRUCTURA DE RESPUESTA:**

📋 **RESUMEN DEL DOCUMENTO:**
- Tipo de informe (consulta, epicrisis, diagnóstico, etc.)
- Fecha
- Especialidad médica

🔍 **DIAGNÓSTICO(S) PRINCIPAL(ES):**
Listar diagnósticos mencionados y explicar en lenguaje simple qué significan

💊 **TRATAMIENTO INDICADO:**
- Medicamentos prescritos
- Procedimientos recomendados
- Estudios solicitados
- Controles programados

💡 **TRADUCCIÓN A LENGUAJE SIMPLE:**
Explicar términos médicos complejos:
- Jerga médica → lenguaje cotidiano
- Abreviaturas → significado completo
- Conceptos técnicos → explicación clara

⚠️ **PUNTOS IMPORTANTES A RECORDAR:**
- Indicaciones críticas
- Precauciones especiales
- Signos de alarma a vigilar
- Cuándo regresar a consulta

❓ **PREGUNTAS SUGERIDAS PARA TU MÉDICO:**
Lista de preguntas que podrías hacer en tu próxima consulta para aclarar dudas

🏥 **SEGUIMIENTO:**
Importancia de cumplir indicaciones y asistir a controles programados

Contexto: ${userContext}`,

    [MEDICAL_IMAGE_TYPES.GENERAL]: `${baseDisclaimer}

Analiza esta imagen médica y proporciona información educativa útil.

**ESTRUCTURA DE RESPUESTA:**

📋 **LO QUE OBSERVO:**
Describe claramente lo que ves en la imagen

⚠️ **CONSIDERACIONES IMPORTANTES:**
Señales que requieren atención médica

💡 **INFORMACIÓN EDUCATIVA:**
Explicaciones generales que puedan ayudar a entender

🏥 **RECOMENDACIÓN:**
Orientación sobre próximos pasos

Contexto: ${userContext}

**Sé empática, clara y educativa. Enfatiza que NO puedes diagnosticar y que un médico profesional debe evaluar para diagnóstico real.**`
  };

  return prompts[imageType] || prompts[MEDICAL_IMAGE_TYPES.GENERAL];
}

/**
 * 🏥 Función principal: Analiza imagen médica con Vision AI
 */
export async function analyzeMedicalImage(imageUrl, userMessage = '', options = {}) {
  try {
    console.log('[ANGELA-VISION] 🏥 Iniciando análisis de imagen médica...');
    console.log(`[ANGELA-VISION] 📸 Imagen: ${imageUrl}`);
    console.log(`[ANGELA-VISION] 💬 Contexto: ${userMessage.substring(0, 100)}...`);

    if (!imageUrl) {
      return {
        success: false,
        error: 'No se proporcionó URL de imagen',
        imageType: MEDICAL_IMAGE_TYPES.GENERAL
      };
    }

    // Detectar tipo de imagen médica
    const imageType = options.imageType || detectMedicalImageType(userMessage);
    console.log(`[ANGELA-VISION] 🔍 Tipo detectado: ${imageType}`);

    // Construir prompt especializado
    const prompt = buildMedicalPrompt(imageType, userMessage);

    // Analizar con Vision AI (alta precisión para imágenes médicas)
    const analysis = await analyzeImage(imageUrl, prompt, {
      temperature: 0.1,  // Muy determinístico para información médica
      max_tokens: 1000,  // Respuestas detalladas
      detail: 'high'     // Máxima calidad de análisis
    });

    if (!analysis || !analysis.success) {
      console.error('[ANGELA-VISION] ❌ Error en Vision API:', analysis?.error);
      return {
        success: false,
        error: analysis?.error || 'No se pudo analizar la imagen',
        imageType
      };
    }

    console.log('[ANGELA-VISION] ✅ Análisis completado');

    return {
      success: true,
      imageType,
      analysis: analysis.content,
      imageUrl,
      timestamp: new Date().toISOString(),
      confidence: 'educational', // Enfatizar que es educativo, no diagnóstico
      disclaimer: '⚠️ Esta es información educativa, NO un diagnóstico médico. Consulta con un profesional de salud.'
    };

  } catch (error) {
    console.error('[ANGELA-VISION] 🚨 Error:', error.message);

    return {
      success: false,
      error: error.message,
      imageType: options.imageType || MEDICAL_IMAGE_TYPES.GENERAL,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 🏥 Analiza múltiples imágenes médicas (útil para progresión/comparación)
 */
export async function analyzeMultipleMedicalImages(imageUrls, userMessage = '', options = {}) {
  if (!imageUrls || imageUrls.length === 0) {
    return {
      success: false,
      error: 'No se proporcionaron imágenes',
      results: []
    };
  }

  console.log(`[ANGELA-VISION] 📸 Analizando ${imageUrls.length} imágenes...`);

  // Analizar primera imagen con contexto completo
  const results = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    const contextMessage = i === 0 
      ? userMessage 
      : `${userMessage} (Imagen ${i + 1} de ${imageUrls.length} - comparar con anteriores)`;
    
    const result = await analyzeMedicalImage(imageUrl, contextMessage, options);
    results.push(result);

    // Pequeña pausa entre análisis para evitar rate limiting
    if (i < imageUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const successCount = results.filter(r => r.success).length;

  return {
    success: successCount > 0,
    totalImages: imageUrls.length,
    successfulAnalyses: successCount,
    results,
    summary: successCount === imageUrls.length 
      ? 'Todas las imágenes analizadas correctamente'
      : `${successCount} de ${imageUrls.length} imágenes analizadas`
  };
}

export default {
  analyzeMedicalImage,
  analyzeMultipleMedicalImages,
  MEDICAL_IMAGE_TYPES
};
