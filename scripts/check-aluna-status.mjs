#!/usr/bin/env node
/**
 * Script rápido para verificar estado de Aluna
 */
import dotenv from 'dotenv';
import databaseService from '../src/database/database.js';

// Cargar variables de entorno
dotenv.config();

(async () => {
  try {
    await databaseService.initialize();
    console.log('✅ Conexión a BD establecida\n');

    // Verificar últimos leads
    console.log('═══ ÚLTIMOS 5 LEADS DE MEMBRESÍA ═══');
    const leads = await databaseService.all(
      `SELECT id, user_phone, client_name, membership_type, status, email, created_at 
       FROM membership_leads 
       ORDER BY created_at DESC 
       LIMIT 5`,
      []
    );
    
    if (leads.length === 0) {
      console.log('❌ No hay leads en membership_leads\n');
    } else {
      leads.forEach(lead => {
        console.log(`📋 ${lead.id} | ${lead.client_name || 'Sin nombre'} | ${lead.membership_type || 'Sin plan'} | ${lead.status}`);
        console.log(`   📞 ${lead.user_phone} | 📧 ${lead.email || 'Sin email'}`);
        console.log(`   📅 ${new Date(lead.created_at).toLocaleString('es-EC')}\n`);
      });
    }

    // Verificar follow-ups programados
    console.log('═══ FOLLOW-UPS PROGRAMADOS (últimos 5) ═══');
    const followups = await databaseService.all(
      `SELECT user_phone, user_name, membership_type, 
              interest_at, followup_24h_sent_at, followup_3d_sent_at, converted_at
       FROM aluna_prospect_followups 
       ORDER BY interest_at DESC 
       LIMIT 5`,
      []
    );

    if (followups.length === 0) {
      console.log('❌ No hay prospectos en aluna_prospect_followups\n');
    } else {
      followups.forEach(fu => {
        const status = fu.converted_at ? '✅ Convertido' : 
                       fu.followup_3d_sent_at ? '📧 D+3 enviado' : 
                       fu.followup_24h_sent_at ? '📧 D+1 enviado' : 
                       '⏳ Pendiente';
        console.log(`💜 ${fu.user_name || 'Sin nombre'} (${fu.user_phone})`);
        console.log(`   Plan: ${fu.membership_type || 'Sin plan'} | Estado: ${status}`);
        console.log(`   Interés: ${new Date(fu.interest_at).toLocaleString('es-EC')}\n`);
      });
    }

    // Verificar prospectos que necesitan follow-up HOY
    console.log('═══ PROSPECTOS QUE NECESITAN FOLLOW-UP HOY ═══');
    
    const need24h = await databaseService.all(
      `SELECT COUNT(*) as count FROM aluna_prospect_followups
       WHERE followup_24h_sent_at IS NULL
         AND converted_at IS NULL
         AND interest_at <= NOW() - INTERVAL '24 hours'`,
      []
    );
    console.log(`⏰ Follow-up 24h pendientes: ${need24h[0]?.count || 0}`);

    const need3d = await databaseService.all(
      `SELECT COUNT(*) as count FROM aluna_prospect_followups
       WHERE followup_24h_sent_at IS NOT NULL
         AND followup_3d_sent_at IS NULL
         AND converted_at IS NULL
         AND followup_24h_sent_at <= NOW() - INTERVAL '72 hours'`,
      []
    );
    console.log(`⏰ Follow-up 3d pendientes: ${need3d[0]?.count || 0}\n`);

    console.log('✅ Auditoría completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
