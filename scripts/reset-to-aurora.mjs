import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function resetToAurora(phoneNumber) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');
    
    // Actualizar el agente activo a AURORA
    const result = await client.query(
      `UPDATE users 
       SET active_agent = $1, 
           updated_at = NOW() 
       WHERE phone_number = $2 
       RETURNING phone_number, active_agent, name`,
      ['AURORA', phoneNumber]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Usuario actualizado:', result.rows[0]);
      console.log('\n🎉 Aurora ahora responderá a los mensajes de este usuario');
    } else {
      console.log('⚠️ No se encontró usuario con ese número');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

// Obtener número de teléfono del argumento
const phoneNumber = process.argv[2] || '+593987770788';
console.log(`🔄 Reseteando agente a AURORA para: ${phoneNumber}\n`);

resetToAurora(phoneNumber);
