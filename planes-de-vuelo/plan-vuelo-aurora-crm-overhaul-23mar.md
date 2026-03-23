# 🤖 Plan de Vuelo — Aurora CRM Overhaul v2.0
**Fecha:** 23 Mar 2026  
**Objetivo:** Convertir el dashboard en una herramienta CRM de primer nivel — precisa, rápida y sin fricción.  
**Duración estimada:** ~90 min  
**Activar con:** `autopilot verde nena`

---

## 📋 Contexto

Production v1064 (`91c0225`). Todos los tabs funcionan. Cambios de hoy (sesión anterior):  
- Prospectos: card grid → tabla  
- Chrome layout fix (overflow, truncate agents/topics)  
- Memory system creado  

---

## 🚀 Grupos de Trabajo

### Grupo A — Bugs y Precisión (Quick wins)

| ID | Cambio | Archivo | Impacto |
|----|--------|---------|---------|
| A1 | D+7 filter: usar campo `date` en lugar de `created_at` | `aurora-dashboard.js` | 🔴 ALTO — actualmente filtra por fecha de creación, no de visita |
| A2 | Stats skeleton loader (CSS pulsing) — reemplaza `—` durante carga | `aurora-reservas.html` + JS | 🟡 MEDIO — UX polish |
| A3 | Row hover highlight en todas las tablas (reservas, prospectos, conversaciones) | `aurora-reservas.html` CSS | 🟢 BAJO — polish |

### Grupo B — Prospectos UX Enhancement

| ID | Cambio | Archivo | Impacto |
|----|--------|---------|---------|
| B1 | Columna teléfono visible (masked) + click-to-copy en tabla Prospectos | `aurora-dashboard.js` | 🔴 ALTO — info crítica hoy invisible |
| B2 | Urgency visual: hot=🔴 pulsing, warm=🟡, cold=⚪ (reemplaza chip de texto) | `aurora-dashboard.js` + CSS | 🟡 MEDIO — visual CRM status |
| B3 | Botón WA directo en cada fila (wa.me link template, 1 click) sin modal | `aurora-dashboard.js` | 🔴 ALTO — hoy requiere abrir modal para enviar |

### Grupo C — Conversaciones UX

| ID | Cambio | Archivo | Impacto |
|----|--------|---------|---------|
| C1 | Mostrar teléfono (masked) en tabla conversaciones | `aurora-dashboard.js` | 🟡 MEDIO |
| C2 | Botón "📲 WA" directo en fila conversaciones (abre hilo del cliente) | `aurora-dashboard.js` | 🟡 MEDIO |

### Grupo D — Global UX

| ID | Cambio | Archivo | Impacto |
|----|--------|---------|---------|
| D1 | Keyboard shortcuts: `1` Reservas, `2` Prospectos, `3` Interesados, `4` Conversaciones. `R` = refresh | `aurora-dashboard.js` | 🟢 BAJO — power user |
| D2 | "Actualizado: hace Xs" badge en cada sección (timestamp visible) | `aurora-dashboard.js` | 🟢 BAJO — confianza en los datos |

---

## 🔄 Secuencia de Ejecución

```
A1 → A2 → A3 (CSS en HTML)
  → B1 → B2 → B3 (JS prospectos)
    → C1 → C2 (JS conversaciones)
      → D1 → D2 (JS global)
        → node --check ✅
          → bump v= a 20260323e
            → commit feat(aurora-crm): CRM overhaul v2 - 11 improvements
              → git push heroku main
```

---

## 📌 Notas Técnicas

- `node --check public/js/aurora-dashboard.js` **OBLIGATORIO** antes de commit
- Cache-busting: `?v=20260323[e,f,g...]` — incrementar letra por cada commit
- `overflow:hidden` en `.card` = **PROHIBIDO** — clipea tooltips
- Parse de montos: `parseFloat(value.replace(',', '.'))` — acepta coma y punto
- D+7 correcto: filtrar `r.date` (fecha de visita), no `r.created_at` (fecha de creación de la reserva)
- WA links siempre `@aurora\n` prefix antes del mensaje

---

## ✅ Criterios de Completado

- [ ] `node --check` pasa sin errores
- [ ] Version bumped en HTML (`?v=20260323e`)
- [ ] Deploy a Heroku exitoso
- [ ] Stats cargan con skeleton (no dash seco)
- [ ] D+7 muestra reservas correctas (por fecha de visita)
- [ ] Prospectos: teléfono visible + botón WA directo
- [ ] Conversaciones: botón WA en fila
- [ ] Shortcuts 1/2/3/4 funcionan

---

*Plan creado por GitHub Copilot — Sesión Aurora 23 Mar 2026*
