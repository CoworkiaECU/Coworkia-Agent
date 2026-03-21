---
name: coworkia-guardian
description: Guardián de ejecuciones limpias. Verifica implementaciones antes de commitear, vigila integridad de migraciones en BD, detecta conflictos entre chats paralelos, y aplica un checklist de cero-fallas antes de cada deploy. Activar siempre al terminar un bloque de autopilot.
applyTo: "src/database/**,src/express-servidor/**,public/**/*.js,public/**/*.html"
---

# COWORKIA GUARDIAN — Guardián de Ejecuciones Limpias

## 🎯 Propósito

**Cero fallas en producción. Cero migraciones rotas. Cero conflictos entre chats.**

El Guardian se activa al terminar cada bloque de autopilot, antes de cada commit, y obligatoriamente antes de cada `git push heroku main`. Su trabajo es verificar que todo está ordenado, completo, y sin efectos secundarios antes de que el código llegue a producción.

---

## 🔒 CUÁNDO ACTIVAR

```
✅ Al terminar cada BLOQUE de autopilot (antes del commit)
✅ Antes de git push heroku main (siempre)
✅ Cuando dos chats trabajaron en paralelo (antes de merge)
✅ Cuando Diego dice "verifica", "revisa", o "están limpias las cosas"
✅ Después de cualquier migración de BD nueva
```

---

## 📋 CHECKLIST GUARDIAN — EJECUTAR EN ORDEN

### 1. 🗄️ INTEGRIDAD DE BASE DE DATOS

**Archivo clave**: `src/database/postgres-adapter.js`

**Verificar**:
```javascript
// ✅ CORRECTO: Siempre usar IF NOT EXISTS
ALTER TABLE tabla ADD COLUMN IF NOT EXISTS columna TEXT;

// ❌ INCORRECTO: Sin IF NOT EXISTS → rompe en segundo deploy
ALTER TABLE tabla ADD COLUMN columna TEXT;

// ✅ CORRECTO: Tablas con IF NOT EXISTS
CREATE TABLE IF NOT EXISTS tabla (...);

// ❌ INCORRECTO: Sin IF NOT EXISTS → error fatal en Heroku
CREATE TABLE tabla (...);
```

**Tablas existentes en producción** (NO recrear, NO renombrar):
```
users, reservations, interactions, pending_confirmations,
reservation_state, aurora_partial_reservations, aluna_partial_memberships,
axel_partial_quotes, paula_partial_visits, agent_forms, partial_forms,
conversation_history, insurance_leads, collision_quotes, axel_photo_sessions,
marketing_leads, legal_leads, real_estate_leads, property_visits,
membership_leads, membership_payments, reservation_payments,
agent_conversations, conversation_files, active_topics, wifi_codes,
aluna_prospect_followups, boss_quotes, campaigns
```

**Checklist BD**:
```
[ ] Toda nueva tabla usa CREATE TABLE IF NOT EXISTS
[ ] Todo nuevo campo usa ALTER TABLE ... ADD COLUMN IF NOT EXISTS
[ ] No se eliminan columnas existentes (solo se agregan)
[ ] No se cambia tipo de columna existente sin migración explícita
[ ] Nuevas columnas tienen DEFAULT para no romper filas existentes
[ ] Índices usan CREATE INDEX IF NOT EXISTS
[ ] Constraints usan ADD CONSTRAINT IF NOT EXISTS o bloque try/catch
```

---

### 2. 🖥️ INTEGRIDAD DE DASHBOARDS HTML/JS

**Regla crítica del proyecto**: Toda función llamada desde HTML (`onclick="funcion()"`) **DEBE** estar expuesta en el scope global como `window.funcion = function()`.

**Por qué**: Los archivos `.js` se cargan como módulos ES6 (`type="module"`). Las funciones locales no son accesibles desde el HTML. **Este es el bug más común del proyecto.**

**Verificar en cualquier dashboard nuevo o modificado**:
```javascript
// ✅ CORRECTO: expuesta en window
window.openModal = function() { ... }
window.sendFollowup = async function() { ... }
window.filterByStage = function(stage) { ... }

// ❌ INCORRECTO: no accesible desde onclick="" en HTML
function openModal() { ... }
const sendFollowup = async () => { ... }
```

**Checklist Dashboard**:
```
[ ] Cada función referenciada en onclick="" existe como window.función
[ ] No hay scripts inline en el HTML con funciones duplicadas que ya existen en .js externo
[ ] El archivo .js externo se carga ANTES de que el HTML lo invoque (script tag al final de body o defer)
[ ] No hay conflicto de nombres entre funciones del .js y window globals
[ ] Modales tienen z-index consistente con el resto (usar z-index: 9999 como estándar)
[ ] Formularios de modales incluyen reset en la función de apertura (openXModal)
```

**Comando de verificación rápida**:
```bash
# Buscar onclick en HTML que no tienen window. en el JS correspondiente
grep -o 'onclick="[^"]*"' public/[dashboard].html | \
  sed 's/onclick="//;s/(.*//' | \
  sort -u | \
  while read fn; do
    grep -q "window\.$fn" public/js/[dashboard]-dashboard.js || echo "❌ FALTA: window.$fn"
  done
```

---

### 3. 🔌 INTEGRIDAD DE ENDPOINTS API

**Regla**: Si un dashboard llama a `/api/agente/endpoint`, ese endpoint **DEBE** existir en `src/express-servidor/endpoints-api/[agente].js`.

**Verificar**:
```bash
# Buscar endpoints llamados en el JS del dashboard
grep -o "fetch('[^']*')" public/js/[dashboard]-dashboard.js

# Verificar que existen en el backend
grep -n "router\.\(get\|post\|put\|delete\).*'/api/[agente]" \
  src/express-servidor/endpoints-api/[agente].js
```

**Checklist Endpoints**:
```
[ ] Todos los fetch() en el frontend tienen su router.get/post en el backend
[ ] Los endpoints nuevos están registrados en index.js (import + app.use)
[ ] Endpoints devuelven { success: true, data: ... } en éxito
[ ] Endpoints devuelven { success: false, error: mensaje } en fallo
[ ] Ningún endpoint nuevo usa puerto diferente al principal
```

---

### 4. ⚡ INTEGRIDAD DE CRON JOBS

**Archivo**: `src/express-servidor/index.js`

**Checklist Crons**:
```
[ ] No hay dos crons con el mismo schedule y misma función
[ ] Cada cron tiene try/catch con console.error en el catch
[ ] Nuevos crons están DESPUÉS de los existentes (no interrumpir orden)
[ ] Nunca se eliminan crons existentes (solo agregar nuevos)
[ ] El schedule es válido (verificar en crontab.guru)
[ ] Variables de entorno que usa el cron están en Heroku config vars
```

---

### 5. 📦 INTEGRIDAD DE IMPORTS/EXPORTS

**El proyecto usa ES Modules (`"type": "module"` en package.json)**

**Checklist Imports**:
```
[ ] Todo import usa rutas relativas con extensión: import x from './servicio.js'
[ ] No hay require() mezclado con import (todo ES modules)
[ ] Nuevos archivos exportan con export default o export const
[ ] No se importa algo que no existe (verificar que el archivo destino tiene el export)
[ ] No hay imports circulares (A importa B, B importa A)
```

---

### 6. 🚀 PRE-DEPLOY FINAL

**Ejecutar estos comandos antes de `git push heroku main`**:

```bash
# 1. Verificar que el servidor arranca sin crashes
node --check src/express-servidor/index.js 2>&1 | head -20

# 2. Smoke test de sintaxis en todos los JS nuevos/modificados
node --check src/database/postgres-adapter.js
node --check src/servicios/[nuevo-servicio].js

# 3. Verificar que no hay console.log con datos sensibles
grep -r "console.log.*password\|console.log.*token\|console.log.*secret" src/ --include="*.js"

# 4. Verificar variables de entorno usadas (deben estar en Heroku)
grep -r "process.env\." src/ --include="*.js" | grep -v "NODE_ENV\|DATABASE_URL\|PORT" | \
  sed 's/.*process.env\.\([A-Z_]*\).*/\1/' | sort -u

# 5. Status git limpio
git status
git diff --stat HEAD
```

**Checklist Pre-Deploy**:
```
[ ] node --check no arroja errores
[ ] No hay datos sensibles en console.log
[ ] Variables de entorno nuevas ya están en heroku config:set
[ ] git status muestra solo los archivos que debería modificar este bloque
[ ] No hay archivos de debug, temp, o .bak accidentalmente incluidos
[ ] El commit message describe exactamente qué hace el bloque
```

---

## 🔍 DETECCIÓN DE CONFLICTOS ENTRE CHATS PARALELOS

Cuando dos chats trabajan en paralelo, el Guardian verifica **antes de pushear**:

```bash
# Ver qué archivos modificó el otro chat (commits recientes)
git log --oneline -5
git show --stat HEAD

# Verificar que no hay conflicto con index.js
git diff HEAD~1 HEAD -- src/express-servidor/index.js | head -30

# Verificar que no hay conflicto con postgres-adapter.js
git diff HEAD~1 HEAD -- src/database/postgres-adapter.js | head -30
```

**Archivos de alto riesgo** (siempre verificar antes de editar):
```
🔴 src/express-servidor/index.js         → todos los crons y rutas
🔴 src/database/postgres-adapter.js      → todas las migraciones
🟡 package.json                          → dependencias y scripts
🟡 src/express-servidor/endpoints-api/*  → endpoints por agente
🟢 public/**/*.html                      → dashboards (bajo riesgo)
🟢 public/**/*.js                        → JS de dashboards (bajo riesgo)
🟢 src/servicios/[nuevo-archivo].js      → archivos nuevos (sin conflicto)
```

**Regla de oro**:
```
Si el otro chat tocó index.js → pull primero, luego editar, luego push
Si el otro chat tocó postgres-adapter.js → pull primero, revisar columnas, luego push
```

---

## 🐛 BUGS RECURRENTES — REGISTRADOS Y PREVENIDOS

### Bug #1: Función inline duplicada en HTML (detectado 20 Mar 2026)
- **Síntoma**: Botón no responde o comportamiento inconsistente
- **Causa**: Función definida inline en `<script>` del HTML **Y** en el archivo `.js` externo. La inline sobreescribe o conflictúa con la del archivo.
- **Fix**: Eliminar todo `<script>` inline del HTML. Todo va en el `.js` externo como `window.funcion`.
- **Prevención**: `grep -n "<script>" public/[dashboard].html | grep -v "src="` debe devolver vacío.

### Bug #2: `window.selectCampaignChannel` vs `selectCampaignChannel` (detectado 20 Mar 2026)
- **Síntoma**: Botón WhatsApp de campaña no activa, typo en nombre de función
- **Causa**: HTML tenía `onclick="selectCampaignChannel('whatsapp')"` (minúscula) y el JS tenía `window.selectCampaignChannel` (correcto) pero con typo `'whatsApp'` (capital A) al comparar
- **Fix**: Consistencia en capitalización de parámetros string
- **Prevención**: Al crear funciones switch/canal, testear TODOS los valores posibles manualmente

### Bug #3: `ADD COLUMN` sin `IF NOT EXISTS` (patrón histórico)
- **Síntoma**: Deploy falla con "column already exists" en Heroku (segunda vez que se corre initDatabase)
- **Causa**: `ALTER TABLE t ADD COLUMN c TEXT` sin `IF NOT EXISTS`
- **Fix**: Siempre `ALTER TABLE t ADD COLUMN IF NOT EXISTS c TEXT`
- **Prevención**: Checklist BD paso 1 de este skill

### Bug #4: Tests de integración fallan sin DB local (detectado 20 Mar 2026)
- **Síntoma**: `npm test` → 13 failed con `Cannot read properties of null`
- **Causa**: Tests de integración requieren `DATABASE_URL` real. En local sin Postgres configurado, queries devuelven null.
- **Fix**: Solo correr `npm test -- tests/unit/` en local. Tests de integración se validan en Heroku.
- **Prevención**: Ver skill `coworkia-testing` → sección "Tests que no necesitan DB"

### Bug #5: Z-index de modal inconsistente
- **Síntoma**: Modal aparece detrás de otro elemento
- **Causa**: Z-index hardcodeado distinto en diferentes modales
- **Fix**: Usar siempre `z-index: 9999` para overlays de modal
- **Prevención**: Checklist Dashboard, item z-index

---

## ✅ FIRMA DEL GUARDIAN (INCLUIR EN COMMIT MESSAGE)

Cuando el Guardian aprueba, el commit message debe incluir:
```
✅ Guardian verificado: BD limpia | Endpoints OK | Window.* OK | Pre-deploy OK
```

Si algo falló y fue corregido:
```
🔧 Guardian: corregido [descripción del fix] | BD limpia | Endpoints OK | Pre-deploy OK
```

---

## 🔗 CUÁNDO ESCALAR A DIEGO

El Guardian **para y notifica a Diego** si detecta:
- Columna eliminada o tipo de columna cambiado en tabla existente
- Import de librería nueva no instalada
- Endpoint que requiere nueva variable de entorno no configurada
- Conflicto irresolvible entre dos chats sobre `index.js`
- Cualquier cambio a `package.json` con nueva dependencia

```
Mensaje a Diego:
"🛑 Guardian bloqueó el deploy: [razón específica]. Necesito tu aprobación para continuar."
```
