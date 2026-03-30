// scripts/preview-renewal-email.mjs
// Quick preview of ALUNA_RENEWAL email template
import { buildEmailTemplate } from '../src/servicios/email-template-system.js';
import { writeFileSync } from 'fs';

const html = buildEmailTemplate('ALUNA', 'RENEWAL', {
  name: 'Diego Villota',
  plan: 'Plan 10',
  expirationDate: '2026-04-01',
  monthlyFee: '140'
}, { xiaomiSafe: true });

writeFileSync('/tmp/renewal-preview.html', html);
console.log('✅ Preview saved to /tmp/renewal-preview.html');
