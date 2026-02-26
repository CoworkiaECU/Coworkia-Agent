# Checklist Manual (10 min) — Aurora Post-Refactor

Fecha: 2026-02-26
Objetivo: validar rápido que Aurora responde en orden, sin cruces y sin duplicados.

## 1) Arranque de pauta: “quiero probar el servicio”
- Mensaje de prueba: `¡Hola Coworkia! quiero probar el servicio`
- Esperado:
  - Aurora responde una sola vez.
  - Respuesta orientada a reserva (día/hora), sin desvío a otro flujo.
  - No aparece doble mensaje compitiendo.

## 2) Confirmación pendiente SI/NO
- Flujo: completar datos de reserva hasta recibir pedido de confirmación.
- Mensaje de prueba: `SI`
- Esperado:
  - Se procesa por un solo camino.
  - Se confirma y cierra sin pasar por orquestador adicional.
  - No hay respuesta duplicada.

## 3) Confirmación pendiente con respuesta ambigua
- Flujo: dejar confirmación pendiente activa.
- Mensaje de prueba: `mmm`
- Esperado:
  - No confirma ni cancela.
  - Pide aclaración de forma simple (SI o NO).
  - Mantiene continuidad, sin saltar de tema.

## 4) Relevo explícito por mención
- Mensaje de prueba: `@axel`
- Esperado:
  - Nuevo agente entra con mensaje de relevo unificado.
  - Debe incluir: “tomo el relevo” + continuidad con `@axel` + especialidad.
  - No se ve salto desordenado ni doble transición.

## 5) Regreso a Aurora desde especialista
- Flujo: luego de estar con otro agente.
- Mensaje de prueba: `@aurora`
- Esperado:
  - Aurora retoma de forma limpia.
  - El contexto no se pierde.
  - No aparecen mensajes cruzados de dos agentes a la vez.

---

## Criterio de pase rápido
- ✅ 0 respuestas duplicadas
- ✅ 0 cambios de agente “fantasma”
- ✅ 0 cruces entre saludo de pauta y formulario
- ✅ Relevo consistente en todos los agentes

Si falla uno solo, registrar:
- mensaje enviado
- respuesta recibida
- hora exacta
- agente que respondió
