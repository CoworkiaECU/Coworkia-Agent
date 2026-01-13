#!/usr/bin/env node
/**
 * Script para actualizar la validación de códigos en wassenger.js
 * Integra búsqueda en PostgreSQL con findQuoteByCode()
 */

const fs = require('fs');
const path = require('path');

const filePath = './src/express-servidor/endpoints-api/wassenger.js';

console.log('🔧 Actualizando validación de códigos en wassenger.js...');

// Leer archivo
let content = fs.readFileSync(filePath, 'utf8');

// Nueva sección con búsqueda PostgreSQL
const newSection = `      // DETECTAR SI USUARIO YA TIENE COTIZACIÓN ENVIADA (buscar en DB PostgreSQL)
      if (activeAgent === 'AXEL') {
        const quoteCodeMatch = text.match(/AXEL-\\d{4}-\\d{4}/);
        const hasExistingQuote = profile.axelData?.lastAnalysis && profile.axelData?.emailSent;
        
        // Si usuario menciona código AXEL, buscar en base de datos PostgreSQL
        if (quoteCodeMatch) {
          console.log(\`[WASSENGER] 🔍 Buscando código en DB: \${quoteCodeMatch[0]}\`);
          
          try {
            const { findQuoteByCode } = await import('../../servicios/axel-quote-db.js');
            const dbResult = await findQuoteByCode(quoteCodeMatch[0]);
            
            if (dbResult.success && dbResult.found) {
              // Cotización encontrada en DB - cargar en perfil
              const dbQuote = dbResult.quote;
              console.log('[WASSENGER] ✅ Cotización encontrada en DB, cargando datos...');
              
              profile.axelData = profile.axelData || {};
              profile.axelData.loadedQuote = {
                code: dbQuote.quote_code,
                vehicle: dbQuote.vehicle,
                status: dbQuote.status,
                priceRange: { min: dbQuote.price_min, max: dbQuote.price_max },
                originalPhone: dbQuote.original_user_phone,
                customerName: dbQuote.customer_name,
                customerEmail: dbQuote.customer_email,
                emailSent: dbQuote.email_sent,
                appointmentConfirmed: dbQuote.appointment_confirmed
              };
              profile.axelData.quoteConfirmed = true;
              profile.axelData.awaitingScheduling = dbQuote.status === 'sent' || dbQuote.status === 'confirmed';
              profile.axelData.confirmedQuoteCode = dbQuote.quote_code;
              
              await saveProfile(userId, profile);
              console.log('[WASSENGER] ✅ Estado actualizado con cotización DB');
              
            } else {
              // Código no encontrado en DB
              console.log('[WASSENGER] ❌ Código AXEL no encontrado en DB');
              await enviarWhatsApp(userId,
                \`❌ No encontré la cotización con código \${quoteCodeMatch[0]}\\n\\n\` +
                'Verifica que el código sea correcto. Si acabas de recibir tu cotización, espera unos segundos e intenta de nuevo. 🔄'
              );
              return;
            }
          } catch (error) {
            console.error('[WASSENGER] Error buscando código en DB:', error);
            // Continuar con flujo normal si hay error DB
          }
        }
        // Si tiene cotización local (sin código), también activar modo post-cotización
        else if (hasExistingQuote && (text.toLowerCase().includes('confirmar') || text.toLowerCase().includes('cotizaci') || text.toLowerCase().includes('agendar') || text.toLowerCase().includes('cita'))) {
          console.log('[WASSENGER] 💡 Usuario tiene cotización local existente, modo post-cotización activado');
          
          profile.axelData = profile.axelData || {};
          profile.axelData.quoteConfirmed = true;
          profile.axelData.awaitingScheduling = true;
          
          await saveProfile(userId, profile);
          console.log('[WASSENGER] ✅ Estado actualizado: quoteConfirmed=true, awaitingScheduling=true');
        }
      }
      
      // `;

// Buscar sección a reemplazar usando marcadores
const startMarker = 'DETECTAR SI USUARIO YA TIENE';
const endMarker = 'SI ES AXEL CON IMAGEN';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('❌ No se encontraron los marcadores de inicio/fin');
  console.error('Start:', startIdx, 'End:', endIdx);
  process.exit(1);
}

// Retroceder hasta el comentario
const commentStart = content.lastIndexOf('//', startIdx - 20);

console.log('📍 Ubicaciones:');
console.log('  - Comentario inicio:', commentStart);
console.log('  - Texto inicio:', startIdx);
console.log('  - Texto fin:', endIdx);

// Reemplazar sección
const before = content.substring(0, commentStart);
const after = content.substring(endIdx);

const newContent = before + newSection + after;

// Crear backup
const backupPath = filePath + '.backup-' + Date.now();
fs.writeFileSync(backupPath, content);
console.log('✅ Backup creado:', backupPath);

// Escribir nuevo contenido
fs.writeFileSync(filePath, newContent);
console.log('✅ Archivo actualizado exitosamente');
console.log('📊 Cambios:');
console.log('  - Sección original:', (endIdx - commentStart), 'caracteres');
console.log('  - Sección nueva:', newSection.length, 'caracteres');
console.log('  - Delta:', newSection.length - (endIdx - commentStart), 'caracteres');
console.log('');
console.log('🎯 Búsqueda PostgreSQL integrada en validación de códigos');
