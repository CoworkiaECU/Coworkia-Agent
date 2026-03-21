/**
 * @file insurance-document-analysis.test.js
 * @description Tests unitarios para detectDocumentType, extractVehicleData, 
 *              buildInsurancePrompt, calculateDocumentQualityScore
 *
 * NO llama a OpenAI — todo lo que se testea aquí es lógica pura (sin I/O).
 */

import { describe, test, expect } from '@jest/globals';
import {
  DOCUMENT_TYPES,
  detectDocumentType,
  buildInsurancePrompt,
  extractVehicleData,
  calculateDocumentQualityScore,
} from '../../src/servicios/insurance-document-analysis.js';

// ──────────────────────────────────────────────────────────────
// 1. DOCUMENT_TYPES — constantes definidas
// ──────────────────────────────────────────────────────────────
describe('DOCUMENT_TYPES', () => {
  test('contiene todos los tipos base', () => {
    expect(DOCUMENT_TYPES.POLICY).toBe('policy');
    expect(DOCUMENT_TYPES.CLAIM).toBe('claim');
    expect(DOCUMENT_TYPES.QUOTE).toBe('quote');
    expect(DOCUMENT_TYPES.GENERAL).toBe('general');
  });

  test('contiene los tipos vehiculares nuevos', () => {
    expect(DOCUMENT_TYPES.VEHICLE_REGISTRATION).toBe('vehicle_registration');
    expect(DOCUMENT_TYPES.ID_CARD).toBe('id_card');
    expect(DOCUMENT_TYPES.CAR_APPRAISAL).toBe('car_appraisal');
  });
});

// ──────────────────────────────────────────────────────────────
// 2. detectDocumentType — detección por keyword
// ──────────────────────────────────────────────────────────────
describe('detectDocumentType()', () => {
  // Tipos base
  test('detecta POLICY con "póliza"', () => {
    expect(detectDocumentType('Tengo mi póliza aquí')).toBe(DOCUMENT_TYPES.POLICY);
  });
  test('detecta POLICY con "poliza" (sin tilde)', () => {
    expect(detectDocumentType('mi poliza de seguro')).toBe(DOCUMENT_TYPES.POLICY);
  });
  test('detecta CLAIM con "siniestro"', () => {
    expect(detectDocumentType('reporte de siniestro')).toBe(DOCUMENT_TYPES.CLAIM);
  });
  test('detecta CLAIM con "accidente"', () => {
    expect(detectDocumentType('tuve un accidente')).toBe(DOCUMENT_TYPES.CLAIM);
  });
  test('detecta QUOTE con "cotización"', () => {
    expect(detectDocumentType('necesito una cotización')).toBe(DOCUMENT_TYPES.QUOTE);
  });
  test('detecta RENEWAL con "renovación"', () => {
    expect(detectDocumentType('renovación de mi seguro')).toBe(DOCUMENT_TYPES.RENEWAL);
  });

  // Tipos vehiculares
  test('detecta VEHICLE_REGISTRATION con "matrícula"', () => {
    expect(detectDocumentType('aquí está la matrícula del carro')).toBe(DOCUMENT_TYPES.VEHICLE_REGISTRATION);
  });
  test('detecta VEHICLE_REGISTRATION con "placa"', () => {
    expect(detectDocumentType('te envío la placa del vehículo')).toBe(DOCUMENT_TYPES.VEHICLE_REGISTRATION);
  });
  test('detecta ID_CARD con "cédula"', () => {
    expect(detectDocumentType('mi cédula de identidad')).toBe(DOCUMENT_TYPES.ID_CARD);
  });
  test('detecta ID_CARD con "cedula" (sin tilde)', () => {
    expect(detectDocumentType('aqui va mi cedula')).toBe(DOCUMENT_TYPES.ID_CARD);
  });
  test('detecta CAR_APPRAISAL con "avalúo"', () => {
    expect(detectDocumentType('el avalúo del carro')).toBe(DOCUMENT_TYPES.CAR_APPRAISAL);
  });
  test('detecta CAR_APPRAISAL con "tasación"', () => {
    expect(detectDocumentType('tasación vehicular adjunta')).toBe(DOCUMENT_TYPES.CAR_APPRAISAL);
  });

  // Fallback
  test('retorna GENERAL cuando no hay keywords', () => {
    expect(detectDocumentType('hola cómo estás')).toBe(DOCUMENT_TYPES.GENERAL);
  });
  test('retorna GENERAL con string vacío', () => {
    expect(detectDocumentType('')).toBe(DOCUMENT_TYPES.GENERAL);
  });
  test('es case-insensitive', () => {
    expect(detectDocumentType('MATRÍCULA DEL CARRO')).toBe(DOCUMENT_TYPES.VEHICLE_REGISTRATION);
    expect(detectDocumentType('PÓLIZA VIGENTE')).toBe(DOCUMENT_TYPES.POLICY);
  });
});

// ──────────────────────────────────────────────────────────────
// 3. buildInsurancePrompt — genera prompts para OpenAI
// ──────────────────────────────────────────────────────────────
describe('buildInsurancePrompt()', () => {
  test('genera prompt para VEHICLE_REGISTRATION con palabras clave vehiculares', () => {
    const prompt = buildInsurancePrompt(DOCUMENT_TYPES.VEHICLE_REGISTRATION);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
    // Debe contener instrucción sobre datos del vehículo
    expect(prompt.toLowerCase()).toMatch(/matr[ií]cula|veh[ií]culo|placa|marca|modelo/);
  });

  test('genera prompt para POLICY con palabras clave de póliza', () => {
    const prompt = buildInsurancePrompt(DOCUMENT_TYPES.POLICY);
    expect(typeof prompt).toBe('string');
    expect(prompt.toLowerCase()).toMatch(/p[oó]liza|cobertura|asegurado/);
  });

  test('genera prompt para CAR_APPRAISAL', () => {
    const prompt = buildInsurancePrompt(DOCUMENT_TYPES.CAR_APPRAISAL);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });

  test('genera prompt para GENERAL como fallback', () => {
    const prompt = buildInsurancePrompt(DOCUMENT_TYPES.GENERAL);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(50);
  });

  test('incluye userContext cuando se pasa', () => {
    const prompt = buildInsurancePrompt(DOCUMENT_TYPES.VEHICLE_REGISTRATION, 'Toyota Corolla 2022');
    expect(prompt).toContain('Toyota Corolla 2022');
  });
});

// ──────────────────────────────────────────────────────────────
// 4. extractVehicleData — parsea respuesta de OpenAI
// ──────────────────────────────────────────────────────────────
describe('extractVehicleData()', () => {
  test('extrae datos completos desde bloque JSON', () => {
    const analysis = `
Aquí están los datos extraídos:
\`\`\`json
{
  "brand": "Toyota",
  "model": "Corolla",
  "year": 2021,
  "plate": "ABC-1234",
  "commercial_value": 18000,
  "cedula": "1712345678"
}
\`\`\`
`;
    const result = extractVehicleData(analysis);
    expect(result.success).toBe(true);
    expect(result.data.brand).toBe('Toyota');
    expect(result.data.model).toBe('Corolla');
    expect(result.data.year).toBe(2021);
    expect(result.data.plate).toBe('ABC-1234');
    expect(result.data.commercial_value).toBe(18000);
  });

  test('extrae datos via regex cuando no hay JSON', () => {
    const analysis = `
Marca: Toyota
Año: 2019
Valor comercial: $15,000
Placa: GHI-5678
Cédula: 1798765432
`;
    const result = extractVehicleData(analysis);
    expect(result.success).toBe(true);
    expect(result.data.year).toBe(2019);
    expect(result.data.commercial_value).toBe(15000);
  });

  test('retorna success: false con string vacío', () => {
    const result = extractVehicleData('');
    expect(result.success).toBe(false);
  });

  test('maneja JSON malformado gracefully (sin throw)', () => {
    const analysis = '```json\n{ bad json }\n```';
    expect(() => extractVehicleData(analysis)).not.toThrow();
    // Cae al regex — puede tener success true o false pero no explotar
    const result = extractVehicleData(analysis);
    expect(typeof result.success).toBe('boolean');
  });

  test('extrae year del JSON correctamente como número', () => {
    const analysis = '```json\n{"year": 2023, "brand": "Chevrolet"}\n```';
    const result = extractVehicleData(analysis);
    expect(result.success).toBe(true);
    expect(typeof result.data.year).toBe('number');
    expect(result.data.year).toBe(2023);
  });
});

// ──────────────────────────────────────────────────────────────
// 5. calculateDocumentQualityScore — scoring
// ──────────────────────────────────────────────────────────────
describe('calculateDocumentQualityScore()', () => {
  test('score base es 50 para texto neutro', () => {
    const score = calculateDocumentQualityScore('Este es un documento.');
    expect(score).toBe(50);
  });

  test('palabras positivas suben el score', () => {
    const score = calculateDocumentQualityScore('Documento completo y válido, en regla.');
    expect(score).toBeGreaterThan(50);
  });

  test('palabras negativas bajan el score', () => {
    const score = calculateDocumentQualityScore('Documento incompleto y vencido con error.');
    expect(score).toBeLessThan(50);
  });

  test('score entre 0 y 100 siempre', () => {
    const scores = [
      calculateDocumentQualityScore('completo válido correcto aprobado vigente en regla suficiente'),
      calculateDocumentQualityScore('faltante incompleto vencido rechazado insuficiente error'),
      calculateDocumentQualityScore(''),
    ];
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});
