import { describe, test, expect } from '@jest/globals';
import { detectLanguage, detectLanguageCommand, getUserLanguage } from '../../src/utils/language-detector.js';

describe('Language Detector', () => {
  test('explicit command wins over auto detection', () => {
    const command = detectLanguageCommand('english');
    expect(command).toBe('en');
  });

  test('falls back to default when message empty', () => {
    const detected = detectLanguage('');
    expect(detected.language).toBe('es');
    expect(detected.reason).toBe('default');
  });

  test('short message uses preferred language', () => {
    const detected = detectLanguage('ok', 'en');
    expect(detected.language).toBe('en');
    expect(detected.confidence).toBeCloseTo(0.6);
    expect(detected.reason).toBe('short_message_using_preference');
  });

  test('auto switches when detected language differs from preference', () => {
    const result = getUserLanguage('hello, good morning I need information about price', 'es');
    expect(result.language).toBe('en');
    expect(result.source).toBe('auto_detected_language_switch');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  test('returns preference when confidence is low', () => {
    const result = getUserLanguage('???', 'en');
    expect(result.language).toBe('en');
    expect(result.source).toBe('user_preference');
  });
});
