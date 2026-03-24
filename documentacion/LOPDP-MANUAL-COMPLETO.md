# 🔐 Manual LOPDP — Coworkia Business Center
**Versión**: 1.0  
**Fecha implementación**: 24 Mar 2026  
**Auditoría**: 11/11 puntos ✅  
**Repos**: `coworkia-agent` (Heroku) + `wifi-portal-coworkia` (Mac Mini)

---

## 1. ¿Qué es la LOPDP y por qué aplica a Coworkia?

La **Ley Orgánica de Protección de Datos Personales** (LOPDP) de Ecuador está en vigor desde mayo 2023. Es el equivalente local del GDPR europeo.

Aplica a Coworkia porque el sistema recopila y procesa datos personales de clientes:

| Sistema | Datos recopilados |
|---------|-------------------|
| Aurora (reservas WA) | Nombre, teléfono, fecha/hora de visita |
| Adriana (seguros) | Nombre, cédula, email, matrícula vehicular |
| Aluna (membresías) | Nombre, email, empresa, presupuesto |
| Enzo (cotizaciones) | Nombre, empresa, email |
| Portal WiFi       | Nombre, MAC address, IP, teléfono (opcional) |

**Base legal**: consentimiento informado + ejecución del servicio contratado.

---

## 2. Arquitectura del sistema LOPDP

```
┌─────────────────────────────────────────────────────────────┐
│                    COWORKIA-AGENT (Heroku)                   │
│                                                             │
│  WhatsApp ──► Aurora (primer contacto)                       │
│                 │                                            │
│                 ▼                                            │
│         [ Aviso silencioso LOPDP ]  ← solo 1 vez           │
│            "Coworkia trata tus datos..."                     │
│                 │                                            │
│      ┌──────────┴──────────┐                                 │
│      ▼                     ▼                                 │
│   Adriana              Aluna/Enzo                            │
│  (seguros)            (membresías)                           │
│      │                                                       │
│      └──► DELETE /api/adriana/leads/:code  (ARCO Cancelación)│
│                                                             │
│  GET  /links           → Página pública bio Instagram        │
│  GET  /privacidad      → Política de privacidad completa     │
│  GET  /privacidad/arco → Formulario derechos ARCO            │
│  POST /api/arco        → Recibir + guardar + notificar Diego  │
│                                                             │
│  PostgreSQL: tabla arco_requests (solicitudes LOPDP)        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  WIFI-PORTAL-COWORKIA (Mac Mini)             │
│                                                             │
│  Cliente conecta WiFi ──► Portal cautivo (login.html)        │
│                                ▼                            │
│                  [ Checkbox LOPDP required ]                 │
│                  "Acepto la Política de Privacidad"          │
│                                ▼                            │
│              SQLite: sessions (consent_given, consent_at)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Los 4 derechos ARCO

La LOPDP garantiza a toda persona los derechos **A**cceso, **R**ectificación, **C**ancelación y **O**posición:

| Derecho | Significado | Plazo legal |
|---------|-------------|-------------|
| **Acceso** | El cliente puede pedir ver todos sus datos almacenados | 15 días hábiles |
| **Rectificación** | Puede pedir corregir datos incorrectos o desactualizados | 15 días hábiles |
| **Cancelación** | Puede pedir borrar completamente sus datos | 15 días hábiles |
| **Oposición** | Puede limitar o bloquear el uso de sus datos para ciertos fines | 15 días hábiles |

**Email de contacto legal**: `coworkia.ec@gmail.com`

---

## 4. Componentes implementados

### 4.1 Aviso silencioso en WhatsApp
**Archivo**: `src/express-servidor/endpoints-api/wassenger.js` (~línea 3439)

El sistema añade automáticamente una nota al **primer mensaje** que Aurora envía a cada contacto nuevo. Solo ocurre una vez por número de teléfono.

```javascript
if (resultado.agenteKey === 'AURORA' && profile.firstVisit === true) {
  finalReply += '\n\n_Coworkia trata tus datos con confidencialidad según la LOPDP. '
    + 'Más info: https://coworkia-agent-e97d15dac56f.herokuapp.com/privacidad_';
}
```

**Texto visible para el cliente**:
> _Coworkia trata tus datos con confidencialidad según la LOPDP. Más info: [url]_

**¿Cómo sabe que es el primer contacto?**  
Cada perfil en BD tiene el campo `firstVisit`. Comienza en `true`. Después del primer mensaje de Aurora, se actualiza a `false`. A partir de ahí nunca más se muestra el aviso.

---

### 4.2 Página de Política de Privacidad
**URL**: `https://coworkia-agent-e97d15dac56f.herokuapp.com/privacidad`  
**Archivo HTML**: `public/privacidad.html`  
**Ruta Express**: `GET /privacidad` en `privacidad.js`

Contenido declarado:
- Responsable del tratamiento: Coworkia Business Center, Ecuador
- Datos que se recopilan (por agente)
- Finalidad del tratamiento
- Proveedores terceros: OpenAI, Wassenger, Heroku
- Período de retención: 2 años desde última interacción
- Derechos ARCO y cómo ejercerlos
- Email de contacto legal

---

### 4.3 Formulario ARCO
**URL**: `https://coworkia-agent-e97d15dac56f.herokuapp.com/privacidad/arco`  
**Archivo HTML**: `public/privacidad-arco.html`  
**API endpoint**: `POST /api/arco`  
**Archivo backend**: `src/express-servidor/endpoints-api/privacidad.js`

**Flujo cuando un cliente ejerce un derecho ARCO:**
1. Entra al formulario vía `/privacidad/arco` o desde el link de Instagram
2. Selecciona el tipo: Acceso / Rectificación / Cancelación / Oposición
3. Completa: nombre completo, email, teléfono (opcional), descripción
4. Envía el formulario → `POST /api/arco`
5. El sistema:
   - ✅ Valida los campos
   - ✅ Guarda en tabla `arco_requests` (PostgreSQL)
   - ✅ Envía WhatsApp a Diego con todos los datos
   - ✅ Devuelve número de solicitud al cliente
6. Diego debe responder en **máximo 15 días hábiles**

**Validaciones del endpoint**:
```
requestType: 'acceso' | 'rectificacion' | 'cancelacion' | 'oposicion'
fullName: mínimo 2 caracteres (requerido)
email: formato válido (requerido)
description: mínimo 10 caracteres (requerido)
phone: texto libre (opcional)
```

---

### 4.4 Base de datos — tabla arco_requests
**BD**: PostgreSQL (Heroku)  
**Migración**: `src/database/migrations/003_arco_requests.js`  
**Aplicada en producción**: 24 Mar 2026

```sql
CREATE TABLE arco_requests (
  id             SERIAL PRIMARY KEY,
  request_type   VARCHAR(20) NOT NULL CHECK (request_type IN ('acceso','rectificacion','cancelacion','oposicion')),
  full_name      VARCHAR(200) NOT NULL,
  email          VARCHAR(200) NOT NULL,
  phone          VARCHAR(50),
  description    TEXT,
  status         VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','processing','resolved')),
  resolved_at    TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices**: `email`, `status` — para búsqueda rápida.

---

### 4.5 Borrado de datos (Cancelación ARCO) — Adriana
**Endpoint**: `DELETE /api/adriana/leads/:code`  
**Archivo**: `src/express-servidor/endpoints-api/adriana-dashboard.js`

Para ejercer el derecho de cancelación de un lead de seguros:
```bash
curl -X DELETE https://coworkia-agent-e97d15dac56f.herokuapp.com/api/adriana/leads/INS-XX-XXX
```

El sistema borra el registro de `insurance_leads` y registra en logs con prefijo `[ADRIANA-ARCO]`.

---

### 4.6 Portal WiFi — Consentimiento explícito
**Repo**: `wifi-portal-coworkia`  
**Archivo login**: `public/login.html`  
**Backend**: `routes/auth.js`  
**BD**: SQLite `database/coworkia.db`, tabla `sessions`

Cada usuario que se conecta al WiFi de Coworkia ve:
> ☑ Acepto la **Política de Privacidad** de Coworkia y autorizo el tratamiento de mis datos para el acceso al servicio WiFi.

El checkbox es `required` — **no se puede conectar sin aceptarlo**.

**Datos guardados en `sessions`**:
```sql
client_phone    TEXT        -- teléfono (opcional)
consent_given   INTEGER     -- 0 o 1
consent_at      TEXT        -- timestamp ISO 8601
```

---

### 4.7 Página de links (Bio Instagram)
**URL**: `https://coworkia-agent-e97d15dac56f.herokuapp.com/links`  
**Archivo**: `public/links.html`

Página pública estilo Linktree con:
- Reserva tu espacio → WhatsApp Aurora
- Membresías → WhatsApp Aluna
- Escríbenos por WhatsApp
- Cómo llegar → Google Maps
- 🔒 Política de Privacidad → `/privacidad`

---

## 5. Flujo completo por canal de entrada

### Canal WhatsApp
```
1. Cliente escribe por primera vez
2. Aurora responde + añade aviso LOPDP al final
3. profile.firstVisit = false (nunca más el aviso)
4. Si el cliente pide borrar sus datos → va a /privacidad/arco
5. Diego recibe WA con la solicitud → 15 días para responder
```

### Canal WiFi
```
1. Cliente conecta al WiFi Coworkia
2. Portal cautivo intercepta → muestra login.html
3. Cliente llena nombre + (teléfono opcional) + acepta checkbox LOPDP
4. Sistema guarda consent_given=1 en SQLite
5. Cliente accede a internet
```

### Canal Instagram
```
1. Cliente ve IG de Coworkia → link en bio → /links
2. Desde /links puede acceder a /privacidad
3. Desde /privacidad puede ir a /privacidad/arco
4. Ejercer derechos ARCO → notificación a Diego
```

---

## 6. Procedimiento operativo para Diego (SOP)

### Cuando llega una solicitud ARCO por WhatsApp:
1. Recibes un mensaje: _"⚖️ Nueva solicitud ARCO #X"_
2. Identifica el tipo: Acceso / Rectificación / Cancelación / Oposición
3. Tienes **15 días hábiles** para responder al email del solicitante
4. Si es Cancelación de lead Adriana:
   ```
   DELETE https://..../api/adriana/leads/:code
   ```
5. Actualiza el estado en la BD si tienes acceso directo al dashboard

### Consultar solicitudes ARCO pendientes:
```sql
-- En Heroku Postgres
SELECT id, request_type, full_name, email, status, created_at
FROM arco_requests
WHERE status = 'pending'
ORDER BY created_at ASC;
```

### Marcar solicitud como resuelta:
```sql
UPDATE arco_requests
SET status = 'resolved', resolved_at = NOW(), notes = 'Respondido por email'
WHERE id = :id;
```

---

## 7. Archivos clave — índice rápido

| Archivo | Función LOPDP |
|---------|---------------|
| `src/express-servidor/endpoints-api/wassenger.js` | Aviso silencioso primer contacto (~L3439) |
| `src/express-servidor/endpoints-api/privacidad.js` | Rutas /privacidad, /privacidad/arco, POST /api/arco |
| `src/express-servidor/endpoints-api/adriana-dashboard.js` | DELETE /api/adriana/leads/:code |
| `src/database/migrations/003_arco_requests.js` | Migración tabla arco_requests |
| `src/express-servidor/index.js` | Registro del router privacidadRouter |
| `public/privacidad.html` | Página política completa |
| `public/privacidad-arco.html` | Formulario ARCO |
| `public/links.html` | Página links Instagram |
| `WiFi/public/login.html` | Checkbox consentimiento WiFi |
| `WiFi/routes/auth.js` | Guardado consent_given/at/phone |
| `WiFi/database/db.js` | Schema + migraciones SQLite |

---

## 8. URLs en producción

| URL | Descripción |
|-----|-------------|
| `.../links` | Bio Instagram |
| `.../privacidad` | Política de privacidad |
| `.../privacidad/arco` | Formulario derechos ARCO |
| `POST .../api/arco` | API solicitudes ARCO |
| `DELETE .../api/adriana/leads/:code` | Borrado lead Adriana |

Base: `https://coworkia-agent-e97d15dac56f.herokuapp.com`

> ⚠️ Cuando se registre el dominio `coworkia.ec`, actualizar la URL base en:
> - `wassenger.js` (aviso silencioso)
> - `privacidad.html` (footer)
> - `WiFi/public/login.html` (link en checkbox)

---

## 9. Historial de cambios

| Fecha | Versión | Cambio |
|-------|---------|--------|
| 24 Mar 2026 | v1.0 | Implementación completa LOPDP en ambos repos |
| 24 Mar 2026 | — | Caso real ARCO: Javier Troya (cancelación, lead INS-JT-001 borrado) |
| 24 Mar 2026 | — | Página /links para bio Instagram |

---

## 10. Auditoría de implementación (24 Mar 2026)

| Componente | Estado |
|------------|--------|
| Aviso silencioso WhatsApp (Aurora, firstVisit) | ✅ OK |
| Rutas /privacidad y /privacidad/arco | ✅ OK |
| POST /api/arco con validación + BD + notificación | ✅ OK |
| Tabla arco_requests (PostgreSQL) con constraints | ✅ OK |
| Router registrado en index.js | ✅ OK |
| privacidad.html con email y ARCO | ✅ OK |
| privacidad-arco.html con 4 derechos | ✅ OK |
| links.html con link a privacidad | ✅ OK |
| login.html WiFi con checkbox required | ✅ OK |
| auth.js guarda consent_given, consent_at, phone | ✅ OK |
| db.js columnas + ALTER TABLE migrations | ✅ OK |
| DELETE /api/adriana/leads/:code | ✅ OK |

**Resultado: 12/12 ✅ — Sistema LOPDP 100% operativo**
