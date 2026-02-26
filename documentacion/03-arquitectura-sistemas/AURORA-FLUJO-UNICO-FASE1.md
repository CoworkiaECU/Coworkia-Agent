# Aurora - Flujo Único (Fase 1)

Fecha: 2026-02-26
Estado: Cerrado para ejecución por fases
Alcance: SOLO Aurora (sin cambios en otros agentes)

## 1) Flujo deseado único (simple)

1. Llega un mensaje del usuario.
2. Se valida y se filtra una sola vez para evitar duplicados.
3. Se carga un solo estado actual del usuario.
4. Si hay un “SI/NO pendiente”, se resuelve primero y termina ahí.
5. Si no hay pendiente, se clasifica intención.
6. Si el mensaje es “quiero probar el servicio”, Aurora inicia directamente el flujo de reserva.
7. Solo si aplica, se hace cambio de agente con transición completa.
8. Se guarda una sola vez y se envía la respuesta final.

## 2) Hallazgos con lupa (archivos revisados)

- src/express-servidor/endpoints-api/wassenger.js
- src/deteccion-intenciones/orquestador.js
- src/deteccion-intenciones/detectar-intencion.js
- src/deteccion-intenciones/intent-detection-helpers.js
- src/deteccion-intenciones/aurora.js
- src/servicios/partial-reservation-form.js
- src/servicios/confirmation-flow.js
- src/servicios/aurora-confirmation-helper.js
- src/servicios/reservation-state.js
- src/perfiles-interacciones/memoria-sqlite.js
- src/servicios/campaign-prompts.js

## 3) Procesos duplicados detectados

### D1. Confirmación pendiente por dos caminos
- En webhook se revisa “pending” por estado legacy y estado nuevo al mismo tiempo.
- Impacto: decisiones distintas para el mismo mensaje.

### D2. Doble entrada para “quiero probar el servicio”
- Se activa por modo especial del orquestador y también por formulario de reserva.
- Impacto: respuestas competidas y secuencia irregular.

### D3. Reglas de saludo de campaña en más de un lugar
- Existe versión de campaña en prompts de Aurora y versión en campaign-prompts.
- Impacto: mensajes de apertura distintos para el mismo gatillo.

## 4) Procesos incoherentes entre sí

### I1. Regla de identidad de Aurora inconsistente
- Hay reglas que dicen no presentarse automáticamente y otras respuestas base donde sí se presenta.
- Impacto: experiencia poco consistente en pautas.

### I2. Orden de transición entre agentes
- El estado de agente puede actualizarse antes de que la transición esté completamente cerrada al usuario.
- Impacto: sensación de salto o estado desalineado.

### I3. Mezcla de estado nuevo y legado en un mismo flujo
- Módulos Aurora usan estado unificado y legacy al mismo tiempo.
- Impacto: mantenimiento difícil y resultados no deterministas.

## 5) Decisiones de unificación aprobables para Fase 2+

1. Dejar una sola fuente de “confirmación pendiente” para Aurora.
2. Dejar un solo dueño del gatillo “quiero probar el servicio”.
3. Dejar una sola plantilla oficial de apertura de campaña.
4. Aplicar una regla única de presentación de Aurora.
5. Mantener la transición de agente en orden visible para usuario.

## 6) Criterio de cierre de Fase 1

Fase 1 queda cerrada cuando:
- Existe flujo único documentado.
- Están listados duplicados e incoherencias reales.
- Queda definido qué se unifica en la siguiente fase, sin tocar todavía otros agentes.

---

## 7) Ejecución realizada (Fases 2 a 6)

### Fase 2 — Confirmaciones pendientes unificadas ✅
- Aurora ahora usa una sola vía de confirmación pendiente (estado unificado).
- Se removió el chequeo paralelo legacy en webhook y cancelación del orquestador.

### Fase 3 — “Quiero probar el servicio” alineado ✅
- Se eliminó la vía paralela de prompt especial en orquestador/Aurora.
- El dueño único del arranque queda en el formulario de Aurora.

### Fase 4 — Cambio entre agentes ordenado ✅
- El relevo ahora ocurre en este orden: transición visible → commit de agente.
- Si falla el commit, se informa al usuario para reintentar de forma clara.

### Fase 5 — Duplicados eliminados ✅
- Se limpiaron rutas duplicadas que podían competir en handoff y saludo especial.
- Se estandarizó la entrada de relevo para todos los agentes.

### Fase 6 — Validación final ✅
- Validación estática sin errores en archivos modificados.
- Flujo Aurora quedó más determinista y con menos bifurcaciones.
