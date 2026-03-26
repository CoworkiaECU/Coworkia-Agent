# 🔧 Fix HTML Emails en Xiaomi — Todo #56

**Fecha**: 26 Mar 2026  
**Prioridad**: URGENTE  
**Estimado**: 1.5-2h  
**Status**: ANÁLISIS COMPLETADO — Pendiente implementación

---

## 📊 Problema Reportado

> "plataformas XIOMI, los html no salen perfectos, no importa imagens, todo sale montado y horrible"

**Alcance**: Emails HTML se ven deformados en dispositivos Xiaomi (MIUI 12+)

---

## 🔍 Diagnóstico (10 min de análisis)

### Causas Identificadas

1. **`linear-gradient` no compatible**  
   📍 `email-ecosystem.js:116`  
   ```js
   background:linear-gradient(135deg,${color},#8B5CF6);
   ```
   ❌ MIUI email client (Xiaomi Mail app) no renderiza gradientes CSS  
   ✅ **Fix**: Agregar fallback `background: ${color};` antes del gradient

2. **`@media (prefers-color-scheme: dark)` inconsistente**  
   📍 `email-assets.js:39-55`  
   - MIUI ignora el media query en algunos casos
   - Necesita versión "light" por defecto más robusta

3. **`box-shadow` con `rgba()` + glow effects**  
   📍 `email-ecosystem.js:125`  
   ```js
   box-shadow:0 0 20px ${color}40
   ```
   ❌ Los colores con transparencia `${color}40` no se parsean bien  
   ✅ **Fix**: Usar colores sólidos o quitar sombras

4. **Viewport no declarado**  
   - Falta meta viewport en templates
   - Xiaomi asume desktop width por defecto

---

## ✅ Plan de Implementación (1.5h)

### Bloque A — Fallbacks CSS (30 min)

**A1. Agregar fallback a gradientes** (15 min)  
En `email-ecosystem.js` línea 116:
```js
// ANTES
background:linear-gradient(135deg,${color},#8B5CF6);

// DESPUÉS  
background:${color};background:linear-gradient(135deg,${color},#8B5CF6);
```

**A2. Simplificar box-shadow** (10 min)  
Cambiar transparencias por colores sólidos o remover:
```js
// ANTES
box-shadow:0 0 20px ${color}40

// DESPUÉS
box-shadow:0 4px 12px rgba(0,0,0,0.3);
```

**A3. Agregar meta viewport** (5 min)  
En todas las funciones de templates:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
```

---

### Bloque B — Dark Mode Más Robusto (30 min)

**B1. Crear versión "Xiaomi-safe"** (20 min)  
- Sin gradientes
- Sin transparencias en colores
- Sin `prefers-color-scheme`, solo inline styles

**B2. Testing manual** (10 min)  
- Enviar email de prueba al celular Diego
- Confirmar que se ve bien en Xiaomi
- Validar también en iPhone (no romper lo que funciona)

---

### Bloque C — Refactor Template System (30 min)

**C1. Agregar flag `xiaomiSafe` a buildEmail** (15 min)  
```js
export function buildEmail(agent, type, data, { xiaomiSafe = false } = {}) {
  const styles = xiaomiSafe ? XIAOMI_SAFE_STYLES : STANDARD_STYLES;
  // ...
}
```

**C2. Detectar User-Agent Xiaomi** (15 min)  
- Wassenger headers incluyen device info
- Si detecta Xiaomi → `xiaomiSafe: true`
- Fallback: usar versión safe por defecto (más compatible universalmente)

---

## 🎯 Siguiente Acción Inmediata

1. Leer `email-ecosystem.js` completo (300 líneas)
2. Implementar Bloque A (fallbacks CSS)
3. Commit checkpoint: `fix(emails): agregar fallbacks CSS Xiaomi-safe`
4. Implementar Bloque B (dark mode robusto)
5. Testing manual en Xiaomi de Diego
6. Deploy y validar en producción

---

## 📝 Notas Técnicas

- **No romper iPhone**: Mantener `prefers-color-scheme` con fallback
- **Compatibilidad universal**: Gmail, Outlook, Apple Mail, Xiaomi Mail, Samsung Email
- **Tamaño email**: Mantener bajo 102KB (límite Gmail)
- **Testing devices**: iPhone 15 Pro (Diego), Xiaomi (pedir a Diego confirmar modelo)

---

**Tiempo total estimado**: 1.5h  
**Bloqueadores**: Ninguno (solo requiere tiempo de desarrollo)  
**Deploy**: Incremental con checkpoints (no requiere migración BD)
