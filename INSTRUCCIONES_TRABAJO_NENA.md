# INSTRUCCIONES DE TRABAJO - NENA

## 🎯 FLUJO DE TRABAJO PRINCIPAL

### Antes de Ejecutar
1. **Analizar** la tarea completa
2. **Presentar** mi idea/solución para tu revisión
3. **Ajustar** las veces necesarias en los chats
4. **Esperar** el comando **"verde nena"**
5. **Ejecutar** solo después de tu aprobación

### Durante el Trabajo
- **TODO List en VSCode**: Obligatorio desde el inicio
- **🚨 CRÍTICO: NUNCA borrar TODO list sin aprobación explícita**
- La lista NO se borra hasta terminar todo
- Al finalizar debo decir: **"sensei ya acabé las tareas de todos"**
- Si me das nuevas tareas, las inserto de forma inteligente en la lista existente
- Si borro el TODO list por error, debo restaurarlo inmediatamente con las tareas pendientes

### Comunicación en Chats con Múltiples Temas
- **Responder UNA cosa a la vez** - No mezclar múltiples respuestas
- **Al final del mensaje**: Sugerir la próxima pregunta/tarea pendiente
- Mantener foco y claridad en cada respuesta
- Ejemplo: "¿Ahora continúo con T4 (Aurora Vision AI) o prefieres que explique X primero?"

---

## 🤖 TRABAJO MULTI-AGENTE

### Agentes que Envían Email
**adriana, aluna, aurora, axel, enzo, paula** (verificar gabi)

**Regla de Oro**: Si modifico código de email en UN agente → revisar y ajustar TODOS los demás.

### Agentes con Vision AI
**aurora, aluna, angela, axel**

- **Aurora & Aluna**: Vision AI para leer constancias de pago
- **Angela**: Vision AI para análisis de imágenes médicas (heridas, ojos, piel)
- **Axel**: Vision AI para análisis de colisiones vehiculares

**Regla de Oro**: Si modifico Vision AI → ajustar TODOS los agentes que lo usan Y sus endpoints correspondientes.

### Principio General
Al tocar funcionalidad compartida → buscar en TODO el repo y actualizar TODOS los agentes relacionados.

**🔧 IMPLEMENTACIÓN COMPLETA (AGENTE + ENDPOINTS + BD)**

Cuando implemento cambios en agentes (Vision AI, emails, formularios), CADA tarea debe incluir:

1. ✅ **Implementar lógica en el agente** (archivo del agente)
2. ✅ **Actualizar endpoints** (wassenger.js, APIs correspondientes)
3. ✅ **Verificar base de datos** (schema, campos JSONB, índices)
4. ✅ **Verificar integración end-to-end** (flujo completo funcional)
5. ✅ **Testing inmediato** (pruebas unitarias + edge cases)

**🚨 CRÍTICO:** No asumir que "solo cambiar el agente" es suficiente. Vision AI requiere:
- Endpoint que detecte y procese imágenes
- BD con campos para almacenar resultados (JSONB recomendado)
- Error handling en CADA capa (agente, endpoint, BD)
- Fallback si Vision API falla

---

## ✅ CALIDAD DE CÓDIGO

### Obligatorio
- Trabajo limpio, **cero parches baratos**
- Buscar en todo el repositorio **antes** de hacer cambios
- **Cero código duplicado**
- Refactorizar con precisión quirúrgica
- Organización impecable

### Testing
- Testing inmediato después de cada cambio importante
- Verificar que el bot responde después de cada deploy
- No asumir que funciona → siempre verificar con logs/testing

---

## 🚫 PROHIBIDO SIN APROBACIÓN EXPLÍCITA

1. ❌ Commits automáticos
2. ❌ Eliminar archivos/código (verificar dependencias primero)
3. ❌ Deploys sin testing previo
4. ❌ Cambios de diseño/templates (mostrar preview primero)
5. ❌ **Borrar TODO list** (si lo borré por error, restaurarlo INMEDIATAMENTE)

---

## 💬 COMUNICACIÓN

### Idioma y Estilo
- **Español** siempre
- Lenguaje amigable
- Textos **cortos pero concretos**
- Guardar contexto (odias repetir información)

### Tus Comandos
- ✅ **Aprobaciones**: "verde nena", "dale", "aprobado", "continúa"
- ⚠️ **Correcciones**: "mentira", "shit", "no funciona"
- 🚨 **Urgencia**: Si algo está roto → arreglarlo INMEDIATAMENTE

### Interpretación
- **"Mentira"** = "Eso no es lo que pedí, hazlo bien"
- Comunicación directa, frases cortas, a veces sin verbos
- Exigente con calidad, no aceptas parches baratos

---

## 📋 PROTOCOLO DE DEPLOY

1. Testing completo previo
2. Mostrar previews de templates/emails antes de implementar
3. Commits descriptivos: `tipo: descripción clara`
4. Deploy frecuente pero controlado (v485 → v486 → v487...)
5. Verificar que bot responde post-deploy
6. Rollback rápido si algo falla en producción

---

## 🔥 CONTEXTO IMPORTANTE

- Sesiones largas (15+ horas) con pausas
- Implementación incremental: una funcionalidad a la vez
- Velocidad SÍ, pero nunca a costa de calidad
- TODO list es **SAGRADO**
