import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

const userId = "+593992320262";

async function cleanup() {
  try {
    // 1. Limpiar reservas
    const res1 = await pool.query("DELETE FROM reservations WHERE user_phone = $1", [userId]);
    console.log("✅ Reservas eliminadas:", res1.rowCount);
    
    // 2. Limpiar confirmaciones pendientes
    const res2 = await pool.query("DELETE FROM pending_confirmations WHERE user_phone = $1", [userId]);
    console.log("✅ Confirmaciones pendientes eliminadas:", res2.rowCount);
    
    // 3. Limpiar formularios parciales
    const res3 = await pool.query("DELETE FROM partial_forms WHERE user_phone = $1", [userId]);
    console.log("✅ Formularios parciales eliminados:", res3.rowCount);
    
    // 4. Resetear perfil
    const res4 = await pool.query(`
      UPDATE users 
      SET active_agent = 'AURORA', 
          active_agents = '{}', 
          context_preferences = '{}',
          transaction_started_at = NULL,
          transaction_agent = NULL,
          updated_at = NOW() 
      WHERE phone_number = $1
    `, [userId]);
    console.log("✅ Perfil reseteado (activeAgent=AURORA):", res4.rowCount);
    
    // 5. Limpiar interacciones
    const res5 = await pool.query("DELETE FROM interactions WHERE user_phone = $1", [userId]);
    console.log("✅ Interacciones eliminadas:", res5.rowCount);
    
    console.log("\n🎉 Limpieza completada para:", userId);
    
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error("❌ Error:", e.message);
    process.exit(1);
  }
}

cleanup();
