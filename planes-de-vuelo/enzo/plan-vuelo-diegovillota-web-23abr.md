# ✈️ Plan de Vuelo — diegovillota.com Refactor (Estilo Artefakt)
## Fecha: 23 Abril 2026 | Chat: Ejecución Frontend

---

## Contexto
Refactorización completa de diegovillota.com clonando la estética editorial de https://artefakt.mov/
Stack: Vite + React + Framer Motion + Express (para Heroku)
Proyecto creado en: `/Users/diegovillota/diegovillota-web/`
Site actual: diegovillota.com es OneMind/MarketingLab (no toca eso, es sitio aparte)

---

## Archivos ya creados ✅

### Config base
- [x] `/Users/diegovillota/diegovillota-web/package.json` — React 18 + Vite + Framer Motion + Express
- [x] `/Users/diegovillota/diegovillota-web/vite.config.js` — build a `/dist`, puerto 3000
- [x] `/Users/diegovillota/diegovillota-web/server.js` — Express sirve `/dist`, SPA fallback
- [x] `/Users/diegovillota/diegovillota-web/Procfile` — `web: node server.js`
- [x] `/Users/diegovillota/diegovillota-web/index.html` — font Space Grotesk (Google Fonts)
- [x] `/Users/diegovillota/diegovillota-web/.gitignore`

### Styles
- [x] `/Users/diegovillota/diegovillota-web/src/styles/global.css`
  - Design tokens completos: colores, tipografía, spacing, motion
  - Reset + utilidades: `.container`, `.label`, `.section-number`, `.btn`, `.link-anim`
  - Custom cursor CSS (hide default, show propio)
  - Scrollbar minimalista, selection invertida

### Componentes
- [x] `/Users/diegovillota/diegovillota-web/src/components/Cursor.jsx` — cursor dot + ring con lerp animation
- [x] `/Users/diegovillota/diegovillota-web/src/components/Cursor.css` — expand on hover, hidden en mobile
- [x] `/Users/diegovillota/diegovillota-web/src/components/Nav.jsx` — logo + links desktop + hamburger mobile + overlay menu animado
- [x] `/Users/diegovillota/diegovillota-web/src/components/Nav.css` — sticky, backdrop-blur on scroll, underline animation
- [x] `/Users/diegovillota/diegovillota-web/src/components/PageTransition.jsx` — Framer Motion fade+slide entre rutas

### Páginas
- [x] `/Users/diegovillota/diegovillota-web/src/pages/Home.jsx` — 4 secciones + footer
  - Hero: headline gigante con outline text, eyebrow labels, tagline + CTA
  - Sección 01: Proyectos Destacados (tabla tipo Artefakt)
  - Sección 02: Identity "¿Guitarra o código?" (grid 2col)
  - Sección 03: Servicios en grid 2x2 (cards con hover)
  - Sección 04: Clases con 3 cards horizontales
  - Footer: grid 3 columnas con email
- [x] `/Users/diegovillota/diegovillota-web/src/pages/Home.css`
- [x] `/Users/diegovillota/diegovillota-web/src/pages/Bio.jsx` — headline + bio body 2col + stats 4col + CTA
- [x] `/Users/diegovillota/diegovillota-web/src/pages/Services.jsx` — lista de 4 servicios full-width
- [x] `/Users/diegovillota/diegovillota-web/src/pages/Clases.jsx` — 3 cards de cursos con topics + CTA
- [x] `/Users/diegovillota/diegovillota-web/src/pages/InnerPage.css` — estilos compartidos Bio/Services/Clases

### Entry points
- [x] `/Users/diegovillota/diegovillota-web/src/App.jsx` — Router + AnimatePresence + rutas (/, /bio, /servicios, /clases)
- [x] `/Users/diegovillota/diegovillota-web/src/main.jsx` — createRoot + BrowserRouter + import global.css

---

## Tareas pendientes

- [ ] **T1** — Instalar dependencias
  ```bash
  cd /Users/diegovillota/diegovillota-web && npm install
  ```

- [ ] **T2** — Verificar build sin errores
  ```bash
  npm run build
  ```
  Errores comunes a revisar:
  - Import de `./InnerPage.css` en Bio.jsx, Services.jsx, Clases.jsx (ya está)
  - Cursor.jsx: `document.querySelectorAll` en useEffect puede necesitar MutationObserver para detectar links añadidos después del montaje (opcional, baja prioridad)

- [ ] **T3** — Dev server local para revisar visualmente
  ```bash
  npm run dev
  # → http://localhost:3000
  ```
  Verificar:
  - [ ] Hero full-height con título gigante
  - [ ] Custom cursor funciona en desktop
  - [ ] Nav sticky + blur on scroll
  - [ ] Overlay menu mobile (hamburger)
  - [ ] PageTransition al navegar entre rutas
  - [ ] Secciones con numeración 01/02/03/04
  - [ ] Hover en work-items (padding expand)
  - [ ] Outline text en todos los headlines

- [ ] **T4** — Ajustes visuales post-revisión (si aplica)
  - Colores: `--bg: #0a0a0a` (negro profundo), `--fg: #f0ede8` (blanco cálido)
  - Si Diego quiere fondo blanco: cambiar en `global.css` las variables bg/fg

- [ ] **T5** — Git init y primer commit
  ```bash
  cd /Users/diegovillota/diegovillota-web
  git init
  git add .
  git commit -m "feat: initial diegovillota.com — Artefakt-style editorial design"
  ```

- [ ] **T6** — Deploy a Heroku
  ```bash
  heroku create diegovillota-web --region us
  # O si ya existe la app:
  heroku git:remote -a [nombre-app-heroku]
  git push heroku main
  ```
  ⚠️ NO deployar sin autorización de Diego

- [ ] **T7** — (Opcional) Agregar página 404 minimalista
  ```jsx
  // src/pages/NotFound.jsx
  // Route: <Route path="*" element={<NotFound />} />
  ```

---

## Diseño — decisiones clave tomadas

| Elemento | Decisión |
|----------|----------|
| Fondo | `#0a0a0a` negro profundo (como Artefakt) |
| Texto | `#f0ede8` blanco cálido |
| Fuente | Space Grotesk (Google Fonts) — similar a Helvetica Neue |
| Hero title | `clamp(3.2rem, 9.5vw, 8.5rem)` + outline text para segunda línea |
| Numeración | `01 / 02 / 03 / 04` en label uppercase como Artefakt |
| Transiciones | Framer Motion `AnimatePresence` + `useInView` para reveal on scroll |
| Cursor | Dot 5px + ring 32px con lerp tracking, expand a 56px en hover |
| Nav mobile | Overlay full-screen con links gigantes animados stagger |

---

## Estructura final de carpetas

```
/Users/diegovillota/diegovillota-web/
├── Procfile
├── index.html
├── package.json
├── server.js
├── vite.config.js
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── components/
    │   ├── Cursor.css
    │   ├── Cursor.jsx
    │   ├── Nav.css
    │   ├── Nav.jsx
    │   └── PageTransition.jsx
    ├── pages/
    │   ├── Bio.jsx
    │   ├── Clases.jsx
    │   ├── Home.css
    │   ├── Home.jsx
    │   ├── InnerPage.css
    │   └── Services.jsx
    └── styles/
        └── global.css
```

---

## Para retomar esta sesión

1. Leer este archivo
2. Ejecutar T1 (`npm install`) → T2 (`npm run build`) → T3 (`npm run dev`)
3. Si hay errores de build, revisar imports de CSS en las páginas
4. Continuar desde T4 en adelante

---

## Registro de abandono

- **Fecha**: 23 de abril de 2026
- **Motivo**: Frustración con el estándar de trabajo del agente.
- **Estado**: Trabajo abandonado en esta sesión.

---

## 🔄 RETOMA — 4 de mayo de 2026 (sesión activa)

### Contexto recuperado
El sitio fue retomado por Diego con un nuevo chat. El chat anterior se cayó dejando el sitio en un estado **mixto**: hero con narrativa OneMind/MarketingLab pero el resto del Home aún era contenido del músico (works musicales, servicios musicales).

Decisión de Diego: **fusionar definitivamente** el sitio antiguo (músico) con el nuevo (OneMind / agencia IA), mostrando todo el ecosistema real, clientes reales y mencionando el portal cautivo WiFi.

### Cambios aplicados en esta sesión (chat 4-may)

**Archivos modificados** (`/Users/diegovillota/diegovillota-web/`):

1. **`src/pages/Home.jsx`**
   - Sección 01 "Proyectos Destacados" → **"Sistemas en operación / Ecosistema OneMind"**
     - Nuevos works: OneMind/Coworkia, KATANA, ARI, Scrapy, Portal Cautivo WiFi, MarketingLab
   - Sección 02 "¿Guitarra o código?" → **mantenida + slot video bg** (`/videos/identity-placeholder.mp4`)
   - Sección 03 "De la visión al sonido" → **"8 agentes. 1 cerebro."**
     - Lista de 8 agentes: Aurora, Adriana, Axel, Paula, Gabi, Enzo, Ángela, Aluna
   - Sección 04 "Clases & Educación" → mantenida (Diego sigue siendo educador musical)
   - **Nueva sección 05 "Infraestructura silenciosa"** → habla del Portal Cautivo WiFi
   - Footer actualizado: dirección Whymper 403, menciona OneMind · MarketingLab · Coworkia

2. **`src/pages/Services.jsx`**
   - Reemplazado: 4 servicios musicales → **8 agentes IA** con descripción detallada de cliente real, tags y deliverable
   - Header: "Servicios" → "Agentes IA"
   - Headline: "DE LA IDEA / AL SONIDO / FINAL" → "UN AGENTE / PARA CADA / NEGOCIO"
   - CTA principal: "Quiero un agente para mi negocio"

3. **`src/pages/Bio.jsx`**
   - Headline: "MÚSICO QUE / NO PARA / DE APRENDER" → "MÚSICO / QUE CONSTRUYE / SISTEMAS"
   - Body: narrativa fusionada — músico + arquitecto de sistemas + lista de creaciones (OneMind, Coworkia, KATANA, ARI, Scrapy, MarketingLab)
   - Stats: "Géneros / Álbumes" → "8 Agentes IA en operación / 5 Plataformas en producción"

4. **`src/pages/Home.css`**
   - Nuevas clases: `.section--with-video`, `.section__video-bg`, `.section__video-overlay`
   - Video con `filter: grayscale(100%) brightness(0.55)` + opacity 0.35 + radial gradient overlay → estilo Artefakt

5. **`src/pages/Clases.jsx`** — SIN CAMBIOS (Diego sigue dando clases de piano/teoría/producción)

### Videos placeholder añadidos
Copiados desde otros proyectos del workspace:
- `public/videos/hero-placeholder.mp4` ← `WiFi Coworkia/public/videos/promo-coworkia.mp4` (5.6 MB)
- `public/videos/identity-placeholder.mp4` ← `ARI/oferta comercial/public/ari_movie.MP4` (3.7 MB)

⚠️ **Reemplazar con videos definitivos** cuando estén listos. El placeholder de identity tiene watermark visible ("Vibes / @audionodemarketing.ec").

### Slots de video disponibles para sumar
- Hero (GlitchHero component) — actualmente ASCII glitch sobre fondo negro. Se puede agregar video bg fácilmente.
- Sección 03 "8 agentes" — buena candidata para video bg de loop estilo "operación".
- Sección 05 "Infraestructura silenciosa" — podría llevar video del portal cautivo WiFi en acción.

Para agregar video bg a otra sección:
```jsx
<section className="section container section--with-video">
  <div className="section__video-bg" aria-hidden="true">
    <video autoPlay muted loop playsInline>
      <source src="/videos/NOMBRE.mp4" type="video/mp4" />
    </video>
    <div className="section__video-overlay" />
  </div>
  {/* contenido */}
</section>
```

### Inventario base usado para textos
Subagente exploró estos folders del workspace para extraer datos reales:
- `/Users/diegovillota/coworkia-agent/` → 8 agentes IA, clientes
- `/Users/diegovillota/WiFi Coworkia/` → portal cautivo
- `/Users/diegovillota/Scrapy/` → motor LOPDP
- `/Users/diegovillota/ARI/` → oferta comercial Padelmar/Jacaranda
- `/Users/diegovillota/Katana Agent /` → Kartódromo Cotopaxi

Marcas de Diego: Coworkia (Aurora), MarketingLab (Enzo), VAZ/SegPopular (Adriana), The PaintBull (Axel), PropElite (Paula), GR Consulting (Gabi), MedBeneficios (Ángela), Membresías Coworkia (Aluna).

Ubicación física: **Whymper 403, Edificio Finistere, Quito**.

### Tareas pendientes — fase post-fusión

- [ ] **R1** — Capturar pantalla completa y revisar con Diego cada sección (en curso)
- [ ] **R2** — Reemplazar `hero-placeholder.mp4` y `identity-placeholder.mp4` con videos definitivos sin watermark
- [ ] **R3** — (Opcional) Agregar video bg al GlitchHero
- [ ] **R4** — (Opcional) Crear página `/proyectos` o `/casos` con cada plataforma en detalle (Coworkia, KATANA, ARI, Scrapy, Portal WiFi)
- [ ] **R5** — Actualizar `Nav.jsx` si se decide separar "Agentes IA" de "Servicios" o agregar link a "Proyectos"
- [ ] **R6** — Build & deploy (con autorización de Diego):
  ```bash
  cd /Users/diegovillota/diegovillota-web
  npm run build
  git add . && git commit -m "feat: fusión OneMind + ecosistema completo + slots video bg"
  git push heroku main
  ```

### Decisión narrativa central (NO cambiar sin avisar a Diego)

> **Diego Villota = creador, broker, piloto, ingeniero.**
> NO es músico/compositor profesional (eso quedó descartado el 4-may por Diego).
> El sitio ahora comunica:
> - **Creador** del ecosistema OneMind y todos sus productos.
> - **Broker de seguros** con cartera vehicular activa (VAZ/SegPopular).
> - **Especialista en automatizaciones** y campañas de marketing de última tecnología.
> - Construye software propio y **renta licencias** de sus creaciones.
> - **Piloto profesional de karting**, instructor y dueño de equipo en Kartódromo Cotopaxi.
> - Sede física: Whymper 403, Edificio Finistere, Quito.

### Sesión 4-may (continuación tarde) — UI/UX upgrade

**Bugs corregidos**:
- Cursor invisible en todo el sitio: `Cursor.jsx` usaba clases `cursor-dot/cursor-ring` pero el CSS define `.cursor__dot/__ring`. Renombrado en JSX. Canvas del GlitchHero ya no fuerza `cursor: default`.

**Componente nuevo: `VideoReveal`** (`src/components/VideoReveal.jsx` + `.css`)
- Scroll-driven con `useScroll` + `useTransform` de Framer Motion
- Curva de revelado: `[0, 0.25, 0.55, 0.9, 1] → [0, max, max, max*0.4, 0]`
- Aplica scale + parallax vertical sutiles
- Filter `grayscale(60%) contrast(1.08)` por defecto
- Acepta props: `src`, `target` (ref de la sección), `maxOpacity`, `blend`, `tint`
- Reemplaza el sistema viejo `.section--with-video` (todavía existe en CSS por compatibilidad)

**Aplicado en Home**:
- Sección 02 Identidad → `VideoReveal` con `identity-placeholder.mp4`, `maxOpacity={0.7}`, tint vertical
- Sección 05 Infraestructura → `VideoReveal` con `hero-placeholder.mp4`, `maxOpacity={0.55}`, tint radial

**Logos copiados** a `/public/logos/`:
- `onemind.png`, `marketinglab.png`, `coworkia.svg`, `kartodromo.png`
- Strip "OPERAMOS" justo después del Hero, con grayscale + hover color

**Bio reescrito** (`src/pages/Bio.jsx`):
- Headline: "CREADOR. BROKER. PILOTO. INGENIERO."
- 4 párrafos: creador de OneMind+ecosistema → broker seguros → automatizaciones+licensing → piloto profesional Cotopaxi+instructor+equipo
- Stats: 8 agentes IA · 5 plataformas · +1k vueltas Cotopaxi · 24/7 always-on

**Home cambios**:
- Sección 02: "¿Guitarra o código?" → **"Póliza, código o vuelta rápida."** + bigtext "CREADOR / BROKER / PILOTO / INGENIERO"
- Sección 04: "Clases & Educación / La música se aprende sonando" → **"Pista & Pupitre / EL MILISEGUNDO SE GANA EN EL SETUP"** con 3 cards: Piloto Profesional · Instructor · Equipo Propio
- Logo strip arriba con OneMind, MarketingLab, Coworkia, Kartódromo + texto SegPopular/PaintBull/PropElite/GR Consulting

### Cómo retomar si este chat se cae

1. **Leer este archivo completo** (sección "RETOMA — 4 de mayo de 2026")
2. **Verificar dev server** corriendo: si no, `cd /Users/diegovillota/diegovillota-web && npm run dev` (puerto 3000)
3. **Abrir navegador** en `http://localhost:3000/`
4. **Continuar desde la última tarea `R*` no completada**
5. Los archivos clave del sitio están en `/Users/diegovillota/diegovillota-web/src/pages/` y `src/components/`

### Decisión narrativa central (NO cambiar sin avisar a Diego)

> **Diego Villota es músico y arquitecto de sistemas con IA.**
> El sitio comunica esa dualidad sin escoger un lado:
> - El **hero** es OneMind (la marca tecnológica que lidera ahora).
> - La **identidad (sec 02)** mantiene "¿Guitarra o código?" — la pregunta que define el ADN.
> - Los **agentes (sec 03)** muestran que OneMind no es promesa: opera 8 negocios reales hoy.
> - **Bio** narra la transición músico → ingeniero de sistemas.
> - **Clases** mantiene viva la dimensión educador musical.
> - **Footer** firma como "OneMind IA · Música · Código · Sistemas".

---

## 🚀 SESIÓN 4-may NOCHE — Eliminación música + DEPLOY a producción

### Decisión final (sobreescribe la narrativa anterior)

> Diego pidió **eliminar TODA referencia a música**. La narrativa de "músico/educador musical" queda DESCARTADA permanentemente. El sitio ahora comunica solo: **creador, broker, piloto, ingeniero**.

### Cambios aplicados

**Eliminación total de música**:
- [x] Borrado `src/pages/Clases.jsx`
- [x] Eliminada ruta `/clases` de `src/App.jsx`
- [x] Eliminado link "Clases" del nav (`src/components/Nav.jsx`)
- [x] CTAs de Bio/Services/Home/footer reescritos sin música
- [x] CSS muerto `.clases-*` eliminado de `InnerPage.css`
- [x] Footer "Música · Código · Sistemas" → **"Sistemas · Código · Pista"**
- [x] CTA Home sec 04: "Ver formación & karting" → **"Quiero rodar en Cotopaxi"** (mailto)
- [x] CTA Bio: "Explorar clases" → **"LinkedIn ↗"**
- [x] CTA Services: "Ver clases de música" → **"Conocer al creador"**

**LinkedIn integrado**:
- [x] Link a `https://www.linkedin.com/in/diegovillota/` en footer + en Bio CTA
- ⚠️ No se pudo scrapear LinkedIn para personalizar Bio (bloquea bots). Pendiente: Diego debe pegar su "About" para refinar.

**Responsive auditado** (viewport 390×844 iPhone):
- ✅ Hero ASCII OK · Logo strip wrapea · Karting CTA visible · Footer LinkedIn ↗
- Breakpoints activos: 1024px (tablet), 768px (mobile), grids → 1 col en móvil

**Build & deploy**:
- [x] `npm run build` → 313KB JS / 16KB CSS / gzip 101KB
- [x] `package.json`: vite movido a `dependencies` + script `heroku-postbuild`
- [x] `git init -b main` + commit inicial
- [x] `heroku create diegovillota-web --region us`
- [x] `git push heroku main` → Released v3 ✅
- [x] App URL: https://diegovillota-web-3acded694594.herokuapp.com/

**Dominio custom `www.diegovillota.com`**:
- [x] Dominio agregado en Heroku (`heroku domains:add www.diegovillota.com`)
- [x] Liberado de app huérfana (`coworkia-agent` lo tenía reservado — `heroku domains:remove`)
- [x] CNAME en cPanel actualizado: `www` → `round-pepper-9ohtvdkkqb0o20i8hqa1q58t.herokudns.com.`
- [x] SSL automático (Let's Encrypt) emitido — válido hasta 2026-08-03
- [x] Verificado HTTP/2 200 vía DNS público (8.8.8.8)

### 🌐 PRODUCCIÓN ACTIVA

```
https://www.diegovillota.com    ✅ LIVE (SSL OK)
https://diegovillota-web-3acded694594.herokuapp.com/    ✅ LIVE (URL Heroku)
```

### Pendiente (no urgente)

- [ ] **R7** — Apex `diegovillota.com` (sin www): cPanel no permite CNAME en apex (limitación DNS estándar). Hay que hacer **redirect 301** desde apex → `https://www.diegovillota.com` usando módulo "Redirects" de cPanel. Pendiente para próxima sesión.
- [ ] **R8** — Refinar Bio con datos reales del LinkedIn de Diego (cuando pegue su "About" o exporte PDF).
- [ ] **R2** — Reemplazar `identity-placeholder.mp4` (tiene watermark "Vibes / @audionodemarketing.ec").
- [ ] **R9** — Agregar logos PaintBull, PropElite, GR Consulting al strip (no encontrados en repos — posiblemente extraer del PDF en `/Desktop/OneMind 2026/The PaintBull/`).

### Repo Git nuevo

- Ubicación: `/Users/diegovillota/diegovillota-web/.git/`
- Remote `heroku`: `https://git.heroku.com/diegovillota-web.git`
- Branch: `main`
- ⚠️ Sin remote GitHub aún — agregar cuando Diego decida si lo quiere público o privado.

### Heroku app info

- App: `diegovillota-web`
- Cuenta: `mktlab.ec@gmail.com`
- Region: `us`
- Dyno: Eco (auto-sleep)
- Stack: heroku-22 (default)
- Procfile: `web: node server.js`

