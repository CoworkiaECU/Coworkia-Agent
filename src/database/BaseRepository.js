/**
 * 🏗️ BASE REPOSITORY
 *
 * Clase base con operaciones CRUD genéricas compartidas por los repositories
 * de leads de agentes (adriana, gabi, enzo, paula).
 *
 * Métodos disponibles:
 *  - getByCode(code)
 *  - getByUser(userId)
 *  - updateStatus(code, status, notes?)
 *  - scheduleMeeting(code, date, opts?)
 *  - getByType(typeColumn, value)
 */

import databaseService from './database.js';

export class BaseRepository {
  /**
   * @param {Object} opts
   * @param {string} opts.table        - Nombre de la tabla en PostgreSQL
   * @param {string} opts.codeColumn   - Columna del código único (ej: 'quote_code')
   * @param {string} [opts.userColumn] - Columna del usuario (default: 'user_phone')
   * @param {string} opts.logPrefix    - Prefijo para logs (ej: 'ADRIANA-REPO')
   */
  constructor({ table, codeColumn, userColumn = 'user_phone', logPrefix }) {
    this.table      = table;
    this.codeColumn = codeColumn;
    this.userColumn = userColumn;
    this.logPrefix  = logPrefix;
  }

  /**
   * 🔍 Obtener registro por código único
   */
  async getByCode(code) {
    await databaseService.ensureInitialized();
    const result = await databaseService.get(
      `SELECT * FROM ${this.table} WHERE ${this.codeColumn} = $1`,
      [code]
    );
    return result || null;
  }

  /**
   * 🔍 Obtener registros por usuario (ordenados por más reciente)
   */
  async getByUser(userId) {
    await databaseService.ensureInitialized();
    const results = await databaseService.all(
      `SELECT * FROM ${this.table} WHERE ${this.userColumn} = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return results || [];
  }

  /**
   * 🔄 Actualizar estado de un registro
   * @param {string}      code
   * @param {string}      status
   * @param {string|null} [notes]
   */
  async updateStatus(code, status, notes = null) {
    await databaseService.ensureInitialized();

    const params = [status, code];
    let query = `UPDATE ${this.table} SET status = $1, updated_at = CURRENT_TIMESTAMP`;

    if (notes) {
      query += `, notes = $3`;
      params.push(notes);
    }

    query += ` WHERE ${this.codeColumn} = $2`;

    await databaseService.run(query, params);
    console.log(`[${this.logPrefix}] ✅ Status actualizado: ${code} → ${status}`);
  }

  /**
   * 📅 Agendar reunión / visita
   * @param {string} code
   * @param {string} date
   * @param {Object} [opts]
   * @param {string} [opts.dateColumn='meeting_scheduled'] - Columna donde guardar la fecha
   * @param {string} [opts.status='meeting_scheduled']    - Estado resultante
   */
  async scheduleMeeting(code, date, { dateColumn = 'meeting_scheduled', status = 'meeting_scheduled' } = {}) {
    await databaseService.ensureInitialized();

    await databaseService.run(
      `UPDATE ${this.table}
       SET ${dateColumn} = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE ${this.codeColumn} = $3`,
      [date, status, code]
    );

    console.log(`[${this.logPrefix}] 📅 Reunión/visita agendada: ${code}`);
  }

  /**
   * 📋 Obtener registros por tipo (columna configurable)
   * @param {string} typeColumn - Nombre de la columna de tipo
   * @param {string} value      - Valor a filtrar
   */
  async getByType(typeColumn, value) {
    await databaseService.ensureInitialized();
    const results = await databaseService.all(
      `SELECT * FROM ${this.table} WHERE ${typeColumn} = $1 ORDER BY created_at DESC`,
      [value]
    );
    return results || [];
  }
}
