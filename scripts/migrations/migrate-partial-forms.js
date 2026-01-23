/**
 * 🔄 Script de Migración: partial_forms → Tablas especializadas
 * Migra datos existentes de partial_forms a las nuevas tablas por agente
 */

import databaseService from '../database/database.js';

async function migratePartialForms() {
  console.log('\n🔄 ============================================');
  console.log('   MIGRACIÓN: partial_forms → Tablas Especializadas');
  console.log('============================================\n');

  await databaseService.initialize();

  try {
    // 1. Obtener todos los registros de partial_forms
    const allForms = await databaseService.all(
      'SELECT * FROM partial_forms ORDER BY cancelled_at DESC'
    );

    if (!allForms || allForms.length === 0) {
      console.log('✅ No hay datos para migrar en partial_forms\n');
      return { success: true, migrated: 0 };
    }

    console.log(`📊 Encontrados ${allForms.length} registros para migrar\n`);

    let migratedAurora = 0;
    let migratedAluna = 0;
    let migratedAxel = 0;
    let migratedPaula = 0;
    let errors = 0;

    // 2. Migrar cada registro según su form_type
    for (const form of allForms) {
      try {
        const formData = JSON.parse(form.form_data);
        const formType = form.form_type;

        console.log(`   Migrando: ${form.user_phone} (tipo: ${formType})`);

        switch (formType) {
          case 'reservation':
            // Migrar a aurora_partial_reservations
            await databaseService.run(
              `INSERT INTO aurora_partial_reservations (
                user_phone, service_type, date, start_time, end_time,
                duration_hours, guest_count, total_price, was_free,
                form_progress, cancellation_reason, cancelled_at, expires_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              ON CONFLICT (user_phone) DO NOTHING`,
              [
                form.user_phone,
                formData.serviceType || formData.service_type || 'sala_juntas',
                formData.date || null,
                formData.startTime || formData.start_time || null,
                formData.endTime || formData.end_time || null,
                formData.durationHours || formData.duration_hours || null,
                formData.guestCount || formData.guest_count || 0,
                formData.totalPrice || formData.total_price || 0,
                formData.wasFree || formData.was_free || false,
                'cancelled',
                formData.cancellationReason || 'Migrado de partial_forms',
                form.cancelled_at,
                form.expires_at
              ]
            );
            migratedAurora++;
            break;

          case 'membership':
            // Migrar a aluna_partial_memberships
            await databaseService.run(
              `INSERT INTO aluna_partial_memberships (
                user_phone, membership_type, start_date, client_name, email, phone,
                company_name, special_requirements, monthly_fee, form_progress,
                cancellation_reason, cancelled_at, expires_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              ON CONFLICT (user_phone) DO NOTHING`,
              [
                form.user_phone,
                formData.membershipType || formData.membership_type || 'basic',
                formData.startDate || formData.start_date || null,
                formData.clientName || formData.client_name || null,
                formData.email || null,
                formData.phone || null,
                formData.companyName || formData.company_name || null,
                formData.specialRequirements || formData.special_requirements || null,
                formData.monthlyFee || formData.monthly_fee || null,
                'cancelled',
                formData.cancellationReason || 'Migrado de partial_forms',
                form.cancelled_at,
                form.expires_at
              ]
            );
            migratedAluna++;
            break;

          case 'axel_quote':
          case 'quote':
            // Migrar a axel_partial_quotes
            await databaseService.run(
              `INSERT INTO axel_partial_quotes (
                user_phone, damage_type, client_name, vehicle_brand, vehicle_model,
                vehicle_year, email, phone, damage_description, photo_count,
                form_progress, cancellation_reason, cancelled_at, expires_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
              ON CONFLICT (user_phone) DO NOTHING`,
              [
                form.user_phone,
                formData.damageType || formData.damage_type || 'collision',
                formData.clientName || formData.client_name || null,
                formData.vehicleBrand || formData.vehicle_brand || null,
                formData.vehicleModel || formData.vehicle_model || null,
                formData.vehicleYear || formData.vehicle_year || null,
                formData.email || null,
                formData.phone || null,
                formData.damageDescription || formData.damage_description || null,
                formData.photoCount || formData.photo_count || 0,
                'cancelled',
                formData.cancellationReason || 'Migrado de partial_forms',
                form.cancelled_at,
                form.expires_at
              ]
            );
            migratedAxel++;
            break;

          case 'visit':
          case 'property_visit':
            // Migrar a paula_partial_visits
            await databaseService.run(
              `INSERT INTO paula_partial_visits (
                user_phone, property_code, property_name, property_address,
                date, start_time, client_name, client_email, client_phone,
                form_progress, cancellation_reason, cancelled_at, expires_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              ON CONFLICT (user_phone) DO NOTHING`,
              [
                form.user_phone,
                formData.propertyCode || formData.property_code || 'UNKNOWN',
                formData.propertyName || formData.property_name || null,
                formData.propertyAddress || formData.property_address || null,
                formData.date || null,
                formData.startTime || formData.start_time || null,
                formData.clientName || formData.client_name || null,
                formData.clientEmail || formData.client_email || null,
                formData.clientPhone || formData.client_phone || null,
                'cancelled',
                formData.cancellationReason || 'Migrado de partial_forms',
                form.cancelled_at,
                form.expires_at
              ]
            );
            migratedPaula++;
            break;

          default:
            console.log(`   ⚠️  Tipo desconocido: ${formType} - manteniendo en partial_forms`);
        }
      } catch (error) {
        console.error(`   ❌ Error migrando ${form.user_phone}:`, error.message);
        errors++;
      }
    }

    // 3. Resumen de migración
    console.log('\n📊 ============================================');
    console.log('   RESUMEN DE MIGRACIÓN');
    console.log('============================================');
    console.log(`   ✅ Aurora (reservas):    ${migratedAurora}`);
    console.log(`   ✅ Aluna (membresías):   ${migratedAluna}`);
    console.log(`   ✅ Axel (cotizaciones):  ${migratedAxel}`);
    console.log(`   ✅ Paula (visitas):      ${migratedPaula}`);
    console.log(`   ❌ Errores:              ${errors}`);
    console.log(`   📊 Total migrado:        ${migratedAurora + migratedAluna + migratedAxel + migratedPaula}`);
    console.log('============================================\n');

    // 4. Opcionalmente, hacer backup de partial_forms
    console.log('💾 Creando tabla de respaldo...');
    await databaseService.run(`
      CREATE TABLE IF NOT EXISTS partial_forms_backup AS 
      SELECT * FROM partial_forms
    `);
    console.log('✅ Backup creado: partial_forms_backup\n');

    // 5. NO eliminamos partial_forms aún (por seguridad)
    console.log('⚠️  IMPORTANTE: partial_forms NO se eliminó (mantener como respaldo)');
    console.log('   Para eliminarla manualmente después de verificar:\n');
    console.log('   DROP TABLE partial_forms;\n');

    return {
      success: true,
      migrated: migratedAurora + migratedAluna + migratedAxel + migratedPaula,
      aurora: migratedAurora,
      aluna: migratedAluna,
      axel: migratedAxel,
      paula: migratedPaula,
      errors
    };

  } catch (error) {
    console.error('❌ Error en migración:', error);
    return { success: false, error: error.message };
  }
}

// Ejecutar migración si se corre directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migratePartialForms()
    .then((result) => {
      if (result.success) {
        console.log('✅ Migración completada exitosamente\n');
        process.exit(0);
      } else {
        console.error('❌ Migración falló:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

export default migratePartialForms;
