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

// CSS para Dark Mode
export const DARK_MODE_CSS = `
  <style>
    /* 🌙 Dark Mode Support */
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a1a !important; color: #e5e5e5 !important; }
      .email-container { background-color: #2d2d2d !important; }
      .content-section { background-color: #363636 !important; }
      .card-white { background-color: #404040 !important; }
      .card-white-border { background-color: #404040 !important; border-color: #4a4a4a !important; }
      .text-dark { color: #e5e5e5 !important; }
      .text-gray { color: #b3b3b3 !important; }
      .text-muted { color: #999999 !important; }
      .border-light { border-color: #4a4a4a !important; }
      .shadow { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important; }
      
      /* Mantener colores de marca */
      .brand-yellow { background-color: #FFD700 !important; }
      .brand-blue { color: #60A5FA !important; }
      .brand-green { color: #84CC16 !important; }
      .brand-red { color: #F87171 !important; }
    }
  </style>
`;

console.log('\n✅ Dark mode CSS generado');
console.log('\nAhora actualiza generic-email-templates.js importando:');
console.log('  import { LOGOS_BASE64, DARK_MODE_CSS } from "./email-assets.js"');
