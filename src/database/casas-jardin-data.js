/**
 * 🏡 BASE DE DATOS - CASAS JARDÍN
 * Proyecto Residencial "El Morenal - Casas Jardín"
 * Constructor: G.M.A. Arquitectos (Izurieta Vergara)
 * 
 * 4 Casas disponibles para construcción 2026
 * Anticipo 30% - Construcción 8 meses
 */

export const PROYECTO_INFO = {
  nombre: "Casas Jardín",
  ubicacion: "El Morenal",
  constructor: "G.M.A. Arquitectos",
  responsable: "Izurieta Vergara",
  totalCasas: 7,
  disponibles: 4,
  casasDisponibles: [1, 3, 6, 7], // Por construir
  casasOcupadas: [2, 4, 5], // Ya construidas y habitadas
  
  condiciones: {
    anticipo: 0.30, // 30% para iniciar obra
    tiempoConstructor: "8 meses",
    personalizacion: "Modificaciones interiores permitidas antes de iniciar obra",
    estado: "Planos y costos finalizados - Listo para construcción"
  },
  
  caracteristicasGenerales: {
    tipo: "Casas unifamiliares en urbanización privada",
    etapa: "Pre-construcción (por iniciar)",
    acabados: "Primera calidad",
    servicios: "Todos los servicios básicos",
    seguridad: "Comunidad cerrada"
  }
};

export const CASAS_DISPONIBLES = {
  
  casa1: {
    numero: 1,
    codigo: "CJ-CASA-001",
    disponible: true,
    
    // Terreno y áreas
    terreno: {
      horizontal: 380.58, // m²
      urbanizado: 380.58,
      jardines: 207.03,
      precioM2: 250,
      valorTerreno: 95145.00
    },
    
    // Construcción
    construccion: {
      plantaBaja: 125.00, // m² (estimado del área útil)
      plantaAlta: 75.16,  // m² (estimado)
      areaUtil: 200.16,
      garajes: {
        cubiertos: 34.80,
        descubiertos: 0
      },
      porches: 16.20,
      terraza: 7.20,
      areasExteriores: 58.20
    },
    
    areaTotalCasa: 258.36, // m²
    
    // Precios
    precios: {
      valorTotalCasa: 245442.00,
      precioPromocional: 340587.00,
      anticipo30: 102176.10, // 30% del precio promocional
      diferencia: 9514.50,
      valorTerreno: 76116.00,
      valorConstruccion: 245442.00
    },
    
    // Formas de pago
    formasPago: {
      reserva10: 9514.50,
      diferenciaReserva: 65601.50,
      valorTerreno: 76116.00,
      valorConstruccion: 245442.00,
      notas: [
        "10% a la reserva",
        "Diferencia al valor de aprobación de planos y permisos de construcción",
        "Precios de ventas en planos al costo para inicio de obra",
        "Precios al finalizar estimados con 15% adicional"
      ]
    },
    
    // Características destacadas
    caracteristicas: [
      "3 dormitorios",
      "2.5 baños",
      "Sala y comedor integrados",
      "Cocina moderna",
      "Área de lavandería",
      "Garaje cubierto para 2 vehículos",
      "Jardín privado amplio (207 m²)",
      "Porche de ingreso",
      "Terraza"
    ],
    
    // Google Drive - Multimedia
    googleDrive: {
      fichaTecnica: null,  // URL de Google Drive
      planoArquitectonico: null,
      renders: [],         // Array de URLs
      fotosReales: [],     // Array de URLs
      videos: [],          // Array de URLs
      masterPlan: null
    },
    
    // Metadata para scoring
    perfilIdeal: {
      familiaSize: "3-4 personas",
      edadNinos: "cualquier edad",
      presupuesto: "high-medium",
      jardinAmplitud: "muy amplio"
    }
  },
  
  casa3: {
    numero: 3,
    codigo: "CJ-CASA-003",
    disponible: true,
    
    terreno: {
      horizontal: 319.51,
      urbanizado: 319.51,
      jardines: 151.18,
      precioM2: 250,
      valorTerreno: 79877.50
    },
    
    construccion: {
      plantaBaja: 101.15, // m² (estimado)
      plantaAlta: 75.59,  // m²
      areaUtil: 176.74,
      garajes: {
        cubiertos: 27.45,
        descubiertos: 0
      },
      porches: 39.70,
      terraza: 8.28,
      areasExteriores: 75.43
    },
    
    areaTotalCasa: 252.17,
    
    precios: {
      valorTotalCasa: 239561.50,
      precioPromocional: 319439.00,
      anticipo30: 95831.70,
      diferencia: 7987.75,
      valorTerreno: 63902.00,
      valorConstruccion: 175659.50
    },
    
    formasPago: {
      reserva10: 7987.75,
      diferenciaReserva: 55914.25,
      valorTerreno: 63902.00,
      valorConstruccion: 175659.50,
      notas: [
        "10% a la reserva",
        "Diferencia al valor de aprobación de planos",
        "Construcción 8 meses después del anticipo",
        "Personalización interior disponible"
      ]
    },
    
    caracteristicas: [
      "3 dormitorios",
      "2.5 baños",
      "Sala y comedor",
      "Cocina moderna",
      "Área de lavandería",
      "Garaje cubierto",
      "Jardín privado (151 m²)",
      "Porche amplio",
      "Terraza",
      "Por construir - Personalizaciones disponibles"
    ],
    
    googleDrive: {
      fichaTecnica: null,
      planoArquitectonico: null,
      renders: [],
      fotosReales: [],
      videos: [],
      masterPlan: null
    },
    
    perfilIdeal: {
      familiaSize: "2-4 personas",
      edadNinos: "cualquier edad",
      presupuesto: "medium",
      jardinAmplitud: "moderado",
      valorAgregado: "Mejor relación precio-calidad del proyecto"
    }
  },
  
  casa6: {
    numero: 6,
    codigo: "CJ-CASA-006",
    disponible: true,
    
    terreno: {
      horizontal: 465.81,
      urbanizado: 465.81,
      jardines: 225.12,
      precioM2: 250,
      valorTerreno: 115952.50
    },
    
    construccion: {
      plantaBaja: 121.73, // m² (estimado)
      plantaAlta: 74.73,  // m²
      areaUtil: 196.46,
      garajes: {
        cubiertos: 35.96,
        descubiertos: 0
      },
      porches: 17.20,
      terraza: 0,
      areasExteriores: 53.16
    },
    
    areaTotalCasa: 249.62,
    
    precios: {
      valorTotalCasa: 237139.00,
      precioPromocional: 353091.50,
      anticipo30: 105927.45,
      diferencia: 11595.25,
      valorTerreno: 92762.00,
      valorConstruccion: 144377.00
    },
    
    formasPago: {
      reserva10: 11595.25,
      diferenciaReserva: 81166.75,
      valorTerreno: 92762.00,
      valorConstruccion: 144377.00,
      notas: [
        "10% a la reserva",
        "Diferencia al valor de aprobación de planos",
        "Precios al costo para inicio de obra",
        "Precio final estimado 15% adicional"
      ]
    },
    
    caracteristicas: [
      "3 dormitorios",
      "2.5 baños",
      "Sala y comedor amplios",
      "Cocina moderna",
      "Área de lavandería",
      "Garaje cubierto doble",
      "Jardín EXTRA GRANDE (225 m²)",
      "Porche de ingreso",
      "Mayor terreno disponible"
    ],
    
    googleDrive: {
      fichaTecnica: null,
      planoArquitectonico: null,
      renders: [],
      fotosReales: [],
      videos: [],
      masterPlan: null
    },
    
    perfilIdeal: {
      familiaSize: "3-5 personas",
      edadNinos: "niños pequeños ideal para juegos",
      presupuesto: "high",
      jardinAmplitud: "extra grande - perfecto para mascotas y niños",
      valorAgregado: "Terreno más amplio del proyecto"
    }
  },
  
  casa7: {
    numero: 7,
    codigo: "CJ-CASA-007",
    disponible: true,
    
    terreno: {
      horizontal: 504.21,
      urbanizado: 504.21,
      jardines: 358.10, // JARDÍN MÁS GRANDE DEL PROYECTO
      precioM2: 250,
      valorTerreno: 126052.50
    },
    
    construccion: {
      plantaBaja: 108.71, // m² (estimado)
      plantaAlta: 71.90,  // m²
      areaUtil: 180.61,
      garajes: {
        cubiertos: 41.96,
        descubiertos: 0
      },
      porches: 0,
      terraza: 12.57,
      areasExteriores: 54.53
    },
    
    areaTotalCasa: 235.14,
    
    precios: {
      valorTotalCasa: 223383.00,
      precioPromocional: 349435.50,
      anticipo30: 104830.65,
      diferencia: 12605.25,
      valorTerreno: 100842.00,
      valorConstruccion: 122541.00
    },
    
    formasPago: {
      reserva10: 12605.25,
      diferenciaReserva: 88236.75,
      valorTerreno: 100842.00,
      valorConstruccion: 122541.00,
      notas: [
        "10% a la reserva",
        "Mayor jardín del proyecto",
        "Ideal para familias con niños",
        "Precio al costo para inicio de obra"
      ]
    },
    
    caracteristicas: [
      "3 dormitorios",
      "2.5 baños",
      "Sala y comedor",
      "Cocina moderna",
      "Área de lavandería",
      "Garaje cubierto amplio",
      "JARDÍN MÁS GRANDE (358 m²) 🌳",
      "Terraza privada",
      "Perfecto para niños y mascotas"
    ],
    
    googleDrive: {
      fichaTecnica: null,
      planoArquitectonico: null,
      renders: [],
      fotosReales: [],
      videos: [],
      masterPlan: null
    },
    
    perfilIdeal: {
      familiaSize: "3-5 personas",
      edadNinos: "ideal para niños de cualquier edad",
      presupuesto: "high",
      jardinAmplitud: "EXCEPCIONAL - El más grande del proyecto",
      valorAgregado: "Perfecto para familias que valoran espacio exterior",
      persuasion: "Para un niño adolescente, este jardín es un paraíso"
    }
  }
  
};

/**
 * Función helper para obtener casa por número
 */
export function getCasaByNumero(numero) {
  const casaKey = `casa${numero}`;
  return CASAS_DISPONIBLES[casaKey] || null;
}

/**
 * Función helper para obtener todas las casas disponibles
 */
export function getCasasDisponibles() {
  return Object.values(CASAS_DISPONIBLES).filter(casa => casa.disponible);
}

/**
 * Función para formatear precio
 */
export function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(precio);
}

/**
 * Función para obtener resumen de casa
 */
export function getResumenCasa(numero) {
  const casa = getCasaByNumero(numero);
  if (!casa) return null;
  
  return {
    numero: casa.numero,
    codigo: casa.codigo,
    precioPromocional: formatearPrecio(casa.precios.precioPromocional),
    anticipo30: formatearPrecio(casa.precios.anticipo30),
    areaConstruccion: `${casa.construccion.areaUtil} m²`,
    areaTerreno: `${casa.terreno.horizontal} m²`,
    areaJardin: `${casa.terreno.jardines} m²`,
    caracteristicasPrincipales: casa.caracteristicas.slice(0, 5),
    estado: "Por construir - 8 meses (personalizable)"
  };
}

export default {
  PROYECTO_INFO,
  CASAS_DISPONIBLES,
  getCasaByNumero,
  getCasasDisponibles,
  formatearPrecio,
  getResumenCasa
};
