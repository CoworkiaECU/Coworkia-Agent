/**
 * enzo-brief-generator.js
 *
 * Genera un diagnóstico digital personalizado por cuenta del cliente +
 * matriz de capacidades reales del stack MarketingLab vs el mercado +
 * superpoderes específicos para su sector.
 *
 * El cliente recibe: "ya estudié tu negocio antes de que llegues".
 */

import { complete } from '../servicios-ia/openai.js';

// Superpoderes reales del stack MarketingLab — lo que ningún competidor tiene igual
const ML_STACK = `STACK REAL DE MARKETINGLAB (esto es lo que vendemos, sé específico al comparar):
1. Agente WhatsApp NATIVO (no widget web) — el cliente interactúa donde ya vive
2. Multi-idioma: Español, Inglés, Portugués, Francés, Alemán, Italiano, Chino, Quechua — único en Ecuador
3. Automatización operativa COMPLETA: reservas + membresías + WiFi cautivo + oficina virtual + proformas + facturación + calendario — no solo responde preguntas, OPERA el negocio
4. Vision AI: análisis de fotos, documentos, contratos, RUC, cédulas directamente en WhatsApp
5. Ecosistema multi-agente: cada vertical tiene su propio agente especializado (ventas, inmobiliaria, seguros, proyectos, marketing, consultas generales)
6. Integración full-stack: CRM + Google Calendar + base de datos + pagos + email + WhatsApp en un solo flujo
7. Aprendizaje continuo: el sistema mejora con cada interacción del negocio específico`;

const SYSTEM_PROMPT = `Eres Enzo, Director de MarketingLab Ecuador.
Cuando un cliente te describe su proyecto, produces un análisis estratégico PERSONALIZADO que comienza citando su cuenta/empresa específica.
El análisis debe sentirse como si dedicaste 2 horas estudiando su negocio antes de escribir.
Devuelves SOLO JSON válido, sin markdown, sin explicaciones, sin bloques de código.`;

/**
 * Llama a OpenAI y retorna el análisis diagnóstico personalizado, o null si falla.
 * @param {{ description: string, companyName: string, projectType: string, socialHandle?: string }} data
 */
export async function generateEnzoBriefContent({ description, companyName, projectType, socialHandle }) {
  // Si no nos dieron el handle, construimos uno probable para que el email sea personalizado
  const handleGuess = socialHandle || _inferHandle(companyName);

  const prompt = `Analiza este cliente y su sector. Produce el JSON diagnóstico personalizado.

CLIENTE:
- Empresa: ${companyName || 'No especificada'}
- Cuenta/handle: ${handleGuess}
- Tipo de proyecto: ${projectType || 'Marketing digital'}
- Lo que el cliente describió: ${description || 'Sin descripción adicional'}

${ML_STACK}

IMPORTANTE — lo que el mercado YA tiene que NO es diferenciador:
- Chatbots básicos (ManyChat, Tidio) los tiene cualquier PYME
- Posts en Instagram: todos los tienen
- Google Ads básico: cualquier agencia lo ofrece
- "Automatización básica": término vacío — sé específico en qué automatiza ML

Devuelve EXACTAMENTE este JSON (sin markdown):
{
  "socialAudit": {
    "handle": "${handleGuess}",
    "currentFindings": [
      "hallazgo específico 1 sobre su presencia digital actual (basado en lo que describes del sector y empresa)",
      "hallazgo específico 2 — patrón típico de empresas similares en Ecuador",
      "hallazgo específico 3 — oportunidad no aprovechada visible desde afuera"
    ],
    "mainGap": "La brecha más crítica y costosa que tienen HOY en una sola frase concisa"
  },
  "capabilityMatrix": [
    {
      "capability": "nombre corto de capacidad (máx 4 palabras)",
      "marketStatus": "lo que el mercado promedio de su sector tiene hoy (específico, no genérico)",
      "mlEdge": "lo que MarketingLab habilita para ESTE cliente específicamente (usa el stack real arriba)"
    },
    { "capability": "...", "marketStatus": "...", "mlEdge": "..." },
    { "capability": "...", "marketStatus": "...", "mlEdge": "..." },
    { "capability": "...", "marketStatus": "...", "mlEdge": "..." }
  ],
  "sectorSuperpowers": [
    {
      "icon": "emoji relevante al superpoder",
      "name": "Nombre del superpoder (3-4 palabras)",
      "what": "Qué hace exactamente este superpoder para su negocio específico (1 frase)",
      "impact": "Impacto medible y concreto para su sector (ej: '3h/día liberadas', '0% leads perdidos')"
    },
    { "icon": "...", "name": "...", "what": "...", "impact": "..." },
    { "icon": "...", "name": "...", "what": "...", "impact": "..." }
  ],
  "roiIn90Days": "Párrafo de 3-4 líneas con ROI específico y números reales para su sector en Ecuador. Menciona reducción de tiempos, captación de leads, conversión esperada. Sé concreto.",
  "strategicClose": "Párrafo de 3-4 líneas de cierre persuasivo. Dirígete directamente a ellos. Crea urgencia real. Conecta con su dolor principal y la solución que MarketingLab habilita.",
  "nextStep": "Una sola frase de acción urgente y motivadora. Que empiece con un verbo."
}

Reglas críticas:
- Empieza cada sección referenciando al cliente por su handle o empresa
- La capabilityMatrix debe ser específica para SU sector, no genérica
- Los sectorSuperpowers deben ser los 3 más impactantes para SU negocio específico
- NO menciones que ChatGPT o IA es novedad — es commodity. El diferenciador es el ECOSISTEMA completo
- Responde SOLO con el JSON. Nada más.`;

  try {
    const raw = await complete(prompt, {
      system: SYSTEM_PROMPT,
      model: 'gpt-4o',
      temperature: 0.5,
      max_tokens: 2000,
    });

    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    const json = JSON.parse(cleaned);

    if (!json.socialAudit || !json.capabilityMatrix || !json.sectorSuperpowers) {
      console.warn('[ENZO-BRIEF] Respuesta con estructura incorrecta');
      return null;
    }

    return json;
  } catch (err) {
    console.error('[ENZO-BRIEF] Error generando brief:', err.message);
    return null;
  }
}

/**
 * Infiere un handle/cuenta probable a partir del nombre de empresa.
 * Ej: "Coworkia Ecuador" → "@coworkia.ec"
 */
function _inferHandle(companyName) {
  if (!companyName) return '@tuempresa';
  const base = companyName
    .toLowerCase()
    .replace(/\s+(s\.a\.|cia\.|ltda\.?|s\.a\.s\.?|ecuador|ec|cía\.?)$/i, '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
  return `@${base}.ec`;
}

/**
 * Convierte el brief JSON en HTML de alto impacto para el email.
 * Estructura: Diagnóstico @handle → Matriz capacidades → Superpoderes → ROI → Cierre → CTA
 */
export function renderEnzoBriefHTML(brief) {
  if (!brief) return null;

  const {
    socialAudit = {},
    capabilityMatrix = [],
    sectorSuperpowers = [],
    roiIn90Days = '',
    strategicClose = '',
    nextStep = '',
  } = brief;

  // ── Diagnóstico social ──────────────────────────────────────────────────
  const findingItems = (socialAudit.currentFindings || [])
    .map(f => `<div style="color: rgba(255,255,255,0.75); font-size: 12px; line-height: 1.6; margin-bottom: 6px; padding-left: 14px; position: relative;">
      <span style="position: absolute; left: 0; color: #FBBF24;">›</span>${f}
    </div>`)
    .join('');

  // ── Filas de la matriz de capacidades ──────────────────────────────────
  const matrixRows = capabilityMatrix.map((row, i) => `
    <tr style="background: ${i % 2 === 0 ? '#F9FAFB' : 'white'};">
      <td style="padding: 10px 12px; color: #1F2937; font-size: 12px; font-weight: 700; border-bottom: 1px solid #F3F4F6; width: 28%;">${row.capability}</td>
      <td style="padding: 10px 12px; color: #9CA3AF; font-size: 11px; line-height: 1.5; border-bottom: 1px solid #F3F4F6; width: 36%;">${row.marketStatus}</td>
      <td style="padding: 10px 12px; color: #0D9488; font-size: 11px; font-weight: 600; line-height: 1.5; border-bottom: 1px solid #F3F4F6; width: 36%;">${row.mlEdge}</td>
    </tr>`).join('');

  // ── Cards de superpoderes ───────────────────────────────────────────────
  const superpowerCards = sectorSuperpowers.map(sp => `
    <td style="width: 33%; padding: 0 5px; vertical-align: top;">
      <div style="background: #F0FDFC; border: 1px solid rgba(13,148,136,0.2); border-radius: 12px; padding: 16px 14px; text-align: center; height: 100%; box-sizing: border-box;">
        <div style="font-size: 26px; margin-bottom: 8px;">${sp.icon}</div>
        <div style="color: #0A0F1E; font-size: 12px; font-weight: 800; margin-bottom: 6px; line-height: 1.3;">${sp.name}</div>
        <div style="color: #374151; font-size: 11px; line-height: 1.5; margin-bottom: 8px;">${sp.what}</div>
        <div style="background: #0D9488; color: white; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 20px; display: inline-block;">${sp.impact}</div>
      </div>
    </td>`).join('');

  return `
    <!-- ═══ DIAGNÓSTICO DIGITAL PERSONALIZADO ═══ -->
    <div style="margin: 0 0 24px;">

      <div style="font-size: 11px; font-weight: 700; color: #2DD4BF; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px;">📊 Diagnóstico de tu presencia digital</div>

      <!-- BLOQUE 1: Diagnóstico @handle -->
      <div style="background: linear-gradient(135deg, #0A0F1E 0%, #0D1520 100%); border-radius: 14px; padding: 20px 22px; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; margin-bottom: 14px;">
          <div style="background: rgba(45,212,191,0.15); border: 1px solid rgba(45,212,191,0.4); border-radius: 8px; padding: 6px 12px; display: inline-block;">
            <span style="color: #2DD4BF; font-size: 13px; font-weight: 800;">${socialAudit.handle || '@tuempresa'}</span>
          </div>
          <span style="color: rgba(255,255,255,0.4); font-size: 11px; margin-left: 10px;">— diagnóstico inicial</span>
        </div>
        <div style="margin-bottom: 14px;">${findingItems}</div>
        <div style="background: rgba(251,191,36,0.1); border-left: 3px solid #FBBF24; border-radius: 0 8px 8px 0; padding: 10px 14px;">
          <span style="color: #FBBF24; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Brecha crítica · </span>
          <span style="color: rgba(255,255,255,0.8); font-size: 12px;">${socialAudit.mainGap || ''}</span>
        </div>
      </div>

      <!-- BLOQUE 2: Matriz de capacidades -->
      <div style="margin-bottom: 18px;">
        <div style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Lo que el mercado tiene vs lo que tú tendrás</div>
        <table style="width: 100%; border-collapse: collapse; border-radius: 12px; overflow: hidden;">
          <tr style="background: #0A0F1E;">
            <td style="padding: 9px 12px; color: #2DD4BF; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; width: 28%;">Capacidad</td>
            <td style="padding: 9px 12px; color: #6B7280; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; width: 36%;">Mercado hoy</td>
            <td style="padding: 9px 12px; color: #2DD4BF; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; width: 36%;">Con MarketingLab</td>
          </tr>
          ${matrixRows}
        </table>
      </div>

      <!-- BLOQUE 3: Superpoderes del sector -->
      <div style="margin-bottom: 18px;">
        <div style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Superpoderes para tu negocio</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>${superpowerCards}</tr>
        </table>
      </div>

      <!-- BLOQUE 4: ROI en 90 días -->
      <div style="background: #FFF7ED; border: 1px solid #FDE68A; border-radius: 12px; padding: 18px 20px; margin-bottom: 18px;">
        <div style="color: #D97706; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">📈 ROI esperado · primeros 90 días</div>
        <div style="color: #78350F; font-size: 12px; line-height: 1.7;">${roiIn90Days}</div>
      </div>

      <!-- BLOQUE 5: Cierre estratégico -->
      <div style="background: linear-gradient(135deg, #0A0F1E 0%, #0D1A2B 100%); border-left: 3px solid #2DD4BF; border-radius: 0 12px 12px 0; padding: 20px 24px; margin-bottom: 16px;">
        <div style="color: rgba(255,255,255,0.85); font-size: 13px; line-height: 1.75; margin-bottom: 12px;">${strategicClose}</div>
        <div style="color: #2DD4BF; font-size: 13px; font-weight: 700;">${nextStep}</div>
      </div>

      <!-- BLOQUE 6: CTA reunión -->
      <div style="text-align: center; margin-bottom: 10px;">
        <a href="https://wa.me/593994837117?text=Hola%20Enzo%2C%20vi%20mi%20diagn%C3%B3stico%20y%20quiero%20agendar%20la%20reuni%C3%B3n%20en%20Coworkia"
           style="display: inline-block; background: linear-gradient(135deg, #2DD4BF 0%, #0D9488 100%); color: #042f2e; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: 800; font-size: 14px; box-shadow: 0 6px 20px rgba(45,212,191,0.35); letter-spacing: 0.3px;">
          📅 Enzo te espera en Coworkia — 45 minutos
        </a>
      </div>

      <!-- Disclaimer -->
      <p style="color: #9CA3AF; font-size: 10px; text-align: center; margin: 6px 0 0; line-height: 1.5;">
        Diagnóstico basado en información pública y patrones del sector · Profundizamos en la reunión
      </p>
    </div>`;
}

