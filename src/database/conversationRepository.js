/**
 * 💬 Conversation Repository - Sistema Unificado de Conversaciones Multi-Agente
 * 
 * Arquitectura de nueva generación para gestionar conversaciones por contexto/tema
 * Soporta todos los agentes: Aurora, Axel, Gaby, Enzo, Adriana, Aluna, Ángela
 * 
 * FEATURES:
 * - Separación de conversaciones por tema/contexto
 * - Almacenamiento de archivos (imágenes, PDFs)
 * - Tracking de temas activos por usuario
 * - Historial estructurado por agente
 * - Metadata extensible para cada mensaje
 * 
 * @version 1.0.0
 * @author Coworkia Engineering Team
 */

import databaseService from './database.js';
import { v4 as uuidv4 } from 'uuid';

class ConversationRepository {
  
  /**
   * 💾 Guarda un mensaje en la conversación
   * 
   * @param {object} params - Parámetros del mensaje
   * @param {string} params.userPhone - Teléfono del usuario
   * @param {string} params.agent - Código del agente (axel, aurora, gaby, etc)
   * @param {string} params.topic - Tema de conversación (collision_quote, reservation, consulting, etc)
   * @param {string} params.role - Rol del mensaje (user, assistant, system)
   * @param {string} params.content - Contenido del mensaje
   * @param {string} [params.sessionId] - ID de sesión (se genera automáticamente si no existe)
   * @param {object} [params.metadata] - Metadata adicional (formData, images, pdfs, etc)
   * @param {number} [params.parentMessageId] - ID del mensaje padre (para hilos)
   * @returns {Promise<object>} Mensaje guardado con su ID
   */
  async saveMessage({ userPhone, agent, topic, role, content, sessionId = null, metadata = {}, parentMessageId = null }) {
    databaseService.ensureInitialized();
    
    try {
      // Generar sessionId si no existe
      const actualSessionId = sessionId || uuidv4();
      
      const query = `
        INSERT INTO agent_conversations (
          user_phone, agent, conversation_topic, session_id,
          role, content, metadata, parent_message_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        userPhone,
        agent.toLowerCase(),
        topic,
        actualSessionId,
        role,
        content,
        JSON.stringify(metadata),
        parentMessageId
      ];
      
      const result = await databaseService.run(query, params);
      
      // Actualizar o crear tema activo
      await this.updateActiveTopic({
        userPhone,
        agent,
        topic,
        sessionId: actualSessionId,
        status: 'active'
      });
      
      console.log(`[CONV-REPO] ✅ Mensaje guardado: ${agent}/${topic} para ${userPhone}`);
      
      return {
        id: result.lastID,
        sessionId: actualSessionId,
        success: true
      };
      
    } catch (error) {
      console.error('[CONV-REPO] ❌ Error guardando mensaje:', error);
      throw error;
    }
  }
  
  /**
   * 📖 Obtiene conversación por tema específico
   * 
   * @param {string} userPhone - Teléfono del usuario
   * @param {string} agent - Código del agente
   * @param {string} topic - Tema de conversación
   * @param {number} [limit=50] - Límite de mensajes a retornar
   * @returns {Promise<Array>} Array de mensajes ordenados cronológicamente
   */
  async getConversationByTopic(userPhone, agent, topic, limit = 50) {
    databaseService.ensureInitialized();
    
    try {
      const query = `
        SELECT 
          id, user_phone, agent, conversation_topic, session_id,
          role, content, metadata, parent_message_id, timestamp
        FROM agent_conversations
        WHERE user_phone = ?
          AND agent = ?
          AND conversation_topic = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `;
      
      const messages = await databaseService.all(query, [
        userPhone,
        agent.toLowerCase(),
        topic,
        limit
      ]);
      
      // Parsear metadata de cada mensaje
      return messages.reverse().map(msg => ({
        ...msg,
        metadata: JSON.parse(msg.metadata || '{}')
      }));
      
    } catch (error) {
      console.error('[CONV-REPO] ❌ Error obteniendo conversación:', error);
      return [];
    }
  }
  
  /**
   * 🔍 Obtiene todas las conversaciones de un agente con un usuario
   * 
   * @param {string} userPhone - Teléfono del usuario
   * @param {string} agent - Código del agente
   * @param {number} [limit=100] - Límite de mensajes
   * @returns {Promise<Array>} Array de mensajes ordenados por fecha
   */
  async getAgentConversation(userPhone, agent, limit = 100) {
    databaseService.ensureInitialized();
    
    try {
      const query = `
        SELECT 
          id, user_phone, agent, conversation_topic, session_id,
          role, content, metadata, parent_message_id, timestamp
        FROM agent_conversations
        WHERE user_phone = ?
          AND agent = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `;
      
      const messages = await databaseService.all(query, [
        userPhone,
        agent.toLowerCase(),
        limit
      ]);
      
      return messages.reverse().map(msg => ({
        ...msg,
        metadata: JSON.parse(msg.metadata || '{}')
      }));
      
    } catch (error) {
      console.error('[CONV-REPO] ❌ Error obteniendo conversación del agente:', error);
      return [];
    }
  }
  
  /**
   * 🎯 Obtiene temas activos de un usuario
   * 
   * @param {string} userPhone - Teléfono del usuario
   * @param {string} [agent] - Filtrar por agente específico (opcional)
   * @returns {Promise<Array>} Array de temas activos
   */
  async getActiveTopics(userPhone, agent = null) {
    databaseService.ensureInitialized();
    
    try {
      let query = `
        SELECT 
          user_phone, agent, topic, session_id, status,
          last_interaction, context_summary
        FROM active_topics
        WHERE user_phone = ?
          AND status = 'active'
      `;
      
      const params = [userPhone];
      
      if (agent) {
        query += ' AND agent = ?';
        params.push(agent.toLowerCase());
      }
      
      query += ' ORDER BY last_interaction DESC';
      
      const topics = await databaseService.all(query, params);
      
      return topics;
      
    } catch (error) {
      console.error('[CONV-REPO] ❌ Error obteniendo temas activos:', error);
      return [];
    }
  }
  
  /**
   * 📝 Actualiza o crea tema activo
   * 
   * @param {object} params - Parámetros del tema
   * @param {string} params.userPhone - Teléfono del usuario
   * @param {string} params.agent - Código del agente
   * @param {string} params.topic - Tema de conversación
   * @param {string} params.sessionId - ID de sesión
   * @param {string} [params.status='active'] - Estado del tema
   * @param {string} [params.contextSummary] - Resumen del contexto actual
   * @returns {Promise<boolean>} true si se actualizó correctamente
   */
  async updateActiveTopic({ userPhone, agent, topic, sessionId, status = 'active', contextSummary = null }) {
    databaseService.ensureInitialized();
    
    try {
      const query = `
        INSERT INTO active_topics (
          user_phone, agent, topic, session_id, status, context_summary
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_phone, agent, topic) DO UPDATE SET
          session_id = excluded.session_id,
          status = excluded.status,
          context_summary = excluded.context_summary,
          last_interaction = CURRENT_TIMESTAMP
      `;
      
      await databaseService.run(query, [
        userPhone,
        agent.toLowerCase(),
        topic,
        sessionId,
        status,
        contextSummary
      ]);
      
      return true;
      
    } catch (error) {
      console.error('[CONV-REPO] ❌ Error actualizando tema activo:', error);
      return false;
    }
  }
  
  /**
   * ✅ Marca un tema como completado
   * 
   * @param {string} userPhone - Teléfono del usuario
   * @param {string} agent - Código del agente
   * @param {string} topic - Tema de conversación
   * @returns {Promise<boolean>} true si se actualizó correctamente
   */
  async completeTopicconversation(userPhone, agent, topic) {
    databaseService.ensureInitialized();
    
    try {
      const query = `
        UPDATE active_topics
        SET status = 'completed', last_interaction = CURRENT_TIMESTAMP
        WHERE user_phone = ? AND agent = ? AND topic = ?
      `;
      
      await databaseService.run(query, [
        userPhone,
        agent.toLowerCase(),
        topic
      ]);
      
      console.log(`[CONV-REPO] ✅ Tema completado: ${agent}/${topic}`);
      return true;
      
    } catch (error) {
      console.error('[CONV-REPO] ❌ Error completando tema:', error);
      return false;
    }
  }
  
  /**
   * ⏸️ Pausa un tema (cuando el usuario cambia de contexto)
   * 
   * @param {string} userPhone - Teléfono del usuario
   * @param {string} agent - Código del agente
   * @param {string} topic - Tema de conversación
   * @returns {Promise<boolean>} true si se actualizó correctamente
   */
  async pauseTopic(userPhone, agent, topic) {
    databaseService.ensureInitialized();
    
    try {
      const query = `
        UPDATE active_topics
        SET status = 'paused', last_interaction = CURRENT_TIMESTAMP
        WHERE user_phone = ? AND agent = ? AND topic = ?
      `;
      
      await databaseService.run(query, [
        userPhone,
        agent.toLowerCase(),
        topic
      ]);
      
      console.log(`[CONV-REPO] ⏸️ Tema pausado: ${agent}/${topic}`);
      return true;
      
    } catch (error) {
      console.error('[CONV-REPO] ❌ Error pausando tema:', error);
      return false;
    }
  }
  
  /**
   * 📸 Guarda archivo adjunto a un mensaje
   * 
   * @param {object} params - Parámetros del archivo
   * @param {number} params.messageId - ID del mensaje al que pertenece
   * @param {string} params.userPhone - Teléfono del usuario
   * @param {string} params.agent - Código del agente
   * @param {string} params.fileType - Tipo de archivo (image, pdf, audio)
   * @param {string} [params.fileUrl] - URL del archivo (Wassenger u otro storage)
   * @param {string} [params.fileData] - Datos del archivo en Base64
   * @param {object} [params.analysisResult] - Resultado del análisis del archivo
   * @returns {Promise<object>} Archivo guardado con su ID
   */
  async saveFile({ messageId, userPhone, agent, fileType, fileUrl = null, fileData = null, analysisResult = null }) {
    databaseService.ensureInitialized();
    
    try {
      const query = `
        INSERT INTO conversation_files (
          message_id, user_phone, agent, file_type,
          file_url, file_data, processed, analysis_result
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        messageId,
        userPhone,
        agent.toLowerCase(),
        fileType,
        fileUrl,
        fileData,
        analysisResult ? 1 : 0,
        analysisResult ? JSON.stringify(analysisResult) : null
      ];
      
      const result = await databaseService.run(query, params);
      
      console.log(`[CONV-REPO] ✅ Archivo guardado: ${fileType} para mensaje ${messageId}`);
      
      return {
        id: result.lastID,
        success: true
      };
      
    } catch (error) {
      console.error('[CONV-REPO] ❌ Error guardando archivo:', error);
      throw error;
    }
  }
  
  /**
   * 🖼️ Obtiene archivos de un mensaje específico
   * 
   * @param {number} messageId - ID del mensaje
   * @returns {Promise<Array>} Array de archivos
   */
  async getFilesForMessage(messageId) {
    databaseService.ensureInitialized();
    
    try {
      const query = `
        SELECT 
          id, message_id, user_phone, agent, file_type,
          file_url, file_data, processed, analysis_result, uploaded_at
        FROM conversation_files
        WHERE message_id = ?
        ORDER BY uploaded_at ASC
      `;
      
      const files = await databaseService.all(query, [messageId]);
      
      return files.map(file => ({
        ...file,
        analysis_result: file.analysis_result ? JSON.parse(file.analysis_result) : null
      }));
      
    } catch (error) {
      console.error('[CONV-REPO] ❌ Error obteniendo archivos:', error);
      return [];
    }
  }
  
  /**
   * 📁 Obtiene todos los archivos de un tema específico
   * 
   * @param {string} userPhone - Teléfono del usuario
   * @param {string} agent - Código del agente
   * @param {string} topic - Tema de conversación
   * @param {string} [fileType] - Filtrar por tipo (opcional)
   * @returns {Promise<Array>} Array de archivos con información del mensaje
   */
  async getFilesForTopic(userPhone, agent, topic, fileType = null) {
    databaseService.ensureInitialized();
    
    try {
      let query = `
        SELECT 
          cf.id, cf.message_id, cf.user_phone, cf.agent, cf.file_type,
          cf.file_url, cf.file_data, cf.processed, cf.analysis_result, cf.uploaded_at,
          ac.content as message_content, ac.timestamp as message_timestamp
        FROM conversation_files cf
        INNER JOIN agent_conversations ac ON cf.message_id = ac.id
        WHERE cf.user_phone = ?
          AND cf.agent = ?
          AND ac.conversation_topic = ?
      `;
      
      const params = [userPhone, agent.toLowerCase(), topic];
      
      if (fileType) {
        query += ' AND cf.file_type = ?';
        params.push(fileType);
      }
      
      query += ' ORDER BY cf.uploaded_at ASC';
      
      const files = await databaseService.all(query, params);
      
      return files.map(file => ({
        ...file,
        analysis_result: file.analysis_result ? JSON.parse(file.analysis_result) : null
      }));
      
    } catch (error) {
      console.error('[CONV-REPO] ❌ Error obteniendo archivos del tema:', error);
      return [];
    }
  }
  
  /**
   * 🔄 Actualiza resultado de análisis de un archivo
   * 
   * @param {number} fileId - ID del archivo
   * @param {object} analysisResult - Resultado del análisis
   * @returns {Promise<boolean>} true si se actualizó correctamente
   */
  async updateFileAnalysis(fileId, analysisResult) {
    databaseService.ensureInitialized();
    
    try {
      const query = `
        UPDATE conversation_files
        SET processed = 1, analysis_result = ?
        WHERE id = ?
      `;
      
      await databaseService.run(query, [
        JSON.stringify(analysisResult),
        fileId
      ]);
      
      console.log(`[CONV-REPO] ✅ Análisis actualizado para archivo ${fileId}`);
      return true;
      
    } catch (error) {
      console.error('[CONV-REPO] ❌ Error actualizando análisis:', error);
      return false;
    }
  }
  
  /**
   * 📊 Obtiene resumen de conversación para Aurora
   * Permite a Aurora ver resumen de otros agentes sin mezclar contextos
   * 
   * @param {string} userPhone - Teléfono del usuario
   * @param {string} [excludeAgent] - Agente a excluir (generalmente 'aurora')
   * @returns {Promise<object>} Resumen por agente con últimas interacciones
   */
  async getConversationSummaryForAurora(userPhone, excludeAgent = 'aurora') {
    databaseService.ensureInitialized();
    
    try {
      const query = `
        SELECT 
          agent,
          conversation_topic as topic,
          COUNT(*) as message_count,
          MAX(timestamp) as last_message,
          (SELECT content FROM agent_conversations ac2 
           WHERE ac2.user_phone = ac.user_phone 
             AND ac2.agent = ac.agent 
             AND ac2.conversation_topic = ac.conversation_topic
             AND ac2.role = 'assistant'
           ORDER BY ac2.timestamp DESC LIMIT 1) as last_agent_message
        FROM agent_conversations ac
        WHERE user_phone = ?
          AND agent != ?
        GROUP BY agent, conversation_topic
        ORDER BY last_message DESC
      `;
      
      const summaries = await databaseService.all(query, [userPhone, excludeAgent]);
      
      // Agrupar por agente
      const byAgent = {};
      summaries.forEach(summary => {
        if (!byAgent[summary.agent]) {
          byAgent[summary.agent] = [];
        }
        byAgent[summary.agent].push({
          topic: summary.topic,
          messageCount: summary.message_count,
          lastMessage: summary.last_message,
          lastAgentMessage: summary.last_agent_message
        });
      });
      
      return byAgent;
      
    } catch (error) {
      console.error('[CONV-REPO] ❌ Error obteniendo resumen para Aurora:', error);
      return {};
    }
  }
  
  /**
   * 🧹 Limpia conversaciones antiguas (mantenimiento)
   * 
   * @param {number} daysOld - Días de antigüedad para limpiar
   * @returns {Promise<number>} Número de registros eliminados
   */
  async cleanOldConversations(daysOld = 90) {
    databaseService.ensureInitialized();
    
    try {
      const query = `
        DELETE FROM agent_conversations
        WHERE timestamp < datetime('now', '-${daysOld} days')
      `;
      
      const result = await databaseService.run(query);
      
      console.log(`[CONV-REPO] 🧹 Conversaciones antiguas eliminadas: ${result.changes}`);
      return result.changes;
      
    } catch (error) {
      console.error('[CONV-REPO] ❌ Error limpiando conversaciones:', error);
      return 0;
    }
  }
}

// Singleton instance
const conversationRepository = new ConversationRepository();

export default conversationRepository;
export { ConversationRepository };
