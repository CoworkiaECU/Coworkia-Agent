# ✈️ PLAN DE VUELO — LOPDP Compliance Coworkia
**Fecha**: 24 Mar 2026  
**Repos**: `coworkia-agent` (Heroku) + `WiFi Coworkia` (Mac Mini)  
**Magic Todo**: #38  
**Estado**: PENDIENTE

---

## 📋 CONTEXTO

La **Ley Orgánica de Protección de Datos Personales (LOPDP)** de Ecuador está en vigor desde 2023 y aplica a Coworkia porque:
- Recopila nombres, emails, teléfonos y cédulas de clientes (Adriana, Aluna, Aurora, Enzo)
- Captura IPs y MACs de usuarios WiFi
- Procesa conversaciones de WhatsApp
- Opera un portal WiFi cautivo donde se puede pedir consentimiento explícito

**Enfoque**: compliance mínimo y funcional — sin paralizar UX, sin popups molestos, flujo silencioso.

---

## 🎯 ALCANCE

| Sistema | Cambio | Prioridad |
|---------|--------|-----------|
| coworkia-agent | Página pública `/privacidad` con política completa | ALTA |
| coworkia-agent | Formulario ARCO `/privacidad/arco` + endpoint `POST /api/arco` | ALTA |
| coworkia-agent | BD tabla `arco_requests` | ALTA |
| coworkia-agent | Aviso silencioso en primer mensaje de todos los agentes WA | MEDIA |
| WiFi Coworkia | Campo nombre (requerido) + checkbox política en login | ALTA |
| WiFi Coworkia | BD columna `consent_given` en tabla `sessions` | ALTA |
| Caso Javier Troya | Borrar datos + registrar en ARCO | INMEDIATA |

---

## 📦 BLOQUE A — Política de Privacidad (coworkia-agent)
**Tiempo**: ~35min  
**Archivos a crear/modificar**:

### A1 — Crear `public/privacidad.html`
Página pública HTML con:
- **Secciones**: Quiénes somos / Qué datos recopilamos / Para qué los usamos / Con quién los compartimos / Tus derechos ARCO / Retención / Contacto
- **Estilo**: mismo look que `aurora-reservas-dark.html` (dark theme, responsive, mobile-first)
- **Link a formulario ARCO** al final: "Ejercer mis derechos" → `/privacidad/arco`
- **Empresa**: Coworkia Business Center, Ecuador
- **Email responsable**: `coworkia.ec@gmail.com`
- **URL del sistema**: `https://coworkia-agent-e97d15dac56f.herokuapp.com/`

**Datos a declarar en la política**:
```
- Agentes conversacionales (Aurora, Adriana, Aluna, Enzo): nombre, email, teléfono, 
  información vehicular, información de membresía, cédula (Adriana), conversaciones WA
- Portal WiFi: nombre, MAC address, IP, historial de sesión
- Propósito: prestación del servicio de coworking y agendamiento
- Base legal: consentimiento + ejecución de contrato
- Retención: 2 años desde última interacción
- Terceros: OpenAI (procesamiento IA), Wassenger (mensajería), Heroku (infraestructura)
- País: Ecuador, LOPDP vigente desde 2023
```

### A2 — Crear `public/privacidad-arco.html`
Página con formulario de derechos ARCO (Acceso, Rectificación, Cancelación, Oposición):
- **Campos**: Nombre completo, email, teléfono, tipo de solicitud (select: Acceso/Rectificación/Cancelación/Oposición), descripción libre
- **Submit** llama a `POST /api/arco`
- **Confirmación**: "Recibimos tu solicitud. Te contactaremos en 15 días hábiles a [email]."

### A3 — Crear `src/routes/privacidad.js`
```js
// GET /privacidad → sirve public/privacidad.html
// GET /privacidad/arco → sirve public/privacidad-arco.html
// POST /api/arco → guarda en BD + notifica Diego WA
```

**Lógica del `POST /api/arco`**:
1. Validar campos (nombre, email, tipo son requeridos)
2. Insertar en tabla `arco_requests` (ver A4)
3. Enviar WA a Diego: "⚖️ Nueva solicitud ARCO: [tipo] de [nombre] ([email]). ID: #[id]"
4. Responder `{ ok: true, requestId, message: "Solicitud recibida. Responderemos en 15 días hábiles." }`

### A4 — Migración BD: tabla `arco_requests`
```sql
CREATE TABLE IF NOT EXISTS arco_requests (
  id SERIAL PRIMARY KEY,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('acceso','rectificacion','cancelacion','oposicion')),
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL,
  phone VARCHAR(50),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','processing','resolved')),
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
Ejecutar en Heroku PostgreSQL al iniciar si no existe (mismo patrón que otras tablas).

### A5 — Registrar rutas en `server.js` o `src/app.js`
```js
import privacidadRoutes from './src/routes/privacidad.js';
app.use('/', privacidadRoutes);
```

---

## 📦 BLOQUE B — Consentimiento silencioso en agentes WA (coworkia-agent)
**Tiempo**: ~25min  
**Objetivo**: En el **primer mensaje** de cada agente a un nuevo contacto, añadir al pie una línea de aviso de privacidad.

**Texto del aviso** (se añade al final del primer mensaje del agente, como pie):
```
_Coworkia trata tus datos según nuestra Política de Privacidad: https://coworkia-agent-e97d15dac56f.herokuapp.com/privacidad_
```

**Regla de "primer mensaje"**: El aviso solo se añade cuando el lead/session se acaba de crear (no existe en BD antes de este mensaje). No se repite nunca.

**Archivos a modificar** (identificar en qué función se envía el primer mensaje de bienvenida en cada agente):

| Agente | Archivo a revisar | Función clave |
|--------|-----------------|---------------|
| Aurora | `src/agentes/aurora-handler.js` o `src/servicios/aurora-*.js` | primer mensaje de bienvenida a reserva |
| Adriana | `src/agentes/adriana-handler.js` o similar | mensaje inicial del flujo de cotización |
| Aluna | `src/agentes/aluna-handler.js` o similar | primer mensaje de bienvenida membresía |
| Enzo | `src/agentes/enzo-handler.js` o similar | primer mensaje del flujo de cotización |

**Implementación**: buscar el punto donde se genera el texto del mensaje de inicio y añadir la línea al final. Si el mensaje es generado por OpenAI, añadirlo como post-proceso en el código JS antes de enviar (no en el prompt).

---

## 📦 BLOQUE C — Portal WiFi (WiFi Coworkia — Mac Mini)
**Tiempo**: ~40min  
**Nota**: Este repo es local en el Mac Mini. El agente puede hacer los cambios y commit, pero **el deploy (copiar archivos o reiniciar server) lo hace Diego manualmente** en el Mac Mini.

### C1 — Modificar `public/login.html`
Agregar debajo del campo `clientName`:
```html
<div class="form-group">
  <label for="clientPhone">Tu Teléfono (opcional)</label>
  <input type="tel" id="clientPhone" name="clientPhone" 
         placeholder="Ej: 0991234567" inputmode="numeric" autocomplete="off">
</div>

<div class="form-group consent-group">
  <label class="consent-label">
    <input type="checkbox" id="privacyConsent" name="privacyConsent" required>
    <span>Acepto la <a href="https://coworkia-agent-e97d15dac56f.herokuapp.com/privacidad" target="_blank">Política de Privacidad</a> de Coworkia</span>
  </label>
</div>
```

El campo nombre `clientName` debe cambiar a **requerido** (quitar `optional` del label).

### C2 — Modificar `public/js/login.js`
- Agregar `clientPhone` al body del fetch de `/auth/validate`
- Validar que `privacyConsent` esté marcado antes de submit (el HTML `required` lo hace, pero doble check en JS)

### C3 — Modificar `routes/auth.js`
- Agregar `clientPhone` y `consentGiven` al destructuring del body
- Guardar `consent_given = true` y `consent_timestamp = NOW()` en la sesión

### C4 — Migración BD WiFi: columnas en `sessions`
El `db.js` usa SQLite better-sqlite3. Agregar:
```sql
ALTER TABLE sessions ADD COLUMN client_phone TEXT;
ALTER TABLE sessions ADD COLUMN consent_given INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN consent_at TEXT;
```
Hacerlo con `try/catch` por si las columnas ya existen.

### C5 — Actualizar `database/db.js`
En el `CREATE TABLE sessions IF NOT EXISTS`, agregar las columnas nuevas para que funcionen en instalaciones frescas.

---

## 📦 BLOQUE D — Caso Javier Troya (Derecho de Cancelación)
**Tiempo**: ~10min  
**Urgencia**: Hacer primero o al menos el mismo día

**Qué hacer**:
1. Buscar en `insurance_leads` el registro de Javier Troya: `SELECT * FROM insurance_leads WHERE client_name ILIKE '%troya%'`
2. Registrar la solicitud en `arco_requests` (una vez que exista la tabla del Bloque A):
   ```sql
   INSERT INTO arco_requests (request_type, full_name, email, description, status, resolved_at)
   VALUES ('cancelacion', 'Javier Troya', '[email si se conoce]', 'Solicitud ejercida el 23 Mar 2026', 'resolved', NOW());
   ```
3. Borrar el registro: `DELETE FROM insurance_leads WHERE client_name ILIKE '%troya%'`
4. Notificar a Diego por WA confirmando que el caso Javier Troya está resuelto

---

## 📦 BLOQUE E — Testing y Deploy
**Tiempo**: ~15min

### E1 — Tests básicos
- `GET /privacidad` → 200, HTML
- `GET /privacidad/arco` → 200, HTML  
- `POST /api/arco` con body completo → 201, `{ ok: true, requestId: N }`
- `POST /api/arco` sin nombre → 400

### E2 — Deploy coworkia-agent
```bash
git add -A
git commit -m "feat(lopdp): política privacidad + ARCO endpoint + aviso silencioso agentes"
git push heroku main
heroku logs --app coworkia-agent --num 20
```

### E3 — Deploy WiFi Coworkia (manual por Diego)
```bash
# Diego ejecuta en Mac Mini:
cd /Users/diegovillota/WiFi\ Coworkia
git pull
# Reiniciar server si es necesario
```
El agente hace el commit del repo WiFi pero Diego hace el pull/restart en el Mac Mini.

---

## 🗓️ ORDEN DE EJECUCIÓN

```
1. BLOQUE A1+A2+A3+A4+A5  (política + ARCO backend)  — 35min
2. BLOQUE B                (aviso silencioso agentes)  — 25min
3. BLOQUE C                (portal WiFi)               — 40min
4. BLOQUE D                (caso Javier Troya)         — 10min
5. BLOQUE E                (testing + deploy)          — 15min
─────────────────────────────────────────────────────────────────
   TOTAL                                               ~2h 05min
```

---

## 🔑 DATOS CLAVE PARA IMPLEMENTACIÓN

| Variable | Valor |
|----------|-------|
| Email ARCO | `coworkia.ec@gmail.com` |
| URL pública | `https://coworkia-agent-e97d15dac56f.herokuapp.com` |
| Empresa | Coworkia Business Center |
| País | Ecuador |
| Ley | LOPDP (Ley Orgánica de Protección de Datos Personales) |
| Retención datos | 2 años desde última interacción |
| Plazo respuesta ARCO | 15 días hábiles |
| Terceros a declarar | OpenAI, Wassenger, Heroku |
| Notificación Diego | `process.env.DIEGO_PERSONAL_PHONE` vía Wassenger |

---

## ⚠️ NOTAS IMPORTANTES

1. **No hay dominio propio** — la URL de la política es la de Heroku. Si después registran `coworkia.ec`, actualizar el link en todos los mensajes.
2. **Cédulas de Adriana**: son imágenes subidas via Vision AI — almacenar solo los datos extraídos (nombre, número), no guardar las imágenes indefinidamente. Por ahora declarar en política pero no implementar borrado automático (siguiente fase).
3. **Footer del portal**: cambiar `"El sistema IA de Coworkia está creado por MarketingLab / OneMind"` → `"Coworkia Business Center | Política de Privacidad"` con link. Aplica en `login.html` del WiFi.
4. **Aviso WA silencioso**: una sola línea en cursiva al pie — nunca interrumpir el flujo conversacional. No preguntar "¿aceptas?", solo informar.
5. **El `consent_given` del WiFi es el más crítico** legalmente porque el WiFi captura MAC address (dato identificador de dispositivo = dato personal bajo LOPDP).
