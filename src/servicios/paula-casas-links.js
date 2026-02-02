/**
 * 🏘️ PAULA - Casas Jardín - Links Específicos por Casa
 * 
 * Estrategia: Envío SELECTIVO
 * - NUNCA enviar link general con todas las fotos
 * - Enviar SOLO el link de la casa específica que el cliente pide
 * - Prioridad: Planos → Renders → Fotos reales → Terreno (última opción)
 * 
 * ESTRUCTURA POR CASA:
 * Cada link debe contener SOLO:
 * - Ficha técnica PDF
 * - Plano arquitectónico PDF
 * - Renders (exterior + interior)
 * - Fotos reales del terreno
 * - Videos (recorrido virtual + tour terreno)
 */

export const CASAS_JARDIN_LINKS = {
  // 🏠 Casa 1 - Link específico (PENDIENTE)
  'Casa 1': {
    link: 'PENDIENTE_AGREGAR_LINK', // TODO: Agregar link de Drive de Casa 1
    disponible: false, // Cambiar a true cuando tengas el link
    descripcion: 'Casa 1 - Modelo A (3 dormitorios, 2.5 baños)',
    contenido: [
      'Ficha técnica PDF',
      'Plano arquitectónico PDF',
      'Renders exteriores e interiores',
      'Fotos del terreno',
      'Video recorrido virtual',
      'Video tour del terreno'
    ]
  },

  // 🏠 Casa 3 - Link específico (PENDIENTE)
  'Casa 3': {
    link: 'PENDIENTE_AGREGAR_LINK', // TODO: Agregar link de Drive de Casa 3
    disponible: false,
    descripcion: 'Casa 3 - Modelo B (4 dormitorios, 3 baños)',
    contenido: [
      'Ficha técnica PDF',
      'Plano arquitectónico PDF',
      'Renders exteriores e interiores',
      'Fotos del terreno',
      'Video recorrido virtual',
      'Video tour del terreno'
    ]
  },

  // 🏠 Casa 6 - Link específico (PENDIENTE)
  'Casa 6': {
    link: 'PENDIENTE_AGREGAR_LINK', // TODO: Agregar link de Drive de Casa 6
    disponible: false,
    descripcion: 'Casa 6 - Modelo Premium (5 dormitorios, 4 baños, estudio)',
    contenido: [
      'Ficha técnica PDF',
      'Plano arquitectónico PDF',
      'Renders exteriores e interiores',
      'Fotos del terreno',
      'Video recorrido virtual',
      'Video tour del terreno'
    ]
  },

  // 🏠 Casa 7 - Link específico (PENDIENTE)
  'Casa 7': {
    link: 'PENDIENTE_AGREGAR_LINK', // TODO: Agregar link de Drive de Casa 7
    disponible: false,
    descripcion: 'Casa 7 - Modelo Deluxe (4 dormitorios, 3.5 baños, terraza)',
    contenido: [
      'Ficha técnica PDF',
      'Plano arquitectónico PDF',
      'Renders exteriores e interiores',
      'Fotos del terreno',
      'Video recorrido virtual',
      'Video tour del terreno'
    ]
  },

  // 📋 Información General del Proyecto (PENDIENTE)
  'Generales': {
    link: 'PENDIENTE_AGREGAR_LINK', // TODO: Agregar link de Drive de Generales
    disponible: false,
    descripcion: 'Información general del proyecto Casas Jardín',
    contenido: [
      'Master plan de la urbanización',
      'Video presentación del proyecto completo',
      'Amenidades de la comunidad',
      'Ubicación y vías de acceso'
    ]
  }
};

/**
 * 🎯 Estrategia de envío según solicitud del cliente
 */
export const ESTRATEGIA_ENVIO = {
  prioridad: [
    '1. PLANOS (siempre primero)',
    '2. RENDERS (visualización del proyecto)',
    '3. FOTOS REALES (solo si cliente lo pide)',
    '4. TERRENO (última opción, solo si insiste)'
  ],
  
  mensaje_planos_primero: 'Te envío los planos arquitectónicos y renders para que veas el proyecto terminado. Es la mejor forma de visualizar tu futura casa. 🏠📐',
  
  mensaje_terreno_despues: 'Si deseas ver el terreno actual, puedo enviarte esas fotos también, pero ten en cuenta que el proyecto se vende en planos con construcción incluida. 🏗️',
  
  plan_pagos: 'Ofrecemos plan flexible de pagos mensuales después de la entrada inicial. Es la forma más accesible de adquirir tu casa. 💰📅'
};

/**
 * 🔧 Función auxiliar para obtener link de una casa específica
 */
export function getCasaLink(casaNumero) {
  const casaKey = `Casa ${casaNumero}`;
  const casa = CASAS_JARDIN_LINKS[casaKey];
  
  if (!casa) {
    return {
      error: true,
      message: `No tenemos información de Casa ${casaNumero}. Casas disponibles: 1, 3, 6, 7`
    };
  }
  
  if (!casa.disponible || casa.link === 'PENDIENTE_AGREGAR_LINK') {
    return {
      error: true,
      message: `El link de Casa ${casaNumero} aún no está disponible. Estamos organizando la información para ti. 📂`
    };
  }
  
  return {
    success: true,
    link: casa.link,
    descripcion: casa.descripcion,
    contenido: casa.contenido
  };
}

/**
 * 🔧 Función auxiliar para obtener link de información general
 */
export function getGeneralesLink() {
  const generales = CASAS_JARDIN_LINKS['Generales'];
  
  if (!generales.disponible || generales.link === 'PENDIENTE_AGREGAR_LINK') {
    return {
      error: true,
      message: 'La información general del proyecto está siendo organizada. Te la enviaremos pronto. 📂'
    };
  }
  
  return {
    success: true,
    link: generales.link,
    descripcion: generales.descripcion,
    contenido: generales.contenido
  };
}

/**
 * 📝 Función para generar mensaje con link(s) según lo que pide el cliente
 */
export function generarMensajeConLinks(casasSolicitadas = [], incluirGenerales = false) {
  let mensaje = '';
  const links = [];
  
  // Agregar casas solicitadas
  for (const casaNum of casasSolicitadas) {
    const resultado = getCasaLink(casaNum);
    
    if (resultado.success) {
      mensaje += `\n🏠 *${resultado.descripcion}*\n📂 ${resultado.link}\n`;
      mensaje += `Incluye: ${resultado.contenido.slice(0, 3).join(', ')}\n`;
      links.push(resultado.link);
    } else {
      mensaje += `\n⚠️ Casa ${casaNum}: ${resultado.message}\n`;
    }
  }
  
  // Agregar información general si la piden
  if (incluirGenerales) {
    const generales = getGeneralesLink();
    
    if (generales.success) {
      mensaje += `\n📋 *Información General del Proyecto*\n📂 ${generales.link}\n`;
      mensaje += `Incluye: ${generales.contenido.join(', ')}\n`;
      links.push(generales.link);
    } else {
      mensaje += `\n⚠️ ${generales.message}\n`;
    }
  }
  
  // Agregar estrategia de venta
  if (casasSolicitadas.length > 0) {
    mensaje += `\n${ESTRATEGIA_ENVIO.mensaje_planos_primero}\n`;
    mensaje += `\n💡 ${ESTRATEGIA_ENVIO.plan_pagos}\n`;
  }
  
  return {
    mensaje: mensaje.trim(),
    links,
    totalEnviados: links.length
  };
}

export default {
  CASAS_JARDIN_LINKS,
  ESTRATEGIA_ENVIO,
  getCasaLink,
  getGeneralesLink,
  generarMensajeConLinks
};
