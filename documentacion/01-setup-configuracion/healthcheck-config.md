# 🚀 Configuración de UptimeRobot para Healthcheck

## 📋 Problema
- Heroku Eco dyno se duerme después de 30 min de inactividad
- Wake-up añade 6-10 segundos de latencia
- Causa timeouts en webhooks (30s límite)

## ✅ Solución: UptimeRobot

### 1. Crear cuenta en UptimeRobot
- https://uptimerobot.com/
- Plan gratuito: 50 monitores, checks cada 5 minutos

### 2. Crear Monitor
```
Type: HTTP(s)
Friendly Name: Coworkia Agent Healthcheck
URL: https://coworkia-agent-e97d15dac56f.herokuapp.com/ping
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds
```

### 3. Endpoints Disponibles

#### `/ping` (Ultra-ligero)
- Respuesta: `pong`
- Sin queries DB
- < 50ms response time
- **RECOMENDADO para UptimeRobot**

#### `/health` (Básico)
- Response:
```json
{
  "ok": true,
  "ai": "ready"
}
```
- Sin queries DB
- < 100ms response time

#### `/health/detailed` (Completo)
- Verifica PostgreSQL
- Verifica Circuit Breakers
- Memory usage
- Uptime stats
- ~200-500ms response time
- **NO usar para healthcheck automático** (demasiado pesado)

### 4. Alternativa: Heroku Scheduler

Si no quieres servicio externo, usa Heroku Scheduler:

```bash
# Instalar add-on (gratis)
heroku addons:create scheduler:standard

# Abrir dashboard
heroku addons:open scheduler
```

**Configurar job:**
```bash
Command: curl https://coworkia-agent-e97d15dac56f.herokuapp.com/ping
Frequency: Every 10 minutes
Dyno size: Free
```

### 5. Verificación

Después de configurar, monitorear:

```bash
# Ver último acceso
heroku logs --tail | grep "GET /ping"

# Verificar que dyno no hace idle
heroku ps
```

**Esperado:** Dyno siempre en estado `up`

### 6. Importante

⚠️ **NO configurar checks < 5 minutos** 
- Heroku Eco tiene límite de horas/mes
- 5 min es suficiente para prevenir sleep (30 min threshold)

✅ **Mejor práctica:**
- UptimeRobot cada 5 min
- También sirve para alertas si app está down
- Dashboard gratis con uptime stats

---

## 🎯 Resultado Esperado

**Antes del healthcheck:**
```
00:00 - Request llega
00:10 - Dyno despierta (10s wake-up)
00:15 - Timeout (excede 30s total)
```

**Después del healthcheck:**
```
00:00 - Request llega
00:01 - Responde inmediatamente (dyno activo)
00:03 - Usuario recibe respuesta
```

**Beneficio:** 
- Elimina 6-10s de wake-up latency
- Previene timeouts por dyno sleeping
- Mejor experiencia de usuario

---

**Estado:** ✅ Endpoints creados y funcionando  
**Pendiente:** Configurar UptimeRobot o Heroku Scheduler
