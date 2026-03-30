# 🚀 Multi-Chat Launcher — Coworkia Agent

## Uso rápido

```bash
./scripts/launch-multi-chat.sh
```

Esto abre **3 ventanas separadas de VS Code**, cada una con el workspace completo.

## Flujo de trabajo

1. **Ejecutar el launcher**: `./scripts/launch-multi-chat.sh`
2. **Esperar 5-6 segundos** a que las 3 ventanas se abran
3. **En cada ventana**, abrir el chat de Copilot (Cmd+Shift+I o click en el icono)
4. **Asignar agente** en cada chat:
   - Ventana 1: `nena hoy nos enfocamos en aurora`
   - Ventana 2: `nena hoy nos enfocamos en aluna`
   - Ventana 3: `nena hoy nos enfocamos en adriana`

## Qué hace el script

1. Abre la ventana principal (Aurora) con el workspace
2. Abre una ventana nueva (`--new-window`) para Aluna
3. Abre otra ventana nueva para Adriana
4. Cada ventana carga:
   - Memoria del proyecto (`.github/memory/`)
   - Skills disponibles (`.github/skills/`)
   - Configuración del workspace (`coworkia.code-workspace`)

## Configuración automática

El proyecto ya tiene configurado:
- **Tasks.json**: Muestra recordatorio de memoria al abrir workspace
- **Settings.json**: Configura Copilot con Claude Sonnet 4
- **Copilot Instructions**: Protocolo de inicio automático

## Alias recomendado (opcional)

Agrega esto a tu `~/.zshrc`:

```bash
alias coworkia-launch='cd /Users/diegovillota/coworkia-agent && ./scripts/launch-multi-chat.sh'
```

Luego ejecuta: `source ~/.zshrc`

Ahora puedes lanzar desde cualquier lugar con: `coworkia-launch`

## Troubleshooting

**Problema:** "Permission denied"
```bash
chmod +x scripts/launch-multi-chat.sh
```

**Problema:** Las ventanas se abren muy rápido y se confunden
→ Aumenta el `sleep` en el script (líneas 16, 21, 26)

**Problema:** Copilot no carga memoria automáticamente
→ Escribe manualmente al inicio del chat: `nena hoy nos enfocamos en [agente]`
