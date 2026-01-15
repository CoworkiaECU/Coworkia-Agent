/**
 * 📸 AXEL PHOTO COLLECTOR
 * Sistema de recolección de fotos para cotizaciones
 * - Acepta 1-4 fotos por cotización
 * - Timeout de 30 segundos entre fotos
 * - Almacenamiento temporal en memoria
 */

// 🗂️ Almacén temporal de fotos por usuario
const photoSessions = new Map();

// ⏱️ Timeout de 30 segundos para considerar sesión completa
const PHOTO_TIMEOUT_MS = 30000;

// 📊 Límites de fotos
const MIN_PHOTOS = 1;
const MAX_PHOTOS = 4;

/**
 * ➕ Agregar foto a la sesión del usuario
 */
export function addPhoto(userId, photoUrl, photoType = 'image') {
  console.log(`[AXEL-PHOTOS] 📸 Agregando foto para ${userId}`);
  
  // Obtener o crear sesión
  let session = photoSessions.get(userId);
  
  if (!session) {
    session = {
      userId,
      photos: [],
      startTime: Date.now(),
      lastPhotoTime: Date.now(),
      timeoutId: null
    };
    photoSessions.set(userId, session);
    console.log(`[AXEL-PHOTOS] ✨ Nueva sesión creada para ${userId}`);
  }
  
  // Limpiar timeout anterior
  if (session.timeoutId) {
    clearTimeout(session.timeoutId);
  }
  
  // Agregar foto si no excede el límite
  if (session.photos.length < MAX_PHOTOS) {
    session.photos.push({
      url: photoUrl,
      type: photoType,
      timestamp: Date.now()
    });
    session.lastPhotoTime = Date.now();
    
    console.log(`[AXEL-PHOTOS] ✅ Foto ${session.photos.length}/${MAX_PHOTOS} agregada`);
  } else {
    console.log(`[AXEL-PHOTOS] ⚠️ Límite de ${MAX_PHOTOS} fotos alcanzado`);
  }
  
  return {
    currentCount: session.photos.length,
    maxPhotos: MAX_PHOTOS,
    canAddMore: session.photos.length < MAX_PHOTOS,
    isReady: session.photos.length >= MIN_PHOTOS
  };
}

/**
 * 📋 Obtener estado de la sesión
 */
export function getSession(userId) {
  const session = photoSessions.get(userId);
  
  if (!session) {
    return null;
  }
  
  const elapsed = Date.now() - session.lastPhotoTime;
  const timeoutRemaining = Math.max(0, PHOTO_TIMEOUT_MS - elapsed);
  
  return {
    photoCount: session.photos.length,
    photos: session.photos,
    startTime: session.startTime,
    lastPhotoTime: session.lastPhotoTime,
    timeoutRemaining,
    isExpired: elapsed >= PHOTO_TIMEOUT_MS,
    canAddMore: session.photos.length < MAX_PHOTOS,
    isReady: session.photos.length >= MIN_PHOTOS
  };
}

/**
 * ⏰ Iniciar timeout para procesar automáticamente
 */
export function startTimeout(userId, onComplete) {
  const session = photoSessions.get(userId);
  
  if (!session) {
    console.log(`[AXEL-PHOTOS] ⚠️ No hay sesión para ${userId}`);
    return;
  }
  
  // Limpiar timeout anterior
  if (session.timeoutId) {
    clearTimeout(session.timeoutId);
  }
  
  // Crear nuevo timeout
  session.timeoutId = setTimeout(() => {
    console.log(`[AXEL-PHOTOS] ⏰ Timeout alcanzado para ${userId} - procesando ${session.photos.length} foto(s)`);
    
    if (onComplete && typeof onComplete === 'function') {
      onComplete(session);
    }
  }, PHOTO_TIMEOUT_MS);
  
  console.log(`[AXEL-PHOTOS] ⏱️ Timeout iniciado: ${PHOTO_TIMEOUT_MS}ms`);
}

/**
 * ✅ Completar sesión y obtener fotos
 */
export function completeSession(userId) {
  const session = photoSessions.get(userId);
  
  if (!session) {
    console.log(`[AXEL-PHOTOS] ⚠️ No hay sesión para completar: ${userId}`);
    return null;
  }
  
  // Limpiar timeout
  if (session.timeoutId) {
    clearTimeout(session.timeoutId);
  }
  
  // Extraer fotos
  const photos = session.photos.map(p => p.url);
  const photoCount = photos.length;
  
  // Eliminar sesión
  photoSessions.delete(userId);
  
  console.log(`[AXEL-PHOTOS] ✅ Sesión completada: ${photoCount} foto(s) recolectadas`);
  
  return {
    photos,
    photoCount,
    duration: Date.now() - session.startTime
  };
}

/**
 * 🗑️ Cancelar sesión
 */
export function cancelSession(userId) {
  const session = photoSessions.get(userId);
  
  if (!session) {
    return false;
  }
  
  // Limpiar timeout
  if (session.timeoutId) {
    clearTimeout(session.timeoutId);
  }
  
  photoSessions.delete(userId);
  console.log(`[AXEL-PHOTOS] 🗑️ Sesión cancelada para ${userId}`);
  
  return true;
}

/**
 * 📊 Validar si puede procesar cotización
 */
export function canProcessQuote(userId) {
  const session = photoSessions.get(userId);
  
  if (!session) {
    return { canProcess: false, reason: 'No hay fotos', photoCount: 0 };
  }
  
  if (session.photos.length < MIN_PHOTOS) {
    return { 
      canProcess: false, 
      reason: `Se necesita al menos ${MIN_PHOTOS} foto(s)`,
      photoCount: session.photos.length 
    };
  }
  
  return { 
    canProcess: true, 
    reason: 'Listo para procesar',
    photoCount: session.photos.length 
  };
}

/**
 * 📈 Obtener estadísticas
 */
export function getStats() {
  return {
    activeSessions: photoSessions.size,
    sessions: Array.from(photoSessions.entries()).map(([userId, session]) => ({
      userId,
      photoCount: session.photos.length,
      elapsed: Date.now() - session.startTime
    }))
  };
}

export default {
  addPhoto,
  getSession,
  startTimeout,
  completeSession,
  cancelSession,
  canProcessQuote,
  getStats,
  MIN_PHOTOS,
  MAX_PHOTOS,
  PHOTO_TIMEOUT_MS
};
