# Diego — Perfil de Usuario

## Identidad
- **Nombre**: Diego Villota
- **Rol**: Fundador de Coworkia + MarketingLab
- **Teléfono personal**: `DIEGO_PERSONAL_PHONE` (env var — único con acceso admin al bot)
- **Email admin**: `COWORKIA_ADMIN_EMAIL` (env var)
- **Estilo**: Rápido, directo, quiere resultados sin explicaciones. Dice "nena" y "véndeme eso" cuando algo le gusta.

## Cómo trabaja Diego
- Trabaja en **tres chats paralelos** en VS Code:
  - **Chat 1 = Torre de Control**: piensa planes de vuelo, genera prompts para los otros 2 chats, coordina deploys
  - **Chat 2 = Ejecución A**: recibe prompt copiado de Torre y ejecuta tareas de 1-2 agentes
  - **Chat 3 = Ejecución B**: recibe prompt copiado de Torre y ejecuta tareas de 1-2 agentes
- Torre de Control genera instrucciones en bloques de texto simple copiables
- Los chats de ejecución commitean pero **NO deployean** sin autorización de Torre
- Cada agente tiene su plan de vuelo en `planes-de-vuelo/[agente]/plan-vuelo-*.md`
- Al finalizar sesión: actualizar plan de vuelo del agente con progreso
- Prefiere ver el resultado, no escuchar el proceso
- Si algo está bien dicho: responde con emojis o "wow nena"
- Si algo es confuso: pide que lo repienses
- **No le gusta**: pantallas con mucho ruido, tablas sin acción, métricas que no dicen nada
- **Le encanta**: dashboards que convierten, acciones con un clic, datos que hablan solos
- Aprueba deploys desde cualquier chat con `git push heroku main`

## Frases clave de Diego
- "autopilot verde nena" → activar modo autónomo total
- "wow nena, casémonos" → máxima aprobación, lo que hiciste fue perfecto
- "discrepo nena" → algo está mal, revisar
- "sin embargo" → hay un pero, escuchar bien lo que sigue
- "no es amigable" → el UI necesita trabajo
- "contundentemente poderoso" → quiere algo que impresione de verdad
