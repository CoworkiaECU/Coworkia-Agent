/**
 * Reenvío manual de AXEL-2026-0001 a yo@diegovillota.com
 * Datos reconstruidos desde el análisis de interacciones + screenshot
 */
import { config } from 'dotenv';
config();

const { sendQuoteEmail } = await import('../src/servicios/axel-quote-email.js');

const result = await sendQuoteEmail({
  customerEmail: 'yo@diegovillota.com',
  customerName: 'Diego Villota',
  vehicleData: { marca: 'Vehículo', modelo: 'Siniestro costado derecho', año: '2026' },
  damageAnalysis: {
    severity: 'MODERADO',
    damages_by_panel: [
      { panel: 'Guardafango delantero derecho', damage_type: 'Abolladura + arañazo hasta el metal', action: 'reparar', severity_panel: 'MODERADO' },
      { panel: 'Parachoques delantero', damage_type: 'Deformación + grieta lateral', action: 'reparar', severity_panel: 'MODERADO' },
      { panel: 'Puerta delantera derecha', damage_type: 'Abolladura media sin rotura', action: 'reparar', severity_panel: 'MODERADO' },
      { panel: 'Puerta trasera derecha', damage_type: 'Arañazo profundo + pérdida de pintura', action: 'reparar', severity_panel: 'LEVE' }
    ],
    affectedParts: ['Guardafango delantero derecho', 'Parachoques delantero', 'Puerta delantera derecha', 'Puerta trasera derecha'],
    damageDetails: 'Daños concentrados en el costado derecho del vehículo. Cuatro paneles afectados con diferente grado de severidad. Análisis realizado por Vision AI sobre 4 fotos.',
    hiddenDamageRisk: 'MEDIO',
    estimatedRepairDays: '5-7 días hábiles'
  },
  quote: {
    resumen_danos: 'Daños concentrados en el costado derecho del vehículo. Guardafango delantero con abolladura y raspón hasta el metal. Parachoques deformado con grieta lateral. Ambas puertas derechas con abolladuras y pérdida de pintura. Se recomienda inspección física para evaluar posibles daños en la estructura del umbral.',
    trabajos: [
      { item: 'Guardafango delantero derecho', detalle: 'Enderezado + pintura panel pequeño + materiales', rango_min: 180, rango_max: 280 },
      { item: 'Parachoques delantero', detalle: 'Reparación y enderezado + pintura + materiales', rango_min: 200, rango_max: 350 },
      { item: 'Puerta delantera derecha', detalle: 'Enderezado abolladura + pintura panel mediano', rango_min: 200, rango_max: 320 },
      { item: 'Puerta trasera derecha', detalle: 'Corrección arañazo profundo + pintura completa', rango_min: 150, rango_max: 230 },
      { item: 'Materiales consumibles (4 paneles)', detalle: 'Masilla, imprimante, lija, cinta de enmascarar', rango_min: 80, rango_max: 120 },
      { item: 'Pulido y acabado final', detalle: 'Abrillantado y detailing zona reparada', rango_min: 25, rango_max: 60 }
    ],
    subtotal_mano_obra: { min: 580, max: 980 },
    subtotal_materiales: { min: 80, max: 120 },
    subtotal_repuestos: { min: 0, max: 0 },
    total_min: 835,
    total_max: 1280,
    dias_entrega: '5-7 días hábiles',
    garantia: '1 año en pintura, garantía de por vida en trabajos de enderezado estructural',
    nota_inspeccion: 'Inspección física recomendada para verificar alineación de puertas y posibles daños en la estructura del umbral derecho no visibles en fotos.'
  },
  priceRange: { min: 835, max: 1280 },
  photoUrls: [
    'https://api.wassenger.com/v1/chat/682de9ea896d635a50b7cd69/files/69a9f01cd4be37569354cfe2/download?token=e572b534785689a6e8c2e8840a83d8a2b8b14d74f4fbfcadb7e0753d81a9c22cb0ce2776aa8f467b',
    'https://api.wassenger.com/v1/chat/682de9ea896d635a50b7cd69/files/69a9f01cd4be37569354cfe1/download?token=e572b534785689a6e8c2e8840a83d8a2b8b14d74f4fbfcadb7e0753d81a9c22cb0ce2776aa8f467b',
    'https://api.wassenger.com/v1/chat/682de9ea896d635a50b7cd69/files/69a9f01cd4be37569354cfe0/download?token=e572b534785689a6e8c2e8840a83d8a2b8b14d74f4fbfcadb7e0753d81a9c22cb0ce2776aa8f467b',
    'https://api.wassenger.com/v1/chat/682de9ea896d635a50b7cd69/files/69a9f01cd4be37569354cfe3/download?token=e572b534785689a6e8c2e8840a83d8a2b8b14d74f4fbfcadb7e0753d81a9c22cb0ce2776aa8f467b'
  ],
  quoteCode: 'AXEL-2026-0001'
});

if (result.success) {
  console.log('✅ Email reenviado a yo@diegovillota.com (+ CC a villotaj71@gmail.com y mktlab.ec@gmail.com)');
} else {
  console.error('❌ Error:', result.error);
  process.exit(1);
}
