# ✈️ Plan de Vuelo — Email Anti-Spam
**Fecha**: 24 Mar 2026  
**Magic Todo**: #39 — "Crear un sistema para que los mails NUNCA caigan en spam por cargar archivos HTML"  
**Estimado**: 2 - 2.5h  
**Estado**: 🟡 EN PROGRESO

---

## 📊 Diagnóstico Previo

**Problema central**: Los emails HTML del sistema caen en spam por:
1. **Sin `text/plain` fallback** — todos los emails son 100% HTML, lo cual es señal roja para filtros
2. **HTML muy pesado** — 1,200-2,500 líneas por email (Gmail penaliza > 102KB)
3. **SVGs inline** en `email-ecosystem.js` — los SVGs inline son bandera de phishing para muchos filtros
4. **`rejectUnauthorized: false`** en mailer.js — problema de seguridad TLS
5. **From inconsistente** — código usa `secretaria.coworkia@gmail.com` como fallback, pero `EMAIL_FROM` = `noreply@coworkia.com`
6. **Sin headers anti-spam estándar** — falta `List-Unsubscribe`, `X-Mailer` correcto, `Precedence`

**Resumen técnico del sistema actual**:
- 15 archivos JS de email, ~11,500 líneas
- Proveedor: Gmail SMTP via Nodemailer
- HTML: 100% inline literal (template literals)
- SPF/DKIM: no configurado en código (nivel DNS — fuera del alcance de este plan)

---

## 🚀 Objetivo del Plan

Implementar un sistema defensivo anti-spam en **la capa de envío** (no en cada template individual) para que TODO email que salga del sistema:
1. Tenga siempre una versión `text/plain` auto-generada
2. Sea comprimido/minificado para reducir tamaño
3. Tenga headers correctos
4. Use `rejectUnauthorized: true` (TLS correcto)
5. Elimine SVGs inline del ecosistema de emails

---

## 📋 Tareas

### 🟥 Bloque 1: Fix crítico — TLS + From consistente (15 min)

- [ ] **1.1** En `src/servicios/mailer.js`: cambiar `rejectUnauthorized: false` → `true`  
  _Motivo: TLS permisivo es señal de mal actor para algunos filtros_

- [ ] **1.2** En `src/servicios/mailer.js`: asegurar que el `from` del transporter tome `EMAIL_FROM` env var  
  _El fallback actual usa `secretaria.coworkia@gmail.com` hardcodeado — el `from` debe coincidir con el email autenticado_

---

### 🟧 Bloque 2: text/plain auto-generado (45 min)

- [ ] **2.1** En `src/servicios/email-assets.js`: crear función `htmlToPlainText(html)`  
  - Strip todas las tags HTML
  - Preservar saltos de línea semánticos (`<br>`, `<p>`, `<div>`, `<tr>`)
  - Preservar URLs de `<a href="">` como texto
  - Normalizar múltiples espacios/newlines
  - Retornar string limpio y legible

- [ ] **2.2** En `src/servicios/email.js`: modificar la función `sendEmail()` para auto-generar `text` si no viene en las opciones  
  ```js
  // Si no hay text/plain, auto-generarlo desde el HTML
  if (!options.text && options.html) {
    options.text = htmlToPlainText(options.html);
  }
  ```

- [ ] **2.3** Verificar con `get_errors` que no hay errores después de los cambios  

---

### 🟨 Bloque 3: Minificación de HTML (30 min)

- [ ] **3.1** En `src/servicios/email-assets.js`: crear función `minifyEmailHTML(html)`  
  - Eliminar comentarios HTML (`<!-- ... -->`)
  - Colapsar múltiples espacios/newlines a uno (sin afectar contenido de texto)
  - Eliminar whitespace entre tags (`>  <` → `><`)
  - NO tocar contenido dentro de `<style>`, `<pre>`, atributos ni texto visible
  - Retornar HTML comprimido

- [ ] **3.2** En `src/servicios/email.js`: aplicar `minifyEmailHTML()` al HTML antes de pasar al transporter  
  ```js
  if (options.html) {
    options.html = minifyEmailHTML(options.html);
  }
  ```

- [ ] **3.3** Verificar que el minify no rompe el renderizado visual (spot check comparando tamaños antes/después en logs)

---

### 🟦 Bloque 4: Eliminar SVGs inline del ecosistema (30 min)

- [ ] **4.1** Leer `src/servicios/email-ecosystem.js` para entender los SVGs inline  
  _Los SVGs inline en emails son bandera roja de phishing para SpamAssassin y filtros similares_

- [ ] **4.2** Reemplazar todos los SVGs inline por:
  - **Opción A** (preferida): emojis Unicode equivalentes (más simples, universales)
  - **Opción B**: texto en `<span>` con estilos coloreados

- [ ] **4.3** Verificar visual básico del ecosistema después del cambio

---

### 🟩 Bloque 5: Headers anti-spam estándar (20 min)

- [ ] **5.1** En `src/servicios/email.js` en la función `sendEmail()`: agregar headers estándar en cada envío:
  ```js
  headers: {
    'X-Mailer': 'Coworkia Agent v2',
    'X-Priority': '3',          // Normal priority (1=High causa spam!)
    'Precedence': 'bulk',       // Más para newsletters, pero ayuda
    'List-Unsubscribe': `<mailto:${EMAIL_USER}?subject=unsubscribe>`,
    'X-Auto-Response-Suppress': 'All',
  }
  ```
  _IMPORTANTE_: Solo añadir `List-Unsubscribe` si el email es notificación/marketing, no en confirmaciones de transacción (Aurora reservas, pagos).

- [ ] **5.2** Distinguir entre emails transaccionales vs. marketing para headers apropiados:
  - Transaccionales (Aurora confirmación, pagos, proformas directas): sin `List-Unsubscribe`, sin `Precedence: bulk`
  - Marketing/Follow-ups (D+1, D+3, D+7, reminders): con `List-Unsubscribe` + `Precedence: bulk`

---

### 🔵 Bloque 6: Documentación SPF/DKIM (15 min)

- [ ] **6.1** Crear `documentacion/EMAIL-ANTISPAM-CONFIG.md` con:
  - Registros DNS SPF exactos para Gmail (`v=spf1 include:_spf.google.com ~all`)
  - Instrucciones DKIM (generación desde Google Workspace Admin o Gmail)
  - Registro DMARC recomendado
  - Checklist de verificación con herramientas (mail-tester.com, mxtoolbox.com)
  - Nota: sin SPF+DKIM, incluso los mejores emails caen en spam eventualmente

---

### ✅ Bloque 7: Verificación final + Deploy (15 min)

- [ ] **7.1** Ejecutar `npm test` para verificar que los cambios no rompieron tests existentes

- [ ] **7.2** Commit: `feat: sistema anti-spam - text/plain auto, minify HTML, sin SVG inline, headers correctos (#39)`

- [ ] **7.3** Deploy: `git push heroku main`

- [ ] **7.4** Verificar logs post-deploy: `heroku logs --app coworkia-agent --num 30`

- [ ] **7.5** PATCH Magic Todo #39 → `done` via `https://coworkia-agent-e97d15dac56f.herokuapp.com/api/todos/39/status`

- [ ] **7.6** Actualizar `queue.json` con el plan completado

---

## 🗺️ Mapa de archivos clave

| Archivo | Cambio |
|---------|--------|
| `src/servicios/mailer.js` | TLS fix, from consistente |
| `src/servicios/email-assets.js` | + `htmlToPlainText()`, + `minifyEmailHTML()` |
| `src/servicios/email.js` | Auto-text/plain + minify en `sendEmail()` |
| `src/servicios/email-ecosystem.js` | Reemplazar SVGs inline → emojis |
| `documentacion/EMAIL-ANTISPAM-CONFIG.md` | Nueva — guía SPF/DKIM/DMARC |

---

## 🔒 Reglas de ejecución

- No modificar los templates HTML individuales (hay 15 archivos, se haría en la capa de envío)
- No cambiar el diseño visual de los emails
- Si `rejectUnauthorized: true` rompe la conexión SMTP en producción → revertir y documentar
- Checkpoint commit al terminar el Bloque 4 (punto seguro de rollback)

---

## 📊 Éxito esperado

| Métrica | Antes | Después |
|---------|-------|---------|
| text/plain en emails | ❌ Ninguno | ✅ 100% automático |
| Tamaño HTML | ~1,200-2,500 líneas sin comprimir | ~30-50% reducción |
| SVGs inline | ✅ Presentes | ❌ Eliminados |
| TLS seguro | `rejectUnauthorized: false` | `rejectUnauthorized: true` |
| Headers anti-spam | ❌ Ninguno | ✅ X-Mailer, X-Priority, List-Unsubscribe |
| Score mail-tester.com | Desconocido → estimar 4-6/10 | Objetivo: 8+/10 |

