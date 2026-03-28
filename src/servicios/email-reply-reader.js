/**
 * 📬 Email Reply Reader — Lee respuestas de clientes a emails del sistema
 * 
 * REGLAS DE AISLAMIENTO:
 * 1. Solo procesa emails que son RESPUESTAS a emails enviados por el sistema
 *    (detectado via In-Reply-To / References headers + subject "Re:")
 * 2. Cada email se enruta al agente correcto basado en el Message-ID original
 * 3. NO lee emails que no sean respuestas al sistema (spam, newsletters, etc.)
 * 4. NO cruza información entre agentes — cada reply va a SU agente
 * 
 * Usa IMAP con las mismas credenciales de EMAIL_USER/EMAIL_PASS (App Password Gmail)
 * 
 * @module email-reply-reader
 */

import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import databaseService from '../database/database.js';

// Pattern para identificar emails del sistema: coworkia-AGENTE-...@coworkia.ec
const COWORKIA_MESSAGE_ID_PATTERN = /coworkia-(\w+)-[^@]+@coworkia\.ec/i;

// Agentes válidos del sistema
const VALID_AGENTS = ['aurora', 'aluna', 'adriana', 'gabi', 'enzo', 'axel', 'paula', 'system'];

// Subject patterns por agente (fallback si no hay Message-ID match)
const AGENT_SUBJECT_PATTERNS = {
  aurora:  /reserva|hot\s*desk|sala\s*(de\s+)?reuniones|coworking/i,
  aluna:   /membres[ií]a|plan\s+\d+|oficina\s+virtual|proforma|ALU-/i,
  adriana: /seguro|p[oó]liza|veh[ií]culo|segpopular|comparativo/i,
  gabi:    /legal|contable|recibo|factura|cotizaci[oó]n/i,
  enzo:    /marketing|estrategia\s+digital|campa[ñn]a|marketinglab/i,
  axel:    /reparaci[oó]n|colisi[oó]n|paintbull|automotriz/i,
  paula:   /inmobiliaria|propiedad|real\s+estate/i,
};

/**
 * 🔌 Conectar a Gmail IMAP
 */
async function connectIMAP() {
  const config = {
    imap: {
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASS,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      authTimeout: 10000,
      tlsOptions: { rejectUnauthorized: false }
    }
  };

  if (!config.imap.user || !config.imap.password) {
    throw new Error('EMAIL_USER o EMAIL_PASS no configurados');
  }

  return await imaps.connect(config);
}

/**
 * 🔍 Extrae el agente del Message-ID original
 * @param {string} messageId - e.g. "coworkia-aluna-12345-abc123@coworkia.ec"
 * @returns {string|null} - nombre del agente o null
 */
function extractAgentFromMessageId(messageId) {
  if (!messageId) return null;
  const match = messageId.match(COWORKIA_MESSAGE_ID_PATTERN);
  if (match && VALID_AGENTS.includes(match[1].toLowerCase())) {
    return match[1].toLowerCase();
  }
  return null;
}

/**
 * 🔍 Detecta agente por subject (fallback)
 */
function detectAgentFromSubject(subject) {
  if (!subject) return null;
  for (const [agent, pattern] of Object.entries(AGENT_SUBJECT_PATTERNS)) {
    if (pattern.test(subject)) return agent;
  }
  return null;
}

/**
 * 🧹 Extrae solo el texto de la respuesta (sin el email citado)
 * Gmail cita con "On ... wrote:" o "El ... escribió:"
 */
function extractReplyText(text) {
  if (!text) return '';
  
  // Patrones de corte para texto citado
  const cutPatterns = [
    /^On .+wrote:$/m,
    /^El .+escribi[oó]:$/m,
    /^-{3,}\s*Original Message\s*-{3,}/mi,
    /^-{3,}\s*Mensaje original\s*-{3,}/mi,
    /^>{1,}/m,  // Líneas citadas con >
    /^From:.*@/m,  // Header del email original
    /^De:.*@/m,
  ];
  
  let cleanText = text;
  for (const pattern of cutPatterns) {
    const idx = cleanText.search(pattern);
    if (idx > 10) { // Solo cortar si hay algo antes
      cleanText = cleanText.substring(0, idx);
      break;
    }
  }
  
  return cleanText.trim();
}

/**
 * 📬 FUNCIÓN PRINCIPAL: Leer respuestas nuevas de clientes
 * 
 * @param {Object} options
 * @param {number} options.maxEmails - Límite de emails a procesar (default: 20)
 * @param {number} options.sinceDays - Buscar emails de los últimos N días (default: 3)
 * @returns {Array} - Lista de respuestas procesadas con agente asignado
 */
export async function readClientReplies({ maxEmails = 20, sinceDays = 3 } = {}) {
  let connection;
  const results = [];
  
  try {
    console.log('[EMAIL-READER] 📬 Conectando a IMAP...');
    connection = await connectIMAP();
    
    await connection.openBox('INBOX');
    
    // Buscar emails recientes (últimos N días)
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - sinceDays);
    const dateStr = sinceDate.toISOString().split('T')[0];
    
    const searchCriteria = [
      ['SINCE', dateStr],
      'UNSEEN' // Solo no leídos
    ];
    
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false, // No marcar como leído automáticamente
      struct: true
    };
    
    console.log(`[EMAIL-READER] 🔍 Buscando emails no leídos desde ${dateStr}...`);
    const messages = await connection.search(searchCriteria, fetchOptions);
    
    console.log(`[EMAIL-READER] 📨 ${messages.length} emails no leídos encontrados`);
    
    let processed = 0;
    
    for (const message of messages) {
      if (processed >= maxEmails) break;
      
      try {
        // Parsear email completo
        const fullBody = message.parts.find(p => p.which === '');
        if (!fullBody) continue;
        
        const parsed = await simpleParser(fullBody.body);
        
        // 🛡️ FILTRO 1: Solo respuestas (tiene In-Reply-To o subject empieza con Re:)
        const inReplyTo = parsed.inReplyTo || '';
        const references = parsed.references || [];
        const isReply = inReplyTo || 
                       (parsed.subject && /^re:\s/i.test(parsed.subject)) ||
                       references.length > 0;
        
        if (!isReply) {
          continue; // Ignorar emails que NO son respuestas
        }
        
        // 🛡️ FILTRO 2: Solo respuestas a emails del SISTEMA
        // Buscar nuestro Message-ID en In-Reply-To o References
        let originAgent = extractAgentFromMessageId(inReplyTo);
        
        if (!originAgent && references.length > 0) {
          for (const ref of references) {
            originAgent = extractAgentFromMessageId(ref);
            if (originAgent) break;
          }
        }
        
        // Fallback: detectar por subject si es un Re: de algo nuestro
        if (!originAgent) {
          originAgent = detectAgentFromSubject(parsed.subject);
        }
        
        // Si no se puede identificar el agente → es un email externo, ignorar
        if (!originAgent) {
          console.log(`[EMAIL-READER] ⏩ Ignorado (no del sistema): ${parsed.subject}`);
          continue;
        }
        
        // 🛡️ FILTRO 3: Ignorar auto-replies y bounces
        const fromEmail = parsed.from?.value?.[0]?.address || '';
        if (fromEmail === process.env.EMAIL_USER ||
            fromEmail.includes('noreply') ||
            fromEmail.includes('mailer-daemon') ||
            fromEmail.includes('postmaster')) {
          continue;
        }
        
        // ✅ Es una respuesta válida a un email del sistema
        const replyText = extractReplyText(parsed.text || '');
        const fromName = parsed.from?.value?.[0]?.name || '';
        
        const replyData = {
          fromEmail,
          fromName,
          subject: parsed.subject || '',
          replyText,
          fullText: parsed.text || '',
          htmlBody: parsed.html || '',
          agent: originAgent,
          inReplyTo,
          references: Array.isArray(references) ? references : [references].filter(Boolean),
          receivedAt: parsed.date || new Date(),
          messageId: parsed.messageId || '',
          uid: message.attributes?.uid
        };
        
        results.push(replyData);
        processed++;
        
        console.log(`[EMAIL-READER] ✅ Reply detectado: ${fromEmail} → agente:${originAgent} | "${parsed.subject}"`);
        
        // Marcar como leído
        if (message.attributes?.uid) {
          await connection.addFlags(message.attributes.uid, ['\\Seen']);
        }
        
      } catch (parseErr) {
        console.warn('[EMAIL-READER] ⚠️ Error parseando email:', parseErr.message);
      }
    }
    
    console.log(`[EMAIL-READER] 📊 Resultado: ${results.length} respuestas de clientes procesadas`);
    return results;
    
  } catch (error) {
    console.error('[EMAIL-READER] ❌ Error:', error.message);
    return results;
  } finally {
    if (connection) {
      try { await connection.end(); } catch (_) {}
    }
  }
}

/**
 * 💾 Guarda respuestas en BD y las asocia al agente + lead correcto
 */
export async function processAndStoreReplies(replies) {
  if (!replies || replies.length === 0) return { processed: 0, stored: 0 };
  
  let stored = 0;
  
  try {
    await databaseService.initialize();
    
    // Crear tabla si no existe
    await databaseService.run(`
      CREATE TABLE IF NOT EXISTS email_replies (
        id TEXT PRIMARY KEY,
        from_email TEXT NOT NULL,
        from_name TEXT,
        subject TEXT,
        reply_text TEXT,
        agent TEXT NOT NULL,
        in_reply_to TEXT,
        received_at TIMESTAMPTZ,
        processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'new',
        lead_id TEXT,
        responded BOOLEAN DEFAULT FALSE,
        response_sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    for (const reply of replies) {
      const id = `REPLY-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
      
      // Buscar lead asociado por email del remitente
      let leadId = null;
      try {
        const leadTable = getLeadTableForAgent(reply.agent);
        if (leadTable) {
          const lead = await databaseService.get(
            `SELECT id FROM ${leadTable} WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
            [reply.fromEmail]
          );
          leadId = lead?.id || null;
        }
      } catch (_) {}
      
      // Verificar duplicado por messageId
      if (reply.messageId) {
        const existing = await databaseService.get(
          `SELECT id FROM email_replies WHERE in_reply_to = $1 AND from_email = $2`,
          [reply.inReplyTo, reply.fromEmail]
        );
        if (existing) {
          console.log(`[EMAIL-READER] ⏩ Duplicado ignorado: ${reply.fromEmail}`);
          continue;
        }
      }
      
      await databaseService.run(`
        INSERT INTO email_replies (id, from_email, from_name, subject, reply_text, agent, in_reply_to, received_at, lead_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [id, reply.fromEmail, reply.fromName, reply.subject, reply.replyText, reply.agent, reply.inReplyTo, reply.receivedAt, leadId]);
      
      stored++;
    }
    
    console.log(`[EMAIL-READER] 💾 ${stored}/${replies.length} respuestas almacenadas`);
    return { processed: replies.length, stored };
    
  } catch (error) {
    console.error('[EMAIL-READER] ❌ Error almacenando:', error.message);
    return { processed: replies.length, stored, error: error.message };
  }
}

/**
 * 🗂️ Mapea agente → tabla de leads
 */
function getLeadTableForAgent(agent) {
  const map = {
    aurora: 'reservations',
    aluna: 'membership_leads',
    adriana: 'insurance_leads',
    gabi: 'legal_leads',
    enzo: 'marketing_leads',
    axel: 'collision_quotes',
    paula: 'real_estate_leads'
  };
  return map[agent] || null;
}

/**
 * 🔄 CRON: Polling periódico de respuestas (cada 10 minutos)
 */
export async function pollEmailReplies() {
  console.log('[EMAIL-READER] 🔄 Polling de respuestas...');
  
  try {
    const replies = await readClientReplies({ maxEmails: 20, sinceDays: 3 });
    
    if (replies.length > 0) {
      const result = await processAndStoreReplies(replies);
      console.log(`[EMAIL-READER] ✅ Poll completado: ${result.stored} nuevas respuestas`);
      return result;
    }
    
    console.log('[EMAIL-READER] 📭 Sin respuestas nuevas');
    return { processed: 0, stored: 0 };
    
  } catch (error) {
    console.error('[EMAIL-READER] ❌ Error en polling:', error.message);
    return { processed: 0, stored: 0, error: error.message };
  }
}
