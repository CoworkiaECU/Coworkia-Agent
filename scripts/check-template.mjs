import dotenv from 'dotenv';
dotenv.config();
import { buildEmailTemplate } from '../src/servicios/email-template-system.js';

const html = buildEmailTemplate('adriana', 'COMPARISON_V2', {
  nombre: 'Javier Andrade', marca: 'Hyundai', modelo: 'Creta', anio: 2022,
  valor_asegurado: '$16,000', vaz_prima_anual: '$830', vaz_prima_mensual: '$83',
});

console.log('Mapfre en tabla:', html.includes('Mapfre'));
console.log('Equinoccial en tabla:', html.includes('Equinoccial'));
console.log('AIG en tabla:', html.includes('AIG'));
console.log('Latina en tabla:', html.includes('Latina'));
console.log('Footer SIN co-brand VAZ:', !html.includes('SegPopular Ecuador \u00b7 VAZ Seguros'));
console.log('Header SIN co-brand VAZ:', !html.includes('SegPopular S.A. \u00b7 VAZ Seguros'));
console.log('Badge ADRIANA RECOMIENDA:', html.includes('ADRIANA RECOMIENDA'));
console.log('Tabla comparativa presente:', html.includes('Comparativa objetiva'));
console.log('Logo segpopular.png en email:', html.includes('segpopular.png'));
console.log('VAZ Elemental:', html.includes('Elemental'));
console.log('12 meses en email:', html.includes('12 meses') || html.includes('12 cuotas'));
console.log('Sin email @gmail en footer:', !html.includes('@gmail') && !html.includes('@segpopular'));
console.log('CTA verde activa:', html.includes('Quiero este seguro'));
