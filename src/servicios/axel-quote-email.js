/**
 * 📧 AXEL QUOTE EMAIL SERVICE
 * Genera y envía emails HTML con cotizaciones de The PaintBull
 */

import { sendEmail } from './email.js';

const WORKSHOP_CC = process.env.AXEL_WORKSHOP_CC || 'villotaj71@gmail.com';
const ADMIN_CC = 'mktlab.ec@gmail.com';

async function fetchAndCompressPhoto(url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      const sharpModule = await import('sharp');
      const sharp = sharpModule.default || sharpModule;
      // Full size para adjunto descargable
      const full = await sharp(buffer)
        .rotate()
        .resize({ width: 960, withoutEnlargement: true })
        .jpeg({ quality: 60, progressive: true })
        .toBuffer();
      // Thumbnail 200×150 para grid inline en el HTML
      const thumb = await sharp(buffer)
        .rotate()
        .resize({ width: 200, height: 150, fit: 'cover' })
        .jpeg({ quality: 65 })
        .toBuffer();
      return { buffer: full, thumbBuffer: thumb, contentType: 'image/jpeg' };
    } catch (err) {
      console.warn('[QUOTE-EMAIL] ⚠️ No se pudo comprimir con sharp, usando original:', err.message);
      return { buffer, thumbBuffer: buffer, contentType: 'image/jpeg' };
    }
  } catch (err) {
    console.error('[QUOTE-EMAIL] ❌ Error descargando/comprimiendo foto:', err.message);
    return null;
  }
}

/**
 * 🎨 Genera HTML del email de cotización (estilo The PaintBull)
 */
async function generateQuoteEmailHTML({ customerName, vehicleData, damageAnalysis, quote, priceRange, photoAssets = [], quoteCode }) {
  const formatDate = new Date().toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // quote puede ser objeto JSON estructurado o fallback texto plano
  const q = (quote && typeof quote === 'object' && !quote.raw_text) ? quote : null;

  // Severidad badge
  const severityMap = {
    LEVE:    { bg: '#DCFCE7', color: '#166534', dot: '#22C55E', label: 'DAÑO LEVE' },
    MODERADO:{ bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B', label: 'DAÑO MODERADO' },
    GRAVE:   { bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444', label: 'DAÑO GRAVE' },
  };
  const sv = severityMap[damageAnalysis.severity] || severityMap.MODERADO;

  // Afected parts badges
  const parts = (damageAnalysis.affectedParts || []).slice(0, 6);
  const partsBadges = parts.map(p =>
    `<span style="display:inline-block;background:#FEF2F2;color:#DC2626;border:1px solid #FECACA;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;margin:3px;">${p}</span>`
  ).join('');

  // Construir filas de trabajos desde JSON estructurado
  let trabajosHTML = '';
  let desgloseHTML = '';

  if (q && Array.isArray(q.trabajos) && q.trabajos.length > 0) {
    trabajosHTML = q.trabajos.map((t, i) => `
      <tr style="background:${i % 2 === 0 ? '#FAFAFA' : 'white'};">
        <td style="padding:14px 16px;font-size:14px;font-weight:600;color:#111827;border-bottom:1px solid #F3F4F6;">${t.item}</td>
        <td style="padding:14px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #F3F4F6;">${t.detalle}</td>
        <td style="padding:14px 16px;font-size:14px;font-weight:700;color:#DC2626;text-align:right;white-space:nowrap;border-bottom:1px solid #F3F4F6;">$${t.rango_min}–$${t.rango_max}</td>
      </tr>`).join('');

    const rows = [
      q.subtotal_mano_obra?.min ? ['🔧 Mano de obra', q.subtotal_mano_obra.min, q.subtotal_mano_obra.max] : null,
      q.subtotal_materiales?.min ? ['🎨 Materiales', q.subtotal_materiales.min, q.subtotal_materiales.max] : null,
      q.subtotal_repuestos?.min ? ['🔩 Repuestos', q.subtotal_repuestos.min, q.subtotal_repuestos.max] : null,
    ].filter(Boolean);

    desgloseHTML = rows.map(([label, min, max]) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F3F4F6;">
        <span style="color:#6B7280;font-size:14px;">${label}</span>
        <span style="color:#374151;font-size:14px;font-weight:600;">$${min} – $${max}</span>
      </div>`).join('');
  } else {
    // Fallback: mostrar texto plano si el JSON falló
    const rawText = (quote && quote.raw_text) ? quote.raw_text : (typeof quote === 'string' ? quote : '');
    trabajosHTML = `<tr><td colspan="3" style="padding:20px;font-size:14px;color:#374151;line-height:1.8;white-space:pre-wrap;">${rawText}</td></tr>`;
  }

  // Grid de thumbnails inline con CID
  const photoGrid = photoAssets.length > 0
    ? `<div style="margin-bottom:28px;">
        <div style="color:#6B7280;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">📸 Fotos del siniestro</div>
        <div style="display:grid;grid-template-columns:repeat(${Math.min(photoAssets.length, 4)},1fr);gap:6px;">
          ${photoAssets.map((_, i) => `<img src="cid:foto-${i+1}@paintbull" alt="Foto ${i+1}" width="100%" style="width:100%;height:90px;object-fit:cover;border-radius:6px;border:1px solid #E5E7EB;display:block;" />`).join('')}
        </div>
      </div>`
    : '';

  const waLink = `https://wa.me/593994837117?text=Hola%2C+quiero+confirmar+mi+cotizaci%C3%B3n+${quoteCode}`;

  // Vehicle display — replace 'Pendiente' with sensible fallbacks
  const vMarca = vehicleData.marca && vehicleData.marca !== 'Pendiente' ? vehicleData.marca : '';
  const vModelo = vehicleData.modelo && vehicleData.modelo !== 'Pendiente' ? vehicleData.modelo : '';
  const vAño = vehicleData.año && vehicleData.año !== 'Pendiente' ? vehicleData.año : '';
  const vehicleTitle = [vMarca, vModelo].filter(Boolean).join(' ') || 'Por inspeccionar';
  const vehicleYearLine = vAño ? `Año ${vAño}` : 'Inspección presencial';

  const ecosistemaItems = [
    ['🤖', 'Enzo — MarketingLab',    'IA & Marketing Digital'],
    ['⚖️', 'Gabi — GR Consulting',   'Finanzas, Legal & Compliance'],
    ['🏥', 'Angela — MedBeneficios', 'Salud Empresarial'],
    ['🛡️', 'Adriana — SegPopular',  'Seguros Vehiculares'],
    ['🏡', 'Paula — PropElite',     'Bienes Raíces Premium'],
    ['🏢', 'Aurora — Coworkia',     'Gestión de Espacios & Reservas'],
  ].map(([icon, name, desc]) => `
    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:13px;text-align:left;">
      <div style="font-size:19px;margin-bottom:5px;">${icon}</div>
      <div style="color:#111827;font-size:12px;font-weight:600;margin-bottom:2px;line-height:1.3;">${name}</div>
      <div style="color:#6B7280;font-size:10px;">${desc}</div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Cotización The PaintBull — ${vehicleTitle}</title>
  <style>
@media (prefers-color-scheme: dark) {
  body.email-body { background-color:#111827 !important; }
  .email-wrap { background-color:#111827 !important; }
  .section-white { background:#1E293B !important; }
  .footer-section { background:#1E293B !important; border-top-color:#374151 !important; }
}
  </style>
</head>
<body class="email-body" style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
<div class="email-wrap" style="max-width:660px;margin:30px auto;">

  <!-- ══ HEADER ══ -->
  <div style="background:linear-gradient(150deg,#B91C1C 0%,#DC2626 50%,#991B1B 100%);border-radius:20px 20px 0 0;padding:48px 40px 40px;text-align:center;position:relative;overflow:hidden;">
    <div style="position:absolute;top:-50px;right:-50px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.04);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-40px;left:-30px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.03);pointer-events:none;"></div>

    <!-- Diana logo -->
    <div style="margin:0 auto 22px;width:82px;height:82px;position:relative;">
      <div style="position:absolute;inset:0;border-radius:50%;background:white;box-shadow:0 4px 18px rgba(0,0,0,0.25);"></div>
      <div style="position:absolute;top:10px;left:10px;right:10px;bottom:10px;border-radius:50%;background:#DC2626;"></div>
      <div style="position:absolute;top:20px;left:20px;right:20px;bottom:20px;border-radius:50%;background:white;"></div>
      <div style="position:absolute;top:30px;left:30px;right:30px;bottom:30px;border-radius:50%;background:#DC2626;"></div>
      <div style="position:absolute;top:38px;left:38px;right:38px;bottom:38px;border-radius:50%;background:white;"></div>
    </div>

    <div style="color:white;font-size:34px;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px;">The PaintBull</div>
    <div style="color:rgba(255,255,255,0.75);font-size:13px;letter-spacing:2px;text-transform:uppercase;margin-bottom:28px;">Colisiones & Pintura Vehicular · Quito</div>

    <div style="background:rgba(255,255,255,0.97);border-radius:16px;padding:22px 28px;display:inline-block;text-align:left;min-width:280px;">
      <div style="color:#DC2626;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:8px;">Cotización preparada para</div>
      <div style="color:#111827;font-size:22px;font-weight:700;margin-bottom:4px;">${customerName}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
        <span style="color:#6B7280;font-size:13px;">${formatDate}</span>
        <span style="background:#DC2626;color:white;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;letter-spacing:1px;">${quoteCode}</span>
      </div>
    </div>
  </div>

  <!-- ══ PRECIO TOTAL — VISIBLE DE INMEDIATO ══ -->
  ${priceRange ? `
  <div class="section-white" style="background:white;padding:32px 40px;border-bottom:1px solid #F3F4F6;text-align:center;">
    <div style="color:#DC2626;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:10px;">Invesión estimada para su reparación</div>
    <div style="color:#DC2626;font-size:52px;font-weight:800;letter-spacing:-1px;line-height:1;">$${priceRange.min} <span style="font-size:28px;color:#9CA3AF;font-weight:500;">–</span> $${priceRange.max}</div>
    <div style="color:#6B7280;font-size:14px;margin-top:6px;">USD · cotización preliminar por análisis fotográfico con IA</div>
  </div>` : ''}

  <!-- ══ CUERPO ══ -->
  <div class="section-white" style="background:white;padding:36px 40px 10px;">

    <!-- Vehículo + Severidad -->
    <div style="display:flex;gap:16px;margin-bottom:28px;flex-wrap:wrap;">
      <div style="flex:1;min-width:200px;background:#FFF8F8;border:1px solid #FECACA;border-radius:14px;padding:20px;">
        <div style="color:#DC2626;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">Vehículo</div>
        <div style="color:#111827;font-size:22px;font-weight:800;line-height:1.2;">${vehicleTitle}</div>
        <div style="color:#6B7280;font-size:15px;margin-top:4px;">${vehicleYearLine}</div>
      </div>
      <div style="flex:1;min-width:160px;background:${sv.bg};border:1px solid ${sv.dot}33;border-radius:14px;padding:20px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">🔍</div>
        <div style="background:${sv.bg};border:2px solid ${sv.dot};border-radius:8px;padding:6px 14px;display:inline-block;">
          <span style="color:${sv.color};font-size:13px;font-weight:700;">${sv.label}</span>
        </div>
        <div style="color:${sv.color};font-size:12px;margin-top:10px;opacity:0.8;">Riesgo daños ocultos: <strong>${damageAnalysis.hiddenDamageRisk || 'MEDIO'}</strong></div>
      </div>
    </div>

    <!-- Partes afectadas -->
    ${parts.length > 0 ? `
    <div style="margin-bottom:28px;">
      <div style="color:#374151;font-size:13px;font-weight:700;margin-bottom:10px;">Áreas con daño detectado</div>
      <div>${partsBadges}</div>
    </div>` : ''}

    ${photoGrid}

    <!-- Resumen de daños -->
    ${q?.resumen_danos ? `
    <div style="background:#FFF8F8;border-left:4px solid #DC2626;border-radius:0 12px 12px 0;padding:18px 22px;margin-bottom:28px;">
      <div style="color:#DC2626;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Diagnóstico</div>
      <p style="color:#374151;font-size:14px;line-height:1.75;margin:0;">${q.resumen_danos}</p>
    </div>` : ''}

    <!-- Tabla de trabajos -->
    <div style="margin-bottom:28px;">
      <div style="color:#374151;font-size:14px;font-weight:700;margin-bottom:12px;">Trabajos requeridos</div>
      <div style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#111827;">
              <th style="padding:12px 16px;text-align:left;color:rgba(255,255,255,0.7);font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Trabajo</th>
              <th style="padding:12px 16px;text-align:left;color:rgba(255,255,255,0.7);font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Proceso</th>
              <th style="padding:12px 16px;text-align:right;color:rgba(255,255,255,0.7);font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Rango</th>
            </tr>
          </thead>
          <tbody>${trabajosHTML}</tbody>
        </table>
      </div>
    </div>

    <!-- Desglose subtotales -->
    ${desgloseHTML ? `
    <div style="background:#F9FAFB;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
      <div style="color:#374151;font-size:13px;font-weight:700;margin-bottom:12px;">Desglose de costos</div>
      ${desgloseHTML}
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0 0;margin-top:4px;border-top:2px solid #E5E7EB;">
        <span style="color:#111827;font-size:15px;font-weight:700;">Total estimado</span>
        <span style="color:#DC2626;font-size:20px;font-weight:800;">$${priceRange?.min || q?.total_min || '—'} – $${priceRange?.max || q?.total_max || '—'} USD</span>
      </div>
    </div>` : ''}

    <!-- Tiempo + Garantía -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:28px;">
      <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:12px;padding:18px;text-align:center;">
        <div style="font-size:28px;margin-bottom:6px;">⏱️</div>
        <div style="color:#166534;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Tiempo de entrega</div>
        <div style="color:#15803D;font-size:16px;font-weight:700;">${q?.dias_entrega || damageAnalysis.estimatedRepairDays || '3-5 días hábiles'}</div>
      </div>
      <div style="background:#EFF6FF;border:1px solid #93C5FD;border-radius:12px;padding:18px;text-align:center;">
        <div style="font-size:28px;margin-bottom:6px;">🛡️</div>
        <div style="color:#1E40AF;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Garantía</div>
        <div style="color:#1D4ED8;font-size:13px;font-weight:600;line-height:1.4;">${q?.garantia || 'Garantía escrita en pintura y mano de obra'}</div>
      </div>
    </div>

    <!-- Nota inspección -->
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:14px 18px;margin-bottom:28px;display:flex;gap:10px;align-items:flex-start;">
      <span style="font-size:18px;flex-shrink:0;">⚠️</span>
      <p style="color:#92400E;font-size:13px;line-height:1.65;margin:0;">${q?.nota_inspeccion || 'Cotización preliminar basada en análisis fotográfico con IA. La inspección física puede revelar daños estructurales adicionales no visibles en fotos.'}</p>
    </div>

    <!-- CTA -->
    <div style="background:linear-gradient(145deg,#DC2626,#991B1B);border-radius:18px;padding:36px;text-align:center;margin-bottom:10px;">
      <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-bottom:8px;">¿Listo para dejar tu vehículo como nuevo?</div>
      <div style="color:white;font-size:20px;font-weight:700;margin-bottom:6px;">Agenda tu cita ahora</div>
      <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-bottom:24px;">Respuesta en menos de 1 hora · Presupuesto sin compromiso</div>
      <a href="${waLink}" style="display:inline-block;background:white;color:#DC2626;padding:16px 44px;border-radius:50px;text-decoration:none;font-weight:800;font-size:15px;box-shadow:0 6px 20px rgba(0,0,0,0.25);letter-spacing:0.3px;">
        🔧 Confirmar cotización ${quoteCode} →
      </a>
      <div style="margin-top:24px;">
        <div style="background:rgba(0,0,0,0.18);border-radius:10px;padding:14px 20px;display:inline-block;">
          <div style="color:rgba(255,255,255,0.85);font-size:12px;">📍 Calle N44-53 y, Quito · Lun-Vie 8:00-18:00 · Sáb 9:00-14:00</div>
          <div style="color:rgba(255,255,255,0.75);font-size:12px;margin-top:4px;">📱 +593 99 483 7117 · <a href="https://www.google.com/maps?q=-0.1640916,-78.4665958" style="color:white;text-decoration:none;">Ver en mapa →</a></div>
        </div>
      </div>
    </div>

    <!-- Por qué PaintBull -->
    <div style="padding:28px 0;border-top:1px solid #F3F4F6;margin-top:10px;">
      <div style="text-align:center;color:#9CA3AF;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;">Por qué The PaintBull</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;text-align:center;">
        ${[['🏆','15 años','de experiencia'],['✅','Garantía','escrita siempre'],['⚡','Tecnología','Vision AI']].map(([ic,t,d])=>`
        <div><div style="font-size:28px;margin-bottom:6px;">${ic}</div><div style="color:#111827;font-size:13px;font-weight:700;">${t}</div><div style="color:#9CA3AF;font-size:12px;">${d}</div></div>`).join('')}
      </div>
    </div>
  </div>

  <!-- ══ CO-BRANDING COWORKIA ══ -->
  <div class="footer-section" style="background:white;border-radius:0 0 20px 20px;padding:44px;text-align:center;border-top:1px solid #F3F4F6;">
    <div style="border-top:1px solid #F3F4F6;padding-top:32px;margin-bottom:28px;">
      <div style="color:#9CA3AF;font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;">Cotización presentada a través de</div>
      <div style="color:#111827;font-size:22px;font-weight:800;margin-bottom:4px;">Coworkia Business Center</div>
      <div style="color:#DC2626;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Ecosistema de Inteligencia Empresarial · Ecuador</div>
    </div>
    <div style="color:#9CA3AF;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">Todo el ecosistema a tu servicio</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:28px;">${ecosistemaItems}</div>
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:16px;margin-bottom:22px;">
      <p style="color:#7F1D1D;font-size:12px;line-height:1.8;margin:0;">
        Un solo ecosistema. Seis especialistas que trabajan por ti.<br>
        <strong style="color:#991B1B;">Tu vehículo en las mejores manos de Ecuador.</strong>
      </p>
    </div>
    <div style="color:#9CA3AF;font-size:11px;line-height:1.7;">
      Cotización generada por <strong style="color:#6B7280;">Axel</strong> · The PaintBull<br>
      Coworkia Intelligence System · ${formatDate}
    </div>
  </div>

</div>
</body>
`;
}

/**
 * 📧 Envía email de cotización al cliente
 */
export async function sendQuoteEmail({ 
  customerEmail, 
  customerName,
  vehicleData, 
  damageAnalysis, 
  quote, 
  priceRange,
  photoUrls = [],
  quoteCode
}) {
  try {
    console.log('[QUOTE-EMAIL] 📧 Enviando cotización por email a:', customerEmail);
    console.log('[QUOTE-EMAIL] 🔢 Código de cotización:', quoteCode);

    const photoAssets = (await Promise.all(photoUrls.map(fetchAndCompressPhoto)));
    const validPhotoAssets = photoAssets.filter(Boolean);

    const htmlContent = await generateQuoteEmailHTML({
      customerName,
      vehicleData,
      damageAnalysis,
      quote,
      priceRange,
      photoAssets: validPhotoAssets,
      quoteCode
    });

    const vTitle = [vehicleData.marca, vehicleData.modelo]
      .filter(v => v && v !== 'Pendiente').join(' ') || 'Análisis de siniestro';
    const subject = `🚗 Cotización ${quoteCode} - ${vTitle}`;

    // Adjuntar fotos: inline con CID para thumbnails del HTML, no sueltas al final
    const attachments = validPhotoAssets.map((asset, idx) => ({
      filename: `foto-${idx + 1}.jpg`,
      content: asset.thumbBuffer || asset.buffer,
      contentType: asset.contentType || 'image/jpeg',
      cid: `foto-${idx + 1}@paintbull`
    }));

    const result = await sendEmail({
      to: customerEmail,
      cc: [WORKSHOP_CC, ADMIN_CC].join(','),
      subject: subject,
      html: htmlContent,
      attachments
    });

    if (result.success) {
      console.log('[QUOTE-EMAIL] ✅ Email de cotización enviado exitosamente');
    } else {
      console.error('[QUOTE-EMAIL] ❌ Error enviando email:', result.error);
    }

    return result;

  } catch (error) {
    console.error('[QUOTE-EMAIL] ❌ Error en sendQuoteEmail:', error);
    return { success: false, error: error.message };
  }
}
