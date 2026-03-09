# Reglas Multiagente — Coworkia Aurora
> Referencia rápida del ecosistema. Se lee antes de cualquier intervención.  
> Última actualización: **08 Mar 2026 — v842**

---

## 0. Filosofía de trabajo

- **Lupa antes que escalpelo.** Leer antes de tocar.
- **Un fix a la vez.** Presentar plan → esperar "verde nena" → ejecutar → verificar errores.
- **Sin tecnicismos en el plan.** Lenguaje humano. Código solo tras aprobación.
- **No toques lo que funciona.** Nada de refactorizar "de paso".
- **"verde nena" = gas.** Sin esa frase, solo analizar y proponer.

---

## 1. Mapa del ecosistema

| Agente    | Empresa            | Especialidad                              | Tipo     |
|-----------|--------------------|--------------------------------------------|----------|
| AURORA    | Coworkia           | Hub central, reservas y coordinación       | Coworking|
| ALUNA     | Coworkia           | Membresías y planes mensuales              | Coworking|
| GABI      | GR Consulting      | Legal, finanzas, RRHH y compliance         | Externo  |
| ENZO      | MarketingLab       | Marketing, publicidad e IA para negocios   | Externo  |
| PAULA     | PropElite          | Bienes raíces Ecuador y Rep. Dominicana    | Externo  |
| AXEL      | PaintBull          | Reparación vehicular y cotizaciones        | Externo  |
| ANGELA    | MedBeneficios      | Salud y bienestar                          | Externo  |
| ADRIANA   | SegPopular         | Seguros y coberturas                       | Externo  |

**Regla de oro:** AURORA y ALUNA son agentes de coworking — reciben contexto de reservas y formularios. El resto son externos — no deben recibir ese contexto, es ruido para ellos.

---

## 2. Grupos de agentes (cómo el orquestador los trata)

```
isCoworkingAgent = ['AURORA', 'ALUNA']
isExternalAgent  = ['GABI', 'ENZO', 'PAULA', 'AXEL', 'ANGELA', 'ADRIANA']
```

**Consecuencias de cada grupo:**
- **Coworking:** recibe formulario de reservas, contexto de membresías, historial completo (hasta 15 mensajes).
- **Externo:** recibe historial reducido (hasta 8 mensajes), sin formulario de reservas, sin ruido de coworking.

---

## 3. Cómo se activan los agentes

| Mecanismo         | Quién lo usa                  | Comportamiento               |
|-------------------|-------------------------------|-------------------------------|
| `@mención`        | Todos                         | Handoff inmediato y prioritario |
| Keywords automáticas | AURORA → ALUNA, AURORA → PAULA | Handoff automático sin menciones |
| Sticky (mantener) | Todos los especializados      | Una vez activo, no cambia hasta nueva `@mención` |

---

## 4. Flujo de handoff estándar

1. Usuario escribe `@agente` (con o sin pregunta).
2. `detectar-intencion.js` detecta la mención → flag `agentHandoff`.
3. `wassenger.js` evalúa:
   - **Con consulta** (`@enzo quiero marketing`): handoff silencioso → LLM responde directo.
   - **Solo mención** (`@enzo`): `executeHandoff()` envía saludo personalizado → espera.
4. `activeAgent` se actualiza en el perfil.

**Timing correcto del handoff** (corregido 08 Mar 2026):
```
Aurora dice adiós → esperar 7s → nuevo agente entra
```
*(Antes el adiós llegaba después del delay — bug corregido en `handoff-manager.js`)*

---

## 5. Historial y filtros de mensajes

- **Todos los agentes:** máximo 15 mensajes (unificado).
- **@menciones puras** (`@aurora` sin texto): se eliminan del historial — son ruido de navegación.
- **@menciones con contenido** (`@enzo quiero marketing`): **NO se eliminan** — son el trigger más importante.
- **ALUNA activa + keywords Aurora** (`hot desk`, `reserva`, `sala`...): se limpia el form de membresía y cae al orquestador para el handoff natural ALUNA→AURORA.

---

## 6. handoffContext — la memoria del porqué

- Se crea solo cuando hay cambio de agente.
- Se persiste en `perfil.lastHandoffContext` para que el agente lo reciba en TODOS sus mensajes siguientes (no solo el primero).
- Se inyecta como `🧠 MEMORIA DE SESIÓN` (no "TRANSFERENCIA" — suena a robot barato).
- Se borra cuando el usuario cambia a otro agente.

---

## 7. Log de trabajo (sesiones anteriores)

### 08 Mar 2026 — v840 / v841 / v842 (Boss Commands + DB fixes)

| Item | Descripción | Archivos | Estado |
|------|-------------|----------|--------|
| DB1 | `query()` en `database.js` llamaba a `databaseService.db.query()` inexistente → bokeaba saves de `axel_quotes`, upserts de `collision_quotes` y `fetchBestDemoCase()` | `database.js` | ✅ v840 |
| DB2 | `collision_quotes` en live DB no tenía columna `damage_analysis` → error "column does not exist" en SELECT | `axel-demo-cotizacion.js`, `postgres-adapter.js` | ✅ v842 |
| NLP1 | Boss commands requerían sintaxis rígida → reemplazados por parsers async con OpenAI `gpt-4o` para los 6 agentes | `gabi-cotizacion-email.js`, `paula-cotizacion-email.js`, `axel-demo-cotizacion.js`, `wassenger.js` | ✅ v841 |
| NLP2 | `isXxxBossQuoteCommand()` amplió triggers a: `manda`, `envía`, `propuesta`, `proforma`, `para <Nombre>`, `coti` | todos los archivos de boss commands | ✅ v841 |
| NLP3 | Parser AXEL y PAULA no eran async → `wassenger.js` no los awaiteaba | `wassenger.js` | ✅ v841 |
| NLP4 | Parser de nombre devolvía `"Fer Gavilánez telefono"` (regex de teléfono no matcheaba `09…`) | `parseAxelDemoQuoteData()` → resuelto al pasar a OpenAI | ✅ v841 |
| MIG1 | Migración `ALTER TABLE collision_quotes ADD COLUMN IF NOT EXISTS damage_analysis JSONB` + `quote_details TEXT` | `postgres-adapter.js` | ✅ v842 |

### 08 Mar 2026 — v839 (Campañas)

| Item | Descripción | Archivos | Estado |
|------|-------------|----------|--------|
| C1 | `sala de reuniones` trigger activaba campaña ALUNA membresías (falso positivo) | `wassenger.js` | ✅ |
| C2 | Campaña #1 no incluía hint `@aluna` para que el usuario supiera cómo navegar | `wassenger.js` | ✅ |
| C3 | `me interesa` → handoff a ENZO no funcionaba en ventana de 30 min | `wassenger.js` | ✅ |

### 08 Mar 2026 — v838 y anteriores

| Item | Descripción | Estado |
|------|-------------|--------|
| A1 | ALUNA: recordatorio renovación membresía (día 25 + día 30) | ✅ |
| A2 | AURORA: sugerencia re-reserva (día anterior, cron 5pm) | ✅ |
| F2 | `handoffContext` se pierde tras 1er mensaje | ✅ |
| F3 | Filtro `@` borraba el mensaje de activación | ✅ |
| F5 | Saludo genérico con `@mención` pura como contexto | ✅ |
| F6 | Historial externo 3 mensajes → 15 unificado | ✅ |
| B1 | Aurora despedida llegaba DESPUÉS del delay de 7s | ✅ |
| B2 | Form de ALUNA bloqueaba switch automático a AURORA | ✅ |
| KW | ALUNA→AURORA automático por keywords (bidireccional) | ✅ |
| EZ | ENZO system prompt: metodología de brief creativo, 9 ejes, máx 7 preguntas | ✅ |
| ML | ENZO emails: logo PNG real de MarketingLab en cotizaciones del jefe | ✅ |
| F1 | GABI estaba en grupo coworking (recibía ruido de reservas) | ✅ |
| F4 | PAULA sin keywords automáticas — descartado (se mantiene `@mención`) | ❌ Descartado |

---

## 8. Sistema de Boss Commands (Cotizaciones del jefe)

Todos los agentes externos (GABI, ENZO, PAULA, AXEL, ALUNA, ADRIANA) tienen un comando especial para que el jefe genere y envíe cotizaciones/proformas por email directamente desde WhatsApp.

### 8.1 Cómo se activa

El sistema detecta el boss command si el mensaje del jefe contiene **email presente** + al menos una de estas palabras/frases:
```
cotización | coti | manda | envía | propuesta | proforma | para <Nombre>
```

No hay orden rígido. La frase puede ser natural, por ejemplo:
```
"gabi prepara una cotizacion para Fer Gavilanez, necesita asesoría SCVS.
Su mail es Mafer@gmail.com, cel 0998379860, empresa Wellness-Series"
```

### 8.2 Parser NLP con OpenAI

Todos los parsers son **async** y usan `gpt-4o` (`temperature: 0.1`, `max_tokens: 80-200`) para extraer:
- `nombre`, `email`, `telefono` (campos de contacto)
- Campo específico por agente: `area`/`descripcionServicio` (GABI), `propiedad` (PAULA), plan (ALUNA), etc.

Si OpenAI falla, cada parser tiene un fallback de regex básico.

**IMPORTANTE:** En `wassenger.js` todos los parsers se llaman con `await` — si se agrega un nuevo parser async, asegurarse de awaitearlo.

### 8.3 Archivos de boss commands por agente

| Agente   | Archivo                              | Parser                      |
|----------|--------------------------------------|-----------------------------|
| GABI     | `gabi-cotizacion-email.js`           | `parseGabiQuoteData()` async OpenAI |
| ENZO     | `enzo-cotizacion-email.js`           | regex                        |
| PAULA    | `paula-cotizacion-email.js`          | `parsePaulaQuoteData()` async OpenAI (contacto) + regex keyword (propiedad) |
| AXEL     | `axel-demo-cotizacion.js`            | `parseAxelDemoQuoteData()` async OpenAI |
| ADRIANA  | `adriana-cotizacion-email.js`        | regex                        |
| ALUNA    | inline en `wassenger.js`             | inline OpenAI: extrae `{ nombre, email, telefono, plan }` |

### 8.4 Demo de AXEL (cotización de colisiones)

- `fetchBestDemoCase()` busca el mejor caso real en `axel_quotes` / `collision_quotes`.
- Si las tablas están vacías → cae a demo estático (Toyota Hilux 4x4 2022, $800-$1500, **sin fotos**).
- **Para tener fotos en la demo:** tiene que existir al menos un usuario real que haya completado el flujo Axel (enviar fotos del vehículo por WhatsApp). Las fotos se guardan en `axel_quotes` desde v840.
- El SELECT de `collision_quotes` **no incluye** `damage_analysis` (columna que faltaba en la tabla live — se agrega por migración en `postgres-adapter.js`).

---

## 9. Capa de base de datos — patrones críticos

### 9.1 `database.js` — el helper `query()`

El helper `query()` exportado de `src/database/database.js` usa `db.all()` y retorna `{ rows }` para ser compatible con la interfaz pg-style:

```js
export const query = async (sql, params) => {
  await databaseService.ensureInitialized();
  const rows = await databaseService.db.all(sql, params);
  return { rows };
};
```

**El `postgresAdapter` solo tiene `run`, `get`, `all` — NO tiene `.query()` nativo.** Nunca llamar `databaseService.db.query()` directamente.

### 9.2 Migraciones de columnas (`postgres-adapter.js`)

Si una tabla live fue creada antes de que se añadiera una columna al schema, usar siempre:
```sql
ALTER TABLE nombre_tabla ADD COLUMN IF NOT EXISTS columna TIPO;
```
Esto va en el bloque de migraciones de `postgres-adapter.js` (cerca del `CREATE TABLE` de la tabla).

**Caso de referencia:** `collision_quotes` en live DB no tenía `damage_analysis JSONB` ni `quote_details TEXT` — se agregaron con `ADD COLUMN IF NOT EXISTS` en v842.

---

## 10. Protocolo de intervención quirúrgica

Antes de tocar cualquier archivo crítico:

1. **Leer el archivo completo** — nunca editar sin contexto total.
2. **Identificar todas las referencias** al código que se va a cambiar (grep antes de operar).
3. **Describir el cambio en humano** — si no se puede explicar sin código, no está listo.
4. **Recibir "verde nena"** — solo entonces se ejecuta.
5. **Verificar errores** tras cada cambio (`get_errors`).
6. **Actualizar esta tabla** cuando un pendiente se resuelva.

---

## 11. Archivos críticos — tocar con máxima precaución

| Archivo                                          | Rol en el sistema                                      |
|--------------------------------------------------|--------------------------------------------------------|
| `src/deteccion-intenciones/orquestador.js`       | Cerebro: decide agente, construye contexto, rutas LLM  |
| `src/express-servidor/endpoints-api/wassenger.js`| Sistema nervioso: recibe WhatsApp, ejecuta handoffs    |
| `src/deteccion-intenciones/detectar-intencion.js`| Detector de intenciones y routing de agentes           |
| `src/servicios/handoff-manager.js`               | Ejecuta la experiencia UX de transición entre agentes  |
| `src/deteccion-intenciones/handoff-messages.js`  | Mensajes de bienvenida/despedida centralizados         |
| `src/deteccion-intenciones/agent-keywords.js`    | Keywords y triggers de todos los agentes               |

---

*Última actualización: 08 Mar 2026 — v842 (Boss Commands NLP + DB query fix + collision_quotes schema migration).*
