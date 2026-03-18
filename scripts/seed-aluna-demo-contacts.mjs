#!/usr/bin/env node
/**
 * 🎭 SEED - Contactos de Demo para Aluna Dashboard
 * 
 * Genera 27 contactos realistas con estados variados en el funnel
 * Para presentaciones de cliente - datos ficticios pero vendibles
 * 
 * @date 2026-03-18
 */

import databaseService from '../src/database/database.js';

// 🇪🇨 Datos realistas ecuatorianos
const NOMBRES = [
  'María José González', 'Carlos Andrés Pérez', 'Ana Lucía Moreno', 
  'Diego Fernando Sánchez', 'Gabriela Alejandra Torres', 'Luis Alberto Ramírez',
  'Carolina Isabel Castro', 'Roberto Javier Mendoza', 'Valentina Sofía Flores',
  'Miguel Ángel Herrera', 'Andrea Paola Jiménez', 'Sebastián David Ortiz',
  'Daniela Teresa Vargas', 'Fernando José Castillo', 'Mónica Cristina Delgado',
  'Juan Pablo Aguilar', 'Verónica Alejandra Silva', 'Patricio Xavier Ruiz',
  'Isabel Mariana Guzmán', 'Andrés Mauricio León', 'Claudia Fernanda Romero',
  'Eduardo Rafael Vega', 'Melissa Andrea Chávez', 'Ricardo Enrique Paredes',
  'Stephanie Nicole Campos', 'Javier Orlando Navarro', 'Natalia Soledad Reyes'
];

const EMPRESAS = [
  'TechVentures EC', 'Innovación Digital Quito', 'StartUp Solutions',
  'Digital Marketing Pro', 'Consultores Empresariales', 'Arquitectos Asociados',
  'Legal Advisors EC', 'Contadores Públicos CIA', 'Software House Latam',
  'E-Commerce Ecuador', 'Agencia Creativa 360', 'Inversiones Estratégicas',
  'Importadora del Pacífico', 'Distribuidora Nacional', 'Servicios Logísticos',
  'Academia de Idiomas', 'Centro de Capacitación', 'Asesoría Financiera Plus',
  'Desarrollo Web Studio', 'Marketing Digital Agency', 'Consultoría IT',
  'Producción Audiovisual', 'Diseño Gráfico Express', 'Comunicación Corporativa',
  'Comercio Exterior SA', 'Trading Internacional', 'Freelancer Independiente'
];

const DOMINIOS_EMAIL = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.com', 'icloud.com'
];

const MEMBERSHIP_TYPES = [
  'plan-5', 'plan-10', 'plan-15', 'plan-20', 'oficina-virtual'
];

const MONTHLY_FEES = {
  'plan-5': 99.00,
  'plan-10': 189.00,
  'plan-15': 269.00,
  'plan-20': 349.00,
  'oficina-virtual': 79.00
};

// 🎯 Distribución realista de estados para demo vendible
const STATUS_DISTRIBUTION = [
  // Parte alta del funnel (interesados recientes)
  { status: 'pending', count: 5 },
  { status: 'pending_payment', count: 3 },
  
  // Proceso de conversión (negociando/tour)
  { status: 'tour_scheduled', count: 4 },
  { status: 'negotiating', count: 3 },
  
  // Conversiones exitosas (LO MÁS IMPORTANTE PARA DEMO)
  { status: 'accepted', count: 2 },
  { status: 'active', count: 8 }, // Mayoría de miembros activos
  
  // Algunos inactivos (realismo)
  { status: 'cancelled', count: 1 },
  { status: 'expired', count: 1 }
];

/**
 * Genera teléfono ecuatoriano realista
 */
function generarTelefonoEC(index) {
  // Formato: +593 9X XXX XXXX (móvil Ecuador)
  const operadoras = ['98', '99', '96', '97', '95']; // Claro, Movistar, CNT
  const operadora = operadoras[index % operadoras.length];
  const numero = String(1000000 + index).padStart(7, '0');
  return `+593${operadora}${numero}`;
}

/**
 * Genera email a partir del nombre
 */
function generarEmail(nombre, index) {
  const partes = nombre.toLowerCase().split(' ');
  const primerNombre = partes[0];
  const apellido = partes[partes.length - 1];
  const dominio = DOMINIOS_EMAIL[index % DOMINIOS_EMAIL.length];
  
  const variaciones = [
    `${primerNombre}.${apellido}@${dominio}`,
    `${primerNombre}${apellido}@${dominio}`,
    `${primerNombre[0]}${apellido}@${dominio}`,
    `${apellido}.${primerNombre}@${dominio}`
  ];
  
  return variaciones[index % variaciones.length];
}

/**
 * Genera fecha de inicio random en los últimos 3 meses
 */
function generarFechaInicio(daysAgo) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - daysAgo);
  return fecha.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Genera timestamp de tour programado (próximos 7 días)
 */
function generarTourScheduled(daysAhead) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + daysAhead);
  fecha.setHours(10 + (daysAhead % 8), 0, 0, 0); // Entre 10am y 6pm
  return fecha.toISOString();
}

/**
 * Genera requerimientos especiales realistas
 */
const REQUERIMIENTOS = [
  'Necesito espacio silencioso para videollamadas',
  'Prefiero zona cerca de ventanas',
  'Requiero acceso 24/7 los fines de semana',
  'Necesito espacio para reuniones de equipo',
  'Importante tener buena señal de internet',
  'Prefiero área alejada del ruido',
  null, null, null // 30% sin requerimientos especiales
];

/**
 * 🎯 Crear 27 contactos de demo
 */
async function seedDemoContacts() {
  console.log('🎭 Iniciando seed de contactos demo para Aluna...\n');
  
  // Inicializar base de datos
  await databaseService.initialize();
  await databaseService.ensureInitialized();
  
  // 1. Verificar si ya existen contactos demo
  const existingCount = await databaseService.get(
    `SELECT COUNT(*) as count FROM membership_leads WHERE email LIKE '%demo%' OR notes LIKE '%DEMO%'`
  );
  
  if (existingCount?.count > 0) {
    console.log(`⚠️  Ya existen ${existingCount.count} contactos demo. ¿Deseas limpiarlos primero?`);
    // Para esta demo, vamos a limpiar automáticamente
    await databaseService.run(`DELETE FROM membership_leads WHERE notes LIKE '%DEMO SEED%'`);
    console.log('🗑️  Contactos demo anteriores limpiados\n');
  }
  
  let contactIndex = 0;
  let totalCreated = 0;
  
  // 2. Crear contactos según distribución de estados
  for (const { status, count } of STATUS_DISTRIBUTION) {
    console.log(`📊 Creando ${count} contactos en estado: ${status}`);
    
    for (let i = 0; i < count; i++) {
      const nombre = NOMBRES[contactIndex];
      const empresa = EMPRESAS[contactIndex];
      const telefono = generarTelefonoEC(contactIndex);
      const email = generarEmail(nombre, contactIndex);
      const membershipType = MEMBERSHIP_TYPES[contactIndex % MEMBERSHIP_TYPES.length];
      const monthlyFee = MONTHLY_FEES[membershipType];
      const daysAgo = Math.floor(Math.random() * 90); // Últimos 3 meses
      
      // Lógica condicional según estado
      let tourScheduled = null;
      let tourCompleted = false;
      let membershipActivated = false;
      let activationDate = null;
      let assignedTo = null;
      
      if (status === 'tour_scheduled') {
        tourScheduled = generarTourScheduled(contactIndex % 7 + 1);
        assignedTo = contactIndex % 2 === 0 ? 'Aluna' : 'Diego';
      }
      
      if (['negotiating', 'accepted', 'active'].includes(status)) {
        tourCompleted = true;
        tourScheduled = generarTourScheduled(-3); // Tour hace 3 días
        assignedTo = 'Aluna';
      }
      
      if (['active'].includes(status)) {
        membershipActivated = true;
        activationDate = generarFechaInicio(daysAgo);
      }
      
      const requerimientos = REQUERIMIENTOS[contactIndex % REQUERIMIENTOS.length];
      
      // PRIMERO: Asegurar que el usuario existe en tabla users
      await databaseService.run(`
        INSERT INTO users (phone_number, name, email, first_visit, free_trial_used)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (phone_number) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email
      `, [telefono, nombre, email, false, false]);
      
      // SEGUNDO: Insertar contacto en membership_leads
      const id = `ML-${String(contactIndex + 1).padStart(4, '0')}`;
      
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);
      
      const updatedAt = new Date();
      updatedAt.setDate(updatedAt.getDate() - Math.floor(daysAgo/2));
      
      await databaseService.run(`
        INSERT INTO membership_leads (
          id, user_phone, membership_type, start_date, client_name, 
          email, phone, company_name, special_requirements,
          tour_scheduled, tour_completed, membership_activated, activation_date,
          monthly_fee, status, assigned_to, notes, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
      `, [
        id,
        telefono,
        membershipType,
        status === 'active' ? activationDate : generarFechaInicio(30 - contactIndex),
        nombre,
        email,
        telefono,
        empresa,
        requerimientos,
        tourScheduled,
        tourCompleted,
        membershipActivated,
        activationDate,
        monthlyFee,
        status,
        assignedTo,
        'DEMO SEED - Contacto generado para presentación de cliente',
        createdAt.toISOString(),
        updatedAt.toISOString()
      ]);
      
      console.log(`  ✅ ${id} - ${nombre} (${membershipType}) - ${status}`);
      
      contactIndex++;
      totalCreated++;
    }
    
    console.log('');
  }
  
  // 3. Resumen final
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✨ SEED COMPLETADO: ${totalCreated} contactos creados\n`);
  
  // Verificar distribución
  const stats = await databaseService.all(`
    SELECT 
      status,
      COUNT(*) as count,
      SUM(monthly_fee) as total_revenue
    FROM membership_leads
    WHERE notes LIKE '%DEMO SEED%'
    GROUP BY status
    ORDER BY 
      CASE status
        WHEN 'active' THEN 1
        WHEN 'accepted' THEN 2
        WHEN 'negotiating' THEN 3
        WHEN 'tour_scheduled' THEN 4
        WHEN 'pending_payment' THEN 5
        WHEN 'pending' THEN 6
        ELSE 7
      END
  `);
  
  console.log('📊 DISTRIBUCIÓN POR ESTADO:\n');
  console.log('Estado              | Cantidad | Ingresos Potenciales');
  console.log('--------------------+----------+---------------------');
  
  let totalRevenue = 0;
  stats.forEach(({ status, count, total_revenue }) => {
    console.log(`${status.padEnd(19)} | ${String(count).padStart(8)} | $${String(total_revenue || 0).padStart(8)}`);
    if (['active', 'accepted'].includes(status)) {
      totalRevenue += parseFloat(total_revenue || 0);
    }
  });
  
  console.log('--------------------+----------+---------------------');
  console.log(`${'INGRESOS MENSUALES'.padEnd(19)} |          | $${String(totalRevenue.toFixed(2)).padStart(8)}`);
  console.log('\n🎉 Dashboard listo para demo de cliente!\n');
  
  process.exit(0);
}

// Ejecutar
seedDemoContacts().catch(error => {
  console.error('❌ Error en seed:', error);
  process.exit(1);
});
