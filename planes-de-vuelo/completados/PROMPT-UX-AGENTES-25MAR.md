# 🚀 PROMPT AUTOPILOT — UX & Storytelling Agentes

**Copia y pega esto cuando quieras activar:**

---

## AUTOPILOT VERDE NENA — Plan de Vuelo: UX & Storytelling Agentes

**OBJETIVO**: Resolver 4 bugs/mejoras que impactan conversión de agentes (Enzo, Gabi, Axel) — trabajo paralelo a Self-Healing en tareas que NO colisionan.

**BLOQUES** (5 tareas, estimado 2.5h):

### 🟥 BLOQUE A: Fix Botones Enzo Dashboard (30min)
- Leer `public/enzo-leads.html` líneas 300-420
- Agregar event listener para `.wa-btn` en delegation handler existente (línea ~406)
- Capturar `data-code` + `data-day` → llamar `sendFollowUp(code, day)`
- Verificar función `sendFollowUp()` existe, si no copiar patrón de aurora-reservas.html
- Test manual: abrir `/enzo-leads.html`, click D+1 → verificar WA enviado

### 🟧 BLOQUE B: Fix Foto Kia Picanto Distorcionada (20min)
- Leer `src/servicios/axel-demo-cotizacion.js` línea ~71-86 (Kia Picanto data)
- Buscar template HTML que renderiza las fotos (probablemente `axel-email-templates.js`)
- Fix: envolver imagen en contenedor con `max-width: 600px`, `object-fit: contain`
- Si template usa `<img>` directo sin contenedor → agregar wrapper CSS
- Test visual: generar cotización Kia Picanto → verificar imagen NO distorcionada

### 🟨 BLOQUE C: Storytelling Vendedor Enzo (40min)
- Leer `src/deteccion-intenciones/enzo.js` getSystemPrompt completo
- Añadir sección "CASOS DE ÉXITO Y STORYTELLING" después de línea ~140
- Incluir 3 casos reales con números: restaurante 300% reservas, tienda 70% menos admin, clínica $12k/mes
- Modificar personalidad: "Analítico + VENDEDOR. Datos + emoción"
- Añadir "CIERRE DE CONVERSACIÓN" con CTAs fuertes: "¿Arrancamos esta semana?"
- Test conversacional: mensaje "@enzo necesito marketing para mi restaurante" → verificar tono vendedor

### 🟩 BLOQUE D: Reenfoque Gabi Cotizaciones (40min)
- Leer `src/deteccion-intenciones/gabi.js` getSystemPrompt completo
- Añadir "FLUJO DE CONSULTORÍA GABI" con 3 pasos: Diagnosticar → Clarificar → Proponer paquete
- Incluir PAQUETES REFERENCIALES con precios:
  - Pack Básico $80/mes
  - Pack Estándar $150/mes
  - Pack Premium $350/mes
  - Consultas puntuales: constitución $500-800, auditoría $400-600
- Añadir "MENSAJES DE VALOR" para cuando cliente duda por precio
- Modificar tono: "Profesional + consultiva. CFO externa, no bot de FAQ"
- Test conversacional: "@gabi necesito ayuda con contabilidad" → verificar propone paquetes + pricing

### ✅ BLOQUE E: Deploy y Cierre (20min)
- `node --check` archivos JS modificados
- `get_errors` VS Code
- Commit: `fix(ux): Enzo botones + Kia Picanto + storytelling Enzo/Gabi (#49,#50,#48,#47)`
- `git push heroku main`
- `heroku logs --app coworkia-agent --num 30`
- PATCH todos 49, 50, 48, 47 → `done` via API

---

## SKILLS A USAR:
- `get-shit-done.md` — velocidad sin análisis parálisis
- `dont-repeat-yourself.md` — reutilizar patrones existentes (event delegation de otros dashboards)
- `coworkia-guardian.md` — checklist pre-deploy (especialmente prompts)

## CHECKPOINTS:
- Checkpoint 1: después de Bloque B (bugs UX resueltos)
- Checkpoint 2: después de Bloque D (storytelling completo)
- Deploy final: después de Bloque E

## ARCHIVOS CRÍTICOS:
- `public/enzo-leads.html` — botones wiring
- `src/servicios/axel-demo-cotizacion.js` — foto Kia Picanto
- `src/deteccion-intenciones/enzo.js` — prompt vendedor
- `src/deteccion-intenciones/gabi.js` — prompt consultivo

## RESULTADO ESPERADO:
✅ 4 todos → done  
✅ Botones Enzo funcionales  
✅ Foto Axel sin distorsión  
✅ Enzo tono 20% más vendedor  
✅ Gabi estructurada con paquetes claros  
✅ +15-25% conversión estimada

---

**Verde nena para arrancar.** 🚀
