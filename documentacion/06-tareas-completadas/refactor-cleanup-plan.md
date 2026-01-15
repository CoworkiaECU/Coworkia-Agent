# 🔬 T11+T12: REFACTOR & CLEANUP COMPLETO

**Status:** 🔄 EN PROGRESO  
**Enfoque:** Quirúrgico, metódico, sin apuros  
**Modo:** Silicon Valley - calidad profesional  

---

## 🎯 OBJETIVO

Refactorizar completamente el repositorio desde arriba hacia abajo:
1. Eliminar código obsoleto/duplicado
2. Reorganizar archivos en estructura lógica
3. Documentar hallazgos complejos para después
4. Dejar codebase limpio, mantenible, profesional

---

## 📋 PLAN DE TRABAJO (Top → Down)

### ✅ Completadas (5/14)
- [x] T1-T10: Features core
- [x] T13: Bug fixes
- [x] T14: Follow-up automático
- [x] T15: Docs reorganización
- [x] T9: Manual reset agentes

### 🔄 En Progreso (0/9)

#### T11.1: 📂 /scripts
**Subcarpetas:**
- [ ] `/scripts/database` - Scripts DB
- [ ] `/scripts/deployment` - Deploy helpers
- [ ] `/scripts/maintenance` - Maintenance tools (✅ manual-agent-reset.js)
- [ ] `/scripts/migrations` - DB migrations
- [ ] `/scripts/migrations-archive` - Old migrations
- [ ] `/scripts/testing` - Test utilities

**Objetivo:** Validar cada script, eliminar obsoletos, documentar propósito

---

#### T11.2: 🗄️ /src/database
**Archivos:**
- [ ] `database.js` - Core DB service
- [ ] `reservationRepository.js` - Reservas CRUD
- [ ] `userRepository.js` - Users CRUD

**Objetivo:** Verificar queries, eliminar duplicados, optimizar

---

#### T11.3: 🧠 /src/deteccion-intenciones
**Archivos clave:**
- [ ] `orquestador.js` - Aurora Core decision engine
- [ ] Parsers individuales por agente
- [ ] Clasificadores de intención

**Objetivo:** Eliminar parsers duplicados, unificar lógica

---

#### T11.4: 🌐 /src/express-servidor
**Subcarpetas:**
- [ ] `/endpoints-api` - REST endpoints
  - [ ] `wassenger.js` - Webhook principal
  - [ ] Otros endpoints
- [ ] `/middleware` - Express middleware
- [ ] Config files

**Objetivo:** Limpiar endpoints obsoletos, middleware duplicado

---

#### T11.5: 👤 /src/perfiles-interacciones
**Archivos:**
- [ ] Profile management
- [ ] Interaction logging
- [ ] Memory/context handling

**Objetivo:** Consolidar lógica de profiles

---

#### T11.6: ⚙️ /src/servicios (CRÍTICO - 32 archivos)
**Estructura actual:** Flat, 32 archivos mezclados
**Estructura propuesta:**
```
servicios/
├── agents/           # Servicios de agentes especializados
│   ├── aluna/
│   ├── axel/
│   ├── adriana/
│   ├── enzo/
│   └── ...
├── calendar/         # Google Calendar
├── email/            # Gmail, SMTP
├── forms/            # Formularios parciales
├── payments/         # Pagos, recibos
├── messaging/        # WhatsApp, Wassenger
├── follow-up/        # Sistema follow-up
└── shared/           # Utilidades compartidas
```

**Objetivo:** Reorganización completa + eliminación obsoletos

---

#### T11.7: 🤖 /src/servicios-ia
**Archivos:**
- [ ] OpenAI service
- [ ] Anthropic service
- [ ] Vision AI services

**Objetivo:** Consolidar llamadas a IA, eliminar duplicados

---

#### T11.8: 🛠️ /src/utils
**Archivos:**
- [ ] Helpers generales
- [ ] Validators
- [ ] Formatters
- [ ] Logger

**Objetivo:** Organizar utilities, eliminar duplicados

---

#### T11.9: 🧪 /tests
**Subcarpetas:**
- [ ] `/unit` - Unit tests
- [ ] `/integration` - Integration tests
- [ ] `/e2e` - End-to-end tests
- [ ] `/manual` - Manual test scripts

**Objetivo:** Validar tests actuales, eliminar obsoletos

---

## 🔍 METODOLOGÍA

### 1. AUDITORÍA (por carpeta)
```bash
# Revisar archivos
ls -la <carpeta>

# Buscar duplicados
grep -r "function nombreFuncion" src/

# Identificar imports
grep -r "import.*from.*<archivo>" src/
```

### 2. CLASIFICACIÓN
- ✅ **Mantener:** Código activo, bien estructurado
- 🔄 **Refactor:** Código activo pero necesita limpieza
- 🗑️ **Eliminar:** Código obsoleto, sin referencias
- ⚠️ **Investigar:** Código complejo que requiere análisis profundo

### 3. EJECUCIÓN
- **Simple:** Hacer cambio inmediato (rename, delete, move)
- **Complejo:** Agregar tarea nueva en TODO para después

### 4. VALIDACIÓN
```bash
# Verificar sintaxis
node -c <archivo>

# Verificar imports rotos
npm run check-imports (si existe)

# Tests
npm test
```

---

## 📊 HALLAZGOS IMPORTANTES

### 🔴 CRÍTICOS (requieren tarea nueva)
_Se irán agregando durante auditoría_

### 🟡 WARNINGS (resolver durante refactor)
_Se irán agregando durante auditoría_

### ✅ RESUELTOS
_Se irán agregando durante refactor_

---

## 🎯 REGLAS DE ORO

1. **No apuros** - Quirúrgico, metódico
2. **Sin duplicados** - Un lugar para cada cosa
3. **Sin "dead code"** - Si no se usa, se elimina
4. **Imports limpios** - No wildcards innecesarios
5. **Nombres claros** - Propósito obvio del archivo
6. **Documentación inline** - JSDoc en funciones complejas
7. **Tests validan** - Ejecutar después de cada cambio mayor
8. **📦 Carpeta /temp** - Archivos dudosos/a-revisar-después van a carpetas temporales:
   - `scripts/temp/` - Scripts temporales
   - `src/temp/` - Código temporal
   - Nombre formato: `TEMP-YYYYMMDD-descripcion.js`
   - Marcar con comentario: `// TODO-TEMP: Revisar después de refactor`
   - Eliminar después de validar que no se usan

---

## 📈 PROGRESO

**Carpetas auditadas:** 0/9  
**Archivos revisados:** 0/~150  
**Archivos eliminados:** 0  
**Archivos refactorizados:** 0  
**Tareas nuevas creadas:** 0  

---

## 🚀 SIGUIENTE PASO

**Iniciar T11.1:** Auditoría /scripts (desde arriba)

```bash
# Comando inicial
cd /Users/diegovillota/coworkia-agent/scripts
ls -la
```

---

**Actualizado:** Enero 14, 2026  
**Responsable:** Diego + GitHub Copilot  
**Compromiso:** Calidad Silicon Valley 🎯
