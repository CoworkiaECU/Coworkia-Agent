/**
 * 🔄 Script para actualizar templates con logos base64 y dark mode
 * Genera nuevas funciones con soporte completo
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer y convertir logos a base64
const segpopularPath = join(__dirname, '../../public/assets/logos/segpopular.png');
const marketinglabPath = join(__dirname, '../../public/assets/logos/marketinglab.png');
const marketinglabWhitePath = join(__dirname, '../../public/assets/logos/marketinglab-white.png');

const segpopularBase64 = readFileSync(segpopularPath).toString('base64');
const marketinglabBase64 = readFileSync(marketinglabPath).toString('base64');
const marketinglabWhiteBase64 = readFileSync(marketinglabWhitePath).toString('base64');

console.log('✅ Logos convertidos a base64:');
console.log(`  - SegPopular: ${(segpopularBase64.length / 1024).toFixed(2)} KB`);
console.log(`  - MarketingLab: ${(marketinglabBase64.length / 1024).toFixed(2)} KB`);
console.log(`  - MarketingLab (white): ${(marketinglabWhiteBase64.length / 1024).toFixed(2)} KB`);

// Exportar para usar en templates
export const LOGOS_BASE64 = {
  segpopular: segpopularBase64,
  marketinglab: marketinglabBase64,
  marketinglabWhite: marketinglabWhiteBase64
};

// CSS para Dark Mode — Restaurado v1150 con estrategia inteligente
// → Clientes modernos (iPhone, Gmail desktop): reciben dark mode via @media
// → Xiaomi/MIUI: se les envía con xiaomiSafe=true (sin este CSS)
// Uso: importar en templates legacy; nuevos templates usan getEmailStyles()
export const DARK_MODE_CSS = `
  <style>
    /* 🌙 Dark Mode Support — Solo clientes que soportan @media queries */
    @media (prefers-color-scheme: dark) {
      body { background-color: #f3f4f6 !important; }
      .em-wrap { background-color: #ffffff !important; color: #1f2937 !important; }
    }
  </style>
`;

console.log('\n✅ DARK_MODE_CSS restaurado (v1150) — uso con xiaomiSafe flag');
console.log('\nAhora actualiza generic-email-templates.js importando:');
console.log('  import { LOGOS_BASE64, DARK_MODE_CSS } from "./email-assets.js"');
