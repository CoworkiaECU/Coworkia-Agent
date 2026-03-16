/**
 * enzo-brief-generator.js
 *
 * Genera un análisis competitivo + FODA personalizado para el email de Enzo.
 * El cliente recibe su mercado analizado antes de la primera reunión.
 */

import { complete } from '../servicios-ia/openai.js';

const SYSTEM_PROMPT = `Eres Enzo, Director de MarketingLab Ecuador — la agencia de marketing digital de mayor crecimiento en el país.
Cuando un cliente describe su proyecto, tú analizas su mercado con profundidad estratégica.
Devuelves SOLO JSON válido, sin markdown, sin explicaciones, sin bloques de código.`;

/**
 * Llama a OpenAI y retorna el análisis estructurado, o null si falla.
 * @param {{ description: string, companyName: string, projectType: string }} data
 * @returns {Promise<{competitors: Array, foda: Object, strategicClose: string, nextStep: string}|null>}
 */
export async function generateEnzoBriefContent({ description, companyName, projectType }) {
  const prompt = `Analiza este proyecto de marketing digital y responde con el JSON indicado.

Empresa: ${companyName || 'No especificada'}
Tipo de proyecto: ${projectType || 'Marketing digital'}
Descripción del cliente: ${description || 'Sin descripción adicional'}

Devuelve EXACTAMENTE este JSON (sin markdown, sin bloques de código):
{
  "competitors": [
    {"name": "Nombre real del competidor", "good": "Lo que hacen bien en una frase corta", "bad": "Error o debilidad que cometen en una frase corta"},
    {"name": "Segundo competidor real", "good": "...", "bad": "..."},
    {"name": "Tercer competidor real", "good": "...", "bad": "..."}
  ],
  "foda": {
    "F": ["fortaleza específica 1", "fortaleza específica 2", "fortaleza específica 3"],
    "O": ["oportunidad concreta 1", "oportunidad concreta 2", "oportunidad concreta 3"],
    "D": ["debilidad a trabajar 1", "debilidad a trabajar 2", "debilidad a trabajar 3"],
    "A": ["amenaza real 1", "amenaza real 2", "amenaza real 3"]
  },
  "strategicClose": "Párrafo de 3-4 líneas con el insight estratégico más importante. Usa un tono directo, experto, sin rodeos. Genera urgencia de actuar en los próximos días.",
  "nextStep": "Una sola frase de acción urgente y motivadora."
}

Reglas:
- Los competidores deben ser marcas o agencias REALES del mercado ecuatoriano cuando sea posible.
- La FODA debe ser específica para la empresa y proyecto, no genérica.
- El strategicClose debe sentirse como si Enzo ya estudió su mercado durante horas.
- Responde SOLO con el JSON. Nada más.`;

  try {
    const raw = await complete(prompt, {
      system: SYSTEM_PROMPT,
      model: 'gpt-4o',
      temperature: 0.4,
      max_tokens: 1500,
    });

    const json = JSON.parse(raw.trim());

    // Validación mínima de estructura
    if (!json.competitors || !json.foda || !json.strategicClose) {
      console.warn('[ENZO-BRIEF] Respuesta incompleta de OpenAI');
      return null;
    }

    return json;
  } catch (err) {
    console.error('[ENZO-BRIEF] Error generando brief:', err.message);
    return null;
  }
}

/**
 * Convierte el brief JSON en un bloque HTML listo para insertar en el email.
 * @param {Object} brief — resultado de generateEnzoBriefContent
 * @returns {string|null}
 */
export function renderEnzoBriefHTML(brief) {
  if (!brief) return null;

  const { competitors = [], foda = {}, strategicClose = '', nextStep = '' } = brief;

  const competitorCards = competitors.map(c => `
    <div style="background: #F8FFFE; border: 1px solid rgba(45,212,191,0.2); border-radius: 10px; padding: 14px; margin-bottom: 10px;">
      <div style="color: #0A0F1E; font-size: 13px; font-weight: 700; margin-bottom: 8px;">${c.name}</div>
      <div style="margin-bottom: 5px;">
        <span style="color: #059669; font-size: 13px; font-weight: 800;">✓</span>
        <span style="color: #374151; font-size: 12px; margin-left: 4px;">${c.good}</span>
      </div>
      <div>
        <span style="color: #DC2626; font-size: 13px; font-weight: 800;">✗</span>
        <span style="color: #374151; font-size: 12px; margin-left: 4px;">${c.bad}</span>
      </div>
    </div>`).join('');

  const fodaItems = (items = []) =>
    items.map(i => `<div style="font-size: 11px; color: inherit; margin-bottom: 4px; line-height: 1.5;">• ${i}</div>`).join('');

  return `
    <!-- ═══ BRIEF COMPETITIVO GENERADO POR IA ═══ -->
    <div style="margin: 0 0 24px;">
      <div style="font-size: 11px; font-weight: 700; color: #2DD4BF; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px;">📊 Análisis de tu mercado</div>

      <!-- Competidores -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Competidores identificados</div>
        ${competitorCards}
      </div>

      <!-- FODA 2x2 -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Análisis FODA</div>
        <table style="width: 100%; border-collapse: separate; border-spacing: 5px;">
          <tr>
            <td style="width: 50%; background: #ECFDF5; border-radius: 10px; padding: 14px; vertical-align: top;">
              <div style="color: #059669; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">Fortalezas</div>
              <div style="color: #065F46;">${fodaItems(foda.F)}</div>
            </td>
            <td style="width: 50%; background: #F0FDFC; border-radius: 10px; padding: 14px; vertical-align: top;">
              <div style="color: #0D9488; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">Oportunidades</div>
              <div style="color: #134E4A;">${fodaItems(foda.O)}</div>
            </td>
          </tr>
          <tr>
            <td style="background: #FFF7ED; border-radius: 10px; padding: 14px; vertical-align: top;">
              <div style="color: #D97706; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">Debilidades</div>
              <div style="color: #78350F;">${fodaItems(foda.D)}</div>
            </td>
            <td style="background: #FEF2F2; border-radius: 10px; padding: 14px; vertical-align: top;">
              <div style="color: #DC2626; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">Amenazas</div>
              <div style="color: #7F1D1D;">${fodaItems(foda.A)}</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Cierre estratégico -->
      <div style="background: linear-gradient(135deg, #0A0F1E 0%, #0D1A2B 100%); border-left: 3px solid #2DD4BF; border-radius: 0 12px 12px 0; padding: 20px 24px; margin-bottom: 16px;">
        <div style="color: rgba(255,255,255,0.85); font-size: 13px; line-height: 1.7; margin-bottom: 12px;">${strategicClose}</div>
        <div style="color: #2DD4BF; font-size: 13px; font-weight: 700;">${nextStep}</div>
      </div>

      <!-- CTA reunión Coworkia -->
      <div style="text-align: center; margin-bottom: 10px;">
        <a href="https://wa.me/593994837117?text=Hola%20Enzo%2C%20vi%20mi%20an%C3%A1lisis%20y%20quiero%20agendar%20la%20reuni%C3%B3n%20en%20Coworkia"
           style="display: inline-block; background: linear-gradient(135deg, #2DD4BF 0%, #0D9488 100%); color: #042f2e; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: 800; font-size: 14px; box-shadow: 0 6px 20px rgba(45,212,191,0.35); letter-spacing: 0.3px;">
          📅 Enzo te espera en Coworkia — 45 minutos
        </a>
      </div>

      <!-- Disclaimer -->
      <p style="color: #9CA3AF; font-size: 10px; text-align: center; margin: 6px 0 0; line-height: 1.5;">
        Análisis basado en información pública disponible · Actualizamos en la reunión
      </p>
    </div>`;
}
