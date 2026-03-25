# 🚀 AUTOPILOT — Magic Todos Urgentes + UX Agentes

**Fecha**: Martes 25 marzo 2026, 17:30  
**Prioridad**: Urgente (2 todos) → Alta (4 UX fixes)  
**Tiempo estimado**: 3.5 horas  
**Commit strategy**: Commit incremental por bloque

---

## 🎯 CONTEXTO DEL PROYECTO

**Sistema**: Coworkia Agent — Multi-agente WhatsApp (Adriana/Enzo/Aurora/Aluna/Axel/Gabi)  
**Stack**: Node.js 24 ES Modules, PostgreSQL 15, Express, Wassenger, OpenAI gpt-4o  
**Deploy**: Heroku `git push heroku main` → app `coworkia-agent`  
**Versión actual**: v1119 (Self-Healing System activo)

**Magic Todos System**: Dashboard en `/todos-dashboard.html`, API en `/api/todos`  
- Al iniciar bloque: `PATCH /api/todos/:id/status` → `{ status: 'in_progress' }`  
- Al terminar bloque: `PATCH /api/todos/:id/status` → `{ status: 'done' }`

---

## 📋 PLAN DE EJECUCIÓN

### FASE 1: MAGIC TODOS URGENTES (1.5h)

#### BLOQUE B1 (45 min) — Todo #57: Restaurar prospecto Javier Troya
**Objetivo**: Agregar el prospecto de vehículos de Javier Troya que fue ocultado  
**Magic Todo ID**: 57 (priority: urgent, agent: adriana)

**Investigación necesaria**:
1. Buscar en tabla `leads` cualquier registro con `name ILIKE '%troya%'` o similar
2. Si existe con `status = 'hidden'` o `is_deleted = true` → restaurar
3. Si no existe → solicitar a Diego los datos (phone + vehículo) para crear registro nuevo
4. Verificar que aparezca en dashboard `/adriana-seguros.html`

**Archivos a revisar**:
- `src/database/postgres-adapter.js` — schema de tabla `leads`
- `src/express-servidor/endpoints-api/adriana-dashboard.js` — query de prospectos
- `public/adriana-seguros.html` — dashboard frontend

**Query de investigación**:
```sql
SELECT id, name, phone, agent, status, interest_type, metadata, 
       created_at, updated_at 
FROM leads 
WHERE (name ILIKE '%troya%' OR phone LIKE '%troya%') 
  AND agent = 'ADRIANA'
ORDER BY created_at DESC;
```

**Acciones**:
- [ ] Ejecutar query de investigación en PostgreSQL (via node script o heroku pg:psql)
- [ ] Si existe registro oculto: `UPDATE leads SET status = 'pending' WHERE id = X`
- [ ] Si no existe: implementar endpoint `POST /api/leads/restore` o pedir datos a Diego
- [ ] Verificar visibilidad en dashboard Adriana
- [ ] Commit: `feat(adriana): restaurar prospecto Javier Troya - todo #57`
- [ ] Update Magic Todo #57 → `done`

**Notas**:
- Diego mencionó "ocultaste el prospecto" → verificar si hay funcionalidad de hide/archive
- Si el prospecto fue eliminado por limpieza de datos, necesitará recreación manual

---

#### BLOQUE B2 (45 min) — Todo #56: Compatibilidad Xiaomi en emails HTML
**Objetivo**: Mejorar renderizado de emails en dispositivos Xiaomi (Android)  
**Magic Todo ID**: 56 (priority: urgent, agent: null)

**Problema detectado**: "los html no salen perfectos, no importa imagens, todo sale montado y horrible"  
**Causa probable**: Clientes email Xiaomi (MIUI Mail) tienen quirks conocidos:
- Ignoran algunos media queries `@media`
- Márgenes y paddings se colapsan incorrectamente
- Tablas con `display: table` no se respetan
- Max-width puede no funcionar en containers principales

**Archivos a modificar**:
- `src/servicios/email-template-system.js` — función `getEmailMediaStyles()`
- `src/servicios/generic-email-templates.js` — templates de todos los agentes
- **Prioridad**: Adriana (SegPopular), Axel (PaintBull), Enzo (MarketingLab)

**Soluciones a implementar**:

1. **Forzar `width` en lugar de `max-width` para containers principales**
```html
<!-- ANTES -->
<div style="max-width:600px;margin:0 auto;">

<!-- DESPUÉS (compatible Xiaomi) -->
<div style="width:100%;max-width:600px;margin:0 auto;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
```

2. **Usar tablas HTML en lugar de divs para layouts críticos**
```html
<!-- Layout principal debe ser <table> no <div> -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F4F6;">
  <tr>
    <td align="center" style="padding:20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:white;">
        <!-- contenido -->
      </table>
    </td>
  </tr>
</table>
```

3. **Inline styles explícitos (no agrupar propiedades)**
```html
<!-- ANTES -->
<div style="padding:20px 24px;">

<!-- DESPUÉS -->
<div style="padding-top:20px;padding-bottom:20px;padding-left:24px;padding-right:24px;">
```

4. **Agregar meta tags Android-specific**
```html
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
```

5. **CSS reset más agresivo para Android/Xiaomi**
```css
/* Agregar a getEmailMediaStyles() */
body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
table { border-collapse: collapse !important; }
img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
```

**Estrategia de implementación**:
1. Modificar `getEmailMediaStyles()` con reset Android/Xiaomi
2. Refactorizar template Adriana `buildAdrianaComparisonHTML()` con estructura de tabla
3. Refactorizar template Axel `generateAxelEmailHTML()` 
4. Probar con herramienta Litmus o Email on Acid (o enviar email de prueba a Diego si tiene Xiaomi)
5. Si no mejora: investigar si Xiaomi Mail está usando vista "Simplified" y agregar fallback

**Acciones**:
- [ ] Modificar `getEmailMediaStyles()` con CSS reset completo
- [ ] Agregar meta tags Android en cabecera de todos los templates
- [ ] Refactorizar top 3 templates más usados: Adriana, Axel, Enzo
- [ ] Testar renderizado (enviar a Diego para validación en Xiaomi)
- [ ] Commit: `fix(emails): mejorar compatibilidad Xiaomi/Android - todo #56`
- [ ] Update Magic Todo #56 → `done`

**Testing**:
```javascript
// Script de prueba - enviar email a Diego
import { sendEmail } from './src/servicios/email-service.js';
await sendEmail({
  to: process.env.COWORKIA_ADMIN_EMAIL,
  subject: '🧪 Test Xiaomi Compatibility',
  html: buildAdrianaComparisonHTML({ /* datos prueba */ }),
});
```

---

### FASE 2: UX FIXES PLAN A (2h)

#### BLOQUE A1 (30 min) — Todo #50: Fix Axel Kia Picanto foto distorsionada
**Objetivo**: Corregir foto que sale a full-width y se deforma  
**Magic Todo ID**: 50 (priority: medium, agent: axel)

**Problema**: "el html de prueba de kia picanto tiene una sola foto la misma que sale distorcio[nada]"

**Causa probable**: Imagen CID adjunta se renderiza con `max-width:100%` sin `object-fit`

**Archivo**: `src/servicios/generic-email-templates.js` → función `generateAxelEmailHTML()`

**Fix CSS**:
```html
<!-- ANTES (línea ~525 aprox) -->
<img src="cid:photo0" style="max-width:100%;height:auto;" />

<!-- DESPUÉS -->
<img src="cid:photo0" 
     style="width:100%;max-width:100%;height:auto;object-fit:cover;border-radius:8px;" />
```

**Si hay grid de fotos**, asegurar contenedor con aspect ratio:
```html
<div style="width:100%;max-width:300px;margin:0 auto;">
  <div style="position:relative;width:100%;padding-bottom:75%;overflow:hidden;border-radius:8px;">
    <img src="cid:photo0" 
         style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;" />
  </div>
</div>
```

**Acciones**:
- [ ] Localizar sección foto en `generateAxelEmailHTML()`
- [ ] Aplicar `object-fit: cover` + contenedor con max-width
- [ ] Commit: `fix(axel): corregir distorsión foto Kia Picanto - todo #50`
- [ ] Update Magic Todo #50 → `done`

---

#### BLOQUE A2 (30 min) — Todo #49: Fix Enzo dashboard buttons sin event listeners
**Objetivo**: Botones de follow-up (D+1/D+3/D+7) en dashboard Enzo no disparan acciones  
**Magic Todo ID**: 49 (priority: medium, agent: enzo)

**Problema**: Los botones existen en `/enzo-leads.html` pero no están wired a funciones

**Archivos**:
- `public/enzo-leads.html` — dashboard frontend
- Probablemente falta `<script>` con event listener o función no definida

**Investigación**:
1. Revisar estructura HTML del dashboard
2. Buscar botones con clase tipo `.btn-followup` o similar
3. Verificar si existe función `sendFollowup()` o equivalente
4. Si no existe: implementar llamada a endpoint del backend

**Ejemplo de fix esperado**:
```javascript
// En <script> del dashboard
document.querySelectorAll('.btn-followup').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const leadId = e.target.dataset.leadId;
    const day = e.target.dataset.day; // 'D1', 'D3', 'D7'
    
    const res = await fetch('/api/enzo/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, day })
    });
    
    if (res.ok) alert(`Follow-up ${day} enviado ✅`);
  });
});
```

**Backend**: Verificar si existe endpoint `/api/enzo/followup` en `src/express-servidor/endpoints-api/`

**Acciones**:
- [ ] Revisar `/enzo-leads.html` y localizar botones
- [ ] Implementar event listeners en JavaScript del dashboard
- [ ] Si falta endpoint backend: crear en `enzo-dashboard.js` o similar
- [ ] Probar clic en botón y verificar que envía follow-up
- [ ] Commit: `feat(enzo): activar botones follow-up dashboard - todo #49`
- [ ] Update Magic Todo #49 → `done`

---

#### BLOQUE A3 (40 min) — Todo #48: Mejorar prompt storytelling Enzo
**Objetivo**: Prompt actual "poco vendedor", necesita hook persuasivo  
**Magic Todo ID**: 48 (priority: medium, agent: enzo)

**Problema**: Email/WhatsApp de Enzo no convierte bien porque falta estructura persuasiva

**Archivo**: `src/deteccion-intenciones/enzo.js` — prompt del agente

**Estructura actual del prompt** (revisar líneas del archivo):
- Probablemente muy técnico/informativo
- Falta storytelling emocional
- No usa técnicas de copywriting (FOMO, social proof, CTA fuerte)

**Mejoras a implementar**:

1. **Hook inicial con problema del cliente**
```
En lugar de "Te puedo ayudar con marketing digital"
→ "¿Tu negocio está luchando por conseguir clientes en redes? No estás solo."
```

2. **Propuesta estructurada tipo PAS (Problem-Agitate-Solution)**
```
PROBLEMA: Muchas pymes gastan en ads sin ver resultados
AGRAVAR: Cada mes que pasa es presupuesto desperdiciado
SOLUCIÓN: Estrategia de 90 días con ROI medible desde el día 1
```

3. **Caso de éxito concreto** (social proof)
```
"Restaurante X aumentó ventas 40% en 2 meses con nuestra estrategia de contenido"
```

4. **CTA con urgencia**
```
"Solo tomo 3 proyectos por mes. Si quieres arrancar en marzo, hablemos esta semana."
```

**Template de propuesta mejorado**:
```markdown
## Plantilla Email/WA Enzo (vendedor)

Hola {{nombre}} 👋

Vi que estás interesad@ en {{tipo_proyecto}}. Déjame ser directo:

**El problema** que veo en el 90% de negocios:
→ Invierten en redes/ads sin estrategia clara
→ Crean contenido sin saber si atrae a su cliente ideal
→ Gastan presupuesto sin medir resultados reales

**¿Te suena familiar?**

En MarketingLab trabajamos diferente:
✅ Estrategia basada en datos (no corazonadas)
✅ Plan a 90 días con hitos medibles cada 30
✅ Brief completo antes de gastar $1 en ads

**Caso real**: Restaurante local aumentó pedidos 40% en 8 semanas con contenido estratégico + Meta Ads optimizados.

**Propuesta para {{nombre}}**:
📋 Brief de 60 min (gratis) → entendemos tu negocio a fondo
🎯 Plan 90 días con proyección de ROI
💰 Desde $890/mes todo incluido

¿Agendamos una llamada esta semana? Solo tomo 3 proyectos nuevos por mes.

Enzo 🎯
MarketingLab | Proyectos que funcionan
+593 99 483 7117
```

**Acciones**:
- [ ] Revisar prompt actual en `enzo.js`
- [ ] Reescribir con estructura PAS + social proof + CTA con urgencia
- [ ] Actualizar plantilla de email en `email-template-system.js` si es necesario
- [ ] Commit: `feat(enzo): mejorar prompt storytelling persuasivo - todo #48`
- [ ] Update Magic Todo #48 → `done`

---

#### BLOQUE A4 (40 min) — Todo #47: Reenfoque prompt Gabi cotizaciones
**Objetivo**: Email de Gabi necesita estructura más clara para consultas legales/financieras  
**Magic Todo ID**: 47 (priority: medium, agent: gabi)

**Problema**: Emails poco claros sobre qué ofrece Gabi exactamente

**Archivo**: `src/deteccion-intenciones/gabi.js` — prompt del agente

**Mejoras estructura propuesta**:

1. **Clarificar alcance de servicios**
```
CONSULTORÍA LEGAL:
→ Revisión de contratos
→ Asesoría laboral
→ Constitución de empresas

CONSULTORÍA FINANCIERA:
→ Análisis de flujo de caja
→ Proyecciones financieras
→ Reestructuración de deuda
```

2. **Pricing transparente con opciones**
```
📋 CONSULTA INICIAL (30 min): $50 (primera vez: GRATIS)
📄 REVISIÓN CONTRATO: desde $150
🏢 CONSTITUCIÓN EMPRESA: desde $800
```

3. **Call-to-action específico por tipo de consulta**
```
Si necesitas: revisar contrato urgente → Agendar hoy
Si necesitas: análisis financiero → Enviar estados financieros
Si necesitas: asesoría legal general → Llamada de 15 min gratis
```

**Template mejorado Gabi**:
```markdown
Hola {{nombre}},

Gracias por tu consulta sobre {{tema}}.

**¿En qué te puedo ayudar específicamente?**

{{si_tema_legal}}
✅ Revisión de contratos (laborales, arrendamiento, servicios)
✅ Asesoría en temas laborales (despidos, indemnizaciones)
✅ Constitución de empresas (SAS, Cía Ltda)
{{fin_si}}

{{si_tema_financiero}}
✅ Análisis de flujo de caja y proyecciones
✅ Reestructuración de deuda
✅ Planning financiero para negocios pequeños
{{fin_si}}

**Inversión**:
📋 Primera consulta (30 min): GRATIS para nuevos clientes
📄 Revisión de contrato simple: desde $150
🏢 Asesoría completa (proyecto): cotización personalizada

**Siguiente paso**:
Podemos agendar una videollamada de 15 minutos (sin costo) para entender tu caso y darte un plan de acción claro.

¿Te viene bien mañana en la tarde o prefieres otro día?

Gabi ⚖️
Asesoría Legal & Financiera
+593 99 483 7117
```

**Acciones**:
- [ ] Revisar prompt actual en `gabi.js`
- [ ] Reescribir con estructura de servicios clara + pricing + CTA específico
- [ ] Actualizar template de email si existe en `email-template-system.js`
- [ ] Commit: `feat(gabi): reenfoque estructura propuesta - todo #47`
- [ ] Update Magic Todo #47 → `done`

---

## 📊 CHECKLIST DE VALIDACIÓN FINAL

Antes de terminar autopilot, verificar:

### Tests
- [ ] `npm test` — Ejecutar suite completa (esperar >95% pass)
- [ ] Revisar errores nuevos en `get_errors` tool

### Deploy
- [ ] `git add . && git commit -m "feat: magic todos urgentes + ux fixes"`
- [ ] `git push origin main` (opcional, solo si Diego quiere backup)
- [ ] `git push heroku main` — Deploy a producción
- [ ] `heroku logs --app coworkia-agent --num 30` — Verificar deploy OK

### Magic Todos Verification
- [ ] Todos #57, #56, #50, #49, #48, #47 marcados como `done`
- [ ] Dashboard `/todos-dashboard.html` muestra 6 todos menos en pending

### Functional Testing
- [ ] Dashboard Adriana muestra prospecto Javier Troya
- [ ] Enviar email de prueba Adriana/Axel a celular Diego para validar Xiaomi fix
- [ ] Dashboard Enzo: botones D+1/D+3/D+7 funcionan al hacer clic
- [ ] (Opcional) Generar lead de prueba Enzo/Gabi para verificar nuevos prompts

---

## 🔔 NOTIFICACIÓN A DIEGO

Al terminar todos los bloques, enviar notificación WhatsApp:

```javascript
import notificationService from './src/servicios/notification-service.js';

await notificationService.notifyAutopilotComplete({
  planName: 'Magic Todos Urgentes + UX Agentes',
  blocksCompleted: 6,
  timeElapsed: '3.5h',
  deployVersion: 'v1120', // o la versión que resulte
  summary: `
✅ Todo #57: Prospecto Javier Troya restaurado
✅ Todo #56: Emails compatibles con Xiaomi
✅ Todo #50: Foto Axel Kia Picanto corregida
✅ Todo #49: Botones Enzo dashboard activos
✅ Todo #48: Prompt Enzo storytelling mejorado
✅ Todo #47: Propuesta Gabi reenfoqueada

🟢 Sistema en producción v1120
📊 6 Magic Todos completados
  `,
});
```

---

## 🚦 PROCEED WITH AUTOPILOT

**Instrucción para el agente**:
Ejecutar este plan de forma autónoma, bloque por bloque, haciendo commits incrementales y actualizando Magic Todos después de cada bloque. Si encuentras un bloqueo que no puedes resolver (ej: faltan datos de Diego), documenta el bloqueo y continúa con el siguiente bloque. Al finalizar, notifica a Diego con resumen completo.

**Comando de activación**: "AUTOPILOT VERDE NENA" ✅
