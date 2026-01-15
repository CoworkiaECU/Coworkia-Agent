# 🧪 Testing Local de Aurora

## Configuración Inicial

### 1. Configurar Variables de Entorno

Copia el archivo de ejemplo y ajústalo con tus claves:

```bash
cp .env.development .env.local
```

Edita `.env.local` y configura tu `OPENAI_API_KEY`:

```bash
OPENAI_API_KEY=sk-tu-clave-aqui
```

### 2. Iniciar el Servidor Local

En una terminal, inicia el servidor en modo desarrollo con SQLite:

```bash
npm run dev:local
```

Esto iniciará el servidor en `http://localhost:3000` usando SQLite en lugar de PostgreSQL.

## Pruebas Básicas

### Enviar un Mensaje Individual

En otra terminal:

```bash
npm run test:aurora "hola"
npm run test:aurora "necesito una sala para mañana a las 3pm"
npm run test:aurora "mi email es diego@test.com"
```

### Conversación Completa Automática

Prueba una conversación completa de reserva:

```bash
npm run test:conversation
```

Esto enviará automáticamente:
1. "hola"
2. "necesito una sala para mañana a las 3pm"
3. "mi email es diego@test.com"
4. "confirmar"

### Test de Cancelación

Prueba el flujo de cancelación:

```bash
npm run test:cancel
```

## Verificar Base de Datos Local

La base de datos SQLite se guarda en `data/coworkia.db`. Puedes verificarla con:

```bash
# Instalar sqlite3 si no lo tienes
brew install sqlite3  # macOS

# Ver usuarios
sqlite3 data/coworkia.db "SELECT * FROM users;"

# Ver interacciones
sqlite3 data/coworkia.db "SELECT * FROM interactions ORDER BY timestamp DESC LIMIT 10;"

# Ver reservas
sqlite3 data/coworkia.db "SELECT * FROM reservations ORDER BY created_at DESC;"
```

## Estructura de Testing

### Script Principal: `scripts/test-aurora-local.js`

Simula webhooks de Wassenger enviando mensajes a tu servidor local.

**Uso avanzado:**

```bash
# Mensaje personalizado
node scripts/test-aurora-local.js "tu mensaje aquí"

# Ver ayuda
node scripts/test-aurora-local.js
```

### Variables de Entorno para Testing

```bash
NODE_ENV=development      # Activa modo desarrollo
FORCE_SQLITE=true         # Fuerza uso de SQLite
WEBHOOK_SECURITY_BYPASS=true  # Desactiva verificación de webhooks
```

## Debugging

### Ver Logs Detallados

El servidor muestra todos los logs en la terminal. Busca:

```
[POSTGRES DEBUG]  -> Queries de base de datos
[WASSENGER]       -> Procesamiento de mensajes
[AURORA]          -> Respuestas de OpenAI
[MEMORIA]         -> Operaciones de memoria/perfil
```

### Resetear Base de Datos Local

Si necesitas empezar desde cero:

```bash
rm data/coworkia.db
# El servidor recreará la base de datos automáticamente
```

## Flujo de Desarrollo Recomendado

1. **Hacer cambios en el código**
2. **Servidor se reinicia automáticamente** (nodemon)
3. **Enviar mensaje de prueba**: `npm run test:aurora "hola"`
4. **Ver respuesta en la terminal**
5. **Iterar** hasta que funcione
6. **Commit y deploy**: `git push heroku main`

## Ventajas de Testing Local

✅ **Rápido**: No necesitas deployar para probar  
✅ **Barato**: No gastas tiempo de dyno de Heroku  
✅ **Debugging**: Ves todos los logs en tiempo real  
✅ **SQLite**: No afectas la base de datos de producción  
✅ **Iteración**: Cambio → Test → Fix en segundos

## Troubleshooting

### Error: "ECONNREFUSED"

El servidor no está corriendo. Inicia con:

```bash
npm run dev:local
```

### Error: "OPENAI_API_KEY not set"

Configura tu API key en `.env.local`:

```bash
OPENAI_API_KEY=sk-tu-clave-aqui
```

### Aurora no responde

Verifica que los logs muestren:

```
[WASSENGER] Webhook recibido
[DEBUG-FLOW] 1️⃣ Iniciando loadProfile
```

Si no ves estos logs, el webhook no está llegando.

### Base de datos bloqueada (SQLite)

Si ves errores de "database is locked", cierra otras conexiones:

```bash
# Reinicia el servidor
# Ctrl+C y luego npm run dev:local
```

## Próximos Pasos

Una vez que tu feature funciona localmente:

1. **Commit**: `git add -A && git commit -m "feat: tu feature"`
2. **Deploy**: `git push heroku main`
3. **Verificar**: Envía un mensaje real al bot
4. **Monitorear**: `heroku logs --tail`

---

**Nota**: El testing local usa SQLite, pero producción usa PostgreSQL. Asegúrate de que tu código sea compatible con ambos.
