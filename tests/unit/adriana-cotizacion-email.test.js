/**
 * @file adriana-cotizacion-email.test.js
 * @description Tests unitarios para isAdrianaBossQuoteCommand
 *              (lógica pura, sin llamadas a OpenAI ni email)
 *
 * sendAdrianaCotizacion NO se testea aquí porque requiere OpenAI + SMTP reales.
 * El script manual scripts/test-adriana-email.mjs cubre ese flujo end-to-end.
 */

import { describe, test, expect } from '@jest/globals';
import { isAdrianaBossQuoteCommand } from '../../src/servicios/adriana-cotizacion-email.js';

// ──────────────────────────────────────────────────────────────
// isAdrianaBossQuoteCommand — detección del comando del jefe
// ──────────────────────────────────────────────────────────────
describe('isAdrianaBossQuoteCommand()', () => {
  // ── TRUE: casos que DEBEN detectarse ──────────────────────
  describe('detección positiva (debe retornar true)', () => {
    test('cotización + email básico', () => {
      expect(isAdrianaBossQuoteCommand(
        'cotización seguro Toyota RAV4 2023 $45000 para Ana ana@gmail.com'
      )).toBe(true);
    });

    test('coti (abreviación) + email', () => {
      expect(isAdrianaBossQuoteCommand(
        'coti seguro Chevrolet Spark 2018 $8500 maria@empresa.ec 0991234567'
      )).toBe(true);
    });

    test('propuesta + email', () => {
      expect(isAdrianaBossQuoteCommand(
        'propuesta seguro Honda CR-V para cliente carlos@coworkia.ec'
      )).toBe(true);
    });

    test('manda + email', () => {
      expect(isAdrianaBossQuoteCommand(
        'manda cotización Toyota Corolla 2022 $22000 para Juan juan@outlook.com'
      )).toBe(true);
    });

    test('envía + email (con tilde)', () => {
      expect(isAdrianaBossQuoteCommand(
        'envía proforma seguro camioneta $35000 para Pedro pedro@test.com'
      )).toBe(true);
    });

    test('envia + email (sin tilde)', () => {
      expect(isAdrianaBossQuoteCommand(
        'envia seguro Kia Sportage 2021 $30000 para Laura laura@empresa.ec'
      )).toBe(true);
    });

    test('proforma + email', () => {
      expect(isAdrianaBossQuoteCommand(
        'proforma seguro moto Yamaha 2020 $6000 para Rodrigo rod@mail.com'
      )).toBe(true);
    });

    test('cotizacion (sin tilde) + email', () => {
      expect(isAdrianaBossQuoteCommand(
        'cotizacion seguro Mazda 3 2022 $20000 cliente@gmail.com'
      )).toBe(true);
    });

    test('con email de dominio empresarial', () => {
      expect(isAdrianaBossQuoteCommand(
        'cotización seguro para empresa florencia@coworkia.com.ec'
      )).toBe(true);
    });

    test('con email + número de teléfono en el mensaje', () => {
      expect(isAdrianaBossQuoteCommand(
        'coti Toyota 2023 $40000 para Luis luis@gmail.com 0987654321 Quito'
      )).toBe(true);
    });
  });

  // ── FALSE: casos que NO deben detectarse ──────────────────
  describe('detección negativa (debe retornar false)', () => {
    test('tiene keyword pero sin email → false', () => {
      expect(isAdrianaBossQuoteCommand(
        'cotización seguro Toyota RAV4 para Ana Martínez'
      )).toBe(false);
    });

    test('tiene email pero sin keyword de cotización → false', () => {
      expect(isAdrianaBossQuoteCommand(
        'hola, mi correo es ana@gmail.com, qué tal?'
      )).toBe(false);
    });

    test('mensaje vacío → false', () => {
      expect(isAdrianaBossQuoteCommand('')).toBe(false);
    });

    test('undefined → false', () => {
      expect(isAdrianaBossQuoteCommand(undefined)).toBe(false);
    });

    test('null → false', () => {
      expect(isAdrianaBossQuoteCommand(null)).toBe(false);
    });

    test('saludo normal sin keywords → false', () => {
      expect(isAdrianaBossQuoteCommand('Hola Adriana, cómo estás hoy?')).toBe(false);
    });

    test('email en texto genérico sin cotización → false', () => {
      // Nota: "para" + palabra también activa el detector (es intencional en la regex)
      // Este test usa un mensaje sin NINGUNA keyword del detector
      expect(isAdrianaBossQuoteCommand(
        'el contacto de soporte es soporte@wassenger.com, gracias'
      )).toBe(false);
    });
  });

  // ── EDGE CASES ─────────────────────────────────────────────
  describe('casos borde', () => {
    test('email con subdominios detectado correctamente', () => {
      expect(isAdrianaBossQuoteCommand(
        'cotización para carlos@mail.empresa.com.ec'
      )).toBe(true);
    });

    test('mayúsculas → detecta igual (case-insensitive)', () => {
      expect(isAdrianaBossQuoteCommand(
        'COTIZACIÓN SEGURO TOYOTA para ANA@GMAIL.COM'
      )).toBe(true);
    });

    test('string con solo espacios → false', () => {
      expect(isAdrianaBossQuoteCommand('   ')).toBe(false);
    });
  });
});
