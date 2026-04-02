# ✈️ Plan de Vuelo — Axel (02 Abr 2026)
**Status**: 🟢 Operativo  
**Producción**: v1192  
**Última sesión**: 02 Abr 2026

---

## 📊 ESTADO ACTUAL

### ✅ Completado (sesión 02 Abr)
- [x] **Todo #67** — Auditoría completa wiring Axel (v1189)
  - Follow-up cron D+2/D+7 reparado (user_phone→phone, admin guard, @axel prefix)
  - Email CC hardcodeado eliminado → env vars AXEL_WORKSHOP_CC + COWORKIA_ADMIN_EMAIL
  - Botón Recordatorio protegido contra ADMIN_PHONE + DIEGO_PERSONAL_PHONE
- [x] **Todo #55** — Email reply capture para Axel (v1192)
  - Subject patterns reordenados (Axel antes de Gabi, evita mis-routing)
  - WA notification al admin por cada email reply detectado (todos los agentes)
  - Axel replies → se linkean a collision_quotes + texto guardado en notes
  - Handler específico extrae AXL-XXXX del subject

### ✅ Operativo (previo)
- CTAs persuasivos + follow-up cron D+2/D+7
- Dashboard dropdown + botón send-reminder
- Kia Picanto image fix (object-fit: contain, v1122)
- AXEL_WORKSHOP_CC=villotaj71@gmail.com configurado en Heroku

### 🟡 PENDIENTE
- [ ] **Todo #54** — Dark mode roto en emails HTML (requiere screenshot de Diego)
- [ ] **P1** — Todo #50: Imagen Kia validar en producción post-fix
- [ ] **P2** — Más templates de cotización (no solo Kia Picanto)
- [ ] **P3** — Integration con catálogo de vehículos
