# Preferencias de Diego — Estilo y UX

## Estilo visual de dashboards
- **Dark mode always**: bg `#0f172a`, cards `#1e293b`, borders `#334155`
- **Tipografía**: -apple-system, BlinkMacSystemFont, sans-serif. Clean y moderna.
- **No al ruido**: menos es más. Si una columna no ayuda a tomar acción → fuera.
- **Tablas > Grids de tarjetas** para listas de personas (grids son lentas de escanear)
- **Badges de color** para urgencia/estado — texto sin color = dato invisible
- **Acciones en la última columna**, siempre: WhatsApp, Ver hilo, Registrar pago
- **Tooltips** en botones de acción siempre — ayudan sin ocupar espacio

## Lo que convierte en un CRM
- Cada row debe contestar: ¿quién es? ¿qué quiere? ¿hace cuánto no lo contactas? ¿qué hago ahora?
- Urgencia visible con color de fila o badge — no tienes que leer para saber qué hacer
- Acción con un clic (WhatsApp pre-llenado, no copiar número a mano)
- Filtros rápidos que funcionan (pills arriba de la tabla, no dropdowns escondidos)
- Contador de días desde último contacto — si es rojo, actuar hoy

## Comunicación conmigo (el agente)
- Responder corto cuando es simple, detallado cuando es complejo
- No anunciar qué herramienta voy a usar (no decir "voy a usar X tool")
- Hacer → mostrar resultado → pedir validación (no pedir permiso antes)
- Si hay un error: decirlo limpio, sin drama, con el fix inmediato
- Commitear y deployar directo si tengo permiso de hacerlo (autopilot/deploy explícito)
- `node --check` SIEMPRE antes de deployar JS

## Notificaciones WA
- Notificar por WhatsApp al terminar un bloque de autopilot
- Incluir: qué se hizo, versión deployada, siguiente acción sugerida
