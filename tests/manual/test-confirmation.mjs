import { isPositiveResponse } from './src/servicios/confirmation-flow.js';

console.log('\n🧪 TEST: isPositiveResponse()');
console.log('----------------------------');
const tests = ['si', 'Si', 'SI', 'sí', 'Sí', 'si por favor', 'si gracias', 'ok', 'dale', 'listo', 'no', 'nop', 'otro horario'];
tests.forEach(text => {
  const result = isPositiveResponse(text);
  console.log(`${result ? '✅' : '❌'} "${text}" -> ${result}`);
});
