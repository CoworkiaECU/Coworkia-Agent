# 🧪 CHECKLIST TESTING PRODUCCIÓN - Sistema V2 Handoffs

**Fecha:** 30 Enero 2026  
**Deploy:** Commit a4c3226 - Sistema V2 en producción  
**Números:** 593987770262 (Paula) | 593987770788 (Aurora)

---

## ✅ Pre-requisitos
- [x] Código V2 deployed a Heroku
- [x] Tests unitarios pasados (21/21)
- [x] Tests integración local pasados (5/5)
- [x] Sin errores de sintaxis
- [x] Heroku app respondiendo (ping OK)

---

## 🎯 TESTS A EJECUTAR

### 1. @Menciones Explícitas → HANDOFF
**Objetivo:** Verificar que @mention activa handoff inmediato

#### Test 1.1: Aurora → Enzo (788)
- [ ] Usuario: `@enzo necesito marketing`
- [ ] Esperado: Handoff silencioso, solo Enzo responde
- [ ] Verificar: activeAgent actualizado en BD = ENZO
- [ ] Verificar: agent_history contiene entrada Enzo

#### Test 1.2: Enzo → Aluna (788)
- [ ] Usuario: `@aluna plan 10`
- [ ] Esperado: Transición directa sin pasar por Aurora
- [ ] Verificar: activeAgent = ALUNA
- [ ] Verificar: Aluna menciona "Enzo está disponible con @enzo"

#### Test 1.3: Cualquier Agente → Aurora (788)
- [ ] Usuario: `@aurora`
- [ ] Esperado: Aurora mensaje especial "de nuevo" + menciona agente anterior
- [ ] Verificar: activeAgent = AURORA

#### Test 1.4: Aurora → Paula (262)
- [ ] Usuario: `@paula busco propiedad`
- [ ] Esperado: Handoff a Paula
- [ ] Verificar: Paula responde con contexto inmobiliario

### 2. Keywords → SUGGESTION (NO handoff)
**Objetivo:** Verificar que keywords NO cambian agente automáticamente

#### Test 2.1: Keyword "marketing" mantiene Aurora (788)
- [ ] Usuario: `necesito marketing`
- [ ] Esperado: Aurora responde sugiriendo @enzo
- [ ] Verificar: activeAgent sigue siendo AURORA
- [ ] Verificar: Aurora menciona "Enzo es especialista en marketing"

#### Test 2.2: Keyword "doctor" desde Enzo (788)
- [ ] Usuario: `necesito consulta con doctor`
- [ ] Esperado: Enzo responde sugiriendo @angela
- [ ] Verificar: activeAgent = ENZO (mantiene)
- [ ] Verificar: Enzo sugiere Angela para temas médicos

#### Test 2.3: Keyword "seguro" NO activa Adriana (262)
- [ ] Usuario: `quiero cotizar seguro`
- [ ] Esperado: Paula responde sugiriendo @adriana
- [ ] Verificar: activeAgent = PAULA (mantiene)

### 3. Edge Cases
**Objetivo:** Casos especiales no activan handoffs incorrectos

#### Test 3.1: Email con keyword no activa agente (788)
- [ ] Usuario: `segpopular.ec@icloud.com`
- [ ] Esperado: Aurora responde normal, NO cambia a Adriana
- [ ] Verificar: activeAgent = AURORA

#### Test 3.2: Múltiples @menciones usa primera (788)
- [ ] Usuario: `@enzo o @aluna?`
- [ ] Esperado: Handoff a ENZO (primera detectada)
- [ ] Verificar: activeAgent = ENZO

#### Test 3.3: @Mención con mayúsculas funciona (262)
- [ ] Usuario: `@PAULA AYUDA`
- [ ] Esperado: Handoff a Paula
- [ ] Verificar: activeAgent = PAULA

### 4. Transiciones All-to-All
**Objetivo:** Verificar que cualquier agente puede ir a cualquier otro

#### Test 4.1: Aluna → Adriana directo (788)
- [ ] Setup: Estar con Aluna
- [ ] Usuario: `@adriana seguro`
- [ ] Esperado: Handoff directo Aluna → Adriana
- [ ] Verificar: No pasa por Aurora

#### Test 4.2: Gabi → Enzo directo (262)
- [ ] Setup: Estar con Gabi
- [ ] Usuario: `@enzo marketing`
- [ ] Esperado: Handoff directo
- [ ] Verificar: activeAgent = ENZO

### 5. Agente History & Mensajes "Returning"
**Objetivo:** Verificar tracking de conversaciones anteriores

#### Test 5.1: Primera vez vs Returning (788)
- [ ] Setup: Handoff Aurora → Enzo (primera vez)
- [ ] Esperado: "¡Hola! Soy Enzo..." (mensaje primera vez)
- [ ] Luego: @aurora y volver con @enzo
- [ ] Esperado: "¡Hola de nuevo! Soy Enzo, nos volvemos a encontrar"

### 6. No Contradicciones de Webhooks
**Objetivo:** Verificar que un solo agente responde, sin duplicados

#### Test 6.1: Keyword ambiguo (788)
- [ ] Usuario: `marketing` (podría activar Enzo O Aurora)
- [ ] Esperado: Solo 1 respuesta (de Aurora sugiriendo Enzo)
- [ ] Verificar: NO hay 2 mensajes simultáneos

#### Test 6.2: Transición simultánea (262+788)
- [ ] Enviar @enzo en 262 y @paula en 788 al mismo tiempo
- [ ] Esperado: Cada número responde 1 vez sin conflicts
- [ ] Verificar: Mutex locks funcionan

---

## 📊 MÉTRICAS A OBSERVAR

### Logs Heroku
- [ ] No hay `[WASSENGER] ⚠️ Usando executeHandoffSequence_LEGACY`
- [ ] Aparece `[HANDOFF-MANAGER] 🤝 Iniciando handoff`
- [ ] Aparece `[INTENT-V2]` logs de resolución
- [ ] NO hay errores de transitions inválidas

### Base de Datos
- [ ] Campo `active_agent` se actualiza correctamente
- [ ] Campo `agent_history` registra todas las conversaciones
- [ ] Campo `forms` NO se pierde en handoffs
- [ ] Timestamps actualizados en cada interacción

---

## 🚨 CRITERIOS DE ÉXITO

**Sistema APROBADO si:**
1. ✅ 0 handoffs implícitos por keywords
2. ✅ 0 webhooks contradictorios (un mensaje por respuesta)
3. ✅ 0 race conditions en BD (activeAgent consistente)
4. ✅ 100% de @mentions generan handoff correcto
5. ✅ Transiciones all-to-all funcionan sin restricciones
6. ✅ Silent handoffs (solo nuevo agente habla)
7. ✅ Agent history tracked correctamente

**Sistema RECHAZADO si:**
1. ❌ Keywords causan handoffs automáticos
2. ❌ Aparecen 2+ respuestas para un mensaje
3. ❌ activeAgent queda inconsistente
4. ❌ @mention no genera handoff
5. ❌ Errores en logs de HANDOFF-MANAGER

---

## 📝 NOTAS DE TESTING

**Formato:**
```
[FECHA HORA] TEST X.Y - [PASS/FAIL]
Entrada: <mensaje usuario>
Esperado: <comportamiento>
Resultado: <lo que pasó>
Logs: <extracto relevante>
```

---

**Inicio Testing:** _______________  
**Completado:** _______________  
**Resultado Final:** [PASS / FAIL]  
**Issues encontrados:** _______________
