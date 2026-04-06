/**
 * 🏡 PAULA COTIZACIÓN EMAIL SERVICE — PropElite Bienes Raíces
 *
 * El jefe le dicta la propiedad y datos del cliente desde WhatsApp:
 *   "cotización Casa Jardín #6 para María García
 *    maria@empresa.com 0991234567"
 *
 * Paula identifica la propiedad, construye un brochure HTML de lujo
 * y lo envía al cliente. Si no especifica la casa → overview El Morenal.
 */

import { complete } from '../servicios-ia/openai.js';
import { sendEmail, AGENT_FROM_NAMES, DEFAULT_FROM_EMAIL } from './email.js';
import { ecosistemaTable } from './email-ecosystem.js';

// SMTP dedicado Paula/PropElite — si no hay env var, fallback al global
const PE_FROM_EMAIL = process.env.PAULA_SMTP_USER || DEFAULT_FROM_EMAIL;
const PE_ADMIN_CC   = process.env.PAULA_CC_EMAIL || process.env.COWORKIA_ADMIN_EMAIL || '';
const ADMIN_WA    = (process.env.BOT_PHONE || '593994837117').replace('+', '');

// ─── CATÁLOGO ─────────────────────────────────────────────────────────────────

const PROPIEDADES = [
  {
    id:               'ECU-JARDIN-1',
    nombre:           'Casa Jardín #1',
    numero:           1,
    habitaciones:     3,
    banos:            2,
    area_construida:  '245.82 m²',
    area_util:        '181.35 m²',
    area_terreno:     '380.58 m²',
    jardin:           '207.03 m²',
    precio:           340587,
    descripcion:      'Casa de lujo con jardín amplio de 207 m², garajes cubiertos, porches y terraza. Lista para habitar.',
    highlights:       ['Jardín exclusivo 207 m²', 'Garaje cubierto 36 m²', 'Terraza privada', 'Distribución flexible hasta 40 m² sin costo'],
    detalles:         { 'Planta baja': '117 m²', 'Planta alta': '64 m²', 'Garaje cubierto': '36 m²', 'Porches': '18 m²', 'Terraza': '10 m²' },
    plano_keywords:   ['jardin 1', 'jardin#1', 'casa 1', 'casa#1', '#1', 'ecu-jardin-1', 'ecuj1'],
    badge:            '',
  },
  {
    id:               'ECU-JARDIN-3',
    nombre:           'Casa Jardín #3',
    numero:           3,
    habitaciones:     3,
    banos:            2,
    area_construida:  '252.17 m²',
    area_util:        '176.74 m²',
    area_terreno:     '319.51 m²',
    jardin:           '151.18 m²',
    precio:           319439,
    descripcion:      'Casa de lujo con jardín privado de 151 m², amplios porches cubiertos y terraza. Urbanización exclusiva.',
    highlights:       ['Jardín exclusivo 151 m²', 'Porches cubiertos 40 m²', 'Garaje privado', 'Acabados premium'],
    detalles:         { 'Planta baja': '101 m²', 'Planta alta': '76 m²', 'Garaje cubierto': '27 m²', 'Porches': '40 m²', 'Terraza': '8 m²' },
    plano_keywords:   ['jardin 3', 'jardin#3', 'casa 3', 'casa#3', '#3', 'ecu-jardin-3', 'ecuj3'],
    badge:            '💰 Mejor precio',
  },
  {
    id:               'ECU-JARDIN-6',
    nombre:           'Casa Jardín #6',
    numero:           6,
    habitaciones:     3,
    banos:            2,
    area_construida:  '275.92 m²',
    area_util:        '214.53 m²',
    area_terreno:     '463.81 m²',
    jardin:           '225.12 m²',
    precio:           353091.50,
    descripcion:      'Casa de lujo con el terreno más generoso entre las de precio medio. Jardín AMPLIO de 225 m², ideal para familia.',
    highlights:       ['Jardín AMPLIO 225 m²', 'Terreno 463 m²', 'Mayor área útil 214 m²', 'Garaje + porches amplios'],
    detalles:         { 'Planta baja': '143 m²', 'Planta alta': '72 m²', 'Garaje cubierto': '35 m²', 'Porches': '20 m²', 'Terraza': '7 m²' },
    plano_keywords:   ['jardin 6', 'jardin#6', 'casa 6', 'casa#6', '#6', 'ecu-jardin-6', 'ecuj6'],
    badge:            '🌿 Mayor jardín medio',
  },
  {
    id:               'ECU-JARDIN-7',
    nombre:           'Casa Jardín #7',
    numero:           7,
    habitaciones:     3,
    banos:            2,
    area_construida:  '282.77 m²',
    area_util:        '230.09 m²',
    area_terreno:     '504.21 m²',
    jardin:           '358.10 m²',
    precio:           349435.50,
    descripcion:      '⭐ La más grande del proyecto. Terreno de 504 m² con jardín ENORME de 358 m². Máxima privacidad y espacio.',
    highlights:       ['⭐ Terreno más grande 504 m²', '🌳 Jardín ENORME 358 m²', 'Mayor área útil del proyecto 230 m²', 'Ideal para familia grande'],
    detalles:         { 'Planta baja': '161 m²', 'Planta alta': '69 m²', 'Garaje cubierto': '32 m²', 'Porches': '16 m²', 'Terraza': '4 m²' },
    plano_keywords:   ['jardin 7', 'jardin#7', 'casa 7', 'casa#7', '#7', 'ecu-jardin-7', 'ecuj7', 'grande', 'más grande', 'terreno'],
    badge:            '⭐ Terreno más grande',
  },
];

const FOTOS_LINK   = 'https://hausiecuador-my.sharepoint.com/personal/ronald_hausi_io/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fronald%5Fhausi%5Fio%2FDocuments%2FPROYECTOS%20HAUSI%2FPROYECTOS%20ANTIGUOS%2FARQUITECTOS%20IZURIETA%2FEl%20Morenal%2Fmarca%20de%20agua&viewid=dd71bdbc%2D6c8a%2D4fcd%2Daec8%2Dec6d1597b57d';
const UBICACION    = 'https://maps.app.goo.gl/tamnA6UwAeJgxAVaA';

// ─── DETECCIÓN ────────────────────────────────────────────────────────────────

export function isPaulaBossQuoteCommand(mensaje) {
  if (!mensaje) return false;
  const hasEmail   = /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/.test(mensaje);
  const hasKeyword = /cotiz[ao]ci[oó]n|coti\b|manda|env[ií]a|brochure|propuesta|proforma|para\s+\w/i.test(mensaje);
  return hasEmail && hasKeyword;
}

// ─── PARSEO ───────────────────────────────────────────────────────────────────

export async function parsePaulaQuoteData(mensaje) {
  const emailMatch = mensaje.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
  const email      = emailMatch ? emailMatch[0] : null;

  // Nombre y teléfono via OpenAI — acepta lenguaje natural
  let nombre = 'Cliente';
  let telefono = '';
  try {
    const raw = await complete(mensaje, {
      system: `Una asesora de bienes raíces recibe un mensaje del jefe para enviarle un brochure a un cliente. Extrae ÚNICAMENTE este JSON (sin markdown):
{
  "nombre": "nombre completo del cliente",
  "telefono": "número de teléfono o null"
}
REGLAS: nombre solo nombre de persona, sin palabras como teléfono/cel/correo.`,
      temperature: 0.1,
      max_tokens: 80,
      model: 'gpt-4o',
    });
    const data = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
    nombre   = data.nombre   || 'Cliente';
    telefono = data.telefono || '';
  } catch {
    const telMatch = mensaje.match(/(?<!\d)(?:\+?593|0)[0-9 ]{8,11}(?!\d)/);
    telefono = telMatch ? telMatch[0].replace(/\s+/g, '') : '';
    const paraMatch = mensaje.match(/para\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i);
    nombre   = paraMatch ? paraMatch[1].trim() : 'Cliente';
  }

  // Detectar propiedad específica (sigue siendo por keywords)
  const msgLower = mensaje.toLowerCase().replace(/[-_]/g, ' ');
  let propiedad  = null;

  for (const p of PROPIEDADES) {
    if (p.plano_keywords.some(kw => msgLower.includes(kw.toLowerCase()))) {
      propiedad = p;
      break;
    }
  }
  const esOverview = !propiedad;

  return { nombre, email, telefono, propiedad, esOverview };
}

// ─── OPENAI: INTRO PERSONALIZADA ─────────────────────────────────────────────

async function generarIntro({ nombre, propiedad, esOverview, mensajeJefe = '' }) {
  const propDesc = esOverview
    ? 'el proyecto Casas Jardín El Morenal (4 casas de lujo disponibles, constructor G.M.A. Arquitectos, Ecuador)'
    : `${propiedad.nombre} del proyecto El Morenal — ${propiedad.descripcion}`;

  const contexto = mensajeJefe
    ? `\n\nContexto del asesor sobre este cliente: "${mensajeJefe.substring(0, 350)}"`
    : '';

  const prompt = `Escribe un párrafo de bienvenida de 3-4 líneas (máximo 90 palabras) para un brochure de bienes raíces de lujo dirigido a ${nombre}. 
La propiedad/proyecto: ${propDesc}.
Empresa: PropElite Bienes Raíces.
Tono: exclusivo, cálido, aspiracional. Conecta con la situación y motivación específica del cliente si se indica. Sin emojis, prosa elegante.${contexto}`;

  try {
    return await complete(prompt, { system: 'Eres una redactora de lujo para bienes raíces premium.', temperature: 0.6, max_tokens: 140 });
  } catch {
    return `Estimado/a ${nombre}, es un placer presentarle esta exclusiva oportunidad en PropElite Bienes Raíces. El proyecto Casas Jardín - El Morenal representa lo mejor de la arquitectura residencial en Ecuador: diseño, espacio y vida de calidad en un entorno privado y seguro.`;
  }
}

// ─── HTML HELPERS ─────────────────────────────────────────────────────────────

function specRow(label, value) {
  return `<tr>
    <td style="padding:9px 14px;color:#6B7280;font-size:13px;border-bottom:1px solid #F5F0E8;white-space:nowrap;">${label}</td>
    <td style="padding:9px 14px;color:#1A2744;font-size:13px;font-weight:700;border-bottom:1px solid #F5F0E8;">${value}</td>
  </tr>`;
}

function propCardHTML(p, single = false) {
  const precioFmt = `$${p.precio.toLocaleString('es-EC', { minimumFractionDigits: 0 })} USD`;
  const detalleRows = Object.entries(p.detalles).map(([k, v]) => specRow(k, v)).join('');
  const highlightItems = p.highlights.map(h => `
    <li style="padding:7px 0;display:flex;gap:10px;align-items:baseline;font-size:13px;color:#374151;border-bottom:1px dashed #F5F0E8;">
      <span style="color:#D4AF37;font-weight:800;flex-shrink:0;">◆</span>${h}
    </li>`).join('');

  return `
  <!-- PROPIEDAD CARD: ${p.nombre} -->
  <div style="border:2px solid #E8E0D0;border-radius:18px;overflow:hidden;margin-bottom:28px;">
    <!-- Card Header -->
    <div style="background:linear-gradient(135deg,#1A2744,#243558);padding:24px 28px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <div>
        ${p.badge ? `<div style="color:#D4AF37;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;">${p.badge}</div>` : ''}
        <div style="color:white;font-size:${single ? '22' : '19'}px;font-weight:800;">${p.nombre}</div>
        <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:2px;">El Morenal · G.M.A. Arquitectos · Ecuador 🇪🇨</div>
      </div>
      <div style="text-align:right;">
        <div style="color:#D4AF37;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Precio promocional</div>
        <div style="color:white;font-size:26px;font-weight:900;">${precioFmt}</div>
        <div style="display:inline-block;background:rgba(255,255,255,0.1);border-radius:6px;padding:2px 10px;color:rgba(255,255,255,0.6);font-size:11px;margin-top:3px;">DISPONIBLE ✓</div>
      </div>
    </div>

    <div style="padding:26px 28px;background:white;">
      <!-- Quick specs -->
      <div style="display:flex;gap:10px;margin-bottom:22px;flex-wrap:wrap;">
        ${[['🛏', `${p.habitaciones} dorm.`], ['🚿', `${p.banos} baños`], ['📐', p.area_util + ' útil'], ['🌳', p.jardin + ' jardín']].map(([ic, v]) => `
        <div style="flex:1;min-width:80px;text-align:center;background:#F9F6F0;border-radius:10px;padding:12px 8px;">
          <div style="font-size:20px;">${ic}</div>
          <div style="font-size:12px;font-weight:700;color:#1A2744;margin-top:4px;">${v}</div>
        </div>`).join('')}
      </div>

      <!-- Descripción -->
      <p style="color:#374151;font-size:14px;line-height:1.75;margin:0 0 20px 0;">${p.descripcion}</p>

      <!-- Grid: Highlights + Detalles técnicos -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div>
          <div style="color:#6B7280;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Destacados</div>
          <ul style="list-style:none;margin:0;padding:0;">${highlightItems}</ul>
        </div>
        <div>
          <div style="color:#6B7280;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Áreas detalladas</div>
          <table style="width:100%;border-collapse:collapse;">${detalleRows}</table>
        </div>
      </div>

      <!-- Botones -->
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <a href="${FOTOS_LINK}" style="flex:1;display:block;text-align:center;background:linear-gradient(135deg,#1A2744,#243558);color:white;padding:13px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;">
          📸 Ver Fotos Profesionales →
        </a>
        <a href="${UBICACION}" style="flex:1;display:block;text-align:center;background:#F9F6F0;border:2px solid #E8E0D0;color:#1A2744;padding:13px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;">
          📍 Ver en Mapa →
        </a>
      </div>
    </div>
  </div>`;
}

// ─── HTML PRINCIPAL ───────────────────────────────────────────────────────────

function buildPaulaEmailHTML({ nombre, propiedad, esOverview, introTexto, quoteCode = '' }) {
  const fechaFmt  = new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const waVisita  = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(`Hola Paula! Soy ${nombre}. Me gustaría agendar una visita a ${esOverview ? 'Las Casas Jardín El Morenal' : propiedad.nombre}.`)}`;

  const propiedadesHTML = esOverview
    ? PROPIEDADES.map(p => propCardHTML(p, false)).join('')
    : propCardHTML(propiedad, true);

  const titulo   = esOverview ? 'Casas Jardín — El Morenal' : propiedad.nombre;
  const subtitulo = esOverview ? '4 casas de lujo disponibles · G.M.A. Arquitectos · Ecuador' : `El Morenal · G.M.A. Arquitectos · Ecuador 🇪🇨`;

  const ecosistemaItems = ecosistemaTable({
    aliados: ['enzo', 'gabi', 'angela', 'adriana', 'axel', 'aurora'],
    theme: 'dark',
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>PropElite — ${titulo}</title>
</head>
<body style="margin:0;padding:0;background:#F2EDE6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="max-width:660px;margin:30px auto;">

  <!-- ══ HEADER PROPELITE ══ -->
  <div style="background:linear-gradient(160deg,#0F1C2E 0%,#1A2744 55%,#0C1520 100%);border-radius:20px 20px 0 0;padding:52px 42px 46px;text-align:center;position:relative;overflow:hidden;">
    <!-- Elementos decorativos -->
    <div style="position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;background:rgba(212,175,55,0.05);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-50px;left:-40px;width:180px;height:180px;border-radius:50%;background:rgba(212,175,55,0.04);pointer-events:none;"></div>

    <div style="margin:0 auto 20px;width:74px;height:74px;background:linear-gradient(145deg,#D4AF37,#F0CB55);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:34px;box-shadow:0 6px 28px rgba(212,175,55,0.5);">🏡</div>
    <div style="color:white;font-size:30px;font-weight:800;letter-spacing:-0.5px;margin-bottom:3px;">PropElite</div>
    <div style="color:#D4AF37;font-size:11px;font-weight:700;letter-spacing:3.5px;text-transform:uppercase;margin-bottom:28px;">BIENES RAÍCES DE LUJO · ECUADOR & R.D.</div>

    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(212,175,55,0.3);border-radius:16px;padding:22px 30px;display:inline-block;">
      <div style="color:#D4AF37;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:8px;">Propuesta exclusiva para</div>
      <div style="color:white;font-size:24px;font-weight:700;margin-bottom:3px;">${nombre}</div>
      <div style="color:rgba(255,255,255,0.45);font-size:12px;">${fechaFmt}</div>
      ${quoteCode ? `<div style="color:#F0CB55;font-size:11px;font-family:monospace;letter-spacing:0.5px;margin-top:6px;background:rgba(212,175,55,0.12);border-radius:6px;padding:3px 10px;display:inline-block;">${quoteCode}</div>` : ''}
    </div>
  </div>

  <!-- ══ CUERPO ══ -->
  <div style="background:white;padding:42px 42px 10px;">

    <!-- Intro personalizada -->
    <div style="background:#FDFAF5;border-left:4px solid #D4AF37;border-radius:0 12px 12px 0;padding:22px 26px;margin-bottom:30px;">
      <p style="color:#1A2744;font-size:15px;line-height:1.85;margin:0;font-style:italic;">${introTexto}</p>
    </div>

    <!-- Proyecto badge -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#1A2744;border-radius:50px;padding:10px 28px;">
        <span style="color:#D4AF37;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Proyecto · ${titulo}</span>
      </div>
      <div style="color:#6B7280;font-size:13px;margin-top:8px;">${subtitulo}</div>
    </div>

    <!-- Propiedades -->
    ${propiedadesHTML}

    <!-- ══ PROCESO DE COMPRA ══ -->
    <div style="background:#F9F6F0;border-radius:16px;padding:30px;margin-bottom:28px;">
      <div style="color:#6B7280;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:18px;">Proceso de compra simplificado</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;text-align:center;">
        ${[['🔍', 'Visita', 'Recorre la propiedad'], ['📝', 'Oferta', 'Presentamos tu propuesta'], ['🤝', 'Reserva', '10-20% para apartar'], ['🔑', 'Escritura', 'Firma y llaves']].map(([ic, st, desc]) => `
        <div style="background:white;border-radius:12px;padding:16px 10px;">
          <div style="font-size:22px;">${ic}</div>
          <div style="color:#1A2744;font-size:12px;font-weight:700;margin:6px 0 3px;">${st}</div>
          <div style="color:#9CA3AF;font-size:11px;line-height:1.4;">${desc}</div>
        </div>`).join('')}
      </div>
      <div style="background:#ECFDF5;border:1px solid #6EE7B7;border-radius:8px;padding:10px 16px;margin-top:14px;">
        <div style="color:#065F46;font-size:12px;">✓ <strong>Sin costo para el comprador</strong> — Comisión pagada por el vendedor · 30-90 días proceso completo</div>
      </div>
    </div>

    <!-- ══ CTA AGENDAR VISITA ══ -->
    <div style="background:linear-gradient(145deg,#1A2744,#0C1520);border-radius:18px;padding:38px;text-align:center;margin-bottom:10px;">
      <div style="color:#D4AF37;font-size:13px;font-weight:600;margin-bottom:10px;">¿Lista para conocerla en persona?</div>
      <p style="color:rgba(255,255,255,0.75);font-size:15px;line-height:1.75;margin:0 0 26px 0;max-width:400px;margin-left:auto;margin-right:auto;">
        Las fotos capturan la belleza, pero la visita presencial revela la vida que puede tener aquí. ¿Agendamos una recorrida esta semana?
      </p>
      <a href="${waVisita}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#F0CB55);color:#1A2744;padding:17px 44px;border-radius:50px;text-decoration:none;font-weight:800;font-size:15px;letter-spacing:0.3px;box-shadow:0 6px 24px rgba(212,175,55,0.5);">
        🏡 Agendar mi visita →
      </a>
      <div style="margin-top:18px;">
        <div style="color:#374151;font-size:13px;line-height:1.7;background:#F9F6F0;border-radius:10px;padding:14px;">
          Asesoría por <strong>Paula</strong> — PropElite Bienes Raíces<br>
          📧 secretaria.coworkia@gmail.com &nbsp;|&nbsp; 📱 +593 98 777 0788
        </div>
      </div>
    </div>
  </div>

  <!-- ══ CO-BRANDING COWORKIA ══ -->
  <div style="background:linear-gradient(180deg,#060E17 0%,#0A1520 100%);border-radius:0 0 20px 20px;padding:44px;text-align:center;">
    <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:32px;margin-bottom:28px;">
      <div style="color:rgba(255,255,255,0.25);font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;">Propuesta presentada a través de</div>
      <div style="color:white;font-size:22px;font-weight:800;margin-bottom:4px;">Coworkia Business Center</div>
      <div style="color:#D4AF37;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Ecosistema de Inteligencia Empresarial · Ecuador</div>
    </div>

    <div style="color:rgba(255,255,255,0.25);font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">Todo el ecosistema a tu servicio</div>
    <div style="margin-bottom:28px;">${ecosistemaItems}</div>

    <div style="background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.12);border-radius:10px;padding:16px;margin-bottom:22px;">
      <p style="color:rgba(255,255,255,0.5);font-size:12px;line-height:1.8;margin:0;">
        Un solo ecosistema. Seis especialistas que trabajan por ti.<br>
        <strong style="color:rgba(255,255,255,0.75);">Tu nueva vida comienza con la propiedad correcta.</strong>
      </p>
    </div>

    <div style="color:rgba(255,255,255,0.15);font-size:11px;line-height:1.7;">
      Brochure generado por <strong style="color:rgba(255,255,255,0.3);">Paula</strong> · PropElite Bienes Raíces<br>
      Coworkia Intelligence System · ${fechaFmt}
    </div>
  </div>

</div>
</body>
</html>`;
}

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────

/**
 * 🏡 Procesa el comando del jefe y envía brochure de lujo al cliente
 * @param {string} mensajeCompleto — texto crudo del jefe en WA
 */
export async function sendPaulaCotizacion(mensajeCompleto, { quoteCode = '' } = {}) {
  const datos = await parsePaulaQuoteData(mensajeCompleto);

  if (!datos.email) {
    return { success: false, error: 'No se pudo extraer email del mensaje' };
  }

  console.log(`[PAULA-COTI] 🏡 ${datos.esOverview ? 'Overview El Morenal' : datos.propiedad.nombre} → ${datos.nombre} (${datos.email})`);

  // Intro personalizada con OpenAI — enriquecida con el contexto del jefe
  const introTexto = await generarIntro({ ...datos, mensajeJefe: mensajeCompleto });

  // Construir HTML con código de documento
  const html      = buildPaulaEmailHTML({ ...datos, introTexto, quoteCode });
  const propLabel = datos.esOverview ? 'Casas Jardín El Morenal' : datos.propiedad.nombre;
  const codeLabel = quoteCode ? `${quoteCode} — ` : '';
  const subject   = `Cotización 🏡 ${codeLabel}${propLabel} · ${datos.nombre} | Paula - PropElite`;

  const result = await sendEmail({ 
    to: datos.email, 
    cc: PE_ADMIN_CC, 
    subject, 
    html,
    from: { name: AGENT_FROM_NAMES.paula, address: PE_FROM_EMAIL }
  });

  return {
    ...result,
    nombre:    datos.nombre,
    email:     datos.email,
    propiedad: datos.esOverview ? 'El Morenal (4 casas)' : datos.propiedad.nombre,
    precio:    datos.esOverview ? `$${PROPIEDADES[1].precio.toLocaleString()} — $${PROPIEDADES[2].precio.toLocaleString()}` : `$${datos.propiedad.precio.toLocaleString()}`,
    quoteCode,
  };
}
