# Auditoría de Código Duplicado — Coworkia Agent
**Fecha:** 9 abril 2026  
**Estado:** Inventario completo — sin refactorizar

---

## 1. Service Label / Service Type Formatters
**INSTANCIAS: 8**

| # | Archivo | Línea | Función | Keys soportadas | Fallback |
|---|---------|-------|---------|-----------------|----------|
| 1 | `src/servicios/aurora-followup-service.js` | L134 | `getServiceLabel()` | snake_case: `sala_reunion, oficina_privada, hot_desk, evento, coworking` | `serviceType \|\| 'espacio'` |
| 2 | `src/servicios/aurora-followup-service.js` | L211 | `getServiceLabelLegacy()` | camelCase + snake_case: `hotDesk, meetingRoom, hot_desk, meeting_room, private_office, deskIndividual` | `'Espacio'` |
| 3 | `src/servicios/email.js` | L53 | `formatServiceType()` | camelCase: `hotDesk, meetingRoom, salaReuniones` | raw `serviceType` |
| 4 | `src/servicios/payment-receipts.js` | L643 | `formatServiceType()` | camelCase: `hotDesk, meetingRoom, privateOffice` | raw `serviceType` |
| 5 | `src/servicios/google-calendar.js` | L155 | `serviceNames = {}` inline | camelCase: `hotDesk, meetingRoom, privateOffice` | — |
| 6 | `src/express-servidor/endpoints-api/aurora-dashboard.js` | L805 | `serviceNames = {}` inline | camelCase: `hotDesk, meetingRoom, deskIndividual` | raw type |
| 7 | `src/express-servidor/endpoints-api/aurora-dashboard.js` | L833 | `serviceNames = {}` inline (2nd copy) | camelCase: `hotDesk, meetingRoom, deskIndividual` | raw type |
| 8 | `public/js/aurora-dashboard.js` | L305 | `getServiceBadge()` (frontend) | camelCase + snake_case: `hotDesk, hot_desk, meetingRoom, meeting_room, deskIndividual, private_office` | `'Espacio'` |

**RECOMENDACIÓN:** Consolidar #1-#7 (backend) en `src/utils/service-labels.js` exportando `getServiceLabel(type)` con cobertura completa (camelCase + snake_case). Frontend (#8) mantener separado (standalone page). Las 2 inline maps en aurora-dashboard.js endpoint son idénticas → extraer a una sola const.

---

## 2. formatDate / formatDateEs (fechas en español)
**INSTANCIAS: 13**

| # | Archivo | Línea | Función | Formato salida |
|---|---------|-------|---------|---------------|
| 1 | `src/servicios/aurora-followup-service.js` | L203 | `formatDateEs()` | `"martes 9 de abril"` (backend, manual) |
| 2 | `public/js/aurora-dashboard.js` | L119 | `formatDate()` | `"Hoy" / "Ayer" / "Hace N días" / dd-MMM-yyyy` |
| 3 | `public/js/aurora-dashboard.js` | L143 | `formatSimpleDate()` | `dd-MMM-yyyy` |
| 4 | `public/js/enzo-dashboard.js` | L33 | `formatDate()` | Similar a aurora (#2) |
| 5 | `public/js/gabi-dashboard.js` | L22 | `formatDate()` | Similar |
| 6 | `public/js/paula-dashboard.js` | L21 | `formatDate()` | Similar |
| 7 | `public/js/adriana-dashboard.js` | L40 | `formatDate()` | Similar |
| 8 | `public/js/axel-dashboard.js` | L36 | `formatDate()` | Similar |
| 9 | `public/js/aluna-dashboard.js` | L127 | `formatDate()` | Similar |
| 10 | `public/js/aluna-dashboard.js` | L140 | `formatDateShort()` | Short format |
| 11 | `public/enzo-leads.html` | L230 | `formatDate()` | Inline in HTML |
| 12 | `WiFi Coworkia/public/js/admin.js` | L213 | `formatDate()` | WiFi project |
| 13 | `scripts/database/audit-reservations.js` | L21 | `formatDate()` | Script util |

**RECOMENDACIÓN:** Las 8 frontend copies (#2-#11) son aceptables — cada dashboard es un standalone HTML page sin bundler/shared module. Backend (#1) es la única usada server-side. No vale la pena consolidar frontend sin un build system.

---

## 3. enviarWhatsApp / Wassenger API calls
**Helper canónico + 9 bypasses**

**Helper:** `src/express-servidor/endpoints-api/wassenger.js` L745 — `enviarWhatsApp(numero, mensaje)`

### Archivos que importan el helper ✅

| Archivo | Import path |
|---------|-------------|
| enzo-dashboard.js | `'./wassenger.js'` |
| gabi-dashboard.js | `'./wassenger.js'` |
| paula-dashboard.js | `'./wassenger.js'` |
| adriana-dashboard.js | `'./wassenger.js'` |
| axel-dashboard.js | `'./wassenger.js'` |
| aluna-dashboard.js | `'./wassenger.js'` |
| internal-notifications.js | `'./wassenger.js'` |
| enzo-followup-service.js | `'../express-servidor/endpoints-api/wassenger.js'` |
| axel-followup-cron.js | `'../express-servidor/endpoints-api/wassenger.js'` |
| adriana-followup-service.js | `'../express-servidor/endpoints-api/wassenger.js'` |
| aluna-followup-service.js | `'../express-servidor/endpoints-api/wassenger.js'` |
| paula-followup-service.js | `'../express-servidor/endpoints-api/wassenger.js'` |
| email-reply-reader.js | `'../express-servidor/endpoints-api/wassenger.js'` |
| aurora-followup-service.js | `'../express-servidor/endpoints-api/wassenger.js'` |

### Archivos con fetch directo a Wassenger API ❌

| # | Archivo | Líneas | Fetch calls |
|---|---------|--------|-------------|
| 1 | `src/servicios/follow-up-service.js` | L181, L304, L517, L677 | **4 calls** — legacy follow-up |
| 2 | `src/servicios/severe-collision-alert.js` | L58, L81 | **2 calls** — alerta crítica |
| 3 | `src/express-servidor/endpoints-api/aurora-dashboard.js` | L635, L816 | **2 calls** — confirmaciones WA de pago |
| 4 | `src/express-servidor/endpoints-api/aluna-dashboard.js` | L589 | **1 call** — pese a importar helper en L12 |

**RECOMENDACIÓN:** `follow-up-service.js` tiene 4 raw fetches → migrar a `enviarWhatsApp()`. `severe-collision-alert.js` puede ser intencional (minimizar deps en alertas críticas). Dashboards: migrar gradualmente.

---

## 4. Dirección Coworkia hardcodeada
**50+ strings "Whymper 403" · NO existe constante `COWORKIA_ADDRESS`**

| Grupo | Archivos | Count |
|-------|----------|-------|
| email.js | L292, L395, L646, L746, L759, L1119, L1125 | 7 |
| email-template-system.js | L242, L347, L688, L1285 | 4 |
| email-i18n.js | L166, L189, L231, L408, L431, L473, L650, L673, L715, L892, L915, L957, L1134, L1157, L1199 | 15 (5 idiomas × 3) |
| aurora-followup-service.js | L363, L419, L475 | 3 |
| aurora-dashboard.js (endpoint) | L815 | 1 |
| email-reply-reader.js | L469, L546 | 2 |
| confirmation-flow.js | L263, L668, L728, L819 | 4 |
| aurora.js (intenciones) | L77, L101, L125, L155 | 4 (4 idiomas) |
| aluna.js (intenciones) | L418, L431 | 2 |
| Otros (calendar, receipts, proforma, welcome, resend, membership-verification) | ~8 files | 8+ |

### Maps URLs — 2 versiones

| URL | Formato | Instancias |
|-----|---------|------------|
| `maps.app.goo.gl/Nqy6YeGuxo3czEt66` | Nuevo (short) | 6 (followups + dashboard) |
| `goo.gl/maps/9GD83LV3XRf23XK59` | Viejo | 3 (email.js L298, L647 + generic-email-templates.js L343) |

**RECOMENDACIÓN:** Crear `src/utils/constants.js`:
```js
export const COWORKIA_ADDRESS = 'Whymper 403, Edificio Finistere, Quito';
export const COWORKIA_ADDRESS_FULL = 'Whymper 403, Edificio Finistere, Planta Baja, Quito';
export const COWORKIA_MAPS_URL = 'https://maps.app.goo.gl/Nqy6YeGuxo3czEt66';
```
Migrar gradualmente. `email-i18n.js` tiene traducciones legítimas → mantener inline. Unificar las 2 Maps URLs al nuevo formato.

---

## Resumen Ejecutivo

| Prioridad | Categoría | Instancias | Acción |
|-----------|-----------|------------|--------|
| 🔴 Alta | Service labels | 8 versiones | `src/utils/service-labels.js` |
| 🔴 Alta | Dirección + Maps URL | 50+ strings | `src/utils/constants.js` |
| 🟡 Media | Wassenger bypasses | 9 raw fetches | Migrar a `enviarWhatsApp()` |
| 🟢 Baja | formatDate frontend | 13 copies | Dejar (no hay bundler) |
