# 🤖 Coworkia Agent# coworkia-agent



Agente conversacional multi-agente con integración WhatsApp vía Wassenger.Minimal project structure for coworkia-agent.



## 👥 Agentes Disponibles## Structure

- `src/server/index.js`: Server entry point

### 🌟 Aurora - Recepcionista Coworkia- `config/.env.example`: Example environment variables

**Activación:** Por defecto  - `.gitignore`: Node and environment ignores

Información, reservas, Hot Desk, pagos, día gratis- `package.json`: Project metadata

- `README.md`: Project documentation

### 💼 Aluna - Closer de Ventas# Coworkia Agent (Bootstrap)

**Activación:** Menciona "plan mensual", "membresía"  Servidor base para Aurora/Aluna/Enzo.

Planes 10/20, oficinas ejecutivas/virtuales, cierre de ventas- Ruta de prueba: /health


### 🛡️ Adriana - Broker Seguros (Segpopular S.A.)
**Activación:** `@adriana`  
Seguros vida, vehículos, incendio, cotizaciones (17 años experiencia)

### 🚀 Enzo - Experto Marketing & IA
**Activación:** `@enzo`  
Estrategias digitales, IA, automatización (mercado Ecuador)

---

## 🚀 Deploy Rápido GitHub + Heroku

```bash
# 1. Subir a GitHub
git init
git add .
git commit -m "feat: Coworkia Agent completo"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/coworkia-agent.git
git push -u origin main

# 2. Deploy Heroku
heroku login
heroku create coworkia-agent
heroku config:set OPENAI_API_KEY=tu_clave
heroku config:set WASSENGER_TOKEN=tu_token
heroku config:set WASSENGER_DEVICE=tu_device
git push heroku main

# 3. Ver logs
heroku logs --tail
```

**O usa el script automático:**
```bash
./deploy-heroku.sh
```

---

## 📱 Configurar WhatsApp (Wassenger)

1. Ve a tu Dashboard de Wassenger
2. Webhooks → Editar webhook existente
3. **URL:** `https://tu-app.herokuapp.com/webhooks/wassenger`
4. **Events:** `message:in-new`, `message:out-new`
5. Save & Test

🎉 ¡Listo! Ahora Aurora responde en WhatsApp 24/7

---

## 📁 Estructura

```
src/
├── servicios-ia/           # OpenAI
├── deteccion-intenciones/  # Cerebro (4 agentes)
├── perfiles-interacciones/ # Memoria
└── express-servidor/       # API + Webhook
```

---

## 🧪 Testing Local

```bash
npm install
npm run dev

# Probar agentes
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hola"}' # → Aurora

curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "plan mensual"}' # → Aluna

curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "@adriana seguro"}' # → Adriana
```

---

## 📚 Documentación Completa

- [documentacion/DEPLOY_HEROKU.md](documentacion/DEPLOY_HEROKU.md) - Guía detallada deploy
- [documentacion/WASSENGER_SETUP.md](documentacion/WASSENGER_SETUP.md) - Integración WhatsApp
- [.env.example](.env.example) - Variables necesarias

---

## 🔧 Variables Requeridas

```env
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
WASSENGER_TOKEN=tu_token
WASSENGER_DEVICE=tu_device
PORT=3001
```

---

**Autor:** Diego Villota  
**Proyecto:** Coworkia  
**Licencia:** MIT
