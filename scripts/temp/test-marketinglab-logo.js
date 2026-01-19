/**
 * 🧪 TEST - Logo MarketingLab Base64 embebido
 * Lee PNG, convierte a base64 y envía email con logo real
 */

import { sendEmail } from '../../src/servicios/email.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testMarketingLabWithLogo() {
  console.log('\n🎯 TEST MARKETINGLAB - Logo PNG Base64\n');
  
  // Leer el PNG y convertir a base64
  const logoPath = join(__dirname, '../../public/assets/logos/marketinglab.png');
  
  let logoBase64 = '';
  try {
    const logoBuffer = readFileSync(logoPath);
    logoBase64 = logoBuffer.toString('base64');
    console.log('✅ Logo PNG leído y convertido a base64');
    console.log(`📏 Tamaño: ${(logoBase64.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ No se encontró el logo en:', logoPath);
    process.exit(1);
  }

  // Generar HTML con logo base64 embebido y diseño gris sobrio
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TEST - Logo MarketingLab Base64</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0;">
      
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header MarketingLab - Gris sobrio con logo real -->
        <div style="background: linear-gradient(135deg, #374151 0%, #1F2937 100%); text-align: center; padding: 40px 20px;">
          
          <!-- Logo MarketingLab embebido como base64 -->
          <div style="margin-bottom: 25px;">
            <img src="data:image/png;base64,${logoBase64}" 
                 alt="MarketingLab" 
                 style="max-width: 280px; height: auto; display: block; margin: 0 auto;" />
          </div>
          
          <div style="color: rgba(255,255,255,0.85); font-size: 15px; font-weight: 500; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase;">
            Estrategias que funcionan
          </div>
          
          <div style="background: white; color: #374151; padding: 20px 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.2); border-left: 4px solid #84CC16;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #374151;">✅ Logo PNG Base64 Test</h1>
            <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 15px;">Verificando visualización del logo</p>
          </div>
        </div>

        <div style="padding: 30px;">
          
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #1f2937; font-size: 20px; margin: 0;">¡Hola, Diego! 👋</h2>
            <p style="color: #6B7280; font-size: 15px; margin: 10px 0 0 0;">
              Este email incluye el <strong style="color: #84CC16;">logo PNG real de MarketingLab</strong> convertido a base64 y embebido en el HTML
            </p>
          </div>

          <div style="background: linear-gradient(135deg, rgba(249,250,251,0.5), rgba(243,244,246,0.5)); border-left: 4px solid #84CC16; border-radius: 12px; padding: 25px; margin: 25px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h3 style="color: #374151; margin-top: 0; font-size: 18px; font-weight: 600;">🎯 DETALLES DE PRUEBA</h3>
            
            <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(132,204,22,0.25);">
              <p style="margin: 5px 0; color: #374151; font-size: 14px;"><strong>Método:</strong> Base64 embebido</p>
              <p style="margin: 5px 0; color: #374151; font-size: 14px;"><strong>Formato:</strong> PNG</p>
              <p style="margin: 5px 0; color: #374151; font-size: 14px;"><strong>Tamaño base64:</strong> ${(logoBase64.length / 1024).toFixed(2)} KB</p>
              <p style="margin: 5px 0; color: #374151; font-size: 14px;"><strong>Diseño:</strong> Gris sobrio con acentos verdes</p>
            </div>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <p style="color: #6B7280; font-size: 14px; margin: 5px 0;">
              💬 ¿Se ve correctamente el logo? ¿Te gusta el diseño gris sobrio?
            </p>
          </div>

          <div style="text-align: center; margin: 35px 0 0 0; padding: 25px; background: linear-gradient(135deg, rgba(132,204,22,0.1), rgba(101,163,13,0.1)); border-radius: 12px; border-left: 4px solid #84CC16;">
            <p style="color: #374151; font-size: 18px; font-weight: 700; margin: 0;">Test completado 🎯</p>
            <p style="color: #4B5563; font-size: 14px; margin: 8px 0; font-weight: 600;">Enzo - MarketingLab</p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;

  const result = await sendEmail({
    to: 'yo@diegovillota.com',
    subject: '🧪 TEST - Logo MarketingLab PNG Base64 (Gris Sobrio)',
    html: html,
    from: '"Test MarketingLab" <coworkia.ec@gmail.com>'
  });

  if (result.success) {
    console.log('\n✅ Email enviado exitosamente con logo base64');
    console.log('📧 Revisa yo@diegovillota.com');
    console.log('\n💡 Verifica que el logo se vea correctamente');
    console.log('💡 Diseño: Gris sobrio (#374151) con acentos verdes (#84CC16)');
  } else {
    console.error('\n❌ Error:', result.error);
  }

  return result;
}

// Ejecutar test
console.log('🚀 INICIANDO TEST LOGO MARKETINGLAB BASE64\n');
console.log('📧 Destinatario: yo@diegovillota.com');
console.log('🎨 Diseño: Gris sobrio con verde lime');
console.log('─'.repeat(60));

try {
  await testMarketingLabWithLogo();
  console.log('─'.repeat(60));
  console.log('\n✅ TEST COMPLETADO\n');
} catch (error) {
  console.error('\n❌ ERROR FATAL:', error.message);
  console.error(error);
  process.exit(1);
}
