# Decisiones Técnicas del Proyecto

## Arquitectura
- **Stack**: Node.js + Express + PostgreSQL + Heroku + Wassenger API
- **Frontend dashboards**: HTML puro + JS vanilla (no React/Vue) — decisión consciente para simplicidad
- **Módulos**: ES Modules (`import/export`), NO CommonJS
- **Deploy**: `git push heroku main` — siempre. Release phase limpia BD de testing.
- **BD**: Una sola PostgreSQL en Heroku. NO SQLite local en producción.

## Routing de mensajes WhatsApp (Wassenger)
- **REGLA CRÍTICA**: Todo mensaje enviado a Wassenger DEBE comenzar con `@[agente]\n`
- Ejemplo: `@aurora\nHola! Tu reserva está confirmada.`
- Sin este prefijo, el mensaje lo responde el agente equivocado
- Agentes: `@aurora`, `@aluna`, `@adriana`, `@gabi`, `@enzo`, `@axel`, `@paula`

## Inputs de dinero
- Siempre `type="text" inputmode="decimal"`, NUNCA `type="number"`
- Parse: `parseFloat(value.replace(',', '.'))` — acepta coma y punto

## Adriana (Seguros)
- VAZ = proveedor. NO decir "VAZ" al cliente, solo "tu aseguradora"
- Plan cliente: "VAZ Elemental" (interno: "Ensigna")
- Prima mensual: `annualTotal / 12` (NO /12.something, NO /10)
- Deducible al cliente: 7%
- `buildEmailTemplate(agent, type)` → type sin prefijo: `'COMPARISON_V2'` ✅

## Aurora (Reservas)
- Release phase de Heroku BORRA reservas `pending`, `cancelled` en cada deploy → grupos "Interesados" siempre vacíos en testing
- D+7 tab vacío = correcto en staging (no hay `completed` recientes después del clean)
- Los `@aurora` prefixes están en: `buildOneHourWhatsApp`, `buildRebookingWhatsApp`, `send-campaign`, `register-payment`
- Prospectos: tabla (no grid de cards) — decisión 23 Mar 2026

## Dashboard UX — Decisiones tomadas
- Columnas de tabla: truncar agentes a 3+N, temas a 3+N con tooltip hover
- `.card` NO debe tener `overflow:hidden` — rompe tooltips `::after`
- Cache-busting con `?v=YYYYMMDD[letra]` en todos los `<script src>`
- Siempre validar JS con `node --check archivo.js` antes de commitear

## Seguridad
- Nunca hardcodear tokens ni emails — siempre `process.env.*`
- Solo `DIEGO_PERSONAL_PHONE` puede ejecutar comandos del bot
