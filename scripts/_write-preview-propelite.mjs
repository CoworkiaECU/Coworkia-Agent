import { writeFileSync } from 'fs';

// ─── TIPOGRAFÍA ÚNICA ────────────────────────────────────────────────────────
// Georgia, 'Times New Roman', serif — en todo el cuerpo del email.
// El SVG del logo es la única excepción (wordmark de marca).
// Jerarquía visual solo por tamaño, peso y color — nunca por cambio de fuente.
// ────────────────────────────────────────────────────────────────────────────

const FOOTER = `
    <!-- FOOTER -->
    <div style="text-align:center;padding:48px 30px 40px;background:#0A0A0A;border-top:2px solid rgba(180,180,180,0.2);">
      <!-- Logo SVG — wordmark de marca, fuentes del SVG son diseño tipográfico -->
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 110" width="200" height="50" role="img" aria-label="PropElite Real Estate" style="display:block;margin:0 auto 24px;">
        <defs>
          <linearGradient id="fg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"  stop-color="#FFFFFF"/>
            <stop offset="20%" stop-color="#E4E4E4"/>
            <stop offset="48%" stop-color="#8C8C8C"/>
            <stop offset="72%" stop-color="#D8D8D8"/>
            <stop offset="100%" stop-color="#ABABAB"/>
          </linearGradient>
          <linearGradient id="fg2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"  stop-color="#C8C8C8"/>
            <stop offset="100%" stop-color="#787878"/>
          </linearGradient>
        </defs>
        <text x="240" y="68" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="56" font-weight="400" fill="url(#fg)" letter-spacing="2">PropElite</text>
        <line x1="62" y1="83" x2="158" y2="83" stroke="#666" stroke-width="0.8"/>
        <line x1="322" y1="83" x2="418" y2="83" stroke="#666" stroke-width="0.8"/>
        <text x="240" y="96" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="11" font-weight="400" fill="url(#fg2)" letter-spacing="5.5">REAL ESTATE</text>
      </svg>
      <!-- CTA WhatsApp -->
      <a href="https://wa.me/593XXXXXXXXX" style="display:inline-block;background:transparent;color:#C0C0C0;padding:12px 36px;text-decoration:none;font-size:12px;letter-spacing:3px;border:1px solid rgba(180,180,180,0.35);text-transform:uppercase;">Escribir a Paula</a>
      <!-- Copyright -->
      <p style="color:#333;font-size:10px;margin:28px 0 0;letter-spacing:1.5px;text-transform:uppercase;">© 2026 PropElite</p>
    </div>`;

const HEADER = (gradId) => `
    <!-- HEADER -->
    <div style="background:linear-gradient(135deg,#0A0A0A 0%,#1C1C1C 100%);padding:45px 30px;text-align:center;border-bottom:2px solid rgba(180,180,180,0.4);">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 110" width="260" height="65" role="img" aria-label="PropElite Real Estate">
        <defs>
          <linearGradient id="${gradId}a" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"  stop-color="#FFFFFF"/>
            <stop offset="20%" stop-color="#E4E4E4"/>
            <stop offset="48%" stop-color="#8C8C8C"/>
            <stop offset="72%" stop-color="#D8D8D8"/>
            <stop offset="100%" stop-color="#ABABAB"/>
          </linearGradient>
          <linearGradient id="${gradId}b" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"  stop-color="#C8C8C8"/>
            <stop offset="100%" stop-color="#787878"/>
          </linearGradient>
        </defs>
        <text x="240" y="68" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="56" font-weight="400" fill="url(#${gradId}a)" letter-spacing="2">PropElite</text>
        <line x1="62" y1="83" x2="158" y2="83" stroke="#888" stroke-width="0.8"/>
        <line x1="322" y1="83" x2="418" y2="83" stroke="#888" stroke-width="0.8"/>
        <text x="240" y="96" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="11" font-weight="400" fill="url(#${gradId}b)" letter-spacing="5.5">REAL ESTATE</text>
      </svg>
    </div>`;

// Tipografía unificada: Georgia para títulos y datos destacados, Arial para cuerpo de texto
// UNA sola fuente serif (Georgia) y UNA sans-serif (Arial) — sin Google Fonts

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Emails — PropElite</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #2a2a2a; font-family: Georgia, 'Times New Roman', serif; }

    /* Tabs */
    .tab-bar { display: flex; gap: 4px; padding: 16px 24px 0; background: #1a1a1a; position: sticky; top: 0; z-index: 100; border-bottom: 1px solid #444; }
    .tab { padding: 8px 18px; background: #333; color: #aaa; font-size: 12px; border-radius: 6px 6px 0 0; cursor: pointer; border: 1px solid #444; border-bottom: none; white-space: nowrap; }
    .tab.active { background: #fff; color: #111; }
    .tab:hover:not(.active) { background: #444; color: #ddd; }

    /* Canvas */
    .preview-wrap { padding: 30px 24px; display: none; }
    .preview-wrap.active { display: block; }
    .email-canvas { max-width: 650px; margin: 0 auto; background: #fff; box-shadow: 0 8px 40px rgba(0,0,0,0.5); border-radius: 4px; overflow: hidden; }
    .email-label { text-align: center; color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; }
  </style>
</head>
<body>

<div class="tab-bar">
  <div class="tab active" onclick="show('t1', this)">✅ Confirmación</div>
  <div class="tab" onclick="show('t2', this)">📅 Reagendada</div>
  <div class="tab" onclick="show('t3', this)">❌ Cancelada</div>
  <div class="tab" onclick="show('t4', this)">🔔 Recordatorio</div>
  <div class="tab" onclick="show('t5', this)">📧 Follow-up 24h</div>
  <div class="tab" onclick="show('t6', this)">🏠 Follow-up 3d</div>
</div>

<!-- T1 — CONFIRMACIÓN -->
<div id="t1" class="preview-wrap active">
  <p class="email-label">Email 1 · Confirmación de visita agendada</p>
  <div class="email-canvas">
    ${HEADER('g1')}
    <div style="text-align:center;margin:38px 0 28px;">
      <div style="display:inline-block;width:80px;height:80px;border-radius:50%;background:#059669;line-height:80px;">
        <span style="color:white;font-size:42px;">✓</span>
      </div>
    </div>
    <div style="text-align:center;padding:0 40px 28px;">
      <h2 style="color:#111;font-size:28px;margin:0 0 14px;font-weight:400;letter-spacing:2px;font-family:Georgia,'Times New Roman',serif;">Visita Confirmada</h2>
      <p style="color:#444;font-size:15px;margin:0;font-weight:300;line-height:1.6;">Carlos Andrade, nos alegra que des este paso — todo está listo para recibirte</p>
    </div>
    <div style="padding:0 40px 40px;">
      <div style="background:#F0F0F0;padding:18px 22px;margin:0 0 20px;border-left:4px solid #B0B0B0;">
        <div style="color:#666;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Código de Visita</div>
        <div style="color:#111;font-weight:700;font-size:22px;font-family:Georgia,'Times New Roman',serif;">VIS-20260515-A4B2</div>
      </div>
      <div style="background:#F8F8F8;border:1px solid #E0E0E0;padding:28px;margin:0 0 24px;">
        <div style="margin-bottom:20px;">
          <div style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Propiedad</div>
          <div style="color:#111;font-size:17px;font-family:Georgia,'Times New Roman',serif;font-weight:700;">Casa Jardín Modelo — Tipo 6</div>
          <div style="color:#888;font-size:13px;margin-top:4px;">ECU-JARDIN-6</div>
        </div>
        <div style="margin-bottom:20px;">
          <div style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Dirección</div>
          <div style="color:#111;font-size:16px;font-family:Georgia,'Times New Roman',serif;">Urb. El Morenal, Cumbayá, Quito</div>
        </div>
        <div>
          <div style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Fecha y Hora</div>
          <div style="color:#111;font-size:17px;font-family:Georgia,'Times New Roman',serif;font-weight:700;">Jueves 15/05/2026 · 10:00</div>
          <div style="color:#999;font-size:13px;margin-top:4px;">1 hora</div>
        </div>
      </div>
      <div style="border:1px solid #D0D0D0;padding:28px;margin:0 0 24px;">
        <h3 style="color:#999;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 18px;font-weight:400;">Para tu visita</h3>
        <p style="color:#444;font-size:14px;margin:10px 0;font-weight:300;line-height:1.7;"><span style="color:#B0B0B0;font-family:Georgia,serif;font-size:15px;margin-right:10px;">I.</span>Llega 5 minutos antes — te esperamos</p>
        <p style="color:#444;font-size:14px;margin:10px 0;font-weight:300;line-height:1.7;"><span style="color:#B0B0B0;font-family:Georgia,serif;font-size:15px;margin-right:10px;">II.</span>Trae tu cédula o pasaporte</p>
        <p style="color:#444;font-size:14px;margin:10px 0;font-weight:300;line-height:1.7;"><span style="color:#B0B0B0;font-family:Georgia,serif;font-size:15px;margin-right:10px;">III.</span>Un agente de PropElite te recibirá personalmente</p>
        <p style="color:#444;font-size:14px;margin:10px 0;font-weight:300;line-height:1.7;"><span style="color:#B0B0B0;font-family:Georgia,serif;font-size:15px;margin-right:10px;">IV.</span>Todas tus preguntas tienen respuesta ese día</p>
      </div>
      <div style="background:#FFFBEB;border-left:3px solid #F59E0B;padding:16px 20px;margin:0 0 32px;">
        <p style="color:#92400E;font-size:13px;margin:0;line-height:1.6;font-weight:300;">¿Necesitas reagendar? Avísanos por WhatsApp con 24 horas de anticipación.</p>
      </div>
      <div style="text-align:center;">
        <a href="#" style="display:inline-block;background:#059669;color:#fff;padding:16px 44px;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Contactar a Paula</a>
      </div>
    </div>
    ${FOOTER}
  </div>
</div>

<!-- T2 — REAGENDADA -->
<div id="t2" class="preview-wrap">
  <p class="email-label">Email 2 · Visita reagendada</p>
  <div class="email-canvas">
    ${HEADER('g2')}
    <div style="text-align:center;margin:38px 0 28px;">
      <div style="display:inline-block;width:80px;height:80px;border-radius:50%;background:#1D4ED8;line-height:80px;">
        <span style="color:white;font-size:38px;">📅</span>
      </div>
    </div>
    <div style="text-align:center;padding:0 40px 28px;">
      <h2 style="color:#111;font-size:28px;margin:0 0 14px;font-weight:400;letter-spacing:2px;font-family:Georgia,'Times New Roman',serif;">Visita Reagendada</h2>
      <p style="color:#444;font-size:15px;margin:0;font-weight:300;">Tu visita ha sido cambiada exitosamente</p>
    </div>
    <div style="padding:0 40px 40px;">
      <div style="background:#F0F0F0;padding:18px 22px;margin:0 0 20px;border-left:4px solid #B0B0B0;">
        <div style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Código de Visita</div>
        <div style="color:#111;font-weight:700;font-size:22px;font-family:Georgia,'Times New Roman',serif;">VIS-20260515-A4B2</div>
      </div>
      <div style="background:#F8F8F8;border:1px solid #E0E0E0;padding:28px;margin:0 0 32px;">
        <div style="margin-bottom:20px;">
          <div style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Propiedad</div>
          <div style="color:#111;font-size:17px;font-family:Georgia,'Times New Roman',serif;font-weight:700;">Casa Jardín Modelo — Tipo 6</div>
        </div>
        <div>
          <div style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Nueva Fecha y Hora</div>
          <div style="color:#111;font-size:17px;font-family:Georgia,'Times New Roman',serif;font-weight:700;">Sábado 17/05/2026 · 11:00</div>
          <div style="color:#999;font-size:13px;margin-top:4px;">1 hora</div>
        </div>
      </div>
      <div style="text-align:center;">
        <a href="#" style="display:inline-block;background:#059669;color:#fff;padding:16px 44px;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Contactar a Paula</a>
      </div>
    </div>
    ${FOOTER}
  </div>
</div>

<!-- T3 — CANCELADA -->
<div id="t3" class="preview-wrap">
  <p class="email-label">Email 3 · Visita cancelada</p>
  <div class="email-canvas">
    ${HEADER('g3')}
    <div style="text-align:center;margin:38px 0 28px;">
      <div style="display:inline-block;width:80px;height:80px;border-radius:50%;background:#DC2626;line-height:80px;">
        <span style="color:white;font-size:38px;">✕</span>
      </div>
    </div>
    <div style="text-align:center;padding:0 40px 28px;">
      <h2 style="color:#111;font-size:28px;margin:0 0 14px;font-weight:400;letter-spacing:2px;font-family:Georgia,'Times New Roman',serif;">Visita Cancelada</h2>
      <p style="color:#444;font-size:15px;margin:0;font-weight:300;">Tu visita ha sido cancelada según tu solicitud</p>
    </div>
    <div style="padding:0 40px 40px;">
      <div style="background:#F0F0F0;padding:18px 22px;margin:0 0 20px;border-left:4px solid #B0B0B0;">
        <div style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Visita Cancelada</div>
        <div style="color:#111;font-weight:700;font-size:22px;font-family:Georgia,'Times New Roman',serif;">VIS-20260515-A4B2</div>
      </div>
      <div style="background:#FEF2F2;border:1px solid #FCA5A5;padding:20px 24px;margin:0 0 32px;">
        <p style="color:#991B1B;font-size:14px;margin:0;line-height:1.7;font-weight:300;">Si fue un error o deseas reagendar, escríbenos por WhatsApp y con gusto encontramos una nueva fecha.</p>
      </div>
      <div style="text-align:center;">
        <a href="#" style="display:inline-block;background:#111;color:#fff;padding:16px 44px;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Reagendar visita</a>
      </div>
    </div>
    ${FOOTER}
  </div>
</div>

<!-- T4 — RECORDATORIO -->
<div id="t4" class="preview-wrap">
  <p class="email-label">Email 4 · Recordatorio de visita (24h antes)</p>
  <div class="email-canvas">
    ${HEADER('g4')}
    <div style="text-align:center;margin:38px 0 28px;">
      <div style="display:inline-block;width:80px;height:80px;border-radius:50%;background:#C0C0C0;line-height:80px;">
        <span style="color:#111;font-size:38px;">🔔</span>
      </div>
    </div>
    <div style="text-align:center;padding:0 40px 28px;">
      <h2 style="color:#111;font-size:28px;margin:0 0 14px;font-weight:400;letter-spacing:2px;font-family:Georgia,'Times New Roman',serif;">Recordatorio de Visita</h2>
      <p style="color:#444;font-size:15px;margin:0;font-weight:300;">Tu visita es <strong style="font-weight:600;">mañana</strong> · Jueves 15/05/2026</p>
    </div>
    <div style="padding:0 40px 40px;">
      <div style="background:#F0F0F0;padding:18px 22px;margin:0 0 20px;border-left:4px solid #B0B0B0;">
        <div style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Código de Visita</div>
        <div style="color:#111;font-weight:700;font-size:22px;font-family:Georgia,'Times New Roman',serif;">VIS-20260515-A4B2</div>
      </div>
      <div style="background:#F8F8F8;border:1px solid #E0E0E0;padding:28px;margin:0 0 24px;">
        <div style="margin-bottom:20px;">
          <div style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Propiedad</div>
          <div style="color:#111;font-size:17px;font-family:Georgia,'Times New Roman',serif;font-weight:700;">Casa Jardín Modelo — Tipo 6</div>
          <div style="color:#888;font-size:13px;margin-top:4px;">Urb. El Morenal, Cumbayá, Quito</div>
        </div>
        <div>
          <div style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Fecha y Hora</div>
          <div style="color:#111;font-size:17px;font-family:Georgia,'Times New Roman',serif;font-weight:700;">Jueves 15/05/2026 · 10:00</div>
        </div>
      </div>
      <div style="border:1px solid #D0D0D0;padding:28px;margin:0 0 32px;">
        <h3 style="color:#999;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 18px;font-weight:400;">Para mañana</h3>
        <p style="color:#444;font-size:14px;margin:10px 0;font-weight:300;line-height:1.7;"><span style="color:#B0B0B0;font-family:Georgia,serif;font-size:15px;margin-right:10px;">I.</span>Llega 5 minutos antes</p>
        <p style="color:#444;font-size:14px;margin:10px 0;font-weight:300;line-height:1.7;"><span style="color:#B0B0B0;font-family:Georgia,serif;font-size:15px;margin-right:10px;">II.</span>Trae tu cédula o pasaporte</p>
        <p style="color:#444;font-size:14px;margin:10px 0;font-weight:300;line-height:1.7;"><span style="color:#B0B0B0;font-family:Georgia,serif;font-size:15px;margin-right:10px;">III.</span>Un agente te recibirá en la propiedad</p>
      </div>
      <div style="text-align:center;">
        <a href="#" style="display:inline-block;background:#059669;color:#fff;padding:16px 44px;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Contactar a Paula</a>
      </div>
    </div>
    ${FOOTER}
  </div>
</div>

<!-- T5 — FOLLOW-UP 24H -->
<div id="t5" class="preview-wrap">
  <p class="email-label">Email 5 · Follow-up 24h después del primer contacto</p>
  <div class="email-canvas">
    ${HEADER('g5')}
    <div style="text-align:center;padding:40px 40px 28px;">
      <h2 style="color:#111;font-size:26px;margin:0 0 14px;font-weight:400;letter-spacing:2px;font-family:Georgia,'Times New Roman',serif;">Hola Carlos</h2>
      <p style="color:#444;font-size:15px;margin:0;font-weight:300;line-height:1.6;">Ayer hablamos sobre tu búsqueda de propiedad.<br>¿Tienes alguna pregunta antes de dar el siguiente paso?</p>
    </div>
    <div style="padding:0 40px 40px;">
      <div style="background:#F8F8F8;border:1px solid #E0E0E0;padding:28px;margin:0 0 24px;">
        <h3 style="color:#999;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;font-weight:400;">Tu búsqueda</h3>
        <p style="color:#444;font-size:14px;margin:8px 0;font-weight:300;line-height:1.7;">🏠 Casa en Cumbayá · Compra</p>
        <p style="color:#444;font-size:14px;margin:8px 0;font-weight:300;line-height:1.7;">💰 Presupuesto: $300,000 – $380,000</p>
        <p style="color:#444;font-size:14px;margin:8px 0;font-weight:300;line-height:1.7;">🛏 3+ habitaciones</p>
      </div>
      <div style="border:1px solid #D0D0D0;padding:28px;margin:0 0 32px;">
        <h3 style="color:#999;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 14px;font-weight:400;">Siguiente paso</h3>
        <p style="color:#444;font-size:14px;line-height:1.7;margin:0;font-weight:300;">Tengo propiedades que coinciden con tu búsqueda. ¿Te gustaría agendar una visita esta semana?</p>
      </div>
      <div style="text-align:center;">
        <a href="#" style="display:inline-block;background:#111;color:#fff;padding:16px 44px;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Agendar visita</a>
      </div>
    </div>
    ${FOOTER}
  </div>
</div>

<!-- T6 — FOLLOW-UP 3D -->
<div id="t6" class="preview-wrap">
  <p class="email-label">Email 6 · Follow-up 3 días · nuevas opciones</p>
  <div class="email-canvas">
    ${HEADER('g6')}
    <div style="text-align:center;padding:40px 40px 28px;">
      <h2 style="color:#111;font-size:26px;margin:0 0 14px;font-weight:400;letter-spacing:2px;font-family:Georgia,'Times New Roman',serif;">Nuevas opciones para ti</h2>
      <p style="color:#444;font-size:15px;margin:0;font-weight:300;">Carlos, encontré propiedades que podrían interesarte</p>
    </div>
    <div style="padding:0 40px 40px;">
      <div style="background:#F8F8F8;border:1px solid #E0E0E0;padding:28px;margin:0 0 20px;">
        <h3 style="color:#999;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 18px;font-weight:400;">Propiedades seleccionadas</h3>
        <div style="border-bottom:1px solid #E8E8E8;padding-bottom:16px;margin-bottom:16px;">
          <div style="color:#111;font-size:15px;font-family:Georgia,'Times New Roman',serif;font-weight:700;">Casa Jardín Tipo 7</div>
          <div style="color:#059669;font-size:16px;font-family:Georgia,'Times New Roman',serif;margin:4px 0;">$349,435</div>
          <div style="color:#888;font-size:13px;font-weight:300;">4 hab · 280 m² · Cumbayá</div>
        </div>
        <div>
          <div style="color:#111;font-size:15px;font-family:Georgia,'Times New Roman',serif;font-weight:700;">Casa Jardín Tipo 1</div>
          <div style="color:#059669;font-size:16px;font-family:Georgia,'Times New Roman',serif;margin:4px 0;">$340,587</div>
          <div style="color:#888;font-size:13px;font-weight:300;">3 hab · 250 m² · Cumbayá</div>
        </div>
      </div>
      <div style="background:#F0F0F0;border-left:3px solid #C0C0C0;padding:16px 20px;margin:0 0 32px;">
        <p style="color:#444;font-size:13px;margin:0;line-height:1.7;font-weight:300;">Ambas en Urb. El Morenal, con escritura limpia y financiamiento disponible hasta 20 años.</p>
      </div>
      <div style="text-align:center;">
        <a href="#" style="display:inline-block;background:#111;color:#fff;padding:16px 44px;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Ver propiedades</a>
      </div>
    </div>
    ${FOOTER}
  </div>
</div>

<script>
function show(id, tab) {
  document.querySelectorAll('.preview-wrap').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  tab.classList.add('active');
}
</script>
</body>
</html>`;

writeFileSync('/Users/diegovillota/coworkia-agent/public/preview-emails-propelite.html', html, 'utf8');
console.log('✅ preview-emails-propelite.html actualizado');
