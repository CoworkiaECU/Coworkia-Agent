/**
 * One-time script: adds background-color fallback before every
 * background:linear-gradient(...) that doesn't already have one.
 * Run: node scripts/_fix-gradient-fallbacks.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const files = [
  'src/servicios/generic-email-templates.js',
  'src/servicios/axel-quote-email.js',
  'src/servicios/email-templates-paula.js',
  'src/servicios/payment-receipt-email.js',
  'src/servicios/paula-cotizacion-email.js',
];

let totalFixed = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf8');
  let count = 0;

  // Match style="...background:linear-gradient(...)..." 
  // Only add fallback if no background-color already present in the prefix
  content = content.replace(
    /style="([^"]*?)background\s*:\s*linear-gradient\(([^)]+)\)/g,
    (match, prefix, gradientArgs) => {
      if (prefix.includes('background-color')) return match;

      const parts = gradientArgs.split(',').map(s => s.trim());
      let firstColor = null;
      for (const p of parts) {
        const colorMatch = p.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
        if (colorMatch) {
          firstColor = colorMatch[1];
          break;
        }
      }

      if (!firstColor) return match;

      count++;
      return `style="${prefix}background-color:${firstColor};background:linear-gradient(${gradientArgs})`;
    }
  );

  if (count > 0) {
    writeFileSync(file, content, 'utf8');
    console.log(`✅ ${file}: ${count} gradients fixed`);
    totalFixed += count;
  } else {
    console.log(`⏭️  ${file}: no unfixed gradients`);
  }
}

console.log(`\n✅ Total: ${totalFixed} gradient fallbacks added`);
