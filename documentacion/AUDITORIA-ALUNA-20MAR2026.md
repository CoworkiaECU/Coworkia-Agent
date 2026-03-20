# 📊 REPORTE DE AUDITORÍA ALUNA - 20 Mar 2026

## ✅ ESTADO ACTUAL DEL SISTEMA

### Funcionalidades Operativas (70% implementado)

#### 1. Captura Automática de Leads ✅
- **Funcionando**: Keywords detectan automáticamente interés
- **Keywords activas**: plan, membresí, mensual, oficina, cowork
- **Fix aplicado hoy**: `membership_type` ahora usa 'consulta-inicial' por defecto (antes era null y fallaba)
- **Ubicación**: `src/database/alunaRepository.js` → `captureAlunaLeadFromKeywords()`

#### 2. Follow-up 24h (D+1) ✅
- **Funcionando**: WhatsApp + Email enviados automáticamente
- **Horario**: 8am - 7pm Ecuador (respeta no molestar)
- **Cron**: Cada 30 minutos verifica prospectos elegibles
- **Templates**:
  - WhatsApp: Mensaje personalizado + invitación día gratis
  - Email: HTML con oferta 15% descuento (vence 7 días)
- **Ubicación**: `src/servicios/follow-up-service.js` → `processAlunaLeadFollowUps()`

#### 3. Follow-up 3 días (D+3) ✅
- **Funcionando**: WhatsApp + Email FOMO enviados automáticamente
- **Horario**: 8am - 7pm Ecuador
- **Cron**: Cada 30 minutos verifica prospectos elegibles
- **Templates**:
  - WhatsApp: Propuesta día gratis + "último intento"
  - Email: "Hoy es el último día - oferta cierra a medianoche"
- **Ubicación**: `src/servicios/follow-up-service.js` → `processAlunaLeadFollowUps()`

#### 4. Dashboard de Leads ✅
- **Funcionando**: Visualización de leads capturados
- **Columnas**: ID, Cliente, Plan, Email, Status, Automatizaciones, Último Contacto
- **Ubicación**: `public/aluna-proformas.html` + `public/js/aluna-dashboard.js`
- **Endpoint**: `/api/aluna/membership-leads`

#### 5. Proforma Automática ✅
- **Funcionando**: Se envía cuando usuario completa formulario de membresía
- **Contenido**: Pricing, beneficios, código único
- **Ubicación**: `src/servicios/aluna-proforma-email.js`

---

## ❌ FUNCIONALIDADES FALTANTES (30% por implementar)

### BLOQUE 1: Tracking de Respuestas del Cliente 🔴 CRÍTICO
**Problema**: No sabemos si el cliente respondió después de D+1 o D+3

**Solución a implementar**:
1. En webhook de Wassenger, detectar si el mensaje viene de un prospecto con follow-up enviado
2. Actualizar campos en BD:
   - `client_response_at` = CURRENT_TIMESTAMP
   - `client_whatsapp_reply` = true (si responde por WA)
   - `client_email_reply` = true (si responde por email - manual)

**Archivos a modificar**:
- `src/express-servidor/endpoints-api/wassenger.js` (línea ~2100)
- Agregar función `markAlunaClientResponse(userPhone, channel)` en `alunaRepository.js`

**Estimado**: 1 hora

---

### BLOQUE 2: Métricas y Stats del Dashboard 🟡 IMPORTANTE
**Problema**: Dashboard no muestra métricas de conversión

**Solución a implementar**:
1. Endpoint `/api/aluna/stats` con:
   - Total leads (últimos 7d, 30d)
   - D+1 enviados (%)
   - D+3 enviados (%)
   - Clientes que respondieron (%)
   - Tasa de conversión a `negotiating` o `active`

2. Frontend en dashboard:
   - Cards con números grandes
   - % de cambio vs período anterior
   - Gráfica simple de tendencia (opcional)

**Archivos a crear/modificar**:
- `src/express-servidor/endpoints-api/aluna-dashboard.js` (nuevo endpoint)
- `public/js/aluna-dashboard.js` (renderizar stats)
- `public/aluna-proformas.html` (sección de métricas)

**Estimado**: 2 horas

---

### BLOQUE 3: Detección de Alta Intención (señales de conversión) 🟢 NICE-TO-HAVE
**Objetivo**: Detectar cuando un prospecto está "caliente" para avisar a Diego

**Keywords de alta intención**:
- "cuando puedo ver", "horarios de visita", "disponibilidad"
- "precio exacto", "cuánto cuesta"
- "me interesa", "quiero contratar", "necesito"

**Acción automática**:
- Cambiar status a `negotiating`
- Notificar a Diego (preparar para Fase 3 del proyecto skills)

**Archivos a modificar**:
- `src/express-servidor/endpoints-api/wassenger.js`
- Agregar función `detectHighIntentKeywords(messageText)` en `alunaRepository.js`

**Estimado**: 1.5 horas

---

### BLOQUE 4: Smart Timing (no enviar en horarios malos) 🟢 NICE-TO-HAVE
**Objetivo**: Respetar mejores horarios de contacto

**Reglas**:
- No enviar WhatsApp antes de 9am o después de 8pm
- Weekend: solo si lead original fue en weekend
- Ajustar zona horaria Ecuador (ya está parcialmente implementado)

**Archivos a modificar**:
- `src/servicios/follow-up-service.js` → `isWithinAlunaFollowUpHours()` (ya existe, expandir lógica)

**Estimado**: 30 minutos

---

## 🐛 BUGS CORREGIDOS HOY

### Bug #1: `membership_type` NULL constraint violation
**Síntoma**: Captura automática de keyword fallaba con error de BD

**Causa**: INSERT intentaba `membership_type = null`, pero columna requiere NOT NULL

**Fix aplicado**:
```javascript
// Antes:
null,  // membership_type

// Después:
'consulta-inicial',  // membership_type - valor por defecto
```

**Archivo**: `src/database/alunaRepository.js` línea ~334

**Commit**: Pendiente (solo en local)

---

## 📊 DATOS REALES DE PRODUCCIÓN (BD Live)

### Últimos Leads Capturados:
1. **Gonzalo Villota** - Plan 20 - D+1 enviado ✅ (19 Mar)
2. **Francisco Zapata** - Plan 20 - Pendiente D+1 ⏰ (18 Mar)
3. Juan José Rivera - Plan 20 - D+3 enviado ✅ (12 Mar)
4. Fernanda Gavilánez - Plan 20 - D+3 enviado ✅ (11 Mar)

### Prospectos Pendientes Hoy:
- **Follow-up 24h**: 1 prospecto (Francisco Zapata)
- **Follow-up 3d**: 0 prospectos

### Observaciones:
- ✅ Sistema funcionando automáticamente
- ✅ Follow-ups enviándose correctamente
- ⚠️ Falta tracking de respuestas para medir conversión

---

## 🎯 PLAN DE ACCIÓN INMEDIATO

### Prioridad 1: Commit del Fix de Hoy
```bash
git add src/database/alunaRepository.js
git commit -m "fix(aluna): captura automática usa 'consulta-inicial' como default membership_type"
```

### Prioridad 2: Implementar BLOQUE 1 (Tracking de Respuestas)
- **Tiempo estimado**: 1 hora
- **Impacto**: CRÍTICO - necesitamos saber si follow-ups funcionan

### Prioridad 3: Implementar BLOQUE 2 (Métricas)
- **Tiempo estimado**: 2 horas
- **Impacto**: ALTO - Diego necesita ver resultados

### Prioridad 4: Testing Completo
- Simular 5-10 leads
- Verificar follow-ups enviándose
- Confirmar emails llegando
- Revisar dashboard con datos reales

---

## 🚀 ESTIMADO TOTAL PARA 100% ALUNA

| Bloque | Tiempo | Prioridad |
|--------|--------|-----------|
| Fix ya aplicado | ✅ Done | - |
| Tracking respuestas | 1h | 🔴 Crítico |
| Métricas dashboard | 2h | 🟡 Alto |
| Alta intención | 1.5h | 🟢 Medio |
| Smart timing | 30min | 🟢 Bajo |
| **TOTAL** | **~5 horas** | - |

---

## ✅ CONCLUSIÓN

**Aluna está al ~70% funcional:**
- ✅ Captura automática funcionando (con fix de hoy)
- ✅ Follow-ups D+1 y D+3 enviándose automáticamente
- ✅ Dashboard mostrando leads
- ❌ Falta tracking de respuestas (CRÍTICO)
- ❌ Falta métricas de conversión (IMPORTANTE)

**Próximo paso**: Commit del fix + implementar tracking de respuestas.

---

**Reporte generado**: 20 Mar 2026, 21:15 ECT  
**Auditoría realizada por**: GitHub Copilot  
**BD consultada**: PostgreSQL Heroku (producción)
