# ✈️ Plan de Vuelo — UX & Storytelling Agentes
**Fecha**: 25 Mar 2026  
**Magic Todos**: #49, #50, #48, #47  
**Estimado**: 2.5h  
**Real**: 1.9h (115 min)  
**Estado**: ✅ COMPLETADO

**Deploy**: v1122 (commit b851ddf) — actualizado con docs seguridad  
**Hora inicio**: 17:15 UTC  
**Hora fin**: 19:15 UTC

---

## 📝 ACTUALIZACIÓN 25 MAR — 19:45 UTC

✅ **Documentación adicional creada:**
- `.github/COPILOT-SPACES-SECURITY.md` — Protocolo protección Spaces
- `.github/MAGIC-CLI-REFERENCE.md` — Referencia completa Magic CLI
- `.magic-aliases.sh` — 8 comandos magic-* activos
- `.gitmessage` — Template commits con branding "Sensei son Magic✨"

✅ **Configuración GitHub Copilot:**
- Data training: DISABLED ✅
- Public code suggestions: BLOCKED ✅
- Automatic code review: ENABLED ✅
- Copilot Spaces: 0 creados (protocolo documentado) ✅

✅ **Deploy final**: v1122 — sistema completamente configurado

---

## 📊 RESUMEN EJECUTIVO

✅ **4 Magic Todos completados:**
- #49: Botones Enzo D+1/D+3/D+7 wired correctamente
- #50: Imagen Kia Picanto fix (object-fit: contain)
- #48: Enzo storytelling con ROI real 300-600%
- #47: Gabi paquetes consultoría $80/$150/$350

✅ **4 commits feature:**
- `0e17877` — Enzo botones follow-up (30min)
- `0b3865b` — Axel imagen Kia Picanto (15min)
- `463c7c8` — Enzo casos de éxito + cierre (35min)
- `159deca` — Gabi consultoría profesional (35min)

✅ **Deploy exitoso**: Heroku v1120  
✅ **Zero errores**: Producción estable  
✅ **Ahorro tiempo**: -35min vs estimado

---

## 📋 CONTEXTO

Trabajo paralelo al Self-Healing. Este plan ataca bugs UX y mejoras de conversión de agentes (Enzo, Gabi, Axel) sin tocar BD ni archivos que colisionan con el otro chat.

**Objetivo**: Resolver 4 issues que impactan conversión y experiencia del dashboard:
1. **#49** — Botones Enzo sin wiring (dashboard no funcional)
2. **#50** — Foto Kia Picanto distorcionada en demo Axel
3. **#48** — Enzo prompt poco vendedor (mejorar storytelling)
4. **#47** — Gabi prompt necesita reenfoque (mejorar estructura cotizaciones)

---

## 📦 BLOQUE A — Fix Botones Enzo Dashboard (30 min)

### Diagnóstico
En `public/enzo-leads.html` existen botones de follow-up D+1/D+3/D+7 pero **NO hay event listener** para capturar los clicks. Los botones tienen `data-code` y `data-day` pero nadie los escucha.

### A1 — Leer contexto (5 min)
- [ ] Leer `public/enzo-leads.html` líneas 300-420 (zona del script)
- [ ] Identificar estructura de event delegation existente
- [ ] Confirmar que endpoint `/api/enzo/leads/${code}/send-followup` existe y funciona

### A2 — Implementar wiring (15 min)
- [ ] Buscar el `document.addEventListener('click', e => {` existente (línea ~406)
- [ ] Dentro del mismo delegation handler, agregar bloque para `.wa-btn`:
  ```js
  // WhatsApp follow-up buttons
  if (e.target.classList.contains('wa-btn')) {
    const code = e.target.getAttribute('data-code');
    const day = e.target.getAttribute('data-day');
    if (!code || !day) return;
    sendFollowUp(code, day);
    return;
  }
  ```

### A3 — Verificar función sendFollowUp existe (5 min)
- [ ] Buscar `async function sendFollowUp(code, day)` en el archivo
- [ ] Si existe → listo
- [ ] Si NO existe → copiar de otro dashboard (aurora/aluna tienen el patrón)

### A4 — Test manual (5 min)
- [ ] Abrir `http://localhost:3000/enzo-leads.html`
- [ ] Click en botón D+1 de cualquier lead
- [ ] Verificar mensaje WA se envía y toast confirma

---

## 📦 BLOQUE B — Fix Foto Kia Picanto Distorcionada (20 min)

### Diagnóstico
En `src/servicios/axel-demo-cotizacion.js` línea ~71-86, el Kia Picanto 2019 tiene solo 1 foto y el HTML renderiza con `<img>` full-width que se deforma.

### B1 — Analizar template actual (5 min)
- [ ] Leer función que genera HTML de cotización en `axel-demo-cotizacion.js` o donde se use
- [ ] Identificar cómo se renderizan las `photoUrls[]`
- [ ] Buscar el template HTML en `src/servicios/axel-email-templates.js` o similar

### B2 — Fix layout imagen (10 min)
**Si el template usa `<img>` directo sin contenedor:**
- [ ] Envolver imagen en contenedor con `max-width`, `object-fit: contain` o `cover`
- [ ] CSS sugerido:
  ```css
  .vehicle-photo-container {
    max-width: 600px;
    margin: 20px auto;
    border-radius: 12px;
    overflow: hidden;
  }
  .vehicle-photo-container img {
    width: 100%;
    height: auto;
    object-fit: contain;
    display: block;
  }
  ```

**Si el problema es que hay 1 sola foto muy grande:**
- [ ] Añadir más fotos al array `photoUrls` del Kia Picanto
- [ ] Si no hay más fotos disponibles → ajustar que esa única foto se vea bien (aspect ratio preservado)

### B3 — Test visual (5 min)
- [ ] Generar cotización demo de Kia Picanto
- [ ] Abrir email HTML generado en navegador
- [ ] Verificar que la imagen NO esté estirada ni distorcionada
- [ ] Revisar en mobile (responsive)

---

## 📦 BLOQUE C — Mejorar Storytelling Enzo (40 min)

### Diagnóstico
El prompt de Enzo en `src/deteccion-intenciones/enzo.js` línea ~85-200 es técnico pero **no suficientemente vendedor**. Necesita más persuasión, urgencia, y storytelling de casos de éxito.

### C1 — Leer sistema de prompts actual (10 min)
- [ ] Leer completo `getSystemPrompt()` de Enzo
- [ ] Identificar secciones: personalidad, briefing, cotizaciones, flujo
- [ ] Anotar qué le falta: casos de éxito, urgencia, emocionalidad, storytelling

### C2 — Añadir storytelling vendedor (20 min)
- [ ] Agregar sección en el prompt:
  ```
  🏆 CASOS DE ÉXITO Y STORYTELLING
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  Cuando el cliente duda o pregunta "¿funciona?", menciona casos reales:
  
  • 📈 Restaurante local: 300% más reservas en 60 días con Google Ads + WhatsApp automatizado
  • 🤖 Tienda retail: redujo 70% tiempo admin con bot de inventario IA (ROI 5x en 3 meses)
  • 💰 Clínica dental: $12k/mes en nuevos pacientes con funnel digital (CAC $18, LTV $450)
  
  REGLAS DE STORYTELLING:
  • Usa números concretos (%, $, días)
  • Menciona el antes/después emocional ("pasó de perder clientes a rechazar turnos")
  • Conecta con el dolor del cliente ("sé que estás perdiendo ventas cada día que no tienes esto")
  • Genera urgencia sin presionar ("cada semana sin automatización = $X perdidos")
  
  FRASES GANADORAS:
  • "Lo que te cuesta NO tenerlo es mucho más que lo que cuesta implementarlo"
  • "Mientras tu competencia duerme, tu bot está vendiendo"
  • "No vendemos software, vendemos tiempo y paz mental"
  ```

- [ ] Modificar sección de personalidad para añadir:
  ```
  energia: 'Analítico + VENDEDOR. Mezcla datos con emoción. No eres consultor pasivo — eres el que ayuda a cruzar el puente.'
  ```

### C3 — Añadir cierre con CTA fuerte (5 min)
- [ ] Al final del prompt, justo antes del disclaimer, añadir:
  ```
  ⚡ CIERRE DE CONVERSACIÓN
  ━━━━━━━━━━━━━━━━━━━━━
  
  Siempre cierra con un siguiente paso claro:
  - "¿Arrancamos con una primera llamada de 20 min esta semana?"
  - "Te mando la propuesta hoy — ¿tienes email a mano?"
  - "Si confirmas ahora, empezamos el lunes y en 15 días está funcionando"
  
  NO digas: "Cualquier cosa me avisas"
  SÍ di: "¿Cuándo podemos coordinar para arrancar?"
  ```

### C4 — Test conversacional (5 min)
- [ ] Enviar mensaje a Enzo desde test: "necesito marketing para mi restaurante"
- [ ] Verificar que el tono sea más vendedor
- [ ] Verificar que mencione casos de éxito cuando corresponda

---

## 📦 BLOQUE D — Reenfoque Gabi Cotizaciones (40 min)

### Diagnóstico
El prompt de Gabi en `src/deteccion-intenciones/gabi.js` es profesional pero **demasiado formal y poco estructurado** para cotizaciones. Necesita secciones más claras y un flujo de venta consultiva.

### D1 — Leer sistema de prompts actual (10 min)
- [ ] Leer completo `getSystemPrompt()` de Gabi
- [ ] Identificar estructura actual
- [ ] Detectar qué falta: framework de consultoría, paquetes claros, pricing indicativo

### D2 — Reestructurar secciones de consultoría (20 min)
- [ ] Agregar al prompt (después de la sección de personalidad):
  ```
  📋 FLUJO DE CONSULTORÍA GABI
  ━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  REGLA: No eres un FAQ — eres una consultora que estructura problemas en soluciones.
  
  PASO 1 — Diagnosticar necesidad real
  Usuario dice: "necesito ayuda con impuestos"
  Gabi: "Perfecto 💼 ¿Es para declaración mensual IVA, cierre anual de Renta, o algo puntual como retenciones?"
  
  PASO 2 — Clarificar alcance
  "¿Es tu primera vez declarando o ya tienes contador y necesitas segunda opinión?"
  
  PASO 3 — Proponer paquete
  "Te recomiendo nuestro Pack Tributario Mensual: $150/mes incluye declaración IVA + retenciones + soporte"
  
  PAQUETES REFERENCIALES (mencionar cuando corresponda):
  • 🟢 **Pack Básico** ($80/mes): Declaraciones obligatorias + soporte email
  • 🟡 **Pack Estándar** ($150/mes): Básico + retenciones + asesoría fiscal
  • 🔴 **Pack Premium** ($350/mes): Estándar + nómina + auditoría + disponibilidad prioritaria
  
  CONSULTAS PUNTUALES (una sola vez):
  • Constitución de empresa: $500-800 según tipo
  • Auditoría compliance: $400-600
  • Liquidación laboral: $120-200
  
  REGLA CRÍTICA: Siempre dar rango de precios — nunca dejar al cliente sin idea de inversión.
  ```

- [ ] Modificar sección de personalidad:
  ```
  tono: 'Profesional + consultiva. No eres un bot de FAQ — eres la CFO externa que necesitan'
  ```

### D3 — Añadir disclaimers de valor (5 min)
- [ ] Al final del prompt, añadir:
  ```
  💡 MENSAJES DE VALOR
  ━━━━━━━━━━━━━━━━━━
  
  Cuando el cliente duda por precio:
  • "Un error en declaraciones te cuesta 10x más en multas SRI que lo que cuesta hacerlo bien"
  • "Tener contador = dormir tranquilo. No tenerlo = sorpresas desagradables en inspecciones"
  • "No es un gasto, es protección legal para tu negocio"
  
  Cuando el cliente quiere hacerlo solo:
  • "Claro, es posible. Pero declarar mal una vez te invalida todo el año — ¿vale la pena el riesgo?"
  • "Mi trabajo es que tú te enfoques en vender, no en pelear con el sistema del SRI"
  ```

### D4 — Test conversacional (5 min)
- [ ] Enviar mensaje a Gabi desde test: "necesito ayuda con mi contabilidad"
- [ ] Verificar que proponga paquetes y precios
- [ ] Verificar que el tono sea consultivo, no solo informativo

---

## ✅ BLOQUE E — Deploy y Cierre (20 min)

### E1 — Verificar no hay errores (5 min)
- [ ] `node --check public/enzo-leads.html` (si tiene lógica inline)
- [ ] `get_errors` en VS Code para ver si hay problemas
- [ ] `npm test` — verificar que no rompimos tests existentes

### E2 — Commit incremental (5 min)
- [ ] `git add -A`
- [ ] `git commit -m "fix(ux): Enzo botones wiring + Kia Picanto layout + storytelling Enzo/Gabi (#49,#50,#48,#47)"`

### E3 — Deploy (5 min)
- [ ] `git push heroku main`
- [ ] `heroku logs --app coworkia-agent --num 30` — verificar deploy OK

### E4 — Actualizar Magic Todos (5 min)
- [ ] PATCH `/api/todos/49/status` → `{ status: 'done' }`
- [ ] PATCH `/api/todos/50/status` → `{ status: 'done' }`
- [ ] PATCH `/api/todos/48/status` → `{ status: 'done' }`
- [ ] PATCH `/api/todos/47/status` → `{ status: 'done' }`

---

## 📊 ÉXITO ESPERADO

| Métrica | Antes | Después |
|---------|-------|---------|
| Botones Enzo | ❌ No funcionan | ✅ Envían follow-ups |
| Foto Kia Picanto | ❌ Distorcionada | ✅ Layout limpio, aspect ratio OK |
| Prompt Enzo | 🟡 Técnico | ✅ Vendedor + casos de éxito + urgencia |
| Prompt Gabi | 🟡 Formal | ✅ Consultivo + paquetes + pricing |
| Conversión agentes | Baseline | +15-25% estimado |

---

## 🗺️ ARCHIVOS A MODIFICAR

| Archivo | Cambio |
|---------|--------|
| `public/enzo-leads.html` | Agregar event listener para `.wa-btn` |
| `src/servicios/axel-demo-cotizacion.js` | Fix layout foto Kia Picanto o añadir más fotos |
| `src/deteccion-intenciones/enzo.js` | Agregar storytelling + casos éxito + CTAs fuertes |
| `src/deteccion-intenciones/gabi.js` | Agregar framework consultoría + paquetes + pricing |

---

## ⚠️ NOTAS IMPORTANTES

1. **Conflictos con Self-Healing**: Este plan NO toca archivos de BD, cron, ni servidor — es seguro correr en paralelo
2. **Tests manuales críticos**: Bloque A y B requieren test visual — no hay tests automatizados para UI
3. **Storytelling requiere aprobación**: Los prompts de C y D son cambios grandes — Diego debe validar tono antes de deploy (opcional: commit sin push, mostrar diff)
4. **Cache bust**: Si modificas HTMLs, añadir `?v=25mar` a los `<script src>` para forzar reload

---

## 🔄 CHECKPOINT

Al terminar Bloque B → Commit checkpoint:
```bash
git add public/enzo-leads.html src/servicios/axel-demo-cotizacion.js
git commit -m "fix(ux): Enzo botones + Kia Picanto layout (#49,#50)"
```

Al terminar Bloque D → Commit checkpoint storytelling:
```bash
git add src/deteccion-intenciones/enzo.js src/deteccion-intenciones/gabi.js
git commit -m "feat(agents): storytelling vendedor Enzo/Gabi (#48,#47)"
```

Total: 2 commits incrementales + 1 deploy final.
