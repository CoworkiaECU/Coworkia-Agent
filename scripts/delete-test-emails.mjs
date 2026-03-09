#!/usr/bin/env node

/**
 * Script para eliminar emails de prueba de la bandeja de entrada
 * Usa IMAP para conectarse a Gmail y borrar mensajes específicos
 */

import Imap from 'imap';
import dotenv from 'dotenv';
import { promisify } from 'util';

dotenv.config();

// IDs de los mensajes a eliminar (mensajes de prueba)
const MESSAGE_IDS_TO_DELETE = [
  '<0b7aebe6-b554-6d08-8d0d-edf7d125762e@gmail.com>',
  '<02479c4b-6e91-a44e-d69a-7513f894a454@gmail.com>',
  '<92bfa4da-4c79-1847-f3eb-1d6cf5b4ef12@gmail.com>',
  '<62ef5661-ef6c-64ff-eb45-50e736eaae35@gmail.com>',
  '<7c2bc51e-2d5f-2cb0-ae50-e046667d1403@gmail.com>',
  '<12db3b33-0974-fda1-7cd6-66c37db118fd@gmail.com>',
  '<c58336cf-1eee-10b7-746d-3e2132f3baea@gmail.com>',
];

console.log('🗑️  Iniciando eliminación de emails de prueba...\n');

const imap = new Imap({
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

function openInbox(cb) {
  imap.openBox('INBOX', false, cb);
}

imap.once('ready', function() {
  console.log('✅ Conectado a Gmail vía IMAP\n');
  
  openInbox(function(err, box) {
    if (err) {
      console.error('❌ Error al abrir INBOX:', err);
      imap.end();
      return;
    }

    console.log(`📬 Total de mensajes en INBOX: ${box.messages.total}`);
    console.log(`📋 Buscando ${MESSAGE_IDS_TO_DELETE.length} mensajes de prueba...\n`);

    let deletedCount = 0;
    let notFoundCount = 0;

    // Buscar cada mensaje por su Message-ID
    MESSAGE_IDS_TO_DELETE.forEach((messageId, index) => {
      const searchCriteria = [['HEADER', 'MESSAGE-ID', messageId]];
      
      setTimeout(() => {
        imap.search(searchCriteria, function(err, results) {
          if (err) {
            console.error(`❌ Error buscando ${messageId}:`, err);
            return;
          }

          if (!results || results.length === 0) {
            console.log(`⚠️  No encontrado: ${messageId}`);
            notFoundCount++;
          } else {
            console.log(`🔍 Encontrado: ${messageId} (UID: ${results[0]})`);
            
            // Marcar para eliminación
            imap.addFlags(results, '\\Deleted', function(err) {
              if (err) {
                console.error(`❌ Error marcando para borrar: ${messageId}`, err);
              } else {
                console.log(`✅ Marcado para eliminar: ${messageId}`);
                deletedCount++;
                
                // Si es el último, ejecutar expunge
                if (index === MESSAGE_IDS_TO_DELETE.length - 1) {
                  setTimeout(() => {
                    imap.expunge(function(err) {
                      if (err) {
                        console.error('❌ Error ejecutando expunge:', err);
                      } else {
                        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        console.log(`✅ Eliminación completada`);
                        console.log(`📊 Eliminados: ${deletedCount}`);
                        console.log(`⚠️  No encontrados: ${notFoundCount}`);
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                      }
                      imap.end();
                    });
                  }, 1000);
                }
              }
            });
          }
        });
      }, index * 500); // Pequeño delay entre búsquedas para evitar rate limiting
    });
  });
});

imap.once('error', function(err) {
  console.error('❌ Error IMAP:', err);
});

imap.once('end', function() {
  console.log('👋 Conexión IMAP cerrada');
  process.exit(0);
});

imap.connect();
