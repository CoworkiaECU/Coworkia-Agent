# ✨ Sensei son Magic — CLI Reference

## 🎯 Comandos Disponibles

### 📊 Monitoreo y Status

#### `magic-status`
Muestra el estado actual del dyno y últimas 15 líneas de logs.
```bash
magic-status
```
**Output esperado:**
- Estado del dyno (web.1, worker.1)
- Últimas 15 líneas de logs de Heroku

---

#### `magic-errors`
Filtra las últimas 100 líneas de logs buscando errores, excepciones y fallas.
```bash
magic-errors
```
**Casos de uso:**
- Debugging rápido post-deploy
- Revisar errores recientes sin abrir dashboard Heroku

---

#### `magic-health`
Verifica el health endpoint de la API y muestra resultado formateado con jq.
```bash
magic-health
```
**Output esperado:**
```json
{
  "status": "healthy",
  "version": "1120",
  "agents": ["Aurora", "Aluna", "Enzo", "Gabi", "Axel", "Adriana", "Paula", "Angela"],
  "database": "connected"
}
```

---

### 📜 Git y Historial

#### `magic-history`
Muestra los últimos 10 commits con formato gráfico y decoraciones.
```bash
magic-history
```
**Output incluye:**
- Hash corto del commit
- Rama actual (HEAD)
- Ramas remotas (origin, heroku)
- Mensaje del commit con emojis

---

### 🚀 Deployment

#### `magic-push`
Push simultáneo a GitHub (origin) y Heroku.
```bash
magic-push
```
**Equivalente a:**
```bash
git push origin main && git push heroku main
```

---

#### `magic-commit "mensaje"`
Commit con prefijo "✨ Sensei son Magic — " automático.
```bash
magic-commit "Aluna: fix respuesta de seguimiento"
```
**Resultado:**
```
✨ Sensei son Magic — Aluna: fix respuesta de seguimiento
```

---

#### `magic-deploy "descripción"`
Workflow completo: stage → commit → push a ambos remotes.
```bash
magic-deploy "Aurora: nueva validación de pagos"
```
**Ejecuta internamente:**
1. `git add .`
2. `git commit -m "✨ Sensei son Magic — Aurora: nueva validación de pagos"`
3. `git push origin main`
4. `git push heroku main`

---

### ⚡ Operaciones de Sistema

#### `magic-restart`
Reinicia el dyno de Heroku y confirma con mensaje.
```bash
magic-restart
```
**Casos de uso:**
- Después de cambiar variables de entorno
- Cuando hay memory leaks
- Para forzar recarga de módulos

---

## 🎨 Git Commit Template

Al hacer `git commit` sin `-m`, se abre el editor con el template:

```
# Sensei son Magic✨ — Coworkia Agent Commit Template
#
# Format: ✨[emoji] [Agent/Module]: Brief description
#
# Emoji Guide:
# ✨ Feature/Enhancement
# 🐛 Bugfix
# 📊 Dashboard/Analytics
# 🚀 Deploy/DevOps
# 🔧 Config/Setup
# ⚡ Performance
# 🎯 Optimization
# 📝 Documentation
# 🔒 Security/Compliance
# 🧪 Tests
```

**Ejemplo de commit manual:**
```bash
git add src/agentes/aluna.js
git commit
# Editor se abre con template
# Escribe: ✨ Aluna: Agregar validación de email en proformas
```

---

## 🔄 Workflows Completos

### Workflow 1: Feature nueva (manual control)
```bash
# 1. Desarrollo en local
code src/agentes/aurora.js

# 2. Commit con template (editor se abre)
git add .
git commit
# Escribe en editor: ✨ Aurora: Nueva validación pagos con Vision AI

# 3. Push a GitHub
git push origin main

# 4. Heroku logs para verificar
magic-status
```

---

### Workflow 2: Hotfix rápido (autopilot)
```bash
# 1. Fix directo en archivo
code src/agentes/aluna.js

# 2. Deploy con un comando
magic-deploy "Aluna: fix respuesta dirección"

# 3. Verificar deploy
magic-status
magic-errors
```

---

### Workflow 3: Debugging producción
```bash
# 1. Ver últimos commits
magic-history

# 2. Verificar health
magic-health

# 3. Revisar errores
magic-errors

# 4. Si hay problema, reiniciar
magic-restart
```

---

## 📋 Cheatsheet Rápida

| Comando | Acción | Tiempo |
|---------|--------|--------|
| `magic-status` | Ver estado + logs | 2s |
| `magic-errors` | Filtrar errores recientes | 3s |
| `magic-health` | Health check API | 1s |
| `magic-history` | Últimos 10 commits | 1s |
| `magic-push` | Push GitHub + Heroku | 15-30s |
| `magic-commit "msg"` | Commit con prefijo Magic | 1s |
| `magic-deploy "desc"` | Stage + commit + push todo | 20-40s |
| `magic-restart` | Reiniciar dyno Heroku | 5-10s |

---

## 🔧 Configuración

**Archivos involucrados:**
- `~/.zshrc` — carga aliases al iniciar terminal
- `/Users/diegovillota/coworkia-agent/.magic-aliases.sh` — definiciones
- `/Users/diegovillota/coworkia-agent/.gitmessage` — template de commits

**Para recargar aliases sin reiniciar terminal:**
```bash
source ~/.zshrc
```

---

## ✅ Estado Actual

**Aliases activos:** 6 ✅  
**Funciones activas:** 2 ✅  
**Git template configurado:** ✅  
**Auto-load en nuevas terminales:** ✅  

---

**Última actualización:** 25 Mar 2026  
**Versión producción:** v1120  
**Commit actual:** `3561be6`
