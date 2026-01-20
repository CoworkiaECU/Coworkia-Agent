/**
 * 🧪 AXEL VISION AI - PRUEBAS UNITARIAS
 * Auditoría de manejo de errores y edge cases
 */

import { jest } from '@jest/globals';

// Mock de OpenAI Vision API
const mockAnalyzeImage = jest.fn();
jest.unstable_mockModule('../../src/servicios-ia/openai.js', () => ({
  analyzeImage: mockAnalyzeImage
}));

const { analyzeCollisionPhotos } = await import('../../src/servicios/axel-vision-analysis.js');

describe('🏗️ AXEL VISION AI - EDGE CASES', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Silenciar logs
    console.error = jest.fn();
  });

  /* ═══════════════════════════════════════════════════════════════
     1️⃣ VALIDACIÓN DE INPUTS
  ═══════════════════════════════════════════════════════════════ */
  
  test('❌ Debe rechazar array vacío', async () => {
    const result = await analyzeCollisionPhotos([]);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('No hay fotos para analizar');
  });
  
  test('❌ Debe rechazar null', async () => {
    const result = await analyzeCollisionPhotos(null);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('No hay fotos para analizar');
  });
  
  test('❌ Debe rechazar undefined', async () => {
    const result = await analyzeCollisionPhotos(undefined);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('No hay fotos para analizar');
  });

  /* ═══════════════════════════════════════════════════════════════
     2️⃣ ERRORES DE VISION API
  ═══════════════════════════════════════════════════════════════ */
  
  test('❌ Debe manejar error de Vision API', async () => {
    mockAnalyzeImage.mockResolvedValue({
      success: false,
      error: 'API key inválida'
    });
    
    const result = await analyzeCollisionPhotos(['https://example.com/photo.jpg']);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('API key inválida');
  });
  
  test('❌ Debe manejar timeout de Vision API', async () => {
    mockAnalyzeImage.mockResolvedValue({
      success: false,
      error: 'Request timeout after 30s'
    });
    
    const result = await analyzeCollisionPhotos(['https://example.com/photo.jpg']);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Request timeout after 30s');
  });
  
  test('❌ Debe manejar URL de imagen inválida', async () => {
    mockAnalyzeImage.mockResolvedValue({
      success: false,
      error: 'Failed to fetch image from URL'
    });
    
    const result = await analyzeCollisionPhotos(['invalid-url']);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to fetch image from URL');
  });

  /* ═══════════════════════════════════════════════════════════════
     3️⃣ RESPUESTAS MALFORMADAS
  ═══════════════════════════════════════════════════════════════ */
  
  test('⚠️ Debe usar fallback si JSON es inválido', async () => {
    mockAnalyzeImage.mockResolvedValue({
      success: true,
      analysis: 'El vehículo presenta daños MODERADOS en puerta trasera'
    });
    
    const result = await analyzeCollisionPhotos(['https://example.com/photo.jpg']);
    
    expect(result.success).toBe(true);
    expect(result.severity).toBe('MODERADO'); // Detectado del texto
    expect(result.damageDetails).toContain('daños MODERADOS');
    expect(result.affectedParts).toEqual([]); // Fallback
  });
  
  test('⚠️ Debe extraer SEVERO del texto si JSON falla', async () => {
    mockAnalyzeImage.mockResolvedValue({
      success: true,
      analysis: 'Daño SEVERO en chasis con múltiples paneles afectados'
    });
    
    const result = await analyzeCollisionPhotos(['https://example.com/photo.jpg']);
    
    expect(result.success).toBe(true);
    expect(result.severity).toBe('SEVERO');
  });
  
  test('⚠️ Debe asumir LEVE si no detecta severidad', async () => {
    mockAnalyzeImage.mockResolvedValue({
      success: true,
      analysis: 'Rayón superficial en puerta del conductor'
    });
    
    const result = await analyzeCollisionPhotos(['https://example.com/photo.jpg']);
    
    expect(result.success).toBe(true);
    expect(result.severity).toBe('LEVE');
  });

  /* ═══════════════════════════════════════════════════════════════
     4️⃣ RESPUESTAS VÁLIDAS (JSON COMPLETO)
  ═══════════════════════════════════════════════════════════════ */
  
  test('✅ Debe parsear JSON válido correctamente', async () => {
    const visionJSON = {
      severity: 'MODERADO',
      damageDetails: 'Abolladuras en puerta trasera derecha',
      affectedParts: ['Puerta trasera derecha', 'Panel lateral'],
      hiddenDamageRisk: 'MEDIO',
      estimatedRepairDays: '3-5 días',
      urgentIssues: ['Revisar cerradura de puerta']
    };
    
    mockAnalyzeImage.mockResolvedValue({
      success: true,
      analysis: JSON.stringify(visionJSON)
    });
    
    const result = await analyzeCollisionPhotos(['https://example.com/photo.jpg']);
    
    expect(result.success).toBe(true);
    expect(result.severity).toBe('MODERADO');
    expect(result.damageDetails).toBe('Abolladuras en puerta trasera derecha');
    expect(result.affectedParts).toEqual(['Puerta trasera derecha', 'Panel lateral']);
    expect(result.hiddenDamageRisk).toBe('MEDIO');
    expect(result.estimatedRepairDays).toBe('3-5 días');
    expect(result.urgentIssues).toEqual(['Revisar cerradura de puerta']);
  });

  /* ═══════════════════════════════════════════════════════════════
     5️⃣ MÚLTIPLES FOTOS (LIMITACIÓN ACTUAL)
  ═══════════════════════════════════════════════════════════════ */
  
  test('⚠️ Solo analiza primera foto (limitación documentada)', async () => {
    mockAnalyzeImage.mockResolvedValue({
      success: true,
      analysis: JSON.stringify({
        severity: 'LEVE',
        damageDetails: 'Rayón en puerta',
        affectedParts: ['Puerta'],
        hiddenDamageRisk: 'BAJO',
        estimatedRepairDays: '1-2 días',
        urgentIssues: []
      })
    });
    
    const photoUrls = [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg',
      'https://example.com/photo3.jpg'
    ];
    
    const result = await analyzeCollisionPhotos(photoUrls);
    
    expect(result.success).toBe(true);
    expect(result.photoCount).toBe(3); // Reporta 3 fotos
    expect(mockAnalyzeImage).toHaveBeenCalledTimes(1); // ⚠️ Solo 1 llamada
    expect(mockAnalyzeImage).toHaveBeenCalledWith(
      'https://example.com/photo1.jpg', // Solo primera foto
      expect.any(String)
    );
  });

  /* ═══════════════════════════════════════════════════════════════
     6️⃣ EXCEPCIONES NO MANEJADAS
  ═══════════════════════════════════════════════════════════════ */
  
  test('❌ Debe capturar excepciones generales', async () => {
    mockAnalyzeImage.mockRejectedValue(new Error('Network error'));
    
    const result = await analyzeCollisionPhotos(['https://example.com/photo.jpg']);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });
  
  test('❌ Debe manejar crash de JSON.parse', async () => {
    mockAnalyzeImage.mockResolvedValue({
      success: true,
      analysis: '{invalid json format'
    });
    
    const result = await analyzeCollisionPhotos(['https://example.com/photo.jpg']);
    
    // No debe crashear, usa fallback
    expect(result.success).toBe(true);
    expect(result.severity).toBe('LEVE'); // Fallback por defecto
  });

});

/* ═══════════════════════════════════════════════════════════════
   🎯 RESUMEN DE AUDITORÍA
   ─────────────────────────────────────────────────────────────
   ✅ Maneja arrays vacíos/null/undefined
   ✅ Maneja errores de Vision API (timeout, auth, URL inválida)
   ✅ Fallback robusto si JSON parsing falla
   ✅ Extrae severidad del texto si no viene JSON
   ✅ Try-catch general captura excepciones
   ✅ No crashea con respuestas malformadas
   
   ⚠️ LIMITACIÓN IDENTIFICADA:
   - Solo analiza primera foto (photoUrls[0])
   - Si usuario envía múltiples fotos, solo procesa la primera
   - Recomendación: Implementar análisis batch o documentar
   
   🗄️ BASE DE DATOS:
   ✅ Campo damage_analysis JSONB acepta null/objetos complejos
   ✅ No crashea si Vision AI falla (collision-confirmation.js usa fallback)
   ✅ Tabla collision_quotes preparada para Vision AI
   
   🔒 WASSENGER.JS:
   ✅ Try-catch en processAxelQuote
   ✅ Verifica visionAnalysis.success antes de continuar
   ✅ Envía mensaje de error al usuario si falla
   
   📊 RESULTADO FINAL: NO CRASHEA ✅
═══════════════════════════════════════════════════════════════ */
