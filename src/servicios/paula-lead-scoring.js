/**
 * 🎯 SISTEMA DE LEAD SCORING - PAULA (PropElite)
 * 
 * Calificación inteligente y sutil de clientes potenciales
 * Cumplimiento UAFE Ecuador (Prevención de Lavado de Activos)
 * 
 * Score Total: 200 puntos
 * - Capacidad de Pago: 60 pts
 * - Origen de Fondos: 50 pts
 * - Interés Genuino: 45 pts
 * - Perfil Familiar: 25 pts
 * - Red Flags: -30 pts (penalizaciones)
 */

/**
 * Categorías de actividades económicas (UAFE Ecuador)
 */
const ACTIVIDADES_ECONOMICAS = {
  // Bajo riesgo - Alto score
  altoRiesgo: {
    score: 5,
    actividades: ['desempleado', 'sin actividad', 'no especifica', 'prefiero no decir']
  },
  
  medioRiesgo: {
    score: 10,
    actividades: ['comercio informal', 'freelance sin registro', 'varios negocios']
  },
  
  profesionalIndependiente: {
    score: 15,
    actividades: ['abogado', 'médico', 'arquitecto', 'ingeniero', 'contador', 'consultor']
  },
  
  empresario: {
    score: 20,
    actividades: ['empresario', 'dueño de negocio', 'gerente general', 'socio']
  },
  
  empleadoFormal: {
    score: 15,
    actividades: ['empleado', 'funcionario', 'gerente', 'director', 'ejecutivo']
  }
};

/**
 * Evaluar capacidad de pago (60 puntos máximo)
 */
export function evaluarCapacidadPago(leadData) {
  const scoring = {
    puntos: 0,
    maxPuntos: 60,
    detalles: []
  };
  
  // 1. Mención de liquidez (20 pts)
  if (leadData.mencionaAnticipoDisponible) {
    scoring.puntos += 20;
    scoring.detalles.push('✅ Menciona tener anticipo disponible (+20)');
  } else if (leadData.preguntaPorFinanciamiento) {
    scoring.puntos += 10;
    scoring.detalles.push('⚠️ Pregunta por financiamiento (+10)');
  } else {
    scoring.detalles.push('❌ No menciona capacidad de pago (0)');
  }
  
  // 2. Tipo de pago preferido (15 pts)
  if (leadData.tipoPago === 'efectivo' || leadData.tipoPago === 'transferencia') {
    scoring.puntos += 15;
    scoring.detalles.push('✅ Pago directo/efectivo (+15)');
  } else if (leadData.tipoPago === 'credito_aprobado') {
    scoring.puntos += 12;
    scoring.detalles.push('✅ Crédito pre-aprobado (+12)');
  } else if (leadData.tipoPago === 'credito_tramite') {
    scoring.puntos += 8;
    scoring.detalles.push('⚠️ Crédito en trámite (+8)');
  } else {
    scoring.detalles.push('❌ Sin definir forma de pago (0)');
  }
  
  // 3. Timeline / Urgencia (10 pts)
  if (leadData.timeline === 'inmediato') {
    scoring.puntos += 10;
    scoring.detalles.push('✅ Compra inmediata (+10)');
  } else if (leadData.timeline === '1-3meses') {
    scoring.puntos += 8;
    scoring.detalles.push('✅ Compra en 1-3 meses (+8)');
  } else if (leadData.timeline === '3-6meses') {
    scoring.puntos += 6;
    scoring.detalles.push('⚠️ Compra en 3-6 meses (+6)');
  } else {
    scoring.puntos += 2;
    scoring.detalles.push('⚠️ Sin urgencia definida (+2)');
  }
  
  // 4. Propiedades previas (15 pts)
  if (leadData.tienePropiedades === 'si_varias') {
    scoring.puntos += 15;
    scoring.detalles.push('✅ Tiene varias propiedades (+15)');
  } else if (leadData.tienePropiedades === 'si_una') {
    scoring.puntos += 10;
    scoring.detalles.push('✅ Tiene una propiedad (+10)');
  } else if (leadData.tienePropiedades === 'primera') {
    scoring.puntos += 8;
    scoring.detalles.push('⚠️ Primera propiedad (+8)');
  }
  
  return scoring;
}

/**
 * Evaluar origen de fondos - Cumplimiento UAFE (50 puntos máximo)
 */
export function evaluarOrigenFondos(leadData) {
  const scoring = {
    puntos: 0,
    maxPuntos: 50,
    detalles: [],
    cumplimientoUAFE: 'pendiente'
  };
  
  // 1. Actividad económica identificada (20 pts)
  const actividadNormalizada = (leadData.actividadEconomica || '').toLowerCase();
  let actividadScore = 5; // default bajo riesgo
  
  for (const [categoria, data] of Object.entries(ACTIVIDADES_ECONOMICAS)) {
    if (data.actividades.some(act => actividadNormalizada.includes(act))) {
      actividadScore = data.score;
      break;
    }
  }
  
  scoring.puntos += actividadScore;
  if (actividadScore >= 15) {
    scoring.detalles.push(`✅ Actividad económica verificable (+${actividadScore})`);
    scoring.cumplimientoUAFE = 'identificado';
  } else if (actividadScore >= 10) {
    scoring.detalles.push(`⚠️ Actividad económica medio riesgo (+${actividadScore})`);
    scoring.cumplimientoUAFE = 'requiere_validacion';
  } else {
    scoring.detalles.push(`❌ Actividad económica no clara (+${actividadScore})`);
    scoring.cumplimientoUAFE = 'alto_riesgo';
  }
  
  // 2. Estructura legal de ingresos (15 pts)
  if (leadData.tipoIngreso === 'empresa_formal') {
    scoring.puntos += 15;
    scoring.detalles.push('✅ Ingresos vía empresa formal (+15)');
  } else if (leadData.tipoIngreso === 'independiente_registrado') {
    scoring.puntos += 12;
    scoring.detalles.push('✅ Profesional independiente registrado (+12)');
  } else if (leadData.tipoIngreso === 'empleado_relacion_dependencia') {
    scoring.puntos += 13;
    scoring.detalles.push('✅ Relación de dependencia (+13)');
  } else if (leadData.tipoIngreso === 'informal') {
    scoring.puntos += 5;
    scoring.detalles.push('⚠️ Actividad informal (+5)');
    scoring.cumplimientoUAFE = 'requiere_validacion';
  }
  
  // 3. Coherencia de recursos vs actividad (15 pts)
  if (leadData.coherenciaRecursos === 'alta') {
    scoring.puntos += 15;
    scoring.detalles.push('✅ Recursos coherentes con actividad (+15)');
  } else if (leadData.coherenciaRecursos === 'media') {
    scoring.puntos += 10;
    scoring.detalles.push('⚠️ Recursos medianamente coherentes (+10)');
  } else if (leadData.coherenciaRecursos === 'baja') {
    scoring.puntos += 3;
    scoring.detalles.push('❌ Recursos no coherentes con actividad (+3)');
    scoring.cumplimientoUAFE = 'alto_riesgo';
  }
  
  return scoring;
}

/**
 * Evaluar interés genuino (45 puntos máximo)
 */
export function evaluarInteresGenuino(leadData) {
  const scoring = {
    puntos: 0,
    maxPuntos: 45,
    detalles: []
  };
  
  // 1. Preguntas específicas (15 pts)
  const numPreguntas = leadData.preguntasRealizadas || 0;
  if (numPreguntas >= 5) {
    scoring.puntos += 15;
    scoring.detalles.push('✅ Hace muchas preguntas específicas (+15)');
  } else if (numPreguntas >= 3) {
    scoring.puntos += 10;
    scoring.detalles.push('✅ Hace preguntas relevantes (+10)');
  } else if (numPreguntas >= 1) {
    scoring.puntos += 5;
    scoring.detalles.push('⚠️ Pocas preguntas (+5)');
  }
  
  // 2. Solicitud de materiales (10 pts)
  if (leadData.solicitoFichas) scoring.puntos += 3;
  if (leadData.solicitoRenders) scoring.puntos += 3;
  if (leadData.solicitoPlanos) scoring.puntos += 4;
  
  const materialSolicitado = 
    (leadData.solicitoFichas ? 1 : 0) +
    (leadData.solicitoRenders ? 1 : 0) +
    (leadData.solicitoPlanos ? 1 : 0);
  
  if (materialSolicitado >= 2) {
    scoring.detalles.push(`✅ Solicitó ${materialSolicitado} tipos de materiales (+10)`);
  } else if (materialSolicitado === 1) {
    scoring.detalles.push('⚠️ Solicitó material básico (+3)');
  }
  
  // 3. Interés en visita (20 pts)
  if (leadData.agendoVisita) {
    scoring.puntos += 20;
    scoring.detalles.push('✅ AGENDÓ VISITA (+20)');
  } else if (leadData.preguntoPorVisita) {
    scoring.puntos += 12;
    scoring.detalles.push('✅ Preguntó por visita (+12)');
  } else if (leadData.mencionoVisitaFutura) {
    scoring.puntos += 6;
    scoring.detalles.push('⚠️ Mencionó visitar en el futuro (+6)');
  }
  
  return scoring;
}

/**
 * Evaluar perfil familiar (25 puntos máximo)
 */
export function evaluarPerfilFamiliar(leadData) {
  const scoring = {
    puntos: 0,
    maxPuntos: 25,
    detalles: [],
    match: null
  };
  
  // 1. Información familiar proporcionada (10 pts)
  if (leadData.numeroPersonas) {
    scoring.puntos += 5;
    scoring.detalles.push('✅ Compartió número de personas (+5)');
  }
  
  if (leadData.edadHijos && leadData.edadHijos.length > 0) {
    scoring.puntos += 5;
    scoring.detalles.push('✅ Compartió edades de hijos (+5)');
  }
  
  // 2. Match con casa de interés (15 pts)
  if (leadData.casaInteres && leadData.numeroPersonas) {
    const matchScore = calcularMatchFamiliar(
      leadData.casaInteres,
      leadData.numeroPersonas,
      leadData.edadHijos
    );
    
    scoring.puntos += matchScore;
    if (matchScore >= 12) {
      scoring.detalles.push('✅ Excelente match familia-casa (+15)');
      scoring.match = 'excelente';
    } else if (matchScore >= 8) {
      scoring.detalles.push('✅ Buen match familia-casa (+10)');
      scoring.match = 'bueno';
    } else if (matchScore >= 5) {
      scoring.detalles.push('⚠️ Match moderado familia-casa (+5)');
      scoring.match = 'moderado';
    }
  }
  
  return scoring;
}

/**
 * Detectar red flags (banderas rojas) - Penalizaciones
 */
export function detectarRedFlags(leadData) {
  const flags = [];
  let penalizacion = 0;
  
  // 1. Evasivo sobre actividad económica (-10)
  if (leadData.evasivoActividad) {
    flags.push('🚩 Evasivo sobre actividad económica');
    penalizacion += 10;
  }
  
  // 2. Inconsistencias en capacidad de pago (-15)
  if (leadData.inconsistenciaPago) {
    flags.push('🚩 Inconsistencias en capacidad de pago');
    penalizacion += 15;
  }
  
  // 3. Urgencia extrema sin justificación (-10)
  if (leadData.urgenciaExtrema && !leadData.justificacionUrgencia) {
    flags.push('🚩 Urgencia extrema sin justificación');
    penalizacion += 10;
  }
  
  // 4. Quiere pagar todo en efectivo inmediato montos grandes (-20)
  if (leadData.efectivoGrande && leadData.montoEfectivo > 100000) {
    flags.push('🚩 Monto grande en efectivo sin justificación');
    penalizacion += 20;
  }
  
  // 5. Múltiples cambios de historia (-12)
  if (leadData.cambiosHistoria && leadData.cambiosHistoria >= 2) {
    flags.push('🚩 Cambió su historia múltiples veces');
    penalizacion += 12;
  }
  
  // 6. No proporciona información básica (-8)
  if (!leadData.nombre || !leadData.telefono || !leadData.email) {
    flags.push('⚠️ Información de contacto incompleta');
    penalizacion += 8;
  }
  
  return {
    flags,
    penalizacion,
    totalFlags: flags.length
  };
}

/**
 * Calcular score total del lead
 */
export function calcularLeadScore(leadData) {
  // Evaluaciones por categoría
  const capacidadPago = evaluarCapacidadPago(leadData);
  const origenFondos = evaluarOrigenFondos(leadData);
  const interesGenuino = evaluarInteresGenuino(leadData);
  const perfilFamiliar = evaluarPerfilFamiliar(leadData);
  const redFlags = detectarRedFlags(leadData);
  
  // Score total
  const scoreBase = 
    capacidadPago.puntos +
    origenFondos.puntos +
    interesGenuino.puntos +
    perfilFamiliar.puntos;
  
  const scoreFinal = Math.max(0, scoreBase - redFlags.penalizacion);
  const scoreMaximo = 200;
  
  // Clasificación
  let clasificacion, recomendacion;
  if (scoreFinal >= 150) {
    clasificacion = 'ALTO';
    recomendacion = 'PROCEDER CON VISITA - Lead calificado premium';
  } else if (scoreFinal >= 100) {
    clasificacion = 'MEDIO';
    recomendacion = 'CALIFICADO - Agendar visita y validar documentación';
  } else if (scoreFinal >= 60) {
    clasificacion = 'BAJO';
    recomendacion = 'PRECAUCIÓN - Requiere más información antes de proceder';
  } else {
    clasificacion = 'DESCALIFICADO';
    recomendacion = 'NO PROCEDER - Lead no cumple criterios mínimos';
  }
  
  return {
    scoreFinal,
    scoreMaximo,
    porcentaje: Math.round((scoreFinal / scoreMaximo) * 100),
    clasificacion,
    recomendacion,
    
    desglose: {
      capacidadPago,
      origenFondos,
      interesGenuino,
      perfilFamiliar,
      redFlags
    },
    
    cumplimientoUAFE: origenFondos.cumplimientoUAFE,
    requiereValidacion: origenFondos.cumplimientoUAFE !== 'identificado' || redFlags.totalFlags > 0
  };
}

/**
 * Generar reporte para email / dueños
 */
export function generarReporteLeadScore(leadData, score) {
  const fecha = new Date().toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return {
    // Para email HTML
    html: `
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">📊 Calificación de Lead</h3>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid ${score.clasificacion === 'ALTO' ? '#10b981' : score.clasificacion === 'MEDIO' ? '#f59e0b' : '#ef4444'};">
          <p style="margin: 5px 0;"><strong>Lead Score:</strong> ${score.scoreFinal}/${score.scoreMaximo} (${score.porcentaje}%)</p>
          <p style="margin: 5px 0;"><strong>Clasificación:</strong> <span style="color: ${score.clasificacion === 'ALTO' ? '#10b981' : score.clasificacion === 'MEDIO' ? '#f59e0b' : '#ef4444'}; font-weight: bold;">${score.clasificacion}</span></p>
          <p style="margin: 5px 0;"><strong>Recomendación:</strong> ${score.recomendacion}</p>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 5px 0; font-size: 14px;"><strong>Capacidad de Pago:</strong> ${score.desglose.capacidadPago.puntos}/${score.desglose.capacidadPago.maxPuntos}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Origen de Fondos:</strong> ${score.desglose.origenFondos.puntos}/${score.desglose.origenFondos.maxPuntos}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Interés Genuino:</strong> ${score.desglose.interesGenuino.puntos}/${score.desglose.interesGenuino.maxPuntos}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Perfil Familiar:</strong> ${score.desglose.perfilFamiliar.puntos}/${score.desglose.perfilFamiliar.maxPuntos}</p>
          ${score.desglose.redFlags.totalFlags > 0 ? `<p style="margin: 5px 0; font-size: 14px; color: #ef4444;"><strong>Penalizaciones:</strong> -${score.desglose.redFlags.penalizacion}</p>` : ''}
        </div>
        
        <div style="background: ${score.cumplimientoUAFE === 'identificado' ? '#ecfdf5' : '#fef3c7'}; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 5px 0; font-size: 13px;"><strong>Cumplimiento UAFE:</strong> ${score.cumplimientoUAFE === 'identificado' ? '✅ Identificado' : '⚠️ Requiere validación'}</p>
          ${score.requiereValidacion ? '<p style="margin: 5px 0; font-size: 12px; color: #92400e;">⚠️ Documentación pendiente en visita</p>' : ''}
        </div>
        
        <p style="font-size: 11px; color: #9ca3af; margin-top: 15px;">Generado: ${fecha}</p>
      </div>
    `,
    
    // Para reporte texto plano
    texto: `
LEAD SCORE: ${score.scoreFinal}/${score.scoreMaximo} (${score.porcentaje}%)
CLASIFICACIÓN: ${score.clasificacion}
RECOMENDACIÓN: ${score.recomendacion}

DESGLOSE:
- Capacidad de Pago: ${score.desglose.capacidadPago.puntos}/${score.desglose.capacidadPago.maxPuntos}
- Origen de Fondos: ${score.desglose.origenFondos.puntos}/${score.desglose.origenFondos.maxPuntos}
- Interés Genuino: ${score.desglose.interesGenuino.puntos}/${score.desglose.interesGenuino.maxPuntos}
- Perfil Familiar: ${score.desglose.perfilFamiliar.puntos}/${score.desglose.perfilFamiliar.maxPuntos}

CUMPLIMIENTO UAFE: ${score.cumplimientoUAFE}
${score.requiereValidacion ? '⚠️ Requiere validación documental en visita' : ''}

Generado: ${fecha}
    `
  };
}

/**
 * Helper: Calcular match familiar con casa
 */
function calcularMatchFamiliar(numeroCasa, numeroPersonas, edadHijos = []) {
  let score = 0;
  
  // Casa 7: Mejor para familias con niños (jardín más grande)
  if (numeroCasa === 7) {
    if (numeroPersonas >= 3 && edadHijos.length > 0) {
      score = 15; // Excelente match
    } else if (numeroPersonas >= 3) {
      score = 10;
    } else {
      score = 5;
    }
  }
  
  // Casa 6: Segunda mejor opción para familias grandes
  else if (numeroCasa === 6) {
    if (numeroPersonas >= 4) {
      score = 13;
    } else if (numeroPersonas === 3) {
      score = 10;
    } else {
      score = 7;
    }
  }
  
  // Casa 1: Buena para familias medianas
  else if (numeroCasa === 1) {
    if (numeroPersonas === 3 || numeroPersonas === 4) {
      score = 12;
    } else {
      score = 8;
    }
  }
  
  // Casa 3: Mejor precio, familias pequeñas a medianas
  else if (numeroCasa === 3) {
    if (numeroPersonas === 2 || numeroPersonas === 3) {
      score = 12;
    } else if (numeroPersonas === 4) {
      score = 9;
    } else {
      score = 6;
    }
  }
  
  return score;
}

export default {
  calcularLeadScore,
  generarReporteLeadScore,
  evaluarCapacidadPago,
  evaluarOrigenFondos,
  evaluarInteresGenuino,
  evaluarPerfilFamiliar,
  detectarRedFlags
};
