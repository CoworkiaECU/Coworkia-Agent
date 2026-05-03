# ✈️ Plan de Vuelo — Sistema de Bounces + Limpieza de CCs

## Fecha: 2 mayo 2026 | Chat: Torre + Ejecución | Agentes afectados: TODOS

---

## Contexto / Disparador

Bounce constante reportado por Diego el 02-may a `crivera@ecuamangueras.com`
(membresía ALU-2026-0032 — Aluna). El servidor MX del destinatario (`206.222.23.50`)
está caído y Gmail reintenta entregar durante 65h, generando un DSN por intento
hacia `secretaria.coworkia@gmail.com`. Además, los follow-ups automáticos
(D+1 / D+3 / renovación) volverían a enviar al mismo email muerto en días siguientes.

Diego pidió:
1. Apagar el bucle de bounces ya
2. Que el sistema deje de inundarle el buzón con CCs operativos
3. Que cualquier futuro bounce se auto-detecte y se bloquee solo

---

## Arquitectura propuesta (3 bloques)

### Bloque 1 — Blocklist global de emails (urgente)
- Tabla nueva `email_blocklist` (genérica, sirve para todos los agentes)
- Filtro centralizado en `sendEmail()` que aborta el envío si `to ∈ blocklist`
- Insertar `crivera@ecuamangueras.com` como primer registro

### Bloque 2 — Bounce handler permanente
- Wrapper de errores en `sendEmail()` que clasifica fallos SMTP:
  - `5xx` (hard bounce: mailbox no existe, dominio inválido) → blocklist inmediata
  - timeouts / `421` (soft bounce: MX caído, rate limit) → contador `bounce_count`,
    blocklist automática al alcanzar 2 fallos consecutivos
- Endpoint admin `GET /api/email-bounces` para revisar/perdonar desde dashboard
  (CRUD básico: list, delete-from-blocklist)

### Bloque 3 — Limpieza de CCs
Decisión Diego (02-may):
- **Mantener** CC al admin → `coworkia.ec@gmail.com` (vía `COWORKIA_ADMIN_EMAIL`)
- **Eliminar** CC operativos a partners:
  - Adriana → `info@segpopular.com` (oficina SegPopular) — ⚠️ asume el riesgo
  - Axel → `AXEL_WORKSHOP_CC` (taller PaintBull)
- **Centralizar** en helper `getAdminCC()` exportado desde `src/servicios/email.js`
- Reemplazar 4 CCs hardcoded:
  - `src/servicios/email.js:628`
  - `src/servicios/aluna-welcome-email.js:304`
  - `src/express-servidor/endpoints-api/aluna-dashboard.js:1004`
  - `src/express-servidor/endpoints-api/aluna-dashboard.js:1114`

---

## Decisiones tomadas

| Decisión | Valor | Motivo |
|----------|-------|--------|
| Estrategia blocklist | Tabla `email_blocklist` (no columna por tabla) | Sirve a 7 agentes con un único filtro |
| Auto-blocklist threshold | 2 bounces consecutivos | Equilibrio entre falsos positivos (server momentáneo) y eficacia |
| Admin CC | `coworkia.ec@gmail.com` (env `COWORKIA_ADMIN_EMAIL`) | Diego confirmó 02-may |
| CCs partners | ELIMINAR todos (SegPopular + taller) | Diego asume el riesgo 02-may |
| Toggle global CC | NO se implementa | Diego decidió mantener CC admin siempre |
| Cancelar bounce activo | Imposible vía código | Gmail retiene 65h. Solo se previenen futuros |

---

## Tareas

### Bloque 1 — Blocklist
- [x] T1.1 — Crear migración `010_email_blocklist.js` con tabla `email_blocklist`
- [x] T1.2 — Crear `src/servicios/email-blocklist.js` (helpers: `isBlocked`, `addToBlocklist`, `removeFromBlocklist`, `recordBounce`)
- [x] T1.3 — Integrar filtro en `sendEmail()` (early return si `to` en blocklist)
- [x] T1.4 — Insertar manualmente `crivera@ecuamangueras.com` (script `scripts/blocklist-add-crivera.mjs`)

### Bloque 2 — Bounce handler
- [x] T2.1 — Try/catch ampliado en `sendEmail()` que clasifica errores SMTP
- [x] T2.2 — Endpoint `GET /api/email-bounces` (listar) y `DELETE /api/email-bounces/:email` (perdonar)
- [ ] T2.3 — (Opcional, fuera de este plan) parser IMAP de DSNs de Gmail

### Bloque 3 — Limpieza CCs
- [x] T3.1 — Helper `getAdminCC()` exportado en `src/servicios/email.js`
- [x] T3.2 — Reemplazar 4 hardcodes de `coworkia.ec@gmail.com`
- [x] T3.3 — Eliminar CC `info@segpopular.com` en Adriana (2 lugares)
- [x] T3.4 — Eliminar CC `AXEL_WORKSHOP_CC` en Axel
- [x] T3.5 — Verificar build sin errores

### Cierre
- [ ] T4.1 — Commit con prefijo `feat(emails)`
- [ ] T4.2 — ⚠️ NO deployar — esperar autorización Torre de Control
- [ ] T4.3 — Diego configura `heroku config:set COWORKIA_ADMIN_EMAIL=coworkia.ec@gmail.com` antes de deploy

---

## Archivos modificados / creados

### Creados
- `src/database/migrations/010_email_blocklist.js`
- `src/servicios/email-blocklist.js`
- `src/express-servidor/endpoints-api/email-bounces.js`
- `scripts/blocklist-add-crivera.mjs`

### Modificados
- `src/servicios/email.js` — filtro blocklist + bounce handler + helper `getAdminCC()`
- `src/servicios/aluna-welcome-email.js` — usa `getAdminCC()`
- `src/express-servidor/endpoints-api/aluna-dashboard.js` — usa `getAdminCC()` (2 lugares)
- `src/servicios/adriana-quote-generator.js` — quita CC partner
- `src/express-servidor/endpoints-api/wassenger.js` — quita CC partner Adriana
- `src/servicios/axel-quote-email.js` — quita CC `AXEL_WORKSHOP_CC`
- `src/express-servidor/servidor.js` — registrar endpoint `/api/email-bounces`

---

## Reversión (si algo sale mal)

Para reactivar CCs a partners:
```bash
git revert <commit-hash>
```

Para perdonar el email del cliente (si nos avisa que ya está OK):
```bash
curl -X DELETE https://coworkia-agent-e97d15dac56f.herokuapp.com/api/email-bounces/crivera@ecuamangueras.com
```

---

## Para retomar

1. Leer este archivo
2. Continuar desde la primera `[ ]` pendiente
3. NO deployar sin OK de Diego (Torre de Control)
