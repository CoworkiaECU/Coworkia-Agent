# 🛡️ Protocolo de Seguridad — Copilot Spaces

## ⚠️ PROBLEMA
No se puede desactivar Copilot Spaces completamente. Si creas un Space por error, el contexto queda almacenado en GitHub.

---

## ✅ REGLAS DE ORO — NUNCA COMPARTIR

### ❌ Información PROHIBIDA en Spaces públicos o compartidos:

#### 1. Compliance y Legal (Gabi)
- ❌ Políticas UAFE completas
- ❌ Nombres de clientes con compliance issues
- ❌ Documentos KYC o due diligence
- ❌ Reportes ROS/RUI (operaciones sospechosas)
- ✅ OK: Frameworks generales, procedimientos sin nombres

#### 2. Propiedad Intelectual Core
- ❌ Prompts completos de Aluna (20% conversión)
- ❌ System prompts de Enzo con casos de éxito ROI
- ❌ Lógica de Vision AI de Aurora (parsing pagos)
- ❌ Algoritmos de pricing de Adriana
- ✅ OK: Arquitectura general, patrones públicos

#### 3. Datos de Clientes
- ❌ Nombres, teléfonos, emails de clientes reales
- ❌ Montos de transacciones específicas
- ❌ Historiales de conversaciones con PII
- ✅ OK: Datos anonimizados, ejemplos ficticios

#### 4. Credenciales y Config
- ❌ API keys (aunque sean variables de entorno)
- ❌ Tokens de Wassenger/OpenAI
- ❌ Database connection strings
- ❌ URLs de webhooks privados
- ✅ OK: Nombres de servicios, arquitectura de conexiones

---

## ✅ QUÉ SÍ PUEDES COMPARTIR EN SPACES

### Contenido seguro para Spaces:
- 📚 Arquitectura multi-agente (diagrama de flujo)
- 🛠️ Tech stack (Node.js, PostgreSQL, Heroku, Wassenger)
- 📋 Workflows generales (reserva → confirmación → pago)
- 🎨 Patrones de código reutilizables
- 📊 Estructura de tablas (sin datos reales)
- 🧪 Estrategias de testing
- 📝 Documentación pública

---

## 🎯 PROTOCOLO DE CREACIÓN DE SPACES

### SI DEBES crear un Space:

**1. Nombre descriptivo NO sensible:**
- ✅ "Coworkia Multi-Agent Architecture"
- ❌ "Coworkia Production Secrets"

**2. Contexto SOLO de archivos públicos:**
```
✅ Agregar:
- /documentacion/ARQUITECTURA-MULTIAGENTE-V2.md (sin secrets)
- /README.md
- /.github/skills/ (solo documentación pública)

❌ NUNCA agregar:
- /src/deteccion-intenciones/*.js (prompts completos)
- /.env o config con credentials
- /data/ con datos reales
- Logs de producción con PII
```

**3. Visibility:**
- Siempre PRIVATE
- NO compartir con organizaciones
- NO invitar colaboradores externos

**4. Antes de compartir con alguien, pregúntate:**
- ¿Esta persona tiene NDA firmado?
- ¿Necesita ver TODO el contexto o solo parte?
- ¿Puedo darle documentación pública en vez del Space?

---

## 🚨 SI CREASTE UN SPACE POR ERROR

### Acción inmediata:
1. Ve a GitHub.com → Tu perfil → Copilot → Spaces
2. Encuentra el Space comprometido
3. Click en "..." → **Delete Space**
4. Confirma eliminación
5. **IMPORTANTE**: El contexto puede quedar en cache de GitHub por ~30 días

### Mitigación:
- Si tenía datos sensibles, considera rotation de:
  - API keys mencionadas
  - Tokens de servicios
  - Passwords si fueron expuestos

---

## ✅ ESTADO ACTUAL - COWORKIA AGENT

**Spaces activos**: 0 (ninguno creado todavía) ✅  
**Riesgo actual**: BAJO  
**Acción requerida**: NINGUNA

**Seguir este protocolo** cuando consideres crear tu primer Space.

---

## 📋 CHECKLIST PRE-SHARE

Antes de compartir CUALQUIER contexto (Space, gist, screenshot):

- [ ] ¿Contiene nombres de clientes reales?
- [ ] ¿Contiene montos o transacciones específicas?
- [ ] ¿Contiene prompts completos con IP core?
- [ ] ¿Contiene API keys o tokens (aunque sean placeholders)?
- [ ] ¿Contiene datos de compliance UAFE?
- [ ] ¿Puedo lograr lo mismo con documentación sanitizada?

**Si marcaste SÍ en cualquiera** → NO COMPARTIR

---

**Última actualización**: 25 Mar 2026  
**Revisión**: Cada vez que GitHub cambie políticas de Spaces
