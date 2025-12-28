# Sistema Multiidioma Coworkia Agent

## 🌍 Descripción General

Coworkia Agent ahora soporta **6 idiomas** de forma nativa y automática:
- 🇪🇸 **Español (es)** - Idioma por defecto
- 🇬🇧 **English (en)** - Inglés
- 🇯🇵 **日本語 (ja)** - Japonés  
- 🇵🇪 **Runasimi (qu)** - Quechua
- 🇫🇷 **Français (fr)** - Francés
- 🇮🇹 **Italiano (it)** - Italiano

El sistema detecta automáticamente el idioma del usuario y todos los agentes responden naturalmente en ese idioma con adaptaciones culturales apropiadas.

---

## 🤖 Agentes Multiidioma

Todos los agentes están entrenados para responder en los 6 idiomas:

### **Aurora** 🌅 - Recepcionista Principal
- Primera línea de atención
- Detección automática de idioma
- Respuestas culturalmente adaptadas
- Manejo de reservas y consultas generales

### **Aluna** 💼 - Especialista en Ventas
- Cierra ventas de membresías
- Terminología de ventas por idioma
- Expresiones de cierre adaptadas

### **Ángela** 🏥 - Asistente de Salud
- Consultas médicas (MedBeneficios)
- Terminología médica precisa
- Sensibilidad cultural en salud

### **Adriana** 🛡️ - Asesora de Seguros
- Coaching financiero (Segpopular)
- Términos de seguros por idioma
- Construcción de confianza cultural

### **Enzo** 🚀 - Experto en Marketing
- Marketing y tecnología
- Terminología técnica global
- Expresiones orientadas a acción

---

## 🔍 Detección Automática de Idioma

### Funcionamiento

El sistema analiza cada mensaje usando:

1. **Patrones de palabras comunes** - Lista de 30+ palabras características por idioma
2. **Caracteres especiales** - Detección de alfabetos (Kanji, Hiragana, Katakana para japonés)
3. **Umbral de confianza** - Mínimo 0.8 (80%) para cambio automático
4. **Preferencia guardada** - Memoria del idioma elegido por usuario

### Lógica de Prioridad

```
1. Comando explícito (/english, cambiar a japonés)
   ↓
2. Detección automática con confianza >0.8
   ↓
3. Idioma preferido guardado en base de datos
   ↓
4. Español (fallback por defecto)
```

### Ejemplos de Detección

**Español:**
- "Hola, necesito reservar un espacio"
- "Buenos días, quiero información"

**English:**
- "Hello, I need to book a space"
- "Good morning, I want information"

**日本語:**
- "こんにちは、スペースを予約したい"
- "おはようございます、情報が欲しい"

**Runasimi:**
- "Allin p'unchay, huk espaciota reservani"
- "Imaynalla, willaykunata munanimi"

**Français:**
- "Bonjour, je veux réserver un espace"
- "Salut, j'ai besoin d'informations"

**Italiano:**
- "Ciao, ho bisogno di prenotare uno spazio"
- "Buongiorno, voglio informazioni"

---

## 💬 Comandos Manuales de Cambio de Idioma

Los usuarios pueden cambiar explícitamente su idioma de 3 formas:

### 1. Comandos con barra (/)
```
/spanish o /español
/english o /inglés
/japanese o /japonés o /日本語
/quechua o /runasimi
/french o /français o /francés
/italian o /italiano o /italiane
```

### 2. Comandos naturales
```
"cambiar a inglés"
"switch to japanese"
"passer au français"
"cambia a italiano"
"日本語に変更"
```

### 3. Comandos cortos
```
"english please"
"español por favor"
"français s'il vous plaît"
"italiano per favore"
```

**Confirmación:**
Cuando el usuario cambia idioma explícitamente, el sistema confirma:
- 🇪🇸 "🌍 Idioma cambiado a Español"
- 🇬🇧 "🌍 Language changed to English"
- 🇯🇵 "🌍 言語が日本語に変更されました"
- 🇵🇪 "🌍 Rimayniyqa Runasimimanñam"
- 🇫🇷 "🌍 Langue changée en Français"
- 🇮🇹 "🌍 Lingua cambiata in Italiano"

---

## 🎭 Adaptaciones Culturales por Agente

### Aurora - Recepcionista

**Español:** Cálida, cercana, emojis alegres 😊☀️🌺
- "¡Hola! ¿Cómo estás?" 
- "¡Perfecto!"

**English:** Profesional, amigable, emojis neutros 😊✨☀️
- "Hello! How are you?"
- "Perfect!"

**日本語:** Respetuosa, formal, emojis kawaii 🌸✨🙇
- "こんにちは！お元気ですか？"
- "かしこまりました！"

**Runasimi:** Comunitaria, respetuosa, emojis andinos 🌄🌾💚
- "Allin p'unchay! Imaynalla kashkanki?"
- "Allinmi!"

**Français:** Elegante, cortés, emojis refinados 🌟💫🎨
- "Bonjour ! Comment allez-vous ?"
- "Parfait !"

**Italiano:** Expresiva, gestual, emojis vivaces 🤌💚🌟
- "Ciao! Come stai?"
- "Perfetto!"

---

## 📦 Almacenamiento de Preferencias

### Base de Datos PostgreSQL

```sql
-- Campo agregado a tabla users
ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'es';
```

### Funciones Disponibles

**memoria-sqlite.js:**
```javascript
// Obtener idioma preferido del usuario
const language = await getUserPreferredLanguage(userId);

// Guardar idioma preferido del usuario
await setUserPreferredLanguage(userId, 'en');
```

**language-detector.js:**
```javascript
// Detectar idioma de un mensaje
const detectedLang = detectLanguage(message, currentLanguage);

// Detectar comando explícito
const command = detectLanguageCommand(message);

// Obtener idioma final del usuario
const userLang = getUserLanguage(message, preferredLanguage);
```

---

## 🔄 Flujo de Conversación Multiidioma

### Escenario 1: Usuario escribe en inglés
```
Usuario: "Hello, I need a desk"
  ↓
Sistema detecta: English (confianza: 0.95)
  ↓
Actualiza DB: preferred_language = 'en'
  ↓
Aurora responde: "Hello! 😊 I'd be happy to help you with desk options..."
```

### Escenario 2: Usuario cambia idioma explícitamente
```
Usuario (en español): "cambiar a japonés"
  ↓
Sistema detecta comando: /japanese
  ↓
Actualiza DB: preferred_language = 'ja'
  ↓
Sistema confirma: "🌍 言語が日本語に変更されました"
  ↓
Aurora responde en japonés: "かしこまりました！✨ どのようなご用件でしょうか？"
```

### Escenario 3: Handover entre agentes
```
Aurora (español): "Te conecto con Aluna 🔄"
  ↓
Sistema pasa: preferredLanguage = 'es' a Aluna
  ↓
Aluna continúa en español: "¡Hola! 💼 Soy Aluna..."
```

---

## 📋 Mensajes del Sistema

### Archivo Central: src/utils/translations.js

Contiene todas las traducciones de mensajes automáticos:

**Categorías:**
- ✅ Confirmaciones (reservationConfirmed, paymentReceived, emailSent)
- ❌ Errores (genericError, databaseError, invalidDate, paymentFailed)
- 🔔 Notificaciones (welcomeBack, reminder24h, pendingPayment)
- ⏳ Respuestas automáticas (processingRequest, oneMinutePlease)
- 🔄 Handovers (transferringToAluna, transferringToAngela)
- 📝 Validaciones (nameRequired, emailRequired, invalidEmail)
- 🎯 Opciones (selectPlan, selectDate, selectTime)
- 👋 Despedidas (goodbye, thankYou)

**Uso:**
```javascript
import { getMessage } from './utils/translations.js';

// Obtener mensaje en idioma del usuario
const message = getMessage('reservationConfirmed', userLanguage);

// Mensaje con variables
const formatted = formatMessage(
  getMessage('reminder24h', 'en'),
  { time: '10:00 AM' }
);
```

---

## 🧪 Testing

### Script de Pruebas: scripts/test-aurora-multilanguage.js

**Ejecutar:**
```bash
node scripts/test-aurora-multilanguage.js
```

**Cobertura:**
- ✅ 33 casos de prueba
- ✅ 24 tests de detección automática (4 por idioma)
- ✅ 9 tests de comandos explícitos
- ✅ 100% tasa de éxito

**Verificaciones:**
- Detección correcta del idioma
- Confianza >0.8 para cambio automático
- System prompt contiene sección "IDIOMA Y COMUNICACIÓN"
- Comandos explícitos reconocidos correctamente

---

## 🚀 Despliegue

### Versiones

**v293** - Sistema de detección de idioma
- language-detector.js
- Integración en wassenger.js
- Aurora multiidioma

**v294** - Todos los agentes multiidioma (ACTUAL)
- Aluna, Ángela, Adriana, Enzo actualizados
- Orquestador simplificado
- Sistema completo en producción

### Monitoreo

**Heroku Logs:**
```bash
heroku logs --tail -a coworkia-agent | grep "preferredLanguage"
```

**Verificar conversaciones:**
- Revisar tabla `users` campo `preferred_language`
- Analizar patrones de cambio de idioma
- Métricas de idiomas más usados

---

## 📊 Estadísticas Esperadas

**Distribución inicial estimada:**
- 🇪🇸 Español: 70%
- 🇬🇧 English: 15%
- 🇯🇵 日本語: 5%
- 🇵🇪 Runasimi: 5%
- 🇫🇷 Français: 3%
- 🇮🇹 Italiano: 2%

**KPIs a monitorear:**
- Precisión de detección automática
- Tasa de comandos explícitos vs auto-detección
- Tiempo de respuesta por idioma
- Satisfacción del usuario por idioma

---

## 🛠️ Mantenimiento

### Agregar un nuevo idioma

1. **language-detector.js:**
   - Agregar entrada en `LANGUAGE_PATTERNS`
   - Incluir palabras comunes y caracteres especiales
   - Agregar comandos naturales en regex

2. **translations.js:**
   - Agregar código de idioma a cada mensaje
   - Traducir todas las categorías

3. **Cada agente (aurora.js, aluna.js, etc):**
   - Agregar idioma al array `personalidad.idiomas`
   - Incluir en sección "ADAPTACIÓN CULTURAL"
   - Definir terminología específica

4. **Testing:**
   - Agregar 4 casos en test-aurora-multilanguage.js
   - Verificar comandos explícitos
   - Confirmar tasa de éxito >95%

### Ajustar detección

Si un idioma tiene falsos positivos/negativos:

1. Revisar `LANGUAGE_PATTERNS` en language-detector.js
2. Agregar palabras más específicas
3. Ajustar regex de caracteres especiales
4. Modificar umbral de confianza si es necesario (actual: 0.8)

---

## 🔐 Consideraciones de Seguridad

- ✅ Validación de códigos de idioma (solo es/en/ja/qu/fr/it)
- ✅ Sanitización de comandos de usuario
- ✅ Fallback seguro a español
- ✅ Logs de cambios de idioma para auditoría

---

## 📞 Soporte

**Contacto técnico:**
- Archivo: documentacion/SISTEMA_MULTIIDIOMA.md
- Script de pruebas: scripts/test-aurora-multilanguage.js
- Código fuente: src/utils/language-detector.js

**Mejoras futuras:**
- [ ] Agregar portugués brasileño
- [ ] Detección de dialectos (español latino vs peninsular)
- [ ] Análisis de sentimiento por cultura
- [ ] Traducciones de documentos PDF

---

## ✅ Checklist de Verificación

Para confirmar que el sistema funciona correctamente:

- [x] Los 5 agentes tienen array `idiomas` con 6 idiomas
- [x] Cada agente tiene `getSystemPrompt(userLanguage)` 
- [x] Orquestador llama `getSystemPrompt()` correctamente
- [x] wassenger.js detecta comandos explícitos
- [x] wassenger.js hace auto-detección antes de `procesarMensaje()`
- [x] Base de datos tiene campo `preferred_language`
- [x] translations.js tiene todas las categorías de mensajes
- [x] Test suite pasa al 100%
- [x] Sistema desplegado en producción (v294)

---

**Última actualización:** Enero 2025  
**Versión:** v294  
**Estado:** ✅ Producción - Todos los agentes activos
