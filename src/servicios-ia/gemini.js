/**
 * 🧠 Gemini AI Service — Thinking Mode
 *
 * Complementa openai.js con las capacidades de razonamiento profundo de Gemini.
 * Usa Gemini 2.5 Flash con thinking habilitado para tareas que requieren
 * análisis estratégico, diagnóstico complejo o planificación.
 *
 * Patrones: circuit breaker + timeout + fallback (misma arquitectura que openai.js)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiBreaker } from '../utils/circuit-breaker.js';
import createLogger from '../utils/logger.js';

const log = createLogger('GEMINI');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('[Gemini] ⚠️ GEMINI_API_KEY no configurada — thinkingComplete() usará fallback a OpenAI');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * 🧠 Genera contenido con thinking habilitado (razonamiento profundo).
 * Ideal para: análisis estratégicos, diagnósticos, planes, comparativas.
 *
 * @param {string} prompt - El prompt del usuario
 * @param {Object} opts - Opciones
 * @param {string} [opts.system] - System instruction
 * @param {number} [opts.temperature] - Temperatura (default 1.0 como recomienda Google)
 * @param {number} [opts.maxOutputTokens] - Max tokens de respuesta (default 2000)
 * @param {number} [opts.thinkingBudget] - Budget de tokens para thinking (-1=dynamic, 0=off, 128-24576)
 * @param {string} [opts.model] - Modelo (default gemini-2.5-flash)
 * @param {number} [opts.timeout] - Timeout en ms (default 60s)
 * @returns {Promise<string>} Texto generado
 */
export async function thinkingComplete(prompt, opts = {}) {
  const {
    system = null,
    temperature = 1.0,
    maxOutputTokens = 2000,
    thinkingBudget = -1,  // dynamic por defecto
    model = DEFAULT_MODEL,
    timeout = 60000,
  } = opts;

  if (!genAI) {
    log.warn('Gemini no disponible, retornando null para fallback a OpenAI');
    return null;
  }

  const startTime = Date.now();

  const fallback = () => {
    log.warn('Using fallback (null) — caller should fall back to OpenAI', { action: 'thinkingComplete', model });
    return null;
  };

  return await geminiBreaker.execute(async () => {
    const generationConfig = {
      temperature,
      maxOutputTokens,
      thinkingConfig: {
        thinkingBudget,
      },
    };

    const modelInstance = genAI.getGenerativeModel({
      model,
      generationConfig,
      ...(system ? { systemInstruction: system } : {}),
    });

    // Timeout race
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini timeout')), timeout)
    );

    const apiPromise = modelInstance.generateContent(prompt);

    const result = await Promise.race([apiPromise, timeoutPromise]);
    const response = result.response;
    const text = response.text();
    const duration = Date.now() - startTime;

    // Log usage si está disponible
    const usage = response.usageMetadata;
    log.timing('Gemini thinking completion', duration, {
      model,
      thinkingBudget,
      promptTokens: usage?.promptTokenCount,
      candidateTokens: usage?.candidatesTokenCount,
      thinkingTokens: usage?.thoughtsTokenCount,
    });

    return text?.trim() || '';
  }, fallback);
}

/**
 * 🧠 Genera contenido con thinking y espera JSON como respuesta.
 * Limpia markdown fences y parsea. Retorna null si falla el parse.
 *
 * @param {string} prompt
 * @param {Object} opts - Mismas opciones que thinkingComplete
 * @returns {Promise<Object|null>} JSON parseado o null
 */
export async function thinkingCompleteJSON(prompt, opts = {}) {
  const raw = await thinkingComplete(prompt, opts);
  if (!raw) return null;

  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    log.error('Error parsing Gemini JSON response', { action: 'thinkingCompleteJSON' }, err);
    return null;
  }
}

/**
 * Verifica si Gemini está disponible y configurado
 */
export function isGeminiAvailable() {
  return !!genAI;
}
