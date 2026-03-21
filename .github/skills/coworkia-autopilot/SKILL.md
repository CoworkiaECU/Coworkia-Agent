---
name: coworkia-autopilot
description: Sistema de ejecución autónoma de planes de vuelo. Permite al agente trabajar 2-3h sin supervisión, leyendo y ejecutando tareas automáticamente con checkpoints, detección de bloqueos, y logs de progreso. Activación con "autopilot verde nena".
---

# Coworkia Autopilot - Agente Autónomo

## 🎯 Propósito de Este Skill

**Activar el agente y dejarlo trabajar solo mientras Diego vende o descansa.**

Este skill permite al agente leer planes de vuelo (archivos `.md` en `/planes-de-vuelo/`) y ejecutar tareas automáticamente con inteligencia, checkpoints automáticos, detección de bloqueos, y reportes de progreso.

---

## 🚀 ACTIVACIÓN

### Comando de Inicio

Diego dice una de estas frases:

```
"autopilot verde nena"
"activa autopilot"
"modo automático verde nena"
```

**Respuesta del agente**:
```
🤖 AUTOPILOT ACTIVADO

📋 Plan detectado: plan-vuelo-20mar.md
📦 Tareas pendientes: 8
⏱️ Tiempo estimado: 2-3 horas

Trabajando en modo autónomo...
Checkpoint cada 3-4 tareas.
Reportaré cuando termine o necesite decisión.

🟢 Iniciando...
```

---

## 📖 CÓMO FUNCIONA

### 1. Lectura del Plan de Vuelo

El agente:
1. Busca el archivo más reciente en `/planes-de-vuelo/plan-vuelo-[fecha].md`
2. Identifica el plan activo del día
3. Parsea las tareas pendientes (marcadas con `[ ]`)
4. Ignora tareas completadas (marcadas con `[x]`)
5. Identifica bloques de trabajo (Fase 1, Fase 2, Bloque A, etc.)

**Ejemplo de detección**:
```markdown
## Tareas de Hoy

### Bloque 1: Refactoring Email Templates
- [x] Consolidar templates de Aurora
- [ ] Consolidar templates de Aluna    ← DETECTA ESTA
- [ ] Eliminar duplicados              ← DETECTA ESTA
- [ ] Testing de emails                ← DETECTA ESTA

### Bloque 2: Dashboard Aluna
- [ ] Añadir filtros por status        ← DETECTA ESTA
```

### 2. Ejecución Inteligente

Para cada tarea:

**PASO 1: Análisis**
- Lee contexto completo de archivos relacionados
- Verifica dependencias con tareas anteriores
- Confirma que tiene toda la información necesaria

**PASO 2: Acción**
- Ejecuta el cambio (edición, creación, refactoring)
- No pregunta confirmación (ya tiene "verde nena" global)
- Sigue las reglas de `reglas_multiagente.md`

**PASO 3: Verificación**
- Ejecuta `get_errors` para ver errores de compilación
- Si hay tests relacionados, los ejecuta
- Valida que el cambio no rompió nada

**PASO 4: Logging**
```markdown
✅ Tarea 2/8 completada: Consolidar templates de Aluna
   - Archivos modificados: 3
   - Líneas eliminadas: 87
   - Tiempo: 4 min
```

### 3. Checkpoints Automáticos

Cada 3-4 tareas completadas:

```bash
git add .
git commit -m "feat: autopilot checkpoint - [descripción de tareas]"
```

**Mensaje al usuario**:
```
🔵 CHECKPOINT 1/3

✅ Completadas: 4 tareas
📝 Commit: v931 "feat: autopilot checkpoint - consolidación templates"
⏱️ Tiempo transcurrido: 45 min
🎯 Progreso: 50% del Bloque 1

Continuando con Bloque 2...
```

### 4. Detección de Bloqueos

Si el agente encuentra el **mismo error 3 veces**:

```
⚠️ AUTOPILOT BLOQUEADO

🚨 Problema: Error de sintaxis en aluna-email-templates.js línea 45
🔁 Intentos: 3/3
❌ No puedo resolver automáticamente

🛑 AUTOPILOT PAUSADO
Esperando intervención de Diego...

Detalles:
- Archivo: src/servicios-ia/aluna-email-templates.js
- Error: SyntaxError: Unexpected token '}'
- Última acción: Consolidar función generateAlunaEmailHTML()
```

**El agente NO continúa** hasta que Diego resuelva el bloqueo.

---

## ✅ DECISIONES AUTÓNOMAS PERMITIDAS

El agente puede hacer estos cambios **sin preguntar**:

### 🟢 VERDE - Totalmente Autónomo

✅ **Refactoring técnico**
- Consolidar código duplicado
- Extraer funciones comunes
- Renombrar variables para claridad
- Reorganizar imports

✅ **Fixes de bugs evidentes**
- Typos en código
- Variables no definidas
- Imports faltantes
- Promesas sin await

✅ **Tests y validaciones**
- Ejecutar tests existentes
- Validar errores de compilación
- Verificar que APIs responden

✅ **Mejoras de performance evidentes**
- Cachear valores constantes
- Evitar re-cálculos innecesarios
- Optimizar queries SQL (sin cambiar lógica)

✅ **Documentación**
- Comentarios en código
- Updates a README
- Actualizar planes de vuelo

### 🟡 AMARILLO - Requiere Pausa y Notificación

⚠️ **Cambios de arquitectura**
- Modificar estructura de tablas
- Cambiar flujo de orquestador
- Añadir nuevas dependencias
- Cambiar sistema de handoffs

⚠️ **Decisiones de negocio**
- Cambiar pricing en proformas
- Modificar textos de marketing
- Alterar flujos de follow-up
- Cambiar keywords de captura

**Acción del agente**: 
```
⏸️ AUTOPILOT PAUSADO

❓ NECESITO DECISIÓN

Detecté que la Tarea 5 requiere cambio arquitectónico:
"Migrar sistema de formularios a Redis"

Esto cambia la arquitectura de persistencia.
¿Procedo? (Responde: "si procede" o "no, skip")
```

### 🔴 ROJO - NUNCA Hacer Automáticamente

❌ **Deploy a producción** (siempre requiere "verde nena" explícito)
❌ **Cambios en variables de entorno de Heroku**
❌ **Migraciones de base de datos destructivas** (DROP, ALTER con pérdida de datos)
❌ **Eliminar archivos de producción** sin backup
❌ **Tocar archivos críticos** sin análisis profundo:
  - `orquestador.js`
  - `wassenger.js` (webhook principal)
  - `database.js`
  - `postgres-adapter.js`

---

## 📊 LOGGING Y PROGRESO

### Formato de Logs

Durante ejecución, el agente reporta:

```
🤖 AUTOPILOT - PROGRESO

📋 Plan: plan-vuelo-20mar.md
🎯 Bloque actual: Bloque 1 - Refactoring Email Templates

✅ Completadas:
  1. ✓ Consolidar templates de Aurora (8 min)
  2. ✓ Consolidar templates de Aluna (6 min)
  3. ✓ Eliminar duplicados (3 min)
  4. ✓ Testing de emails (5 min)

🔄 En progreso:
  5. → Añadir filtros por status en dashboard (7 min transcurridos...)

⏱️ Tiempo total: 29 min
📈 Progreso: 40% del plan completo
🔵 Último checkpoint: v931 (hace 12 min)
```

### Formato de Finalización

Cuando termina:

```
✅ AUTOPILOT COMPLETADO

📋 Plan: plan-vuelo-20mar.md
⏱️ Tiempo total: 2h 15min

📦 Trabajo realizado:
  ✓ Bloque 1: Refactoring Email Templates (8 tareas)
  ✓ Bloque 2: Dashboard Aluna (5 tareas)
  ✓ Bloque 3: Testing (4 tareas)

📝 Commits realizados:
  - v931: autopilot checkpoint 1 - templates consolidados
  - v932: autopilot checkpoint 2 - dashboard filters
  - v933: autopilot final - testing completo

📊 Estadísticas:
  - Archivos modificados: 18
  - Líneas añadidas: 342
  - Líneas eliminadas: 587
  - Tests ejecutados: 12 (todos ✓)
  - Errores encontrados: 0

🟢 LISTO PARA REVIEW Y DEPLOY

Recomendaciones:
1. Revisar cambios en templates (críticos para emails)
2. Probar dashboard en navegador
3. Si todo OK: `git push heroku main`
```

---

## 🛠️ MANEJO DE ERRORES

### Tipos de Errores

#### 1. Error de Sintaxis (Compilación)

**Detección**: `get_errors` retorna errores

**Acción**:
1. Intento 1: Revisar código, corregir error obvio
2. Intento 2: Leer archivo completo, analizar contexto
3. Intento 3: Revisar archivos relacionados

**Si falla 3 veces**: BLOQUEO → pausar y notificar

#### 2. Error de Tests

**Detección**: Test suite falla

**Acción**:
1. Leer output del test
2. Si es error de lógica: revertir último cambio
3. Si es test desactualizado: actualizar test
4. Si es dependencia: revisar imports

**Si falla 3 veces**: BLOQUEO → pausar y notificar

#### 3. Error de Queries (Base de Datos)

**Detección**: Error en repositorio o migration

**Acción**:
1. Verificar schema actual
2. Comparar con query esperado
3. Si falta columna: sugerir migración (NO ejecutar automáticamente)

**Siempre pausa**: Cambios de BD requieren aprobación

#### 4. Error de Dependencias

**Detección**: Module not found, import errors

**Acción**:
1. Verificar package.json
2. Si falta: `npm install [package]` (solo si es dev dependency)
3. Si es production dependency: PAUSAR y preguntar

---

## 🔄 ROLLBACK AUTOMÁTICO

Si después de 3 intentos no puede resolver:

```bash
# Revertir último commit automático
git reset --soft HEAD~1

# Notificar
⚠️ ROLLBACK EJECUTADO

Revertí el último checkpoint (v932) debido a errores irresolubles.

Estado actual: v931 (último checkpoint estable)

Detalles del problema:
[descripción del error]

Esperando instrucciones...
```

---

## 📋 PLANTILLA DE PLAN DE VUELO COMPATIBLE

Para que autopilot funcione bien, los planes deben seguir este formato:

```markdown
# Plan de Vuelo - [Fecha]

## 🎯 Objetivo del Día
[Descripción breve]

---

## 📋 Tareas

### Bloque 1: [Nombre del Bloque]
- [ ] Tarea 1 clara y específica
- [ ] Tarea 2 clara y específica
- [ ] Tarea 3 con contexto si es necesario

### Bloque 2: [Nombre del Bloque]
- [ ] Tarea 4
- [ ] Tarea 5

---

## ⚠️ DECISIONES PENDIENTES
[Cosas que requieren aprobación de Diego]

---

## 🔮 PRÓXIMOS PASOS
[Para siguiente sesión]
```

**Claves para autopilot**:
- ✅ Tareas claras y accionables ("Consolidar X" no "Mejorar X")
- ✅ Un checkbox `[ ]` por tarea
- ✅ Agrupadas en bloques lógicos
- ✅ Sin ambigüedad ("Refactorizar templates de Aluna" es claro, "Optimizar código" no)

---

## 🧪 TESTING DEL AUTOPILOT

### Modo Dry-Run (Recomendado Primera Vez)

Diego puede decir:
```
"autopilot dry-run verde nena"
```

El agente:
- Lee el plan
- Parsea tareas
- **NO ejecuta cambios**
- Solo reporta qué haría:

```
🧪 AUTOPILOT DRY-RUN

📋 Plan: plan-vuelo-20mar.md
📦 Detectadas: 8 tareas en 2 bloques

Simulación de ejecución:

Bloque 1: Refactoring Email Templates
  1. [ ] Consolidar templates de Aluna
     → Archivos a modificar: src/servicios-ia/aluna-email-templates.js
     → Acción: Extraer generateAlunaEmailHTML() a generic-email-templates.js
     ✓ Sin bloqueos detectados

  2. [ ] Eliminar duplicados
     → Archivos a eliminar: src/servicios-ia/old-aluna-templates.js
     → Acción: Buscar referencias y limpiar imports
     ✓ Sin bloqueos detectados

[...]

✅ Dry-run completado
⚠️ Advertencias: 0
🔴 Bloqueos previstos: 0

¿Ejecutar en modo real? (Responde: "autopilot verde nena")
```

### Testing Manual Post-Autopilot

Después de completar:

```bash
# 1. Ver cambios
git diff HEAD~3..HEAD

# 2. Ejecutar tests
npm test

# 3. Verificar errores
npm run dev
# Abrir navegador y probar funcionalidades tocadas

# 4. Si todo OK
git push heroku main
```

---

## 🎓 MEJORES PRÁCTICAS

### Para Diego (Escribiendo Planes)

✅ **Hacer**:
- Tareas específicas: "Consolidar templates de Aluna" ✓
- Un nivel de indentación: `- [ ] Tarea` ✓
- Agrupar en bloques lógicos ✓
- Indicar dependencias si existen ✓

❌ **Evitar**:
- Tareas ambiguas: "Mejorar código" ✗
- Sub-tareas anidadas (autopilot no las detecta) ✗
- Mezclar decisiones con tareas ✗
- Tareas gigantes (> 1 hora) ✗

### Para el Agente (Ejecutando)

✅ **Hacer**:
- Leer contexto completo antes de cada tarea
- Commits frecuentes (cada 3-4 tareas)
- Verificar errores tras cada cambio
- Reportar progreso claramente
- Pausar ante dudas arquitectónicas

❌ **Evitar**:
- Asumir contexto sin leer archivos
- Acumular muchos cambios sin commit
- Ignorar errores de compilación
- Tocar archivos críticos sin análisis
- Continuar tras 3 intentos fallidos

---

## � NOTIFICACIÓN OBLIGATORIA AL TERMINAR

**SIEMPRE al finalizar un autopilot** (tanto desde VS Code como desde WhatsApp), el agente DEBE enviar notificación a Diego. Es el último paso, sin excepción.

### Cómo enviar (desde VS Code / terminal)

```bash
node /Users/diegovillota/coworkia-agent/scripts/notify-magic.mjs "mensaje aquí"
```

Si el script no existe, crearlo primero (ver abajo). Si hay error de red, loggearlo pero NO bloquear el fin del autopilot.

### Script permanente: `scripts/notify-magic.mjs`

```javascript
// scripts/notify-magic.mjs
import https from 'https';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const envLines = readFileSync(envPath, 'utf8').split('\n');
const env = {};
for (const line of envLines) {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/);
  if (m) env[m[1]] = m[2].trim();
}
const token = env.WASSENGER_TOKEN || env.WASSENGER_API_KEY;
const phone = env.DIEGO_PERSONAL_PHONE || '+593987770788';
const message = process.argv[2] || '✨ Magic: autopilot completado';

const body = JSON.stringify({ phone, message });
const req = https.request({
  hostname: 'api.wassenger.com', path: '/v1/messages', method: 'POST',
  headers: { 'Token': token, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
}, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const j = JSON.parse(data);
    console.log(j.id ? '✅ Notificación enviada' : '❌ Error: ' + j.message);
  });
});
req.on('error', e => console.error('notify error:', e.message));
req.write(body);
req.end();
```

### Mensaje estándar de finalización

```
✨ *Sensei soy Magic* ✨
🚀 *Autopilot completado — v[NUM] live*

✅ [FASE/BLOQUE]: descripción corta
✅ [FASE/BLOQUE]: descripción corta

[N] archivos modificados. Listo nena. 🎯
```

### Si el autopilot corrió desde WhatsApp

Usar `notifyDiego('task_complete', 'Autopilot terminado', {...})` del sistema de notificaciones interno — que ya enviará el mensaje al celular de Diego vía `sendMessage()` del contexto activo.

---

## 📊 MÉTRICAS DE ÉXITO

Un autopilot exitoso logra:

- 🎯 **> 80% de tareas completadas** sin intervención
- ⏱️ **< 10% del tiempo** en bloqueos
- 🔄 **0 rollbacks** por errores
- 📝 **Commits claros** y bien documentados
- ✅ **0 errores** al finalizar
- 📱 **Notificación enviada** al celular de Diego (último paso siempre)

Un autopilot que necesita mejorar:

- ⚠️ **< 50% de tareas completadas**
- 🐌 **> 30% del tiempo** en bloqueos
- 🔄 **> 2 rollbacks**
- 📝 **Commits confusos** o muy grandes
- ❌ **Errores al finalizar**

---

## 🔮 ROADMAP DEL AUTOPILOT

### v1.0 (Actual)
- [x] Lectura de planes de vuelo
- [x] Ejecución de tareas con checkpoints
- [x] Detección de bloqueos (3 intentos)
- [x] Logging de progreso
- [x] Rollback automático

### v2.0 (Futuro)
- [ ] Integración con notificaciones WhatsApp (ver skill `coworkia-notifications`)
- [ ] Estimación de tiempo por tarea (ML)
- [ ] Priorización inteligente de tareas
- [ ] Dry-run automático antes de ejecutar
- [ ] Dashboard web de progreso en tiempo real

### v3.0 (Visión)
- [ ] Aprendizaje de patrones (qué tareas suelen fallar)
- [ ] Auto-generación de planes de vuelo desde objetivos
- [ ] Ejecución paralela de tareas independientes
- [ ] Integración con CI/CD (deploy automático tras tests)

---

## ❓ FAQ

**P: ¿Qué pasa si Diego interrumpe el autopilot?**
R: El agente detecta nuevo mensaje, pausa inmediatamente, reporta progreso actual, y espera instrucciones.

**P: ¿Puede autopilot hacer deploys a Heroku?**
R: NO. Deploy requiere "verde nena" explícito cada vez. Autopilot solo llega hasta commits en git local.

**P: ¿Qué pasa si la tarea es ambigua?**
R: El agente pausa y pregunta: "Tarea X es ambigua. ¿Te refieres a [A] o [B]?"

**P: ¿Cómo sabe qué archivos tocar?**
R: Usa contexto del plan + memoria del proyecto (skill `coworkia-memory`) + búsqueda semántica si es necesario.

**P: ¿Qué pasa si el plan tiene 50 tareas?**
R: Autopilot trabaja en bloques. Después de cada bloque, hace checkpoint y pregunta si continuar.

**P: ¿Puede trabajar toda la noche sin supervisión?**
R: Técnicamente sí, pero NO recomendado. Máximo 2-3h (8-12 tareas) por sesión.

---

## ✅ CHECKLIST DE ACTIVACIÓN

Antes de activar autopilot:

- [ ] Plan de vuelo del día está actualizado
- [ ] Tareas son claras y específicas
- [ ] No hay dudas arquitectónicas pendientes
- [ ] DB está en estado estable (no hay migraciones a medio hacer)
- [ ] Tests pasan (npm test)
- [ ] Sin errores de compilación
- [ ] Diego tiene 2-3h disponibles para estar cerca (primeras veces)

---

**Última actualización**: 20 Mar 2026
**Versión**: 1.0
**Comando de activación**: `"autopilot verde nena"`
