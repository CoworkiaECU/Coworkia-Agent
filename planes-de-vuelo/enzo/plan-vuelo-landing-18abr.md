# Plan de Vuelo: Landing OneMind + Dominio + Redes Sociales
**Fecha**: 18 abril 2026  
**Agente**: Enzo (landing de ventas)  
**Prioridad**: ALTA  
**Estimado**: 3 bloques de trabajo

---

## BLOQUE 1 — Dominio `diegovillota.com` + Deploy
**Estimado**: 30 min — **COMPLETADO 18 abr 2026**

> **NOTA**: Se usó `diegovillota.com` y `www.diegovillota.com` (no subdominio ai.)

- [x] **1.1** Agregar dominios en Heroku (`heroku domains:add diegovillota.com` + `www.diegovillota.com`)
- [x] **1.2** Configurar CNAME `www` → `behavioral-mayflower-lc99f7xubzvmh46vkauz21oy.herokudns.com` en cPanel Zone Editor
- [x] **1.3** Configurar redirección 301 `diegovillota.com` → `https://www.diegovillota.com` en cPanel Redirige
- [x] **1.4** Heroku SSL automático (en proceso de provisioning)
- [ ] **1.5** Verificar sitio en `https://www.diegovillota.com` (SSL puede tardar minutos)
- [ ] **1.6** Actualizar meta tags OG/canonical con nuevo dominio
- [ ] **1.7** Actualizar URLs en CTAs de WhatsApp (tracking source)
- [ ] **1.8** Deploy a producción

### DNS Targets (referencia):
| Dominio | Target |
|---------|--------|
| `diegovillota.com` | `adjacent-mongoose-oyl17qmo9y5my4l6l2s74neu.herokudns.com` |
| `www.diegovillota.com` | `behavioral-mayflower-lc99f7xubzvmh46vkauz21oy.herokudns.com` |

## BLOQUE 2 — Integración Instagram DMs + Facebook Messenger
**Estimado**: 4-5h  
**Dependencia**: Cuenta Business IG + Facebook Page ✅

### 2A — Setup Meta Developer App (EN PROGRESO)
- [x] **2.1** Meta App existente: **Coworkia Agent** (App ID: `3126833560850017`, negocio: coworkia.ec)
- [ ] **2.2** Obtener App Secret (Settings → Basic → Mostrar)
- [ ] **2.3** Agregar caso de uso "Messenger" a la app
- [ ] **2.4** Agregar caso de uso "Instagram" a la app
- [ ] **2.5** Conectar Facebook Page a la app
- [ ] **2.6** Conectar Instagram Professional a la app
- [ ] **2.7** Obtener Page Access Token de larga duración
- [ ] **2.8** Configurar variables en Heroku:
  - `META_APP_SECRET`
  - `META_PAGE_ACCESS_TOKEN`
  - `META_VERIFY_TOKEN` (lo generamos nosotros)
  - `META_PAGE_ID`
  - `META_IG_ACCOUNT_ID`

### 2B — Código backend
- [ ] **2.9** Crear `src/express-servidor/endpoints-api/meta-webhook.js` — webhook unificado IG + Messenger
- [ ] **2.10** Implementar verificación webhook (GET challenge)
- [ ] **2.11** Implementar handler mensajes entrantes (POST)
- [ ] **2.12** Normalizar formato Meta → formato interno (como Wassenger)
- [ ] **2.13** Crear `enviarMeta(plataforma, recipientId, mensaje)` — Send API
- [ ] **2.14** Conectar al `procesarMensaje()` del orquestador existente
- [ ] **2.15** Registrar ruta en `src/express-servidor/index.js`

### 2C — Testing + Deploy
- [ ] **2.16** Registrar webhook URL en Meta: `https://www.diegovillota.com/webhooks/meta`
- [ ] **2.17** Test IG DM → respuesta del agente
- [ ] **2.18** Test FB Messenger → respuesta del agente
- [ ] **2.19** Deploy con los 3 canales activos (WA + IG + FB)

---

## ESTADO
- **Bloque 1**: ✅ 80% COMPLETADO — falta verificar SSL + actualizar meta tags
- **Bloque 2A**: 🟡 EN PROGRESO — Meta App identificada, faltan credenciales
- **Bloque 2B**: ⬜ PENDIENTE
- **Bloque 2C**: ⬜ PENDIENTE

## PRÓXIMOS PASOS (siguiente sesión):
1. Verificar que `https://www.diegovillota.com` carga con SSL ✅
2. En Meta Developers: obtener App Secret + agregar Messenger + Instagram
3. Construir webhook `/webhooks/meta`
4. Conectar y testear
