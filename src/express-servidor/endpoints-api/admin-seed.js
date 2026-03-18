/**
 * 🎭 API Endpoint - Seed de Contactos Demo para Aluna
 * URL: GET /api/admin/seed-demo-contacts
 * 
 * Crea 27 contactos realistas para presentaciones de cliente
 * ⚠️ SOLO PARA DESARROLLO/DEMO
 */

import express from 'express';
import databaseService from '../../database/database.js';

const router = express.Router();

// 🇪🇨 Datos realistas ecuatorianos (27 contactos)
const DEMO_DATA = [
  // ACTIVE (8 miembros) - Ingreso mensual real
  { nombre: 'María José González', empresa: 'TechVentures EC', membership: 'plan-10', fee: 189, status: 'active', daysAgo: 45, activated: true },
  { nombre: 'Carlos Andrés Pérez', empresa: 'Innovación Digital Quito', membership: 'plan-15', fee: 269, status: 'active', daysAgo: 60, activated: true },
  { nombre: 'Ana Lucía Moreno', empresa: 'StartUp Solutions', membership: 'plan-5', fee: 99, status: 'active', daysAgo: 30, activated: true },
  { nombre: 'Diego Fernando Sánchez', empresa: 'Digital Marketing Pro', membership: 'plan-20', fee: 349, status: 'active', daysAgo: 75, activated: true },
  { nombre: 'Gabriela Alejandra Torres', empresa: 'Consultores Empresariales', membership: 'plan-10', fee: 189, status: 'active', daysAgo: 20, activated: true },
  { nombre: 'Luis Alberto Ramírez', empresa: 'Arquitectos Asociados', membership: 'plan-15', fee: 269, status: 'active', daysAgo: 50, activated: true },
  { nombre: 'Carolina Isabel Castro', empresa: 'Legal Advisors EC', membership: 'plan-5', fee: 99, status: 'active', daysAgo: 15, activated: true },
  { nombre: 'Roberto Javier Mendoza', empresa: 'Contadores Públicos CIA', membership: 'oficina-virtual', fee: 79, status: 'active', daysAgo: 40, activated: true },
  
  // TOUR SCHEDULED (4 contactos) - Potencial conversión
  { nombre: 'Valentina Sofía Flores', empresa: 'Software House Latam', membership: 'plan-15', fee: 269, status: 'tour_scheduled', daysAgo: 5, tour: 2 },
  { nombre: 'Miguel Ángel Herrera', empresa: 'E-Commerce Ecuador', membership: 'plan-10', fee: 189, status: 'tour_scheduled', daysAgo: 3, tour: 1 },
  { nombre: 'Andrea Paola Jiménez', empresa: 'Agencia Creativa 360', membership: 'plan-20', fee: 349, status: 'tour_scheduled', daysAgo: 7, tour: 3 },
  { nombre: 'Sebastián David Ortiz', empresa: 'Inversiones Estratégicas', membership: 'plan-10', fee: 189, status: 'tour_scheduled', daysAgo: 4, tour: 4 },
  
  // PENDING (5 contactos) - Leads nuevos
  { nombre: 'Daniela Teresa Vargas', empresa: 'Importadora del Pacífico', membership: 'plan-5', fee: 99, status: 'pending', daysAgo: 1 },
  { nombre: 'Fernando José Castillo', empresa: 'Distribuidora Nacional', membership: 'plan-10', fee: 189, status: 'pending', daysAgo: 2 },
  { nombre: 'Mónica Cristina Delgado', empresa: 'Servicios Logísticos', membership: 'oficina-virtual', fee: 79, status: 'pending', daysAgo: 1 },
  { nombre: 'Juan Pablo Aguilar', empresa: 'Academia de Idiomas', membership: 'plan-15', fee: 269, status: 'pending', daysAgo: 3 },
  { nombre: 'Verónica Alejandra Silva', empresa: 'Centro de Capacitación', membership: 'plan-10', fee: 189, status: 'pending', daysAgo: 2 },
  
  // NEGOTIATING (3 contactos) - Cierre cercano
  { nombre: 'Patricio Xavier Ruiz', empresa: 'Asesoría Financiera Plus', membership: 'plan-20', fee: 349, status: 'negotiating', daysAgo: 10 },
  { nombre: 'Isabel Mariana Guzmán', empresa: 'Desarrollo Web Studio', membership: 'plan-15', fee: 269, status: 'negotiating', daysAgo: 8 },
  { nombre: 'Andrés Mauricio León', empresa: 'Marketing Digital Agency', membership: 'plan-10', fee: 189, status: 'negotiating', daysAgo: 12 },
  
  // PENDING PAYMENT (3 contactos) - Esperando pago inicial
  { nombre: 'Claudia Fernanda Romero', empresa: 'Consultoría IT', membership: 'plan-10', fee: 189, status: 'pending_payment', daysAgo: 6 },
  { nombre: 'Eduardo Rafael Vega', empresa: 'Producción Audiovisual', membership: 'plan-5', fee: 99, status: 'pending_payment', daysAgo: 5 },
  { nombre: 'Melissa Andrea Chávez', empresa: 'Diseño Gráfico Express', membership: 'oficina-virtual', fee: 79, status: 'pending_payment', daysAgo: 7 },
  
  // ACCEPTED (2 contactos) - Aceptados, empiezan pronto
  { nombre: 'Ricardo Enrique Paredes', empresa: 'Comunicación Corporativa', membership: 'plan-15', fee: 269, status: 'accepted', daysAgo: 4 },
  { nombre: 'Stephanie Nicole Campos', empresa: 'Comercio Exterior SA', membership: 'plan-10', fee: 189, status: 'accepted', daysAgo: 3 },
  
  // CANCELLED/EXPIRED (2 contactos) - Realismo
  { nombre: 'Javier Orlando Navarro', empresa: 'Trading Internacional', membership: 'plan-5', fee: 99, status: 'cancelled', daysAgo: 25 },
  { nombre: 'Natalia Soledad Reyes', empresa: 'Freelancer Independiente', membership: 'oficina-virtual', fee: 79, status: 'expired', daysAgo: 35 }
];

/**
 * Genera teléfono ecuatoriano realista
 */
function generarTelefono(index) {
  const operadoras = ['98', '99', '96', '97', '95'];
  const operadora = operadoras[index % operadoras.length];
  const numero = String(3000000 + index).padStart(7, '0');
  return `+593${operadora}${numero}`;
}

/**
 * Genera email a partir del nombre
 */
function generarEmail(nombre, index) {
  const dominios = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.com'];
  const partes = nombre.toLowerCase().split(' ');
  const primerNombre = partes[0];
  const apellido = partes[partes.length - 1];
  const dominio = dominios[index % dominios.length];
  
  return `${primerNombre}.${apellido}@${dominio}`;
}

/**
 * Genera fecha pasada
 */
function generarFechaPasada(daysAgo) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - daysAgo);
  return fecha.toISOString().split('T')[0];
}

/**
 * Genera timestamp de tour futuro
 */
function generarTourFuturo(daysAhead) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + daysAhead);
  fecha.setHours(10 + (daysAhead * 2) % 8, 0, 0, 0);
  return fecha.toISOString();
}

/**
 * 🎯 ENDPOINT: Seed de contactos demo
 */
router.get('/seed-demo-contacts', async (req, res) => {
  try {
    console.log('🎭 [ADMIN] Iniciando seed de contactos demo...');
    
    await databaseService.ensureInitialized();
    
    // 1. Limpiar contactos demo anteriores
    const deleted = await databaseService.run(
      `DELETE FROM membership_leads WHERE notes LIKE '%DEMO SEED%'`
    );
    console.log(`🗑️ Contactos demo anteriores eliminados: ${deleted.changes || 0}`);
    
    const created = [];
    
    // 2. Crear los 27 contactos
    for (let i = 0; i < DEMO_DATA.length; i++) {
      const contact = DEMO_DATA[i];
      const telefono = generarTelefono(i);
      const email = generarEmail(contact.nombre, i);
      const id = `ML-${String(i + 1).padStart(4, '0')}`;
      
      // Crear usuario primero
      await databaseService.run(`
        INSERT INTO users (phone_number, name, email, first_visit, free_trial_used)
        VALUES ($1, $2, $3, false, false)
        ON CONFLICT (phone_number) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email
      `, [telefono, contact.nombre, email]);
      
      // Datos según estado
      let tourScheduled = null;
      let tourCompleted = false;
      let membershipActivated = contact.activated || false;
      let activationDate = membershipActivated ? generarFechaPasada(contact.daysAgo) : null;
      let assignedTo = null;
      
      if (contact.status === 'tour_scheduled') {
        tourScheduled = generarTourFuturo(contact.tour);
        assignedTo = i % 2 === 0 ? 'Aluna' : 'Diego';
      }
      
      if (['negotiating', 'accepted', 'active'].includes(contact.status)) {
        tourCompleted = true;
        assignedTo = 'Aluna';
      }
      
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - contact.daysAgo);
      
      const updatedAt = new Date();
      updatedAt.setDate(updatedAt.getDate() - Math.floor(contact.daysAgo / 2));
      
      // Insertar membership lead
      await databaseService.run(`
        INSERT INTO membership_leads (
          id, user_phone, membership_type, start_date, client_name,
          email, phone, company_name, tour_scheduled, tour_completed,
          membership_activated, activation_date, monthly_fee, status,
          assigned_to, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      `, [
        id, telefono, contact.membership, activationDate || generarFechaPasada(10),
        contact.nombre, email, telefono, contact.empresa, tourScheduled, tourCompleted,
        membershipActivated, activationDate, contact.fee, contact.status,
        assignedTo, 'DEMO SEED - Contacto generado para presentación de cliente',
        createdAt.toISOString(), updatedAt.toISOString()
      ]);
      
      created.push({ id, nombre: contact.nombre, status: contact.status });
    }
    
    // 3. Estadísticas
    const stats = await databaseService.all(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(monthly_fee) as revenue
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
    
    const totalActive = stats
      .filter(s => ['active', 'accepted'].includes(s.status))
      .reduce((sum, s) => sum + parseFloat(s.revenue || 0), 0);
    
    console.log(`✅ [ADMIN] ${created.length} contactos demo creados`);
    console.log(`💰 Ingresos mensuales (activos): $${totalActive.toFixed(2)}`);
    
    return res.json({
      ok: true,
      message: `${created.length} contactos demo creados exitosamente`,
      stats: {
        total: created.length,
        distribution: stats,
        monthlyRevenue: totalActive
      },
      contacts: created
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Error en seed:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;
