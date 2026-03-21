const fs = require('fs');
const html = fs.readFileSync('public/aluna-proformas.html', 'utf8');
const js = fs.readFileSync('public/js/aluna-dashboard.js', 'utf8');

const initIds = ['filter-status', 'filter-origin', 'search'];
console.log('=== IDs en init del JS ===');
initIds.forEach(id => {
  const inHtml = html.includes('id="' + id + '"');
  console.log(id + ': ' + (inHtml ? 'OK' : 'FALTA EN HTML'));
});

const modalIds = ['modal-followup', 'modal-campaign', 'modal-prospect',
  'followup-modal-title', 'followup-lead-name', 'followup-lead-plan',
  'followup-message', 'btn-send-followup', 'followup-sending',
  'campaign-name', 'campaign-filter', 'campaign-message',
  'campaign-channel-wa', 'campaign-channel-email',
  'campaign-preview-count', 'campaign-final-count',
  'campaign-preview-box', 'campaign-preview-message',
  'btn-create-campaign', 'campaign-sending', 'campaign-progress'];

console.log('\n=== IDs de modales ===');
modalIds.forEach(id => {
  const inHtml = html.includes('id="' + id + '"');
  console.log(id + ': ' + (inHtml ? 'OK' : 'FALTA'));
});

// find if any JS getElementById calls reference IDs not in HTML
const getByIdMatches = [...js.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)];
const missingIds = getByIdMatches
  .map(m => m[1])
  .filter((id, i, arr) => arr.indexOf(id) === i)
  .filter(id => !html.includes('id="' + id + '"'));

console.log('\n=== IDs en JS que NO existen en HTML ===');
if (missingIds.length === 0) {
  console.log('Ninguno - todo OK');
} else {
  missingIds.forEach(id => console.log('FALTA: ' + id));
}
