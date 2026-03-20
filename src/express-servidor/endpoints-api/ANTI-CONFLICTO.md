# 🛡️ Anti-Conflicto: Mismo Celular para Todo

## ❓ El Problema

Diego usa `+593987770788` para:
- ✅ Recibir notificaciones del autopilot
- ✅ Enviar comandos (Si/No/Review/Deploy)
- ✅ Probar los agentes (Aurora, Aluna, Gabi, etc)

**Pregunta**: ¿Cómo distingue el sistema si "Si" es un comando o un mensaje normal de prueba?

---

## 💡 La Solución: Estado de Espera

### 🎯 Concepto Simple

El sistema SOLO interpreta comandos cuando:
1. **Hay una pregunta pendiente** (guardada en memoria)
2. **Dentro de 5 minutos** (timeout)
3. **Del número de Diego** (seguridad)

Si NO cumple los 3 → **mensaje normal**, va al orquestador.

---

## 📋 Ejemplos Reales

### ✅ Escenario 1: Prueba Normal (Sin Pregunta Pendiente)

```
10:00 AM - Diego: "Hola Aurora, quiero hot desk"
           Estado: waitingForApproval = false
           Resultado: Va al orquestador → Aurora responde
```

### ✅ Escenario 2: Comando del Sistema (Con Pregunta Pendiente)

```
11:00 AM - Sistema: "✅ Plan completado. ¿Deploy a Heroku? Si/No/Review"
           Estado: setPendingQuestion('deploy', ...)
           waitingForApproval = true

11:01 AM - Diego: "Si"
           Estado: detectSystemCommand() → APPROVE
           Resultado: Ejecuta deploy, NO va al orquestador
           Estado: clearPendingQuestion()
```

### ✅ Escenario 3: Prueba Dentro del Timeout (Pero Sin Match)

```
11:00 AM - Sistema: "✅ Plan completado. ¿Deploy a Heroku? Si/No/Review"
           Estado: waitingForApproval = true

11:02 AM - Diego: "Hola Aluna, quiero info de membresía premium"
           Estado: detectSystemCommand('Hola Aluna...') → null (no matchea)
           Resultado: Va al orquestador → Aluna responde
```

### ✅ Escenario 4: Comando Después de Timeout (>5min)

```
11:00 AM - Sistema: "✅ Plan completado. ¿Deploy a Heroku? Si/No/Review"
           Estado: waitingForApproval = true

11:07 AM - Diego: "Si"
           Timeout: 7 minutos > 5 minutos
           Estado: clearPendingQuestion() automático
           Resultado: Va al orquestador como mensaje normal
```

---

## 🔍 Lógica de Detección (Código)

```javascript
// wassenger.js - Webhook handler

router.post('/webhook', async (req, res) => {
  const { data } = req.body;
  const from = data.fromNumber;
  const message = data.body;
  
  // 1️⃣ Verificar si es comando del sistema
  const command = detectSystemCommand(from, message);
  
  if (command) {
    // Es un comando → ejecutar acción, NO ir al orquestador
    await executeCommand(command);
    return res.json({ ok: true, handled: 'command' });
  }
  
  // 2️⃣ No es comando → mensaje normal al orquestador
  await orquestadorPrincipal({ data });
  return res.json({ ok: true, handled: 'agent' });
});
```

---

## 🧠 State Manager (autopilot-state.js)

```javascript
// Detecta si mensaje es comando
export function detectSystemCommand(userId, message) {
  // Condición 1: Es Diego?
  if (userId !== process.env.DIEGO_PERSONAL_PHONE) return null;
  
  // Condición 2: Hay pregunta pendiente?
  if (!autopilotState.waitingForApproval) return null;
  
  // Condición 3: Dentro de timeout (5 min)?
  const elapsed = Date.now() - autopilotState.pendingQuestion.askedAt;
  if (elapsed > 5 * 60 * 1000) {
    clearPendingQuestion();
    return null;
  }
  
  // ✅ Cumple las 3 → interpretar como comando
  const msg = message.toLowerCase().trim();
  if (msg === 'si') return { command: 'APPROVE' };
  if (msg === 'no') return { command: 'REJECT' };
  if (msg === 'review') return { command: 'REVIEW' };
  if (msg === 'deploy') return { command: 'DEPLOY' };
  
  // No matchea comando → mensaje normal
  return null;
}
```

---

## ✨ Resumen: Por Qué NO Hay Conflicto

| Situación | Estado | Resultado |
|-----------|--------|-----------|
| **Prueba normal de agente** | `waitingForApproval=false` | Va al orquestador |
| **Comando dentro de 5min** | `waitingForApproval=true` + match | Ejecuta comando |
| **Comando después de 5min** | Timeout → auto-clear | Va al orquestador |
| **Mensaje no-comando con pregunta** | No matchea Si/No/Review | Va al orquestador |

---

## 🔐 Seguridad Adicional

1. **Solo número de Diego** puede enviar comandos
2. **Timeout automático** (5 min) previene comandos accidentales
3. **Logs de todas las decisiones** para debugging
4. **Confirmación explícita** antes de acciones críticas (deploy)

---

## 📱 Flujo Visual

```
Mensaje entrante de +593987770788
         |
         v
   [detectSystemCommand()]
         |
    ┌────┴────┐
    |         |
   SÍ        NO
    |         |
    v         v
[Ejecuta] [Orquestador]
[Comando] [→ Agentes]
```

---

## 🎯 Conclusión

**NO hay conflicto** porque el sistema usa **contexto temporal** (estado de espera) para distinguir:
- ✅ Comandos del sistema = cuando espera respuesta
- ✅ Mensajes normales = resto del tiempo (99% del uso)

El mismo celular funciona para **TODO** sin problema.
