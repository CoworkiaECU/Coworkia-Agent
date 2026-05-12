# Plan de Vuelo — Paula Multi-Cliente & Expansión Mayo 2026
# Agente: PAULA | Creado: 2026-05-11 | Torre de Control
# Última actualización: 2026-05-12 | v1255 en producción

## Estado de producción
- **v1251**: Visit days Martes/Jueves/Sábado + regla en system prompt ✅
- **v1252**: DB multi-cliente (4 migraciones) + paulaRepository.js + dashboard C1/C2/C3 + send-brochure API ✅
- **v1253**: Logo PropElite SVG + esquema colores negro/plata en 7 templates ✅
- **v1254**: Tipografías Cormorant Garamond + Jost, footer sin teléfono, @Paula CTAs, copys cálidos ✅
- **v1255**: Footer unificado `REAL ESTATE` en los 7 templates y preview ✅

## Objetivo
Convertir a Paula de agente de un solo proyecto (Casas Jardín) a plataforma multi-cliente
de bienes raíces. Coworkia es el proveedor del bot; los clientes (inmobiliarias / propietarios)
son externos. No mezclar branding de clientes entre sí.

## Contexto actual
- Paula ya maneja Ecuador 🇪🇨 + República Dominicana 🇩🇴
- Proyecto actual hardcodeado: "Casas Jardín - El Morenal" 
- PropElite es el nombre de marca del bot (cliente actual = Casas Jardín)
- Email reply system: YA EXISTE (`email-reply-reader.js` + cron cada 10min) — solo falta E2E test
- Horarios visitas: Lun–Sáb 09:00–18:00, slots 10/11/15/16/17h

---

## BLOQUE A — Multi-cliente: estructura DB + routing ✅ COMPLETADO v1252
> Tiempo estimado: 3-4h | Ejecutar en Chat 1

### A1 — Tabla `real_estate_clients` (clientes de Paula)
```sql
CREATE TABLE real_estate_clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,          -- 'casas-jardin', 'propelite-rd', etc.
  name        TEXT NOT NULL,                 -- nombre visible al cliente
  brand_name  TEXT,                          -- nombre en emails (puede diferir)
  country     TEXT DEFAULT 'ec',             -- 'ec' | 'do'
  wa_number   TEXT,                          -- número WA del agente receptor
  email_from  TEXT,                          -- email remitente para este cliente
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```
- Migración segura: si ya existe, skip
- Insertar cliente inicial: `casas-jardin` con datos actuales

### A2 — Columna `real_estate_client_id` en `paula_leads` y `property_visits`
```sql
ALTER TABLE paula_leads ADD COLUMN IF NOT EXISTS real_estate_client_id UUID REFERENCES real_estate_clients(id);
ALTER TABLE property_visits ADD COLUMN IF NOT EXISTS real_estate_client_id UUID REFERENCES real_estate_clients(id);
```

### A3 — `paulaRepository.js`: añadir `getClientBySlug()` y `getDefaultClient()`
```js
export async function getClientBySlug(slug) { ... }
export async function getDefaultClient() { ... } // retorna casas-jardin por defecto
```

### A4 — `paula.js` (deteccion-intenciones): hacer proyectoActual dinámico
- Leer cliente desde `profile.paulaClientId` o usar default
- Pasar `clientContext` al system prompt en lugar de valores hardcoded
- NO romper flujo actual — el fallback es Casas Jardín

---

## BLOQUE B — Multi-cliente: catálogo de propiedades dinámico ✅ COMPLETADO v1252
> Tiempo estimado: 2h | Ejecutar en Chat 1

### B1 — Tabla `real_estate_properties`
```sql
CREATE TABLE real_estate_properties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID REFERENCES real_estate_clients(id),
  code            TEXT NOT NULL,             -- 'CJ-001', 'PRD-A12'
  name            TEXT NOT NULL,
  type            TEXT,                      -- 'casa', 'dpto', 'oficina', 'terreno'
  operation       TEXT,                      -- 'venta', 'arriendo'
  price_usd       NUMERIC,
  city            TEXT,
  country         TEXT DEFAULT 'ec',
  address         TEXT,
  maps_url        TEXT,
  description     TEXT,
  features        JSONB,                     -- { rooms, bathrooms, m2, parking, ... }
  brochure_url    TEXT,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### B2 — Migrar propiedades de Casas Jardín al nuevo sistema
- Las 4 casas de El Morenal actualmente en `paula.js` → INSERT en `real_estate_properties`

### B3 — `paulaRepository.js`: `searchProperties(filters)`, `getPropertyByCode(code, clientId)`

---

## BLOQUE C — Dashboard Paula multi-cliente ✅ COMPLETADO v1252
> Tiempo estimado: 2.5h | Ejecutar en Chat 2

### C1 — Badge de lead score en pipeline del dashboard
- `paula-lead-scoring.js` ya calcula score (`🔥 Hot / 🌡️ Warm / ❄️ Cold`)
- En `public/paula-inmobiliaria.html`: añadir badge al lado del nombre del lead
- Color: rojo (#ef4444) = Hot, naranja (#f97316) = Warm, azul (#3b82f6) = Cold
- Query: `SELECT pl.*, pls.score, pls.tier FROM paula_leads pl LEFT JOIN paula_lead_scores pls ON pl.id = pls.lead_id`

### C2 — Timeline de follow-ups por lead
- En el panel de detalle del lead: mostrar cronología
  - 📤 Brochure enviado (timestamp)
  - ⏳ Follow-up 24h (pending / sent / replied)
  - ⏳ Follow-up 3 días (pending / sent / replied)
  - 📅 Visita agendada (si aplica)
- Fuente: tabla `paula_followups` + `property_visits`

### C3 — Botón "Enviar Brochure" desde dashboard
- Botón en tabla de leads: `POST /api/paula/send-brochure?leadId=xxx`
- Endpoint llama `sendBrochureEmail()` de `paula-followup-service.js`
- Confirmar con modal antes de enviar (evitar envíos dobles)
- Deshabilitar botón si brochure ya fue enviado (`brochure_sent_at IS NOT NULL`)

---

## BLOQUE D — Email Reply System: test E2E con Paula ⏳ PENDIENTE
> Tiempo estimado: 1h | Ejecutar en Chat 1

### D1 — Test manual del flujo completo
El sistema ya existe. Verificar:
1. `email-reply-reader.js`: pattern Paula = `/inmobiliaria|propiedad|real\s+estate|PAU-/i`
2. Enviar email de prueba respondiendo a un email de Paula
3. `GET /api/email-replies/poll` → verificar que detecta el reply y lo enruta a Paula
4. Confirmar que el mensaje llega al WhatsApp del lead por Wassenger

### D2 — Compatibilidad MIUI/Xiaomi para email brochure
Ref: `documentacion/FIX-HTML-XIAOMI-TODO56.md`
- Verificar que `generateBrochureEmail()` en `paula-followup-service.js` sigue las reglas:
  - Sin `background-image` en contenedores principales
  - Colores con fallback: `background-color:#1A2744;background:linear-gradient(...)`  
  - Sin `display:flex` ni `grid`
  - Tablas para estructura si es necesario en el cuerpo del brochure
- Crear `public/preview-brochure-email-paula.html` para validar visualmente

---

## BLOQUE E — Branding PropElite en emails ✅ COMPLETADO v1253–v1255

### E1 — Logo PropElite SVG ✅
- `public/images/logos/propelite.svg` — SVG con gradiente metálico plata
- URL: `https://coworkia-agent-e97d15dac56f.herokuapp.com/images/logos/propelite.svg`

### E2 — Templates actualizados (v1253–v1255) ✅
- 7 templates en `src/servicios/email-templates-paula.js`
- Logo SVG en header de los 7 + fallback MSO
- Colores: negro (#0A0A0A / #111111) + plata (#C0C0C0 / #B0B0B0)
- Tipografías: Cormorant Garamond (headings) + Jost (body/labels)
- Footer unificado en todos: `REAL ESTATE` · noreply@coworkia.ec · 🇪🇨 Ecuador · Atendido por @Paula
- Sin teléfono visible en footer
- CTAs con @Paula: `ESCRIBIR A @PAULA`, `CONFIRMAR CON @PAULA`, etc.
- Copys cálidos en los 7 templates (v1254)

---

## Criterios de salida

| Bloque | Criterio | Estado |
|--------|----------|--------|
| A | `real_estate_clients` existe, flujo Paula no se rompe | ✅ v1252 |
| B | 4 propiedades Casas Jardín migradas a DB | ✅ v1252 |
| C1 | Badges visibles en dashboard pipeline | ✅ v1252 |
| C2 | Timeline aparece en panel de lead | ✅ v1252 |
| C3 | Botón envía brochure, no duplica si ya enviado | ✅ v1252 |
| D1 | Poll IMAP detecta reply Paula, enruta correctamente | ⏳ pendiente |
| D2 | Brochure email renderiza en MIUI sin bloques blancos | ⏳ pendiente |
| E | Logo + branding en 7 templates, footer unificado | ✅ v1253–v1255 |

## Próxima sesión — arrancar desde aquí
**BLOQUE D** — Email Reply E2E test + compatibilidad MIUI
