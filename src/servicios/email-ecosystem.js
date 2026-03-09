/**
 * 🌐 COWORKIA INTELLIGENCE ECOSYSTEM
 * Genera la grilla TABLE de agentes IA para footers de emails.
 *
 * Usa layout <table> compatible con Gmail, Outlook y Apple Mail.
 * Reemplaza el CSS Grid que NO funciona en clientes de email.
 *
 * Cada tarjeta incluye copy persuasivo por agente (BBDO brief).
 */

// SVG path data per agent — COLOR placeholder replaced at render time
const AGENT_SVGS = {
  gabi:    `<rect x="5" y="3" width="22" height="26" rx="2" stroke="COLOR" stroke-width="1.5" fill="none"/><line x1="9" y1="10" x2="23" y2="10" stroke="COLOR" stroke-width="1.5" stroke-linecap="round"/><line x1="9" y1="15" x2="23" y2="15" stroke="COLOR" stroke-width="1.5" stroke-linecap="round"/><line x1="9" y1="20" x2="17" y2="20" stroke="COLOR" stroke-width="1.5" stroke-linecap="round"/>`,
  enzo:    `<polygon points="16,3 29,10 29,22 16,29 3,22 3,10" stroke="COLOR" stroke-width="1.5" fill="none"/><polygon points="16,10 22,13.5 22,20.5 16,24 10,20.5 10,13.5" fill="COLOR" opacity="0.2" stroke="COLOR" stroke-width="1"/><circle cx="16" cy="16" r="2" fill="COLOR"/>`,
  angela:  `<path d="M16 5C11.03 5 7 9.03 7 14C7 18.97 11.03 23 16 23C20.97 23 25 18.97 25 14C25 9.03 20.97 5 16 5Z" stroke="COLOR" stroke-width="1.5" fill="none"/><line x1="16" y1="10" x2="16" y2="18" stroke="COLOR" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="14" x2="20" y2="14" stroke="COLOR" stroke-width="2" stroke-linecap="round"/><path d="M10 23L7 28H25L22 23" stroke="COLOR" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  adriana: `<path d="M16 4L28 10V18C28 23 22.5 27.5 16 29C9.5 27.5 4 23 4 18V10L16 4Z" stroke="COLOR" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M11 16L14 19L21 12" stroke="COLOR" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  axel:    `<circle cx="16" cy="16" r="12" stroke="COLOR" stroke-width="1.5" fill="none"/><circle cx="16" cy="16" r="6" stroke="COLOR" stroke-width="1.5" fill="none"/><line x1="16" y1="4" x2="16" y2="10" stroke="COLOR" stroke-width="1.5" stroke-linecap="round"/><line x1="16" y1="22" x2="16" y2="28" stroke="COLOR" stroke-width="1.5" stroke-linecap="round"/><line x1="4" y1="16" x2="10" y2="16" stroke="COLOR" stroke-width="1.5" stroke-linecap="round"/><line x1="22" y1="16" x2="28" y2="16" stroke="COLOR" stroke-width="1.5" stroke-linecap="round"/><circle cx="16" cy="16" r="2" fill="COLOR"/>`,
  paula:   `<path d="M4 28V16L16 6L28 16V28H20V21H12V28H4Z" stroke="COLOR" stroke-width="1.5" stroke-linejoin="round" fill="none"/>`,
  aurora:  `<circle cx="16" cy="16" r="13" stroke="COLOR" stroke-width="1.5" stroke-dasharray="4 3" fill="none"/><circle cx="16" cy="16" r="7" stroke="COLOR" stroke-width="1.5" fill="none"/><circle cx="16" cy="16" r="2.5" fill="COLOR"/><circle cx="16" cy="4" r="1.5" fill="COLOR" opacity="0.6"/><circle cx="16" cy="28" r="1.5" fill="COLOR" opacity="0.6"/><circle cx="4" cy="16" r="1.5" fill="COLOR" opacity="0.6"/><circle cx="28" cy="16" r="1.5" fill="COLOR" opacity="0.6"/>`,
  aluna:   `<path d="M16 3L20 12H29L22 18L25 27L16 21L7 27L10 18L3 12H12L16 3Z" stroke="COLOR" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M16 9L18 14H23L19 17L21 22L16 19L11 22L13 17L9 14H14L16 9Z" fill="COLOR" opacity="0.3"/>`,
  custom:  `<circle cx="16" cy="16" r="12" stroke="COLOR" stroke-width="2" stroke-dasharray="2 2" fill="none"/><path d="M16 8V16L20 20" stroke="COLOR" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="16" r="3" fill="COLOR"/><path d="M8 8L12 12M20 8L16 12M8 24L12 20M24 24L20 20" stroke="COLOR" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>`,
};

function iconSVG(key, color) {
  const paths = AGENT_SVGS[key].replaceAll('COLOR', color);
  return `<svg width="36" height="36" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
}

// Brand accent color per agent — matches the website card colors
const AGENT_COLORS = {
  gabi:    '#34D399',  // emerald
  enzo:    '#A855F7',  // purple
  angela:  '#F87171',  // coral red
  adriana: '#38BDF8',  // sky blue
  axel:    '#FB923C',  // orange
  paula:   '#10B981',  // green
  aurora:  '#4ECDC4',  // teal (Coworkia brand)
  aluna:   '#F59E0B',  // amber
  custom:  '#A78BFA',  // purple light (tu agente personalizado)
};

const AGENTS = {
  gabi: {
    tag: 'LEGAL &amp; FINANZAS',
    name: 'Gabi — GR Consulting',
    pitch: 'SRI, contratos y compliance. Resueltos antes de que sean un problema.',
    cta: 'Asesoría profesional 30 mins gratis →',
    link: 'https://wa.me/593994837117?text=%40gabi%20quiero%20asesor%C3%ADa%20legal%2C%20contable%20y%20de%20cumplimiento',
  },
  enzo: {
    tag: 'MARKETING IA',
    name: 'Enzo — MarketingLab',
    pitch: 'Más clientes en 60 días. La IA de Enzo trabaja mientras tú duermes.',
    cta: 'Impulsar mi negocio ahora →',
    link: 'https://wa.me/593994837117?text=%40enzo%20quiero%20implementar%20inteligencia%20artificial%20en%20mi%20empresa',
  },
  angela: {
    tag: 'SALUD EMPRESARIAL',
    name: 'Angela — MedBeneficios',
    pitch: 'Obsequios de salud para campañas de fidelidad. Porque tu gente es tu motor.',
    cta: 'Quiero un médico virtual ahora →',
    link: 'https://wa.me/593994837117?text=%40angela%20quiero%20fidelizar%20mis%20distribuidores%20%2F%20socios%20en%20todo%20el%20pa%C3%ADs',
  },
  adriana: {
    tag: 'SEGUROS VEHICULARES',
    name: 'Adriana — SegPopular',
    pitch: 'Tu auto protegido al mejor precio del mercado. Cotización en minutos.',
    cta: 'Asegurar mi vehículo →',
    link: 'https://wa.me/593994837117?text=%40adriana%20aseguremos%20mi%20auto',
  },
  axel: {
    tag: 'COLISIONES &amp; PINTURA',
    name: 'Axel — The PaintBull',
    pitch: 'Rayón, choque o pintura. Precio justo garantizado, sin sorpresas.',
    cta: 'Reparar mi auto →',
    link: 'https://wa.me/593994837117?text=%40axel%20reparemos%20la%20colisi%C3%B3n%20de%20mi%20veh%C3%ADculo',
  },
  paula: {
    tag: 'BIENES RAÍCES',
    name: 'Paula — PropElite',
    pitch: 'Vende más rápido o encuentra exactamente lo que buscas. Paula lo gestiona.',
    cta: 'Encontrar mi casa ideal →',
    link: 'https://wa.me/593994837117?text=%40paula%20Hola%2C%20estoy%20buscando%20una%20propiedad',
  },
  aurora: {
    tag: 'ESPACIOS &amp; RESERVAS',
    name: 'Aurora — Coworkia',
    pitch: 'Hot desk o sala de reuniones. Reserva en segundos, sin papeleo.',
    cta: 'Reservar mi espacio →',
    link: 'https://wa.me/593994837117?text=%40aurora%20Hola%2C%20quiero%20reservar%20un%20espacio%20en%20Coworkia',
  },
  aluna: {
    tag: 'MEMBRESÍAS',
    name: 'Aluna — Coworkia',
    pitch: 'Tu oficina en Quito desde $140/mes. Flexible, sin permanencia forzada.',
    cta: 'Activar mi membresía →',
    link: 'https://wa.me/593994837117?text=%40aluna%20quiero%20conocer%20las%20membres%C3%ADas%20en%20Coworkia',
  },
  custom: {
    tag: 'TU AGENTE IA',
    name: '¿Y si tu negocio tuviera su propia IA?',
    pitch: 'Imagina un agente que SOLO habla de TU producto. Que vende mientras duermes. Que nunca pide vacaciones. Tu próximo empleado es virtual.',
    cta: 'Activar IA en mi empresa →',
    link: 'https://wa.me/593994837117?text=%40enzo%20quiero%20un%20agente%2C%20%C2%BFme%20cotizas%20uno%3F',
  },
};

function darkCard(key) {
  const a = AGENTS[key];
  const color = AGENT_COLORS[key] || '#4ECDC4';
  const svg = iconSVG(key, color);
  const isSpecial = key === 'custom';
  
  // Botón más sencillo y pequeño
  const btnStyle = isSpecial 
    ? `display:inline-block;background:linear-gradient(135deg,${color},#8B5CF6);border:none;border-radius:16px;padding:8px 12px;color:white;font-size:9px;font-weight:700;text-decoration:none;white-space:nowrap;`
    : `display:inline-block;background:${color};border:none;border-radius:16px;padding:7px 11px;color:#0F172A;font-size:9px;font-weight:700;text-decoration:none;white-space:nowrap;`;
  
  // Card con glow sutil y dinámico
  const cardStyle = isSpecial
    ? `background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid ${color}88;border-radius:12px;box-shadow:0 0 20px ${color}40, inset 0 1px 0 rgba(255,255,255,0.05);transition:all 0.3s ease;`
    : `background:#16181d;border:1px solid ${color}55;border-radius:12px;box-shadow:0 0 16px ${color}35;transition:all 0.3s ease;`;
  
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" height="180" class="eco-card eco-card-${key}" style="${cardStyle}"><tr><td style="padding:16px;vertical-align:top;" valign="top" height="180"><div style="margin-bottom:10px;">${svg}</div><div style="color:${color};font-size:9px;font-weight:600;letter-spacing:1.8px;text-transform:uppercase;margin-bottom:7px;opacity:0.75;">${a.tag}</div><div style="color:rgba(255,255,255,0.95);font-size:15px;font-weight:600;line-height:1.25;margin-bottom:8px;">${a.name}</div><div style="color:rgba(255,255,255,0.6);font-size:11px;line-height:1.5;margin-bottom:14px;">${a.pitch}</div><a href="${a.link}" target="_blank" style="${btnStyle}">${a.cta}</a></td></tr></table>`;
}

function lightCard(key) {
  const a = AGENTS[key];
  const color = AGENT_COLORS[key] || '#10B981';
  const svg = iconSVG(key, color);
  const btnStyle = `background:${color};border:1px solid ${color};border-radius:20px;padding:6px 14px;color:white;font-size:11px;font-weight:700;`;
  return `<a href="${a.link}" target="_blank" style="text-decoration:none;display:block;"><table width="100%" cellpadding="0" cellspacing="0" border="0" height="190" class="eco-light-card" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;"><tr><td style="padding:16px;vertical-align:top;" valign="top" height="190"><div style="margin-bottom:10px;">${svg}</div><div style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">${a.tag}</div><div style="color:#111827;font-size:13px;font-weight:700;line-height:1.3;margin-bottom:8px;">${a.name}</div><div style="color:#6B7280;font-size:11px;line-height:1.5;margin-bottom:13px;">${a.pitch}</div><span style="${btnStyle}">${a.cta}</span></td></tr></table></a>`;
}

/**
 * Genera la grilla TABLE de tarjetas de agentes IA (2 columnas).
 * Compatible con Gmail, Outlook y Apple Mail.
 *
 * @param {{ aliados: string[], theme?: 'dark'|'light' }} opts
 *   aliados — claves de agentes: ['gabi','enzo','angela',...]
 *   theme   — 'dark' para fondos oscuros, 'light' para fondos blancos
 * @returns {string} HTML de <table> listo para insertar en el email
 */
export function ecosistemaTable({ aliados, theme = 'dark' }) {
  const fn = theme === 'dark' ? darkCard : lightCard;
  const rows = [];

  for (let i = 0; i < aliados.length; i += 2) {
    const left  = aliados[i];
    const right = aliados[i + 1];
    if (right) {
      rows.push(`<tr>
        <td width="50%" valign="top" style="padding:5px 4px;">${fn(left)}</td>
        <td width="50%" valign="top" style="padding:5px 4px;">${fn(right)}</td>
      </tr>`);
    } else {
      // Último agente impar — centrado a 58% de ancho
      rows.push(`<tr>
        <td colspan="2" align="center" style="padding:5px 4px;"><table width="58%" cellpadding="0" cellspacing="0" border="0"><tr><td>${fn(left)}</td></tr></table></td>
      </tr>`);
    }
  }

  const hoverCSS = `<style>.eco-card{transition:box-shadow 0.2s ease,border-color 0.2s ease}.eco-light-card{transition:box-shadow 0.2s ease}</style>`;
  return hoverCSS + `<table width="100%" cellpadding="0" cellspacing="0" border="0">
    ${rows.join('\n    ')}
  </table>`;
}
