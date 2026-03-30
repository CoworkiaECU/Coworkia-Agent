# 🎯 Sistema Multi-Chat Automático — Guía Completa

## ¿Qué se instaló?

### 1. Script Launcher (`scripts/launch-multi-chat.sh`)
Abre 3 ventanas de VS Code automáticamente, cada una con el workspace completo.

### 2. Configuración VS Code (`.vscode/`)
- **tasks.json**: Mensaje de bienvenida al abrir workspace
- **settings.json**: Configuración óptima de Copilot

### 3. Instrucciones Mejoradas (`.github/copilot-instructions.md`)
El agente ahora:
- ✅ Detecta si el chat está vacío y saluda primero
- ✅ Pregunta en qué agente enfocar (Aurora/Aluna/Adriana)
- ✅ Carga automáticamente memoria y plan de vuelo
- ✅ Identifica el chat por tu frase "nena hoy nos enfocamos en..."

---

## 🚀 Cómo Usar (Flujo Completo)

### Paso 1: Lanzar las 3 ventanas
```bash
cd /Users/diegovillota/coworkia-agent
./scripts/launch-multi-chat.sh
```

Verás esto en terminal:
```
🚀 Lanzando Coworkia Agent Multi-Chat Setup...

📱 Ventana 1: Aurora (Principal)
💼 Ventana 2: Aluna
🚗 Ventana 3: Adriana

✅ 3 ventanas lanzadas
```

### Paso 2: Esperar 5-6 segundos
Las ventanas se abren escalonadas para evitar conflictos.

### Paso 3: Abrir chat en cada ventana
En cada ventana de VS Code:
- **macOS**: `Cmd + Shift + I`
- **Windows/Linux**: `Ctrl + Shift + I`
- O click en el ícono de Copilot en la barra lateral

### Paso 4: Asignar agente a cada chat

**Ventana 1 (Principal):**
```
nena hoy nos enfocamos en aurora
```

**Ventana 2:**
```
nena hoy nos enfocamos en aluna
```

**Ventana 3:**
```
nena hoy nos enfocamos en adriana
```

### Paso 5: El agente responde automáticamente
Cada agente cargará:
- ✅ Memoria del proyecto completa
- ✅ Plan de vuelo del agente asignado
- ✅ Última tarea pendiente
- ✅ Estado de producción

**Ejemplo de respuesta automática:**
```
¡Hola Diego! 🤖

📋 Chat: Aurora (reservas coworking)
🔖 Última sesión: 28 marzo 2026 — webhook fix

📍 Nos quedamos en:
   → Verificar sincronización calendario Google
   → Estado: completado

🎯 Siguiente paso inmediato:
   → Revisar logs de reservas últimas 24h

🟢 Producción: v842 — [abc123]

¿Arrancamos? 🚀
```

---

## 📝 Alias Recomendado (Opcional pero muy útil)

Edita `~/.zshrc`:
```bash
nano ~/.zshrc
```

Agrega al final:
```bash
# Coworkia Multi-Chat Launcher
alias coworkia='cd /Users/diegovillota/coworkia-agent && ./scripts/launch-multi-chat.sh'
```

Guarda y recarga:
```bash
source ~/.zshrc
```

Ahora puedes lanzar desde **cualquier lugar** simplemente con:
```bash
coworkia
```

---

## 🔧 Personalización

### Cambiar delays entre ventanas
Si las ventanas se abren muy rápido, edita `scripts/launch-multi-chat.sh`:
```bash
sleep 2  # Línea 16 — cambia a 3 o 4
sleep 2  # Línea 21 — cambia a 3 o 4  
sleep 1  # Línea 26 — cambia a 2 o 3
```

### Cambiar agentes del launcher
Edita el script y cambia los `echo` para reflejar tus agentes preferidos.

### Agregar más ventanas
Copia el bloque de ventana 3 y modifica:
```bash
echo "🎯 Ventana 4: Axel"
code --new-window "$WORKSPACE_FILE" &
sleep 2
```

---

## 🐛 Troubleshooting

### "Permission denied" al ejecutar el script
```bash
chmod +x scripts/launch-multi-chat.sh
```

### Las ventanas se confunden o no se abren
1. Cierra todas las ventanas de VS Code
2. Aumenta los `sleep` en el script
3. Ejecuta de nuevo

### El agente no carga memoria automáticamente
- **Opción A**: Escribe manualmente: `nena hoy nos enfocamos en [agente]`
- **Opción B**: Verifica que `.github/copilot-instructions.md` exista y sea válido

### Solo se abre una ventana
Asegúrate de que la flag `--new-window` esté en las ventanas 2 y 3 del script.

---

## 📚 Archivos Creados/Modificados

| Archivo | Propósito |
|---------|-----------|
| `scripts/launch-multi-chat.sh` | Script launcher principal |
| `scripts/LAUNCH-README.md` | Documentación técnica detallada |
| `.vscode/tasks.json` | Task de bienvenida automático |
| `.vscode/settings.json` | Configuración de Copilot optimizada |
| `.github/copilot-instructions.md` | Protocolo de inicio mejorado |
| `README.md` | Sección Quick Start agregada |

---

## 🎯 Next Steps

1. **Prueba el launcher**: `./scripts/launch-multi-chat.sh`
2. **Asigna agentes** en cada chat
3. **Trabaja en paralelo** sin mezclar contextos
4. **Commitea y pushea** cuando termines sesión

---

**Creado**: 30 marzo 2026  
**Autor**: Coworkia Agent (GitHub Copilot)  
**Para**: Diego Villota
