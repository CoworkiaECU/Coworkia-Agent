# ✈️ Plan de Vuelo — Aluna Verificación + Tests (09 Abr 2026)
**Status**: ✅ COMPLETADO  
**Producción**: v1237 — `2654b86`  
**Última sesión**: 09 Abr 2026  
**Modo**: Torre de Control — Chat 3 (Ejecución Aluna)

---

## 🎯 OBJETIVO
Verificar fixes de intent detection (v1222), excluir Diego de follow-ups, arreglar tests

---

## 🔧 TAREAS COMPLETADAS

### T1 — Verificar intent detection post-fix
- [x] Confirmar keywords Aluna son específicos (membresía, plan mensual, plan10, plan20)
- [x] Confirmar "planes" genérico ya eliminado de _alunaKeywords
- [x] Verificar guards en membership-flow.js (12 keywords Aurora exclusion)
- [x] Dashboard Aluna funcionando correctamente

### T2 — Excluir Diego de follow-ups
- [x] Diego excluido de D+1 follow-up (parameterized query con DIEGO_PERSONAL_PHONE)
- [x] Diego excluido de D+3 follow-up (parameterized query con DIEGO_PERSONAL_PHONE)

### T3 — Tests Aluna
- [x] Auditoría completa de test failures → `auditoria-tests-09abr.md`
- [x] Fix aluna-vision tests (mock paths)
- [x] Fix aluna-integration tests (databaseService mock)
- [x] Fix adriana-multi-document tests
- [x] Todos los tests Aluna passing

**Deploy**: v1237 — incluido en deploy conjunto con Aurora

---

## 📋 PENDIENTE (próxima sesión)

- [ ] Tests de regresión A3.1-A3.5 del plan 07abr (intent detection edge cases)
- [ ] Dashboard Aluna: botones de acción manual (D+1 WA, D+1 Email, D+3 WA, D+3 Email)
- [ ] Campañas: editor de mensajes masivos para leads filtrados por status
