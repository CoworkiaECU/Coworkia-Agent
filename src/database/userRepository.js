/**
 * 👤 User Repository - Operaciones de base de datos para usuarios
 */

import databaseService from './database.js';

class UserRepository {
  /**
   * 🔍 Busca un usuario por su número de teléfono
   */
  async findByPhone(phoneNumber) {
    console.log('[USER-REPO DEBUG] Llamando ensureInitialized()');
    databaseService.ensureInitialized();
    console.log('[USER-REPO DEBUG] ensureInitialized() completado');
    
    const query = `
      SELECT * FROM users 
      WHERE phone_number = ?
    `;
    
    console.log('[USER-REPO DEBUG] Antes de databaseService.get()');
    const user = await databaseService.get(query, [phoneNumber]);
    console.log('[USER-REPO DEBUG] Después de get(), user:', user ? 'FOUND' : 'NULL');
    
    if (user) {
      // Convertir valores SQLite a JavaScript
      user.first_visit = Boolean(user.first_visit);
      user.free_trial_used = Boolean(user.free_trial_used);
    }
    
    console.log('[USER-REPO DEBUG] Retornando user:', user ? 'FOUND' : 'NULL');
    return user;
  }

  /**
   * 💾 Crea o actualiza un usuario
   */
  async createOrUpdate(phoneNumber, userData) {
    databaseService.ensureInitialized();
    
    const existing = await this.findByPhone(phoneNumber);
    
    if (existing) {
      return await this.update(phoneNumber, userData);
    } else {
      return await this.create(phoneNumber, userData);
    }
  }

  /**
   * ✨ Crea un nuevo usuario
   */
  async create(phoneNumber, userData) {
    databaseService.ensureInitialized();
    
    const {
      name = null,
      email = null,
      whatsapp_display_name = null,
      first_visit = true,
      free_trial_used = false,
      free_trial_date = null,
      conversation_count = 0,
      last_message_at = new Date().toISOString()
    } = userData;

    const query = `
      INSERT INTO users (
        phone_number, name, email, whatsapp_display_name,
        first_visit, free_trial_used, free_trial_date,
        conversation_count, last_message_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      phoneNumber, name, email, whatsapp_display_name,
      first_visit ? 1 : 0, free_trial_used ? 1 : 0, free_trial_date,
      conversation_count, last_message_at
    ];

    await databaseService.run(query, params);
    return await this.findByPhone(phoneNumber);
  }

  /**
   * 🔄 Actualiza un usuario existente
   */
  async update(phoneNumber, userData) {
    databaseService.ensureInitialized();
    
    const updates = [];
    const params = [];
    
    // Construir query dinámicamente
    Object.entries(userData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'phone_number') {
        updates.push(`${key} = ?`);
        
        // Convertir booleanos para SQLite
        if (typeof value === 'boolean') {
          params.push(value ? 1 : 0);
        } else {
          params.push(value);
        }
      }
    });

    if (updates.length === 0) {
      return await this.findByPhone(phoneNumber);
    }

    // Agregar updated_at automático
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(phoneNumber);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE phone_number = ?
    `;

    await databaseService.run(query, params);
    return await this.findByPhone(phoneNumber);
  }

  /**
   * 📊 Obtiene estadísticas de usuarios
   */
  async getStats() {
    databaseService.ensureInitialized();
    
    const stats = await databaseService.all(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN first_visit = 1 THEN 1 END) as new_users,
        COUNT(CASE WHEN free_trial_used = 1 THEN 1 END) as trial_used_users,
        AVG(conversation_count) as avg_conversations
      FROM users
    `);

    return stats[0];
  }

  /**
   * 🔍 Busca usuarios por email
   */
  async findByEmail(email) {
    databaseService.ensureInitialized();
    
    const query = `
      SELECT * FROM users 
      WHERE email = ?
    `;
    
    return await databaseService.get(query, [email]);
  }

  /**
   * 📋 Lista todos los usuarios con paginación
   */
  async list(limit = 50, offset = 0) {
    databaseService.ensureInitialized();
    
    const query = `
      SELECT * FROM users 
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const users = await databaseService.all(query, [limit, offset]);
    
    // Convertir valores SQLite a JavaScript
    return users.map(user => ({
      ...user,
      first_visit: Boolean(user.first_visit),
      free_trial_used: Boolean(user.free_trial_used)
    }));
  }
}

export default new UserRepository();