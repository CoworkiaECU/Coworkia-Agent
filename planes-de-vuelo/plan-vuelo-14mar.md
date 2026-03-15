# 🚀 Plan de Vuelo — 14 Marzo 2026
> Estado del trabajo del día. Actualizado continuamente.
> **Última actualización:** 15 Mar 2026 — Noche (post-auditoría Whisper + multiidioma 8 agentes)

---

### ✓ P5 — Homologación de idiomas (4 agentes, 6 idiomas) `15 Mar`
- Axel, Gabi, Enzo, Paula: `getMensajes` actualizado a ES/EN/FR/IT/PT/QU (entrada + despedida)
- `getSystemPrompt`: bloque de normalización + `Idioma:` / `idioma const` / `REGLA CRÍTICA` / `ADAPTACIÓN CULTURAL` en 6 langs
- Paula `personalidad.idiomas`: expandido de 2 → 6 idiomas
- Deployed: `fa5329f`

### ✓ Fix: respuesta "¿qué idiomas hablas?" `15 Mar`
- `detectLanguageListQuery()` — 13 patrones, detecta la pregunta en los 6 idiomas
- `getLanguageListResponse()` — intro en idioma del usuario + lista 🇪🇸🇬🇧🇫🇷🇮🇹🇧🇷⛰️
- Orquestador intercepta antes de OpenAI (sin costo de tokens) → `a41de06`
- Bug fix: faltaba `shouldReply: true` → caía a OpenAI con `prompt=undefined` → `bd6e682`

### ✓ ML-5 — Multiidioma impecable: 8 agentes completos `15 Mar`
**Deployed: `88b4524` (Aurora/Gabi/Enzo) + `53da0c1` (Axel/Adriana/Angela/Paula) + `ab77af0` (Enzo fix)**

Auditoría completa + correcciones aplicadas a los 8 agentes:

| Agente | getMensajes 6L | Normalización | IDIOMA ACTUAL | REGLA CRÍTICA #1/2/3 | ADAPTACIÓN CULTURAL 6L |
|--------|---------------|---------------|---------------|----------------------|------------------------|
| Aurora | ✅ | ✅ fix | ✅ | ✅ fix | ✅ fix |
| Aluna  | ✅ | ✅ | ✅ | ✅ | ✅ |
| Enzo   | ✅ | ✅ | ✅ | ✅ fix (#1→#1/2/3) | ✅ (QU expandido) |
| Gabi   | ✅ | ✅ | ✅ fix | ✅ fix | ✅ fix |
| Axel   | ✅ | ✅ | ✅ fix | ✅ fix | ✅ fix |
| Adriana| ✅ fix (it/pt/qu) | ✅ fix (full compat) | ✅ | ✅ fix (#1→#1/2/3) | ✅ fix |
| Angela | ✅ | ✅ fix | ✅ | ✅ | ✅ |
| Paula  | ✅ | ✅ fix (full compat) | ✅ fix | ✅ fix | ✅ fix |

---

## ✅ ML-6 — Bugs Whisper multiidioma `15 Mar`
**Deployed: pendiente commit**

- **Bug 1 CRÍTICO fix:** `openai.js` — `whisperLanguage` para `qu` ahora es `null` (auto-detect) en vez de `'es'`. API call omite `language` cuando es null. Retorno incluye `language: whisperLanguage || language` para trazabilidad.
- **Bug 2 MENOR fix:** `wassenger.js` — `blockedMessages` expandido de 3 → 6 idiomas (añadidos fr/it/pt)

### Bug 1 — CRÍTICO: Quechua fuerza español en Whisper
**Archivo:** `src/servicios-ia/openai.js` línea 354
**Afecta:** Los 8 agentes cuando `preferredLanguage === 'qu'`

```js
// ACTUAL — MAL: para 'qu' devuelve 'es' → fuerza transcripción en español
const whisperLanguage = supportedLanguages.includes(language) ? language : 'es';

// CORRECTO: para 'qu' devuelve null → Whisper hace auto-detect
const whisperLanguage = supportedLanguages.includes(language) ? language : null;
```

Además la llamada a la API debe condicionarse:
```js
// Si whisperLanguage es null, no pasar language (= auto-detect Whisper nativo)
const params = { file: audioFile, model: 'whisper-1', response_format: 'text' };
if (whisperLanguage) params.language = whisperLanguage;
const transcription = await client.audio.transcriptions.create(params);
```

### Bug 2 — MENOR: Mensaje "tipo bloqueado" incompleto
**Archivo:** `src/express-servidor/endpoints-api/wassenger.js` ~línea 1070
**Afecta:** usuarios FR/IT/PT que envíen sticker/documento/ubicación → reciben mensaje en español

```js
// ACTUAL — solo 3 idiomas:
const blockedMessages = { es: '...', en: '...', qu: '...' };

// CORRECTO — 6 idiomas:
const blockedMessages = {
  es: '📝 Por favor envía tu mensaje por texto, imagen o audio.\n\nNo puedo procesar este tipo de archivo.',
  en: '📝 Please send your message as text, image or audio.\n\nI cannot process this type of file.',
  fr: '📝 Envoyez votre message par texte, image ou audio.\n\nJe ne peux pas traiter ce type de fichier.',
  it: '📝 Invia il tuo messaggio come testo, immagine o audio.\n\nNon posso elaborare questo tipo di file.',
  pt: '📝 Envie sua mensagem como texto, imagem ou áudio.\n\nNão posso processar este tipo de arquivo.',
  qu: '📝 Ama hina willayta qillqasqapi, imaynapi utaq uyarinapaq apachimuy.\n\nMana atinichu kay laya willakuna ruwayta.'
};
```

### Lo que sí está bien ✅
- `getLocalizedAudioError()` en `audio-validator.js`: 6 idiomas completos ✅
- Fallback "no pude acceder al audio": 6 idiomas completos ✅
- `supportedLanguages = ['es','en','fr','it','pt']` (qu excluido) — correcto en concepto ✅
- Whisper recibe `userLanguage` del perfil del usuario → misma ruta para los 8 agentes ✅
- `agentName: 'orquestador'` en logs → correcto (Whisper es pre-agente) ✅

---

## ✅ ML-1 — Homologar Aurora, Adriana, Aluna, Ángela a 6 idiomas `15 Mar`
**Deployed: `e82cc14`**

- **Aurora** `getMensajes`: QU añadido (entrada + despedida)
- **Aurora** `getSystemPrompt` IDIOMA: extendido a 6 langs
- **Aurora** `getVirtualAgentSalesPrompt`: añadidos IT/PT/QU
- **Adriana** `getMensajes`: IT/PT/QU añadidos
- **Adriana** `getSystemPrompt`: normalización + IDIOMA/REGLA → 6 langs
- **Aluna** `getMensajes`: IT/PT/QU añadidos
- **Aluna** `getSystemPrompt`: normalización + IDIOMA/REGLA/ADAPTACIÓN CULTURAL → 6 langs
- **Ángela** `getMensajes`: FR/IT/PT añadidos (entre EN y QU)
- **Ángela** `getSystemPrompt`: IDIOMA/REGLA/ADAPTACIÓN CULTURAL → 6 langs (FR/IT/PT sobre QU)

## ✅ ML-2 — Completar `handoff-messages.js` `15 Mar`
**Deployed: `e82cc14`**

- `getAuroraExitMessage`: añadidos `it` y `qu`
- `getAuroraReturnMessage`: añadido `qu`
- `topicLine` (hasContext true/false): extendido a FR/IT/PT/QU

## ✅ ML-3 — Whisper: excluir `qu` del idioma forzado `15 Mar`
**Deployed: `e82cc14`**

- `supportedLanguages` Whisper: `['es', 'en', 'fr', 'it', 'pt']` — `qu` excluido
- Quechua usa auto-detect nativo (mejor precisión que forzar código no soportado)

## ✅ Fix: respuestas de idiomas personalizadas por agente `15 Mar`
**Deployed: `cebb482` + `73d672f`**

- `getLanguageListResponse(lang, agentId)`: cada agente tiene intro única que refleja su especialidad
  - Aurora: "¡Soy el corazón de Coworkia! ✨ Te conecto con todo en:"
  - Aluna: "¡Cierro membresías sin fronteras! 💼 Me adapto a ti en:"
  - Adriana: "Corredora con 33 licencias en Latinoamérica 🛡️ Proceso tus pólizas en:"
  - Enzo: "¡Llevo proyectos a todo el mundo! 🚀 MarketingLab opera en:"
  - Ángela: "MedBeneficios está en 19 países 💚 Cuido tu salud en:"
  - Axel: "¡Soy experto en reparación de colisiones! 🔧 PaintBull trabaja contigo en:"
  - Gabi: "¡El mundo financiero no tiene fronteras! ⚖️ Asesoro tus consultas en:"
  - Paula: "¡Las propiedades no tienen fronteras! 🏡 Asesoro en bienes raíces en:"
- Orquestador: pasa `activeAgent` a `getLanguageListResponse`

## ✅ Fix: Quechua persistencia en Ángela (y todos los agentes) `15 Mar`
**Deployed: `cebb482`**

- **Language lock** en orquestador: cuando `preferredLanguage !== 'es'`, inyecta bloque `🔒 IDIOMA ACTIVO` al TOP y BOTTOM de todos los system prompts — evita que el AI revierta al español por el historial
- **Detector QU**: añadidas palabras clave faltantes (`yupaichani`, `imanalla`, `allinmi`, `napaykullayki`, `sumaq`, etc.)

---

## ⏳ PENDIENTE — Siguiente sprint

### ML-4 — Emails HTML multiidioma (fase 1: textos de UI)
**Alcance:** `generic-email-templates.js` — añadir `userLanguage` param, traducir asunto/saludo/CTA/footer  
**Estrategia:** parámetro `userLanguage` en funciones de generación → strings condicionales por idioma  
**Nota:** no rediseñar templates, solo localizar textos de UI  
**Bloqueo:** es el más complejo — requiere sesión dedicada

### P3 — Auditoría de emails HTML (6 archivos, 8 agentes)
**Objetivo:** Saber cuál agente tiene template viejo, cuál no envía, cuál tiene campos mal.  
**Diferida** — esperar ML-4 primero para no duplicar trabajo

### P4 — Compatibilidad HTML emails (dark mode + Gmail + mobile)
**Diferida** — requiere P3 terminado

### P6 — TODOs bloqueados por cliente
- **AXEL:** Tarifario oficial de The PaintBull
- **PAULA:** Links de Drive para 5 propiedades
- **ALUNA:** Definir si el tour post-pago va a Google Calendar

---

## 📋 HISTORIAL COMPLETO DE TAREAS ANTERIORES

## ✅ TAREAS COMPLETADAS HOY

### ✓ Fases 1–5 del repo (mañana, v925→v930)
- F1.1: Template Axel premium migrado al sistema genérico
- F2: `isPositiveResponse`/`isNegativeResponse` unificados en `generic-confirmation-flow.js`
- F3: `code-generator.js` centralizado + 8 repositorios usan prefijos `AXL-/ADR-/GAB-/ENZ-/PAU-/ALU-/AUR-`
- F4: `parseDate` + `normalizeTimeFormat` centralizados en `date-time-parser.js` (Ecuador UTC-5)
- F5: `BaseRepository.js` creado — adriana, gabi, enzo, paula refactorizados (-236 líneas boilerplate)

### ✓ Desvío Axel v2 (tarde)
Tres mejoras entregadas, en producción desde `f8b17b2`:

**A — CTAs emocionales** (`axel-quote-email.js`, `collision-confirmation.js`, `wassenger.js`)
- Botón email: *"Agendar mi cita — mi auto lo merece 🚗✨"*
- `smsSummary` WhatsApp: copy con *"Tu auto habla por ti. Sin abolladuras = autoestima."*
- Post-email consent: Axel pregunta fecha de cita directamente en WA

**B — Agendamiento en taller** (`axel-appointment.js` nuevo, `wassenger.js`, `axelRepository.js`)
- `detectSchedulingIntent()` + `processWorkshopScheduling()` parsean lenguaje natural ("el martes en la mañana")
- `axelSchedulingPending` Map en wassenger — guarda `quoteCode` hasta que usuario dé fecha
- Guarda `collision_quotes.inspection_scheduled` en DB cuando el usuario agenda

**C — Recordatorios automáticos** (`postgres-adapter.js`, `axelRepository.js`, `axel-quote-email.js`, `follow-up-service.js`, `cron-scheduler.js`)
- 2 columnas nuevas en DB: `reminder_1_sent_at`, `reminder_2_sent_at`
- Email 24h: tono suave *"Tu cotización todavía te espera ⏳"*
- Email 7 días: tono diferente *"La vida se ve diferente desde un auto impecable 💪"*
- `processAxelQuoteReminders()` respeta horario 9am–6pm lun–vie Ecuador
- Cron: `0 10 * * 1-5` (10:00 AM lun–vie), solo si `inspection_scheduled IS NULL`

### ✓ P1 — Limpiar console.log DEBUG (tarde)
- Auditados 28 `console.log/warn/error` con "DEBUG" o "test"
- Resultado: 27 ya estaban gateados detrás de `DEBUG_MODE === 'true'` desde versiones anteriores
- El único expuesto era `payment-receipts.js:489` (comprobante test Diego) — gateado ahora
- Deployed: `d20a799`

### ✓ P2 — Borrar .DS_Store + carpeta data/
- 4 archivos `.DS_Store` eliminados: `./`, `public/`, `public/images/`, `public/images/axel-demo/`
- Carpeta `data/` (vacía) eliminada
- `.gitignore` ya los tenía cubiertos — no se commitean de nuevo
- Deployed: `d20a799`

---

## 🍽️ EN PAUSA — Almuerzo

---

## 📋 PRÓXIMAS TAREAS (orden recomendado)

### P3 — Auditoría de emails HTML (6 archivos, 8 agentes)
**Objetivo:** Saber cuál agente tiene template viejo, cuál no envía, cuál tiene campos mal.**Qué investigar concretamente:**
- `scripts/test-{agente}-email.mjs` existen para: adriana, aluna, axel — ¿y los demás?
- Inventariar los 12 archivos de email en `src/servicios/` — cuál usa cuál
- Revisar `generic-email-templates.js` vs templates propios (adriana, enzo, gabi, paula, aurora tienen propios)
- Identificar qué agentes NO tienen template HTML propio y qué envían (texto plano o nada)
- Detectar campos vacíos en los templates: logos que fallan, colores de marca inconsistentes
- **No hacer aún:** refactoring — solo auditar y listar hallazgos

### P4 — Compatibilidad HTML emails (dark mode + Gmail + mobile)
**Objetivo:** Emails que se vean bien en Gmail, Outlook, iOS y Android en dark mode.**Qué implica concretamente:**
- Los templates actuales usan `div` en vez de `table` (rompe Outlook)
- Estilos CSS no son todos inline (Gmail los stripea)
- No hay `@media (prefers-color-scheme: dark)` → dark mode muestra texto blanco sobre fondo blanco
- Imágenes sin dimensiones fijas → layout se rompe en mobile
- **Solución:** migrar a estructura tabla + inline CSS + media query dark mode en los templates más usados (Aurora, Axel, Aluna primero)

### P5 — Homologación de idiomas (8 agentes, 6 idiomas)
~~**Objetivo:** Todos los agentes responden en el idioma del usuario.~~
**✅ COMPLETADO `15 Mar`** — ver sección de tareas completadas.

### P6 — TODOs bloqueados por cliente
**No se pueden hacer hasta que el cliente entregue:**
- **AXEL:** Tarifario oficial de The PaintBull → `axel-quote-generator.js` + `axel-demo-cotizacion.js`
- **PAULA:** Links de Drive para 5 propiedades (Casa 1, 3, 6, 7, Generales) → `paula-casas-links.js`
- **ALUNA:** Definir si el tour post-pago va a Google Calendar o es solo recordatorio → `membership-payment-verification.js`

---

### 📧 SISTEMA DE EMAILS HTML (desglosado)

#### 6.1 Inventario completo de archivos de email
**Estado:** Pendiente análisis
- Listar TODOS los archivos que generan emails HTML
- Identificar qué agente usa cuál archivo
- Detectar duplicados o archivos huérfanos

#### 6.2 Revisar templates HTML de cada agente
**Estado:** Pendiente análisis
- **ADRIANA** (SegPopular - Seguros): revisar template y branding
- **ALUNA** (Coworkia - Membresías): revisar proformas
- **ANGELA** (MedBeneficios - Salud): revisar template
- **AURORA** (Coworkia - Reservas): revisar confirmaciones
- **AXEL** (PaintBull - Colisiones): revisar cotizaciones (mencionaste que hay problemas con aprobaciones)
- **ENZO** (MarketingLab - Marketing): revisar propuestas
- **GABI** (GR Consulting - Legal): revisar cotizaciones
- **PAULA** (PropElite - Bienes raíces): revisar emails de propiedades

#### 6.3 Detectar inconsistencias entre templates
**Estado:** Pendiente análisis
- Ver si algunos agentes usan diseños viejos
- Comparar estructura HTML entre agentes
- Detectar si hay secciones que faltan o están desactualizadas

#### 6.4 Problema específico de AXEL
**Estado:** Requiere investigación
- Mencionaste que hay templates que no reconocen aprobaciones realizadas
- **Investigar:** ¿Qué significa "no reconoce aprobaciones"?
  - ¿El email sale mal?
  - ¿Falta algún campo?
  - ¿El diseño no se ve bien?
- Leer código de axel-quote-email.js y comparar con otros agentes

#### 6.5 Verificar sistema genérico vs específico
**Estado:** Pendiente análisis
- Existe generic-email-templates.js
- ¿Todos los agentes lo usan?
- ¿Algunos tienen su propio sistema custom?
- ¿Hay código duplicado entre el genérico y los específicos?

#### 6.6 Probar cada template
**Estado:** Pendiente ejecución
- Ejecutar script de test para cada agente (test-{agente}-email.mjs)
- Verificar que los emails salgan bien
- Confirmar que todos los campos se llenan correctamente

#### 6.7 Plan de consolidación
**Estado:** Pendiente propuesta
- Basado en hallazgos de 6.1-6.6
- Proponer si unificar más o dejar separados
- Identificar qué se puede simplificar sin perder personalización

---

### 🔄 SISTEMA DE CONFIRMACIONES (desglosado)

#### 7.1 Inventario de archivos de confirmación
**Estado:** Pendiente análisis detallado
- Archivos detectados:
  - `aurora-confirmation-helper.js` (520 líneas)
  - `collision-confirmation.js` (AXEL)
  - `confirmation-flow.js` (AURORA - principal)
  - `gabi-confirmation.js` (GABI)
  - `insurance-confirmation.js` (ADRIANA)
  - `marketing-confirmation.js` (ENZO)
  - `membership-confirmation.js` (ALUNA)
  - `paula-confirmation-helper.js` (PAULA)
  - `real-estate-confirmation.js` (PAULA - 2do tipo)
  - `resend-confirmation.js` (helper)
  - `generic-confirmation-flow.js` (sistema universal)

#### 7.2 ¿Cuál es la diferencia entre generic y específico?
**Estado:** Requiere investigación
- Existe un sistema genérico (generic-confirmation-flow.js)
- Pero cada agente tiene su propio archivo
- **Investigar:**
  - ¿Qué hace el genérico?
  - ¿Qué hacen los específicos que el genérico no?
  - ¿Hay funcionalidad duplicada?

#### 7.3 Flujo de cada agente
**Estado:** Pendiente mapeo
- **AURORA:** Confirmación de reservas (sala/hot desk) → pago → calendario → email
- **ALUNA:** Confirmación de membresía → pago → proforma → tour
- **GABI:** Confirmación de consultoría legal → guardado en DB → email
- **ENZO:** Confirmación de proyecto marketing → guardado en DB → email
- **PAULA:** DOS tipos: visitas a propiedades + cotizaciones
- **AXEL:** Confirmación de cotización colisión → análisis fotos → email
- **ADRIANA:** Confirmación de seguro → guardado en DB → email
- **ANGELA:** (no tiene confirmation.js propio, ¿usa el genérico?)

#### 7.4 ¿Todos manejan SI/NO igual?
**Estado:** Pendiente comparación
- Ver si todos usan los mismos patrones para detectar "sí" (sí, si, ok, perfecto, confirmo, etc.)
- Ver si todos usan los mismos patrones para "no" (no, cancelar, mejor no, etc.)
- Detectar si hay inconsistencias

#### 7.5 Integración con reservation-state.js
**Estado:** Pendiente análisis
- 6 archivos importan `getPendingConfirmation` y `clearPendingConfirmation`
- ¿Todos los agentes usan este sistema de estado?
- ¿O algunos tienen su propio manejo de estado?

#### 7.6 Problema: ¿Qué pasa si el usuario confirma cuando no hay nada pendiente?
**Estado:** Requiere investigación
- Si un usuario dice "sí" sin contexto, ¿se rompe?
- ¿Hay validaciones para evitar confirmaciones huérfanas?

#### 7.7 Plan de unificación
**Estado:** Pendiente propuesta
- Basado en hallazgos de 7.1-7.6
- Proponer:
  - ¿Migrar todos al genérico?
  - ¿Mantener específicos pero con base compartida?
  - ¿Qué código se puede compartir sin perder flexibilidad?

---

### 📝 TODOs IMPORTANTES DEL CÓDIGO

#### 8.1 PAULA - Links de casas pendientes
**Estado:** Pendiente
- 5 casas sin links de Drive:
  - Casa 1
  - Casa 3
  - Casa 6
  - Casa 7
  - Generales
- **Necesitamos:** Los links reales para agregarlos
- **Archivo:** [paula-casas-links.js](src/servicios/paula-casas-links.js)

#### 8.2 AXEL - Tarifario oficial pendiente
**Estado:** En espera de cliente
- 2 TODOs dicen "cuando The PaintBull entregue su tarifario oficial"
- Actualmente usa tarifas estimadas/demo
- **Archivos:**
  - [axel-quote-generator.js](src/servicios/axel-quote-generator.js)
  - [axel-demo-cotizacion.js](src/servicios/axel-demo-cotizacion.js)
- **Acción:** Esperar a que cliente entregue tarifas reales

#### 8.3 ALUNA - Tour del espacio pendiente
**Estado:** Pendiente implementación
- Cuando alguien paga membresía, debería agendarse un tour
- El TODO dice "Programar tour del espacio"
- **Archivo:** [membership-payment-verification.js](src/servicios/membership-payment-verification.js)
- **Investigar:** ¿Queremos automatizar esto con Google Calendar o solo recordatorio?

---

### 🌍 HOMOLOGACIÓN DE IDIOMAS

#### 9.1 Estado actual del multiidioma
**Estado:** Pendiente auditoría
- Sistema soporta 6 idiomas: ES, EN, FR, IT, PT, QU
- Archivo central: `language-detector.js` (detección automática)
- Archivo support: `multi-language.js` (configuración compartida)
- **Problema detectado:**
  - Ángela: 6 idiomas completos
  - Otros agentes: No todos tienen 6 idiomas en sus getSystemPrompt
  - Algunos solo mencionan español/inglés

#### 9.2 Inventario por agente
**Estado:** Requiere análisis
- **Revisar cada archivo** en `src/deteccion-intenciones/*.js`:
  - ¿Tiene `personalidad.idiomas` declarado?
  - ¿getSystemPrompt maneja los 6 idiomas?
  - ¿getMensajes() tiene versiones en todos los idiomas?
  - ¿Las instrucciones REGLA CRÍTICA están en todos?

#### 9.3 Detectar agentes con idiomas incompletos
**Estado:** Pendiente comparación
- Comparar Aurora vs Ángela vs Axel vs Adriana vs resto
- Identificar quién tiene los 6 idiomas completos
- Identificar quién solo tiene 2-3 idiomas

#### 9.4 Uniformizar system prompts
**Estado:** Pendiente implementación
- Todos los agentes deben:
  - Soportar los 6 idiomas en getSystemPrompt
  - Tener mismo formato de "IDIOMA ACTUAL DEL USUARIO"
  - Incluir "REGLA CRÍTICA: Responde SIEMPRE en [idioma]"
  - Manejar edge cases (parámetros invertidos, defaults)

#### 9.5 Uniformizar getMensajes()
**Estado:** Pendiente implementación
- Aurora tiene `getMensajes(userLanguage)` con 6 versiones
- ¿Los demás agentes también?
- Mensaje de entrada, despedida, y status debe existir en 6 idiomas

#### 9.6 Verificar templates de emails
**Estado:** Pendiente auditoría
- Los emails HTML que envían los agentes ¿están traducidos?
- O siempre salen en español sin importar el idioma del usuario
- **Investigar:** Si cliente es inglés, ¿el email debe salir en inglés?

#### 9.7 Tests de idiomas
**Estado:** Pendiente validación
- Existe `multilanguage.test.js` con tests para todos los agentes
- Ejecutar suite completa
- Verificar que los 8 agentes pasan tests en inglés
- Agregar tests para FR, IT, PT, QU si faltan

---

### 📱 COMPATIBILIDAD HTML EMAILS

#### 10.1 Problema actual
**Estado:** Requiere investigación
- Gmail muestra colores horribles
- Android celulares también
- Dark mode cambia el diseño
- Plataformas diferentes rompen el layout

#### 10.2 Auditoría de código HTML actual
**Estado:** Pendiente análisis
- Revisar las 12 plantillas de email
- Identificar estilos en línea vs externos
- Detectar problemas comunes:
  - Background colors que Gmail reemplaza
  - Fuentes que no se cargan en móviles
  - Imágenes sin width/height fijo
  - Tablas sin max-width para móviles
  - CSS que dark mode rompe

#### 10.3 Investigar mejores prácticas Email HTML 2026
**Estado:** Pendiente research
- **Metas:**
  - Compatible con Gmail, Outlook, Apple Mail, Android, iOS
  - Funcionar en dark mode sin romperse
  - Responsive para móviles
  - Colores que se vean bien en todas las plataformas
- **Técnicas:**
  - Usar tablas en vez de divs (compatibilidad)
  - Estilos inline obligatorios
  - Media queries para dark mode
  - Colores con fallback
  - Prefijos -webkit para móviles
  - Máximo width 600px

#### 10.4 Implementar sistema de estilos universal
**Estado:** Pendiente diseño
- Crear módulo `email-styles-universal.js` con:
  - Variables de color dark-mode-safe
  - Estructura HTML compatible
  - Media queries para responsive
  - Prefijos de compatibilidad
- Aplicar a las 12 plantillas

#### 10.5 Testing en múltiples plataformas
**Estado:** Pendiente plan
- ¿Cómo testear emails en Gmail, Outlook, móviles?
- Opciones:
  - Litmus (servicio pago)
  - Email on Acid (servicio pago)
  - Enviar emails de prueba manualmente
  - Usar herramientas gratuitas online
- **Decidir** método de validación

#### 10.6 Implementar preflight checks
**Estado:** Pendiente diseño
- Crear función `validateEmailHTML(htmlString)` que detecte:
  - CSS externo (prohibido)
  - Imágenes sin dimensiones
  - Ancho mayor a 600px
  - Colores problemáticos en dark mode
  - Errores comunes de compatibilidad
- Llamar antes de enviar cada email

#### 10.7 Documentar guía de emails
**Estado:** Pendiente creación
- Crear `documentacion/guia-emails-html.md` con:
  - Reglas de compatibilidad
  - Colores aprobados
  - Estructura de tabla recomendada
  - Ejemplos de media queries
  - Checklist antes de agregar nuevos templates

---

### 🧠 SISTEMA DE AUTO-APRENDIZAJE

#### 11.1 Definir qué queremos aprender
**Estado:** Requiere clarificación
- ¿Aprender de qué exactamente?
  - Nuevas formas de escribir intenciones
  - Respuestas que funcionaron mejor
  - Patrones de usuarios recurrentes
  - Errores comunes del parsing
  - Preguntas frecuentes (FAQ automático)
- **Necesitamos:** Tu input sobre el objetivo principal

#### 11.2 Propuesta: Sistema de aprendizaje seguro
**Estado:** Pendiente validación
**OPCIÓN A - Feedback Loop (conservador):**
- Guardar mensajes que el sistema NO pudo procesar bien
- Guardar respuestas que el usuario rechazó o corrigió
- Revisar manualmente cada semana
- Ajustar prompts/regex basado en patrones reales
- ✅ Sin riesgo, control total
- ⚠️ Requiere revisión manual

**OPCIÓN B - Fine-tuning periódico (moderado):**
- Guardar interacciones exitosas en JSONL
- Cada mes, crear fine-tune de GPT-4 con ejemplos reales
- Usar modelo custom para parsing de intención
- ✅ Mejora real con datos propios
- ⚠️ Costo OpenAI, requiere mínimo 50 ejemplos

**OPCIÓN C - Vector store + RAG (avanzado):**
- Guardar conversaciones exitosas en vector DB (Pinecone/Weaviate)
- Cuando llega consulta similar, buscar ejemplos previos
- Inyectar contexto de casos similares al prompt
- ✅ Aprendizaje inmediato sin modificar modelos
- ⚠️ Requiere servicio externo, más complejo

#### 11.3 Propuesta: Análisis de conversaciones fallidas
**Estado:** Pendiente implementación
- Crear endpoint `/api/admin/failed-conversations`
- Detectar conversaciones donde:
  - Usuario abandonó sin completar
  - Usuario pidió @aurora volver (frustración)
  - Múltiples intentos de parsing fallidos
  - Mensajes con "no entiendo" o "ayuda"
- Dashboard para revisar y mejorar

#### 11.4 Sistema de métricas de calidad
**Estado:** Pendiente diseño
- Rastrear en PostgreSQL:
  - Tasa de intención detectada correctamente
  - Tiempo promedio para completar conversación
  - Handoffs exitosos vs fallidos
  - Abandono por agente
- Dashboard con Grafana o similar

#### 11.5 Prevención de problemas serios
**Estado:** Análisis de riesgos
**Riesgos de auto-aprendizaje:**
- ❌ Aprender de mensajes maliciosos
- ❌ Sobre-ajustar a casos edge
- ❌ Perder comportamiento general
- ❌ Datos sensibles en el entrenamiento
- ❌ Costos descontrolados de API
**Protecciones necesarias:**
- ✅ Whitelist de mensajes aprendibles (solo exitosos)
- ✅ Validación humana antes de fine-tune
- ✅ Limitar máximo tokens por mes
- ✅ Excluir datos personales/financieros
- ✅ Sistema de rollback si empeora

#### 11.6 Prototipo mínimo viable
**Estado:** Pendiente propuesta
- Empezar simple:
  - Tabla `learning_events` en PostgreSQL
  - Campos: user_id, message, intent_detected, was_successful, feedback
  - Guardar solo cuando `process.env.LEARNING_MODE === 'true'`
  - Dashboard simple para revisión semanal
- Sin modificar comportamiento actual
- Solo observación y recolección

#### 11.7 Roadmap de implementación
**Estado:** Pendiente aprobación
1. **Mes 1:** Recolección de datos + dashboard de análisis
2. **Mes 2:** Identificar top 10 mejoras basadas en datos
3. **Mes 3:** Implementar mejoras manualmente
4. **Mes 4:** Evaluar si vale la pena fine-tuning
5. **Mes 5+:** Iterar según resultados

---

### 🎤 SISTEMA WHISPER MULTIAGENTE

#### 12.1 Estado actual
**Estado:** Requiere investigación completa
- **Funcionando:** Whisper transcribe audio en 6 idiomas (ES, EN, FR, IT, PT, QU)
- **Archivo:** `src/servicios-ia/openai.js` → función `transcribeAudio()`
- **Problema:** Después de transcribir, SIEMPRE se envía a Aurora Core
- **Código problemático:** `wassenger.js` línea 1180 construye envelope para Aurora (`buildMessageEnvelope`)

#### 12.2 ¿Por qué solo Aurora procesa audios?
**Estado:** Análisis técnico
- Línea 1145 de wassenger.js: `transcribeAudio(mediaUrl, { agentName: 'orquestador' })`
- El agentName se pasa como "orquestador" pero luego el texto transcrito SIEMPRE va a Aurora
- **El problema:** No hay routing del audio transcrito hacia el agente correcto
- Necesitamos agregar detección de intención DESPUÉS de transcribir

#### 12.3 Solución propuesta - Whisper → Intent Detection → Agente correcto
**Estado:** Pendiente implementación
**Flujo actual:**
```
Audio → Whisper transcribe → texto → Aurora Core (siempre)
```

**Flujo propuesto:**
```
Audio → Whisper transcribe → texto → detectar @agente → rutear al agente correcto
```

**Cambios necesarios:**
1. Modificar wassenger.js después de línea 1175
2. Aplicar intent detection al texto transcrito
3. Si contiene @gabi, @axel, @aluna, etc. → rutear
4. Si no tiene mención explícita → Aurora (default)

#### 12.4 Casos especiales a considerar
**Estado:** Pendiente validación
- **Audio en mitad de conversación con Axel:** debe seguir con Axel
- **Audio después de handoff explícito:** respetar contexto
- **Audio con @mención:** priorizar mención sobre contexto
- **Audio sin contexto:** Aurora (default)

#### 12.5 Testing de Whisper por agente
**Estado:** Pendiente creación
- Crear tests para:
  - Audio "hola @gabi necesito asesoría legal" → Gabi responde
  - Audio "quiero reservar sala" (sin @) → Aurora responde
  - Audio en conversación activa de Axel → Axel continúa
  - Audio multi-idioma funcionando con todos los agentes

#### 12.6 Documentar sistema Whisper
**Estado:** Pendiente actualización
- Existe: `documentacion/WHISPER-MULTIIDIOMA-TECHNICAL.md`
- Actualizar con:
  - Nuevo routing a múltiples agentes
  - Manejo de contexto de conversación
  - Ejemplos por agente
  - Limitaciones y fallbacks

#### 12.7 Validar idiomas por agente
**Estado:** Pendiente verificación
- ¿Todos los agentes soportan los 6 idiomas de Whisper?
- ¿O algunos solo español/inglés?
- Conectar con punto 9 (homologación de idiomas)

---

### ♻️ ESTRATEGIA DE ELIMINACIÓN DE DUPLICADOS

#### 13.1 Inventario completo de duplicados detectados
**Estado:** Consolidación de hallazgos previos
**DUPLICADOS CONFIRMADOS:**

**A. Email templates (2,400 líneas):**
- `generic-email-templates.js` (1,642 líneas)
- vs archivos custom: axel-quote-email.js, gabi-cotizacion-email.js, enzo-cotizacion-email.js, adriana-cotizacion-email.js, paula-cotizacion-email.js
- **Impacto:** Axel envía DOS formatos diferentes al mismo cliente

**B. Sistema de confirmaciones (funciones SI/NO):**
- `isPositiveResponse()` e `isNegativeResponse()` en 2 lugares:
  - confirmation-flow.js (Aurora)
  - generic-confirmation-flow.js (Universal)
- Patrones regex idénticos

**C. Confirmation helpers:**
- `aurora-confirmation-helper.js` vs `paula-confirmation-helper.js`
- Funciones similares: shouldActivate, extractData, etc.

**D. Otros duplicados por encontrar:**
- Funciones de utilidades repetidas
- Validaciones duplicadas
- Parsers de fechas/horas en múltiples archivos
- Código de PostgreSQL/Database en varios lugares

#### 13.2 Estrategia por categoría
**Estado:** Pendiente decisión

**Para EMAIL TEMPLATES:**
- **Recomendación:** Consolidar en generic-email-templates.js
- Agregar soporte de fotos inline (caso Axel)
- Borrar archivos custom redundantes
- Mantener UN formato por agente
- **Beneficio:** Fin del problema "no reconozco aprobaciones"

**Para CONFIRMACIONES:**
- **Recomendación:** Aurora migra a generic-confirmation-flow.js
- Borrar confirmation-flow.js específico de Aurora
- Helpers → funciones compartidas
- **Beneficio:** Un solo lugar para patrones SI/NO

**Para HELPERS:**
- **Recomendación:** Crear `shared-helpers.js`
- Mover funciones repetidas ahí
- Importar desde archivos específicos
- **Beneficio:** Cambio en un lugar afecta a todos

**Para VALIDACIONES:**
- **Pendiente investigación:** Buscar validadores duplicados
- Ejemplo: validación de email, teléfono, fechas

#### 13.3 Búsqueda automatizada de duplicados
**Estado:** Pendiente ejecución
- Usar herramienta para detectar:
  - Funciones con nombres similares
  - Código con >80% similaridad
  - Regex patterns duplicados
- **Herramientas posibles:**
  - jscpd (JS Copy/Paste Detector)
  - jsinspect
  - PMD CPD
- **Acción:** Ejecutar y generar reporte

#### 13.4 Priorizar duplicados por impacto
**Estado:** Pendiente clasificación
- **CRÍTICO** (afecta usuario final):
  - Email templates (cliente recibe formatos diferentes)
  - Confirmaciones SI/NO (puede fallar detección)
- **ALTO** (complejidad de mantenimiento):
  - Helpers duplicados
  - Validaciones repetidas
- **MEDIO** (código más limpio):
  - Utilidades menores
  - Constantes repetidas

#### 13.5 Análisis realizado — Decisiones por agente
**Estado:** ✅ Completado (14 Mar 2026)

**DATOS DEL ANÁLISIS (jscpd + lectura manual):**
- 131 archivos JS analizados · 40,512 líneas · 17 clones detectados
- Duplicación total estimada: 3,370-3,970 líneas (~10%)

**TABLA DE DECISIONES — EMAIL TEMPLATES:**

| Agente | Generic (generic-email-templates.js) | Custom (*-cotizacion-email.js) | GANADOR | Razón |
|--------|--------------------------------------|-------------------------------|---------|-------|
| AXEL | Texto simple, sin fotos | Fotos con sharp, grid CID, tabla de trabajos | **CUSTOM** | El genérico no tiene foto support |
| GABI | 780+ líneas, pricing 2-tiers, AI analysis, servicios grid | 366 líneas, más básico | **GENERIC** | Mucho más completo |
| ENZO | Dark navy, cronograma 4 semanas, pricing table | 380 líneas | **GENERIC** | Más contenido y valor |
| ADRIANA | Logo base64, cuotas, premium section | 294 líneas | **GENERIC** | Cálculo de cuotas incluido |
| PAULA | PropElite minimalista, lead score integrado | 413 líneas | **GENERIC** | Lead score + diseño sofisticado |
| ALUNA | Proforma + upsell combos Oficina Virtual | 245 líneas | **GENERIC** | Upsell integrado |

**ESTRATEGIA FINAL:**
- **Axel:** Mover `generateQuoteEmailHTML` de axel-quote-email.js → generic-email-templates.js como nuevo `generateAxelEmailHTML` (con fotos). Actualizar collision-confirmation.js para usar el nuevo.
- **Gabi/Enzo/Adriana/Paula/Aluna:** Los archivos custom pasan a importar desde generic-email-templates.js. Sin cambios para el cliente — mismo diseño.

#### 13.6 Plan de eliminación FASE 1 — Emails (APROBADO PENDIENTE)
**Estado:** Pendiente ejecución — verde nena para arrancar

**PASO A: Preparar generic-email-templates.js**
1. Copiar `generateQuoteEmailHTML` de axel-quote-email.js → genérico como `generateAxelEmailHTML`
2. Agregar soporte de fotos inline y attachments al genérico de Axel
3. Verificar que todos los otros generates ya están completos

**PASO B: Actualizar importaciones (collision-confirmation.js)**
1. Cambiar import de `axel-quote-email.js` → `generic-email-templates.js`
2. Cambiar llamada: `generateQuoteEmailHTML(...)` → `generateAxelEmailHTML(...)`
3. Verificar que los parámetros coincidan

**PASO C: Actualizar archivos custom (4 archivos)**
1. `gabi-cotizacion-email.js` → su función `buildGabiEmailHTML` importa de genérico
2. `enzo-cotizacion-email.js` → idem
3. `adriana-cotizacion-email.js` → idem  
4. `paula-cotizacion-email.js` → idem

**PASO D: Tests antes y después**
1. Correr tests relevantes antes de cambios
2. Enviar email de prueba por cada agente
3. Verificar que el cliente recibe mismo diseño
4. Tests verdes → commit

**PASO E: Cleanup**
1. Borrar funciones HTML duplicadas de archivos custom (ya no necesarias)
2. Mantener lógica de boss command parsing (esa NO se duplica)
3. Mantener `fetchAndCompressPhoto` en axel-quote-email.js (lógica única)

#### 13.7 Plan de eliminación FASE 2 — Confirmaciones SI/NO
**Estado:** Pendiente ejecución

**Objetivo:** Aurora usar generic-confirmation-flow.js en lugar de confirmation-flow.js
- Verificar que `confirmation-flow.js` y `generic-confirmation-flow.js` tienen mismos patterns
- Actualizar imports de Aurora para usar genérico
- Archivar/borrar `confirmation-flow.js` si no hay diferencias funcionales

#### 13.8 Plan de eliminación FASE 3 — Generadores de Código
**Estado:** Pendiente diseño

**Crear `src/utils/code-generator.js`:**
```javascript
export async function generateSequentialCode(prefix, tableName, codeColumn, padLength = 3) {
  // Lógica única que hoy está duplicada 8 veces
}
```
- Reemplazar generateQuoteCode en: collision-confirmation.js, insurance-confirmation.js, axel-quote-code.js
- Reemplazar generateLeadCode en: real-estate-confirmation.js, membership-confirmation.js
- Reemplazar generateConsultationCode (gabi), generateProjectCode (enzo), generateVisitCode (paula)
- **Ahorro:** ~120 líneas

#### 13.9 Plan de eliminación FASE 4 — Date/Time Parsers
**Estado:** ✅ COMPLETADO (v929 — 14 Mar 2026)

**Creado `src/utils/date-time-parser.js`:**
- `normalizeTimeFormat(timeStr, defaultTime='09:00')` — versión con default configurable
- `parseDate(dateStr)` — versión timezone-aware Ecuador (America/Guayaquil) de Aurora
- Removidas funciones locales de `aurora-confirmation-helper.js` y `paula-confirmation-helper.js`
- Paula llama `normalizeTimeFormat(str, '10:00')` para mantener su default de visitas
- **Ahorro real:** 124 líneas eliminadas (net: -247 líneas duplicadas + 123 utilidad)

#### 13.10 Plan de eliminación FASE 5 — Base Repository
**Estado:** 🔄 En análisis (siguiente)

**Crear `src/database/BaseRepository.js`:**
- Clase base con CRUD genérico: `save(data)`, `getByCode(code)`, `getByUser(userId)`, `updateStatus(code, status, notes)`, `getStats()`
- Constructor: `{ table, codeColumn, userColumn='user_id' }`
- **5 repositories candidatos** (patrón idéntico): `adrianaRepository`, `gabiRepository`, `enzoRepository`, `paulaRepository`, `bossQuotesRepository`
- **NO entran** (lógica única): conversationRepository, reservationRepository, alunaRepository, axelRepository, auroraRepository
- **Ahorro estimado real:** ~400-500 líneas (los 5 simples × ~80 líneas boilerplate)

#### 13.11 Métricas del proyecto
**Estado:** Línea base establecida

**ANTES (14 Mar 2026):**
- Código total: 40,512 líneas · 131 archivos
- Duplicación detectada: 253 líneas exactas (jscpd) + ~3,200 estimadas manual
- Email files: 12 archivos · 5,349 líneas · 2 formatos por agente
- Confirmation SI/NO: duplicado en 2 lugares

**META:**
- Reducir ~3,500 líneas de código duplicado
- De 12 → 7 archivos de email
- Un solo formato consistente por agente
- Todos los agentes reciben mismo nivel de calidad de email

---

## 🐛 TESTS FALLANDO

**Estado:** Pendiente revisión
- 13 tests rotos de 458 totales
- 7 suites con problemas
- El más crítico: `partial-form-regression.test.js` espera campo `paymentMethod` que ya no aparece
- **Necesitamos:** Revisar si los tests están mal o si el código cambió y rompió funcionalidad

---

## 📍 PRÓXIMOS PASOS INMEDIATOS

1. ✅ Plan de vuelo creado y actualizado
2. ✅ Limpieza ejecutada (DS_Store, data/, console.log DEBUG)
3. ✅ Análisis completo: emails, confirmaciones, duplicados
4. ✅ **Fase 1.1 PASO A+B:** Template Axel premium migrado al genérico + collision-confirmation usa sendQuoteEmail con fotos CID
5. ✅ **Deploy v922 Heroku** — GitHub actualizado (commit d8619df)
6. ✅ **Fase 1.1 PASO C:** Gabi dead code eliminado. Enzo/Adriana/Paula conservados (justified: boss commands con OpenAI)
7. ✅ **Fase 2:** isPositiveResponse/isNegativeResponse unificados en generic-confirmation-flow.js. confirmation-flow.js re-exporta.
8. ✅ **Desvío post-pruebas Axel** (ver checkpoint abajo) — 3 bugs corregidos, deploy v923
9. ✅ **Fase 3:** code-generator.js + 8 archivos refactorizados. Prefijos AXL/ADR/GAB/ENZ/PAU/ALU/AUR — v925
10. ✅ **Fase 3b hotfix:** AUR- en reservations, ALU- en membership_leads, columna membership_code — v926
11. ✅ **Aluna DB migration:** PRO-→ALU- en membership_leads (2 rows) — v928
12. ✅ **Fase 4:** date-time-parser.js (parseDate + normalizeTimeFormat) centralizado. Aurora + Paula refactorizados — v929
13. ✅ **Fase 5:** BaseRepository.js — adriana, gabi, enzo, paula refactorizados (-236 líneas boilerplate) — v930
14. ⏳ **← SIGUIENTE → Desvío Axel v2:** CTAs persuasivos + agendamiento en calendario Coworkia + recordatorios automáticos
15. ⏳ P9: Homologar idiomas
16. ⏳ HTML emails multiplataforma (Punto 10)
17. ⏳ Whisper multiagente (Punto 12)
18. ⏳ Arreglar 13 tests fallando

---

## 🧪 CHECKPOINT: PRUEBAS DE AXEL (14 Mar 2026 — Noche) ✅ COMPLETADO

**Resultado:** Flujo de usuario normal funcionó bien. Se detectaron 3 bugs:

### Bug 1 — "I'm sorry, I can't assist with that." en tabla de trabajos
**Causa:** `complete()` en `axel-quote-generator.js` se llamaba sin `system` message. OpenAI a veces rechaza prompts de cotización de daños sin contexto técnico explícito.
**Fix:** Añadido `system: 'Eres un especialista en cotizaciones de talleres...'` al `complete()`. Añadido fallback estructurado desde `damages_by_panel` cuando OpenAI rechaza (en vez de mostrar el texto de rechazo en el email).
**Archivo:** `src/servicios/axel-quote-generator.js`

### Bug 2 — Secuencial no incrementó en el dashboard
**Causa:** `collision-confirmation.js` tenía su propia `generateQuoteCode()` con prefijo `PB-YEAR-` (no `AXEL-YEAR-NNNN`) y usaba `LIKE ?` (SQLite) en vez del query raw de PostgreSQL. Siempre generaba `PB-2026-001`.
**Fix:** Eliminada función local, importada `generateQuoteCode` de `axel-quote-code.js`. Return cambiado de string a `const quoteCode = (await generateQuoteCode()).code`.
**Archivo:** `src/servicios/collision-confirmation.js`

### Bug 3 — Footer blanco/light en email de cotización
**Causa:** `axel-quote-email.js` usaba `theme: 'light'` con fondo blanco. Otros agentes (Enzo, Gabi) tienen footer dark con gradiente oscuro.
**Fix:** Footer reemplazado por ecosistema dark (`background:#12121a`, `border-top:3px solid #DC2626`, título naranja PaintBull). Aliados correctos: enzo, gabi, angela, adriana, paula, aurora (sin axel — regla: el agente que envía no aparece en su propio footer).
**Archivo:** `src/servicios/axel-quote-email.js`

**Deploy:** GitHub commit `01cabfd` → Heroku v923 ✅ · 445/458 tests pasando

---
## 🧭 CHECKPOINT: PRUEBAS AXEL v2 (14 Mar 2026) ✅ COMPLETADO

**Boss command:** Excelente — flujo completo sin errores.
**Flujo usuario normal:** Excelente — cotización, fotos, email generados correctamente.

**Resultado:** Axel está en producción y funciona bien. Se identificaron 3 mejoras estratégicas:

### Mejora A — CTAs persuasivos en emails/mensajes
**Contexto:** Los botones y enlaces actuales son informativos, no persuasivos.
**Objetivo:** Cada CTA debe incitar a agendar/reservar. La acción = acercarse a la venta.
**Concepto clave:** AUTO limpio y sin abolladuras = autoestima + reflejo de quien lo maneja.
**Archivos a tocar:** `axel-quote-email.js`, mensajes de WhatsApp en `collision-confirmation.js`

### Mejora B — Axel agenda en Google Calendar (como Aurora)
**Contexto:** Aurora usa `secretaria.coworkia` + calendario de Coworkia para confirmar reservas. Axel debe poder hacer lo mismo para agendar el ingreso del auto al taller.
**No crear calendarios nuevos** — reutilizar credenciales y agenda existente de Coworkia.
**Archivos de referencia:** `aurora-confirmation-helper.js`, `calendario.js`

### Mejora C — Recordatorios automáticos WhatsApp + Email
**Contexto:** Clientes que recibieron cotización pero no agendaron.
**Flujo:**
- 1 día después: recordatorio suave (tono: "tu auto te lo agradece")
- 1 semana después: segundo acercamiento (tono diferente, NO repetitivo)
**Canal:** WhatsApp (mensaje) + Email (HTML nuevo, diseño PaintBull)
**Concepto:** Persuasión emocional — auto sin abolladuras = confianza, presencia, autoestima
**Archivos nuevos:** scheduler de recordatorios, template HTML recordatorio PaintBull

---

## 🔮 LO QUE VIENE DESPUÉS (P9 — Homologación de idiomas)

Cuando terminemos el desvío de Axel, arrancamos con P9. Aquí el resumen para no perder contexto:

**Problema:** Algunos agentes responden en inglés o mezclan idiomas cuando:
- El usuario escribe en español pero el system prompt tiene frases en inglés
- Los mensajes de error/fallback están hardcodeados en inglés
- Las fechas y formatos (AM/PM) salen en formato anglosán

**Meta:** 100% de respuestas en español latinoamericano (Ecuador), sin mezclas.

**Archivos principales a auditar:**
- `src/deteccion-intenciones/orquestador.js` — mensajes de error
- `src/deteccion-intenciones/handoff-messages.js` — mensajes de transición
- System prompts de cada agente — verificar lenguaje de instrucción
- Respuestas fallback en `wassenger.js`

---
## 🛑 PAUSAS Y RETOMAS

Cuando digas **"pausa"** o **"descansar"**, actualizaré este archivo con:
- Qué se completó
- Qué quedó pendiente
- Siguiente paso cuando retomes

---

**Última actualización:** 14 Mar 2026 — Fase 5 completa (v930). Desvío Axel v2 identificado (CTAs + agendamiento calendario + recordatorios automáticos). **Próximo:** Desvío Axel v2 (Mejoras A+B+C) → luego P9 Homologación idiomas.
