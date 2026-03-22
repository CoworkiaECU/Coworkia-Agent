/**
 * Inserta a Javier Troya como lead real en insurance_leads
 */
import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  // Ensure user exists
  await pool.query(`
    INSERT INTO users (phone_number, name, email, first_visit, free_trial_used)
    VALUES ($1,$2,$3,false,false)
    ON CONFLICT (phone_number) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email
  `, ['+593983765432', 'Javier Troya', 'javier.troya@gmail.com']);
  console.log('✅ Usuario Javier Troya upserted');

  // Insert as real lead
  const r = await pool.query(`
    INSERT INTO insurance_leads
      (id, quote_code, user_phone, client_name, email, phone, insurance_type,
       vehicle_brand, vehicle_model, vehicle_year, commercial_value, quoted_premium,
       status, notes, quote_sent_at, created_at)
    VALUES
      ('INS-JT-001','ADR-JT-001','+593983765432','Javier Troya','javier.troya@gmail.com',
       '+593983765432','Seguro para Vehículos livianos',
       'Hyundai','Creta',2022,16000,830.00,'quoted',
       'Lead real · Hyundai Creta 2022 · Prima $830/año · VAZ Seguros',
       NOW() - INTERVAL '1 day',
       NOW() - INTERVAL '1 day')
    ON CONFLICT (quote_code) DO UPDATE SET
      client_name=EXCLUDED.client_name,
      email=EXCLUDED.email,
      quoted_premium=EXCLUDED.quoted_premium,
      status=EXCLUDED.status,
      notes=EXCLUDED.notes
    RETURNING quote_code, client_name, status, quoted_premium
  `);
  console.log('✅ Javier Troya en insurance_leads:', r.rows[0]);

  const cnt = await pool.query('SELECT COUNT(*) as n FROM insurance_leads');
  console.log('📊 Total insurance_leads:', cnt.rows[0].n);
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
