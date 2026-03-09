/**
 * 🌱 Seed data para membership_leads - Proformas de prueba
 * Script para poblar la base de datos con datos de ejemplo del dashboard de Aluna
 * 
 * Ejecutar: node scripts/seed-aluna-proformas.mjs
 */

import dotenv from 'dotenv';
dotenv.config();

import databaseService from '../src/database/database.js';

const SAMPLE_PROFORMAS = [
  {
    membership_code: 'PRO-2026-0001',
    user_phone: '+593987654321',
    membership_type: 'plan_10',
    start_date: '2026-04-01',
    client_name: 'María Fernanda Gómez',
    email: 'maria.gomez@gmail.com',
    phone: '+593987654321',
    company_name: 'Diseño Creativo Studio',
    monthly_fee: 140.00,
    status: 'pending'
  },
  {
    membership_code: 'PRO-2026-0002',
    user_phone: '+593998765432',
    membership_type: 'plan_20',
    start_date: '2026-03-15',
    client_name: 'Carlos Alberto Mendoza',
    email: 'carlos.mendoza@outlook.com',
    phone: '+593998765432',
    company_name: 'Tech Innovations EC',
    monthly_fee: 220.00,
    status: 'active'
  },
  {
    membership_code: 'PRO-2026-0003',
    user_phone: '+593976543210',
    membership_type: 'oficina_virtual',
    start_date: '2026-03-10',
    client_name: 'Ana Patricia Ruiz',
    email: 'ana.ruiz@coworkia.ec',
    phone: '+593976543210',
    company_name: 'Consulting Group',
    monthly_fee: 30.00,
    status: 'active'
  },
  {
    membership_code: 'PRO-2026-0004',
    user_phone: '+593965432109',
    membership_type: 'plan_10',
    start_date: '2026-03-20',
    client_name: 'Roberto Javier Castro',
    email: 'rjcastro@yahoo.com',
    phone: '+593965432109',
    monthly_fee: 140.00,
    status: 'pending_payment'
  },
  {
    membership_code: 'PRO-2026-0005',
    user_phone: '+593954321098',
    membership_type: 'plan_20',
    start_date: '2026-04-05',
    client_name: 'Laura Beatriz Ortiz',
    email: 'laura.ortiz@empresarial.com',
    phone: '+593954321098',
    company_name: 'Marketing Pro',
    monthly_fee: 220.00,
    status: 'pending'
  },
  {
    membership_code: 'PRO-2026-0006',
    user_phone: '+593943210987',
    membership_type: 'plan_10',
    start_date: '2026-02-28',
    client_name: 'Diego Andrés Flores',
    email: 'diego.flores@gmail.com',
    phone: '+593943210987',
    company_name: 'Freelance Developer',
    monthly_fee: 140.00,
    status: 'active'
  },
  {
    membership_code: 'PRO-2026-0007',
    user_phone: '+593932109876',
    membership_type: 'oficina_virtual',
    start_date: '2026-03-12',
    client_name: 'Gabriela Estefanía Morales',
    email: 'gaby.morales@hotmail.com',
    phone: '+593932109876',
    company_name: 'Legal Advisors',
    monthly_fee: 30.00,
    status: 'tour_scheduled'
  },
  {
    membership_code: 'PRO-2026-0008',
    user_phone: '+593921098765',
    membership_type: 'plan_20',
    start_date: '2026-03-08',
    client_name: 'Fernando José Salazar',
    email: 'fernando.salazar@empresa.ec',
    phone: '+593921098765',
    company_name: 'Arquitectura & Diseño',
    monthly_fee: 220.00,
    status: 'cancelled'
  },
  {
    membership_code: 'PRO-2026-0009',
    user_phone: '+593910987654',
    membership_type: 'plan_10',
    start_date: '2026-03-25',
    client_name: 'Sofía Carolina Vega',
    email: 'sofia.vega@gmail.com',
    phone: '+593910987654',
    company_name: 'Content Creator',
    monthly_fee: 140.00,
    status: 'negotiating'
  },
  {
    membership_code: 'PRO-2026-0010',
    user_phone: '+593909876543',
    membership_type: 'plan_20',
    start_date: '2026-04-10',
    client_name: 'Manuel Alejandro Torres',
    email: 'manuel.torres@outlook.com',
    phone: '+593909876543',
    company_name: 'Fotografía Profesional',
    monthly_fee: 220.00,
    status: 'accepted'
  }
];

async function seedProformas() {
  try {
    console.log('🌱 Iniciando seed de proformas de Aluna...\n');
    
    await databaseService.initialize();
    console.log('✅ Base de datos inicializada\n');
    
    // Verificar si ya hay datos
    const existing = await databaseService.get(
      'SELECT COUNT(*) as count FROM membership_leads'
    );
    
    if (existing.count > 0) {
      console.log(`⚠️  Ya existen ${existing.count} proformas en la base de datos.`);
      console.log('¿Deseas continuar y agregar más datos? (Ctrl+C para cancelar)\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('� Creando usuarios primero...\n');
    
    // Crear usuarios para cada proforma
    const uniquePhones = [...new Set(SAMPLE_PROFORMAS.map(p => p.user_phone))];
    let usersCreated = 0;
    
    for (const phone of uniquePhones) {
      try {
        // Verificar si el usuario ya existe
        const existingUser = await databaseService.get(
          'SELECT phone_number FROM users WHERE phone_number = $1',
          [phone]
        );
        
        if (!existingUser) {
          const proforma = SAMPLE_PROFORMAS.find(p => p.user_phone === phone);
          await databaseService.run(
            `INSERT INTO users (phone_number, name, created_at) 
             VALUES ($1, $2, NOW())`,
            [phone, proforma.client_name]
          );
          usersCreated++;
          console.log(`  ✅ Usuario creado: ${phone} - ${proforma.client_name}`);
        } else {
          console.log(`  ⏭️  Usuario ya existe: ${phone}`);
        }
      } catch (error) {
        console.error(`  ❌ Error creando usuario ${phone}:`, error.message);
      }
    }
    
    console.log(`\n✨ ${usersCreated} usuarios nuevos creados\n`);
    console.log('�📝 Insertando proformas de prueba...\n');
    
    let insertedCount = 0;
    for (const proforma of SAMPLE_PROFORMAS) {
      try {
        const id = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await databaseService.run(
          `INSERT INTO membership_leads (
            id, membership_code, user_phone, membership_type,
            start_date, client_name, email, phone,
            company_name, monthly_fee, status, 
            quote_sent_at, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
          [
            id,
            proforma.membership_code,
            proforma.user_phone,
            proforma.membership_type,
            proforma.start_date,
            proforma.client_name,
            proforma.email,
            proforma.phone,
            proforma.company_name || null,
            proforma.monthly_fee,
            proforma.status
          ]
        );
        
        insertedCount++;
        console.log(`  ✅ ${proforma.membership_code} - ${proforma.client_name} ($${proforma.monthly_fee})`);
        
        // Pequeño delay para evitar IDs duplicados
        await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (error) {
        console.error(`  ❌ Error insertando ${proforma.membership_code}:`, error.message);
      }
    }
    
    console.log(`\n✨ Seed completado: ${insertedCount}/${SAMPLE_PROFORMAS.length} proformas insertadas\n`);
    
    // Mostrar resumen
    const stats = await databaseService.get(
      `SELECT 
        COUNT(*) as total,
        SUM(monthly_fee) as revenue
      FROM membership_leads`
    );
    
    const byStatus = await databaseService.all(
      `SELECT status, COUNT(*) as count 
       FROM membership_leads 
       GROUP BY status 
       ORDER BY count DESC`
    );
    
    console.log('📊 RESUMEN:');
    console.log(`   Total proformas: ${stats.total}`);
    console.log(`   Revenue potencial: $${parseFloat(stats.revenue).toFixed(2)}/mes`);
    console.log('\n   Por estado:');
    byStatus.forEach(s => {
      console.log(`   - ${s.status}: ${s.count}`);
    });
    
    console.log('\n🚀 Dashboard listo: https://coworkia-agent-e97d15dac56f.herokuapp.com/aluna-proformas.html');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

// Ejecutar seed
seedProformas();
