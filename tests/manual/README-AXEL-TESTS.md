# 🧪 Tests Manuales de AXEL

Scripts para verificar el sistema de análisis de fotos de AXEL antes de probar en producción.

## Scripts Disponibles

### 1. `check-axel-state.mjs` - Verificación de Estado

Verifica que todas las piezas del sistema estén implementadas correctamente.

```bash
node scripts/tests-manual/check-axel-state.mjs
```

**Verifica:**
- ✅ Map de fotos pendientes
- ✅ Sistema de agrupación
- ✅ Timer de 4 segundos
- ✅ Limpieza de cache
- ✅ Flag waitingForPhotoRetry
- ✅ Prevención de reinicio de conversación
- ✅ Servicio collision-analysis.js

### 2. `test-axel-photos.mjs` - Test de Agrupación

Simula el envío de 4 fotos para verificar la agrupación.

```bash
# Test local (servidor en localhost:3000)
node scripts/tests-manual/test-axel-photos.mjs photos

# Test en Heroku staging
TEST_URL=https://tu-app-staging.herokuapp.com node scripts/tests-manual/test-axel-photos.mjs photos
```

**Qué hace:**
1. Envía 4 fotos rápidamente (300ms entre cada una)
2. Espera 5 segundos para que el timer se dispare
3. Muestra resultados de cada foto enviada

**Qué verificar en los logs:**
- `📸 Foto agregada al grupo (1 total)`
- `📸 Foto agregada al grupo (2 total)`
- `📸 Foto agregada al grupo (3 total)`
- `📸 Foto agregada al grupo (4 total)`
- `🚀 Procesando 4 fotos agrupadas`
- **NO** debe aparecer mensaje genérico de AXEL

### 3. Test de Manejo de Errores

```bash
node scripts/tests-manual/test-axel-photos.mjs error
```

Muestra instrucciones para simular un error de OpenAI y verificar:
- Se envía mensaje de error al usuario
- Se guarda `waitingForPhotoRetry = true`
- Mensajes vacíos posteriores son ignorados
- **NO** se reinicia conversación

## Flujo Completo de Prueba Local

### Paso 1: Preparar entorno

```bash
# Copiar variables de entorno
cp .env.example .env

# Configurar variables necesarias
# - WASSENGER_TOKEN
# - WASSENGER_DEVICE_ID  
# - OPENAI_API_KEY
# - DATABASE_URL (PostgreSQL local)
# - WEBHOOK_SECURITY_BYPASS=true
# - DEBUG_MODE=true
```

### Paso 2: Iniciar servidor

```bash
npm run dev
```

El servidor debe estar corriendo en `http://localhost:3000`

### Paso 3: Verificar estado

```bash
node scripts/tests-manual/check-axel-state.mjs
```

Todos los checks deben ser ✅

### Paso 4: Ejecutar test de fotos

```bash
node scripts/tests-manual/test-axel-photos.mjs photos
```

### Paso 5: Revisar logs del servidor

Buscar en la salida del servidor:

```
[WASSENGER] 🚗 AXEL activo + imagen detectada - iniciando agrupación de fotos
[WASSENGER] 📸 Foto agregada al grupo (1 total) - esperando 4 segundos...
[WASSENGER] 📸 Foto agregada al grupo (2 total) - esperando 4 segundos...
[WASSENGER] 📸 Foto agregada al grupo (3 total) - esperando 4 segundos...
[WASSENGER] 📸 Foto agregada al grupo (4 total) - esperando 4 segundos...
[WASSENGER] 🚀 Procesando 4 fotos agrupadas
[COLLISION ANALYSIS] 📸 Analizando foto tipo: general
[COLLISION ANALYSIS] 🔗 URL: https://api.wassenger.com/...
```

## Simular Errores de OpenAI

Para probar el manejo de errores:

### Opción 1: Desconectar internet temporalmente

```bash
# Antes de ejecutar el test
sudo ifconfig en0 down  # macOS
# o
sudo ip link set eth0 down  # Linux

# Ejecutar test
node scripts/tests-manual/test-axel-photos.mjs photos

# Reconectar
sudo ifconfig en0 up
```

### Opción 2: API Key inválida

```bash
# En .env
OPENAI_API_KEY=sk-invalid-key-for-testing

# Reiniciar servidor y ejecutar test
```

### Opción 3: Mock temporal en el código

Editar `src/servicios/collision-analysis.js`:

```javascript
export async function analyzeCollisionPhoto(imageUrl, context = {}) {
  // 🧪 TEST: Simular error
  return {
    success: false,
    error: 'Servicio temporalmente no disponible. Por favor, intenta de nuevo.'
  };
  
  // ... resto del código
}
```

## Verificar en Producción (Heroku)

Después de probar localmente, verificar en Heroku:

```bash
# Ver logs en tiempo real
heroku logs --app coworkia-agent --tail

# Filtrar solo logs de AXEL
heroku logs --app coworkia-agent --tail | grep -E "(AXEL|WASSENGER|Foto agregada)"

# Enviar fotos reales vía WhatsApp y observar logs
```

## Checklist Pre-Deploy

Antes de desplegar cambios a producción:

- [ ] ✅ Todos los checks de `check-axel-state.mjs` pasan
- [ ] ✅ Test de fotos funciona localmente
- [ ] ✅ Logs muestran agrupación correcta (1, 2, 3, 4 total)
- [ ] ✅ Timer se dispara después de 4 segundos
- [ ] ✅ Una sola llamada a OpenAI Vision con todas las fotos
- [ ] ✅ Manejo de errores funciona (no reinicia conversación)
- [ ] ✅ Variables de entorno configuradas en Heroku
- [ ] ✅ Git commit y push a main
- [ ] ✅ Deploy a Heroku exitoso

## Troubleshooting

### "Connection refused" al ejecutar test

- Verificar que el servidor esté corriendo en localhost:3000
- Verificar que no haya firewall bloqueando

### "Map is not defined"

- Verificar que el import del Map esté antes de los otros imports
- Verificar sintaxis ES6

### Fotos no se agrupan

- Verificar que `activeAgent === 'AXEL'` en la DB
- Verificar que las fotos tengan `mediaUrl` válido
- Revisar logs de `axelPendingPhotos.get/set`

### Timer no se dispara

- Verificar que clearTimeout esté funcionando
- Verificar que el setTimeout tenga 4000ms
- Revisar si hay errores antes del setTimeout

### Conversación se reinicia después de error

- Verificar que `waitingForPhotoRetry` se guarde en el perfil
- Verificar que el check de `!text.trim()` esté funcionando
- Revisar logs de "ignorando mensaje vacío"
