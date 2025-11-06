# 🚀 Conexión Heroku - Pasos Finales

## ✅ Variables Ya Configuradas en Heroku

Veo que ya tienes:
- ✅ OPENAI_API_KEY
- ✅ WASSENGER_TOKEN  
- ✅ WASSENGER_DEVICE_ID
- ✅ WHATSAPP_BOT_NUMBER

## ⚙️ Variables Faltantes (Opcionales pero recomendadas)

Agrega estas en Heroku Dashboard → Settings → Config Vars:

| Key | Value |
|-----|-------|
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `ENV` | `production` |
| `AGENT_BUILDER_TOKEN` | `B1FB9E5E-1031-4ED1-A72D-7E1DF051D7E9` |

O por terminal:
```bash
heroku config:set OPENAI_MODEL="gpt-4o-mini"
heroku config:set ENV="production"
heroku config:set AGENT_BUILDER_TOKEN="B1FB9E5E-1031-4ED1-A72D-7E9"
```

## 🔗 Conectar Git con Heroku

```bash
# 1. Verificar que estés en la carpeta del proyecto
cd /Users/diegovillota/coworkia-agent

# 2. Ver la URL del Git de Heroku (cópiala de tu dashboard)
# URL: https://git.heroku.com/coworkia-agent.git

# 3. Agregar remoto de Heroku
git remote add heroku https://git.heroku.com/coworkia-agent.git

# 4. Verificar remotos
git remote -v

# 5. Hacer primer deploy
git add .
git commit -m "feat: Deploy inicial - 4 agentes + WhatsApp"
git push heroku main

# Si te pide login:
heroku login
```

## 📱 Actualizar Webhook en Wassenger

Tu URL de Heroku es:
```
https://coworkia-agent.herokuapp.com
```

**Webhook URL para Wassenger:**
```
https://coworkia-agent.herokuapp.com/webhooks/wassenger
```

### Pasos en Wassenger:
1. Ve a tu Dashboard de Wassenger
2. Click en **"Coworkia Agent (11)"** (el que ya tienes)
3. Edit
4. Cambia la URL de:
   ```
   https://coworkia-agent.herokuapp.com/webhooks/wassenger
   ```
5. Events: `message:in-new` ✅ (ya lo tienes)
6. Save
7. Test Connection → Debe dar ✅

## 🧪 Verificar que Todo Funcione

### 1. Ver logs de Heroku
```bash
heroku logs --tail
```

Deberías ver:
```
> Coworkia Agent listo en http://localhost:XXXX
```

### 2. Probar endpoint
```bash
curl https://coworkia-agent.herokuapp.com/webhooks/wassenger
```

Respuesta esperada:
```json
{
  "ok": true,
  "message": "Wassenger Webhook activo",
  "timestamp": "2025-11-06T..."
}
```

### 3. Enviar mensaje de prueba por WhatsApp

Al número: **593994837117**

Mensaje:
```
Hola Aurora
```

Deberías recibir respuesta automática 🎉

## 🐛 Si Algo Falla

### Error: "No such app"
```bash
heroku apps:info coworkia-agent
# Verifica el nombre exacto de tu app
```

### Error: "Permission denied"
```bash
heroku login
```

### Error: Webhook no llega
1. Verifica URL en Wassenger (sin `/` extra al final)
2. Ve logs: `heroku logs --tail`
3. Chequea que device esté conectado en Wassenger

## ✅ Checklist Final

- [ ] Variables agregadas en Heroku
- [ ] Git remoto agregado (`git remote add heroku ...`)
- [ ] Deploy exitoso (`git push heroku main`)
- [ ] Logs sin errores (`heroku logs --tail`)
- [ ] Endpoint responde (curl a /webhooks/wassenger)
- [ ] Webhook actualizado en Wassenger
- [ ] Test desde WhatsApp → ✅ Respuesta

---

**¡Todo listo para producción! 🚀**
