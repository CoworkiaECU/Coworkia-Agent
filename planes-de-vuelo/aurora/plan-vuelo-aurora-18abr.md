# ✈️ Plan de Vuelo Aurora — 18 Abril 2026
## Fix Email D+3 Follow-up (FOMO)

### Contexto
Email D+3 "¿Cuándo vuelves?" se enviaba con sender "Coworkia Secretaría" en vez de Aurora, logo roto (URL relativa), nombre vacío mostrando ".", sin saludo personal, y social proof hardcodeado como párrafo plano.

### Tareas

- [x] **T1** — Fix `buildAuroraD3HTML` en `email-template-system.js`:
  - Logo URL absoluta (`https://coworkia-agent-e97d15dac56f.herokuapp.com/images/logos/coworkia.svg`)
  - Nombre con fallback robusto (ignora ".", vacío, 1 char)
  - Agregar saludo "Hola NAME 👋" como los otros templates
  - Social proof en tabla estructurada con borde + header uppercase
  - Agregar `<title>` tag
  - Agregar `border: 1px solid #e2e8f0` al social proof box (consistencia con Confirmation)
  
- [x] **T2** — Fix `aurora-followup-service.js`:
  - Agregar `agent: 'aurora'` al `sendEmail` de D+3 (sender correcto)
  - Agregar `agent: 'aurora'` al `sendEmail` de D+1 y Reminder 24h
  - Fix subject line: no mostrar nombre si está vacío/inválido

- [x] **T3** — Fix logo URL relativa en TODOS los templates Aurora:
  - Confirmation, Rebooking, D1, Reminder 24h (4 más con mismo bug)

- [ ] **T4** — Commit: `fix(aurora): fix D3 follow-up email design + sender + logo URLs`

### Estado: EN PROGRESO — T1-T3 completadas, falta commit
