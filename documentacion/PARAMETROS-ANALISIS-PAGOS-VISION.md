# 📋 PARÁMETROS DE ANÁLISIS DE PAGOS - COWORKIA VISIONAI

**Versión:** 1.0  
**Fecha:** 19 de enero de 2026  
**Alcance:** Análisis automático de comprobantes de pago para Aluna (membresías) y Aurora (reservas)

---

## 🎯 OBJETIVO

Definir **todos los parámetros** que el agente virtual debe extraer de un comprobante de pago enviado por WhatsApp para validar automáticamente transferencias, pagos Payphone y tarjetas de crédito.

---

## 📊 PARÁMETROS CRÍTICOS (OBLIGATORIOS)

Estos parámetros **DEBEN** ser extraídos para considerar un pago como válido:

### 1. **Monto (`amount`)**
- **Tipo:** Decimal (10,2)
- **Descripción:** Cantidad pagada en dólares
- **Validación:** 
  - Debe coincidir con el monto esperado ±$0.50 de tolerancia
  - Formato: 12.08, 100.00, 350.50
- **Extracción VisionAI:**
  - Buscar: "USD", "$", "Monto", "Total", "Amount"
  - Convertir comas a puntos (formato internacional)
- **Ejemplo:** `8.40`, `180.00`, `350.00`

---

### 2. **Fecha de Transacción (`transaction_date`)**
- **Tipo:** DATE (YYYY-MM-DD)
- **Descripción:** Fecha en que se realizó el pago
- **Validación:**
  - No puede ser fecha futura
  - Debe ser dentro de los últimos 30 días
  - Si es > 7 días, alertar para confirmación manual
- **Extracción VisionAI:**
  - Formatos soportados: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
  - Payphone: "18/11/2025" → convertir a "2025-11-18"
- **Ejemplo:** `2026-01-19`, `2026-01-15`

---

### 3. **Hora de Transacción (`transaction_time`)**
- **Tipo:** TIME (HH:MM:SS)
- **Descripción:** Hora exacta del pago
- **Validación:**
  - Formato 24 horas
  - Útil para resolver duplicados o disputas
- **Extracción VisionAI:**
  - Buscar: "Hora", "Time", junto a la fecha
  - Payphone: "14:12" → almacenar como "14:12:00"
- **Ejemplo:** `14:30:00`, `09:15:30`

---

### 4. **Número de Transacción (`transaction_number`)**
- **Tipo:** TEXT (único, indexado)
- **Descripción:** Identificador único del banco/plataforma
- **Validación:**
  - **CRÍTICO:** Verificar que no exista en BD (evitar doble procesamiento)
  - Longitud típica: 6-20 caracteres
- **Extracción VisionAI:**
  - Payphone: "No. Transacción: 70613140"
  - Bancos: "Referencia", "Comprobante", "Transaction ID"
- **Ejemplo:** `70613140`, `REF-2026-00123`, `TRX123456789`

---

### 5. **Método de Pago (`payment_method`)**
- **Tipo:** TEXT (enum)
- **Valores permitidos:**
  - `payphone` - Pago con Payphone
  - `transferencia_interbancaria` - Transferencia entre diferentes bancos
  - `transferencia_mismo_banco` - Transferencia dentro del mismo banco
  - `deposito_efectivo` - Depósito en efectivo en ventanilla
  - `tarjeta_credito` - Tarjeta de crédito/débito
  - `tarjeta_debito` - Tarjeta de débito
  - `paypal` - PayPal
  - `otro` - Otros métodos
- **Validación:**
  - Solo aceptar métodos en la lista
- **Extracción VisionAI:**
  - Si ve logo Payphone → `payphone`
  - Si ve "Transferencia" → `transferencia_interbancaria`
  - Si ve terminal POS → `tarjeta_credito` o `tarjeta_debito`
- **Ejemplo:** `payphone`, `transferencia_interbancaria`

---

## 📊 PARÁMETROS IMPORTANTES (RECOMENDADOS)

Estos parámetros mejoran la validación pero no son obligatorios:

### 6. **Banco Emisor (`bank_sender`)**
- **Tipo:** TEXT
- **Descripción:** Banco/institución desde donde se envió el dinero
- **Validación:**
  - Lista de bancos ecuatorianos válidos
  - Cooperativas reguladas por SEPS
- **Extracción VisionAI:**
  - Buscar logos o nombres: Pichincha, Guayaquil, Produbanco, etc.
  - Si es Payphone: extraer de "Persona" o tarjeta usada
- **Bancos válidos:**
  ```javascript
  const BANCOS_ECUADOR = [
    'Pichincha', 'Guayaquil', 'Pacífico', 'Produbanco', 'Bolivariano',
    'Internacional', 'Austro', 'Procredit', 'Solidario', 'BanEcuador',
    'Loja', 'Machala', 'Litoral', 'Capital', 'Comercial de Manabí',
    'Diners Club', 'Payphone', 'Cooperativa JEP', 'Cooperativa 29 de Octubre',
    // ... más cooperativas
  ];
  ```
- **Ejemplo:** `Pichincha`, `Payphone`, `Cooperativa JEP`

---

### 7. **Banco Receptor (`bank_receiver`)**
- **Tipo:** TEXT
- **Descripción:** Banco donde se recibió el dinero (Coworkia)
- **Validación:**
  - **DEBE SER:** `Produbanco` para transferencias
  - Si es diferente, alerta (posible error)
- **Extracción VisionAI:**
  - Buscar: "Cuenta destino", "Beneficiario", "Recipient"
- **Ejemplo:** `Produbanco`

---

### 8. **Cuenta Destino (`account_number_destination`)**
- **Tipo:** TEXT
- **Descripción:** Número de cuenta a la que se transfirió
- **Validación:**
  - **DEBE SER:** `20059783069` (cuenta Coworkia)
  - Si es diferente, RECHAZAR pago
- **Extracción VisionAI:**
  - Buscar: "Cuenta destino", "A la cuenta", "To account"
  - Limpiar guiones y espacios: "2005-9783-069" → "20059783069"
- **Ejemplo:** `20059783069`

---

### 9. **Cuenta Origen (`account_number_source`)**
- **Tipo:** TEXT
- **Descripción:** Cuenta desde donde se envió el dinero
- **Validación:**
  - Opcional para tracking
  - Útil para identificar pagos recurrentes
- **Extracción VisionAI:**
  - Buscar: "Cuenta origen", "De la cuenta", "From account"
  - Formato: últimos 4 dígitos pueden estar ocultos (***1234)
- **Ejemplo:** `1234567890`, `****5678`

---

### 10. **Titular de Cuenta Origen (`account_holder_source`)**
- **Tipo:** TEXT
- **Descripción:** Nombre del pagador
- **Validación:**
  - Comparar con `client_name` del lead
  - Si no coincide, alertar (puede ser familiar o empresa)
- **Extracción VisionAI:**
  - Payphone: campo "Persona"
  - Bancos: "Pagador", "De", "From"
- **Ejemplo:** `DIEGO VILLOTA`, `JUAN PÉREZ GARCÍA`

---

### 11. **Número de Autorización (`authorization_number`)**
- **Tipo:** TEXT
- **Descripción:** Código de autorización (tarjetas, Payphone)
- **Validación:**
  - Único por transacción
  - Payphone: empieza con "W"
- **Extracción VisionAI:**
  - Payphone: "No. Autorización: W70613140"
  - Tarjetas: "Auth Code", "Código de aprobación"
- **Ejemplo:** `W70613140`, `AUTH123456`

---

### 12. **Número de Comprobante (`receipt_number`)**
- **Tipo:** TEXT
- **Descripción:** Número del comprobante digital/impreso
- **Validación:**
  - Diferente a `transaction_number` (puede existir ambos)
- **Extracción VisionAI:**
  - Buscar: "Comprobante Nro.", "Receipt #", "Voucher"
- **Ejemplo:** `590709020900`, `COMP-2026-001`

---

## 📊 PARÁMETROS ADICIONALES (CONTEXTUALES)

Estos parámetros proporcionan contexto adicional:

### 13. **Moneda (`currency`)**
- **Tipo:** TEXT(3)
- **Descripción:** Moneda del pago
- **Validación:**
  - Ecuador: siempre debe ser `USD`
  - Si es diferente, rechazar
- **Ejemplo:** `USD`

---

### 14. **Descripción/Concepto (`transaction_description`)**
- **Tipo:** TEXT
- **Descripción:** Concepto del pago registrado
- **Validación:**
  - Opcional, informativo
  - Puede contener: "Coworkia hot desk", "Membresía Plan 20"
- **Extracción VisionAI:**
  - Payphone: descripción secundaria del comprobante
  - Bancos: campo "Concepto", "Descripción"
- **Ejemplo:** `Coworkia hoy desk`, `Pago membresía mensual`

---

### 15. **Estado de Transacción (`transaction_status`)**
- **Tipo:** TEXT (enum)
- **Valores permitidos:**
  - `approved` - Aprobada/Exitosa
  - `pending` - Pendiente
  - `rejected` - Rechazada
  - `cancelled` - Cancelada
- **Validación:**
  - **Solo procesar si es `approved`**
  - Si es `pending`, informar al usuario que espere
  - Si es `rejected`, solicitar nuevo pago
- **Extracción VisionAI:**
  - Payphone: "Aprobada" (en verde) → `approved`
  - Bancos: "Exitosa", "Completada" → `approved`
- **Ejemplo:** `approved`, `pending`

---

### 16. **Canal de Pago (`payment_channel`)**
- **Tipo:** TEXT
- **Descripción:** Cómo se hizo el pago
- **Valores:**
  - `web` - Página web
  - `mobile_app` - App móvil
  - `physical_pos` - Terminal físico
  - `atm` - Cajero automático
  - `branch` - Sucursal bancaria
- **Ejemplo:** `mobile_app`, `physical_pos`

---

### 17. **Tipo de Tarjeta (`card_type`)**
- **Tipo:** TEXT
- **Descripción:** Tipo de tarjeta usada (si aplica)
- **Valores:**
  - `visa` - Visa
  - `mastercard` - Mastercard
  - `diners` - Diners Club
  - `amex` - American Express
  - `alia` - Alia (Ecuador)
- **Extracción VisionAI:**
  - Buscar logos en el comprobante
- **Ejemplo:** `visa`, `mastercard`

---

### 18. **Últimos 4 Dígitos de Tarjeta (`card_last_four`)**
- **Tipo:** TEXT(4)
- **Descripción:** Últimos 4 dígitos de tarjeta (seguridad)
- **Validación:**
  - Solo almacenar últimos 4 (PCI compliance)
  - NUNCA almacenar número completo
- **Ejemplo:** `1234`, `5678`

---

### 19. **Comisión/Fee (`transaction_fee`)**
- **Tipo:** DECIMAL(10,2)
- **Descripción:** Comisión bancaria cobrada
- **Validación:**
  - Informativo, no afecta validación
  - Útil para reconciliación contable
- **Ejemplo:** `0.50`, `1.20`

---

### 20. **Confianza del Análisis (`confidence_score`)**
- **Tipo:** INTEGER (0-100)
- **Descripción:** Nivel de confianza de VisionAI en la extracción
- **Validación:**
  - Si < 70: solicitar confirmación manual
  - Si >= 90: procesar automáticamente
  - Si 70-89: procesar pero notificar al staff
- **Ejemplo:** `95`, `82`, `65`

---

## 🔍 REGLAS DE VALIDACIÓN COMPLETAS

### Validación Nivel 1: Datos Mínimos (OBLIGATORIO)
```javascript
const isDatosMinimos = (paymentData) => {
  return (
    paymentData.amount > 0 &&
    paymentData.transaction_number &&
    paymentData.transaction_date &&
    paymentData.payment_method &&
    paymentData.transaction_status === 'approved'
  );
};
```

### Validación Nivel 2: Monto (CRÍTICO)
```javascript
const isMontoValido = (paymentData, expectedAmount) => {
  const difference = Math.abs(paymentData.amount - expectedAmount);
  const tolerance = 0.50; // $0.50 USD
  
  return difference <= tolerance;
};
```

### Validación Nivel 3: Cuenta Destino (SEGURIDAD)
```javascript
const isCuentaCorrecta = (paymentData) => {
  const CUENTA_COWORKIA = '20059783069';
  
  if (!paymentData.account_number_destination) {
    return null; // Desconocido (no rechazar)
  }
  
  // Limpiar formato
  const cleaned = paymentData.account_number_destination.replace(/[-\s]/g, '');
  
  return cleaned === CUENTA_COWORKIA;
};
```

### Validación Nivel 4: Fecha (TEMPORAL)
```javascript
const isFechaValida = (paymentData) => {
  const paymentDate = new Date(paymentData.transaction_date);
  const now = new Date();
  const daysDiff = (now - paymentDate) / (1000 * 60 * 60 * 24);
  
  return {
    valid: daysDiff >= 0 && daysDiff <= 30, // Últimos 30 días
    warning: daysDiff > 7, // Alerta si > 7 días
    daysDiff
  };
};
```

### Validación Nivel 5: Duplicados (ANTI-FRAUDE)
```javascript
const isDuplicado = async (transaction_number) => {
  // Buscar en BD si ya existe ese transaction_number
  const existing = await db.findPaymentByTransactionNumber(transaction_number);
  
  return !!existing;
};
```

### Validación Nivel 6: Confianza VisionAI
```javascript
const shouldAutoApprove = (confidence_score) => {
  if (confidence_score >= 90) return 'auto'; // Aprobar automáticamente
  if (confidence_score >= 70) return 'notify'; // Aprobar pero notificar staff
  return 'manual'; // Requiere revisión manual
};
```

---

## 🗃️ ESTRUCTURA DE BASE DE DATOS

### Tabla: `membership_payments`

```sql
CREATE TABLE IF NOT EXISTS membership_payments (
  id TEXT PRIMARY KEY,
  
  -- Relación con lead
  membership_lead_id TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  
  -- PARÁMETROS CRÍTICOS
  amount DECIMAL(10,2) NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_time TIME,
  transaction_number TEXT NOT NULL UNIQUE, -- Evitar duplicados
  payment_method TEXT NOT NULL,
  
  -- PARÁMETROS IMPORTANTES
  bank_sender TEXT,
  bank_receiver TEXT,
  account_number_destination TEXT,
  account_number_source TEXT,
  account_holder_source TEXT,
  authorization_number TEXT,
  receipt_number TEXT,
  
  -- PARÁMETROS ADICIONALES
  currency TEXT DEFAULT 'USD',
  transaction_description TEXT,
  transaction_status TEXT DEFAULT 'approved',
  payment_channel TEXT,
  card_type TEXT,
  card_last_four TEXT,
  transaction_fee DECIMAL(10,2) DEFAULT 0,
  
  -- METADATA DE ANÁLISIS
  confidence_score INTEGER,
  image_url TEXT, -- URL temporal del comprobante
  raw_vision_data JSONB, -- Respuesta completa de VisionAI
  validation_warnings JSONB, -- Alertas generadas
  
  -- ESTADO DE PROCESAMIENTO
  status TEXT DEFAULT 'verified' CHECK (status IN ('pending', 'verified', 'rejected', 'flagged', 'manual_review')),
  verification_method TEXT DEFAULT 'vision_ai', -- vision_ai | manual | auto
  verified_by TEXT, -- ID del staff que verificó manualmente
  verified_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- AUDITORÍA
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  
  -- FOREIGN KEYS
  FOREIGN KEY (membership_lead_id) REFERENCES membership_leads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
);

-- Índices para performance y seguridad
CREATE INDEX IF NOT EXISTS idx_membership_payments_lead ON membership_payments(membership_lead_id);
CREATE INDEX IF NOT EXISTS idx_membership_payments_user ON membership_payments(user_phone);
CREATE INDEX IF NOT EXISTS idx_membership_payments_transaction ON membership_payments(transaction_number);
CREATE INDEX IF NOT EXISTS idx_membership_payments_date ON membership_payments(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_membership_payments_status ON membership_payments(status);
CREATE INDEX IF NOT EXISTS idx_membership_payments_confidence ON membership_payments(confidence_score);
```

### Tabla: `reservation_payments` (similar para Aurora)

```sql
CREATE TABLE IF NOT EXISTS reservation_payments (
  id TEXT PRIMARY KEY,
  
  -- Relación con reserva
  reservation_id TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  
  -- Mismos campos que membership_payments
  amount DECIMAL(10,2) NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_time TIME,
  transaction_number TEXT NOT NULL UNIQUE,
  payment_method TEXT NOT NULL,
  
  -- ... resto de campos idénticos ...
  
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
);
```

---

## 📝 EJEMPLO DE EXTRACCIÓN COMPLETA

### Comprobante Payphone Recibido:
```
┌─────────────────────────┐
│       payphone          │
│                         │
│      Aprobada ✓         │ <- Verde
│                         │
│      USD 12.08          │
│                         │
│   PAGO APROBADO         │
│ Coworkia hoy desk       │
│                         │
│ Detalle de transacción  │
│ ────────────────────    │
│ Fecha: 18/11/2025 14:12 │
│ No. Transacción: 70613140│
│ No. Autorización: W70613140│
│ Persona: DIEGO VILLOTA  │
│                         │
│ [Logos de seguridad]    │
│ Powered by payphone     │
└─────────────────────────┘
```

### JSON Extraído por VisionAI:
```json
{
  "transactionNumber": "70613140",
  "amount": 12.08,
  "currency": "USD",
  "date": "2025-11-18",
  "time": "14:12",
  "bank": "Payphone",
  "paymentMethod": "payphone",
  "recipient": "Coworkia",
  "receiptNumber": "W70613140",
  "accountHolderSource": "DIEGO VILLOTA",
  "transactionStatus": "approved",
  "transactionDescription": "Coworkia hoy desk",
  "isValid": true,
  "confidence": 95
}
```

### Registro en BD:
```sql
INSERT INTO membership_payments VALUES (
  'PAY-2026-001', -- id
  'LEAD-2026-123', -- membership_lead_id
  '+593999828633', -- user_phone
  12.08, -- amount
  '2025-11-18', -- transaction_date
  '14:12:00', -- transaction_time
  '70613140', -- transaction_number
  'payphone', -- payment_method
  'Payphone', -- bank_sender
  NULL, -- bank_receiver
  NULL, -- account_number_destination
  NULL, -- account_number_source
  'DIEGO VILLOTA', -- account_holder_source
  'W70613140', -- authorization_number
  NULL, -- receipt_number
  'USD', -- currency
  'Coworkia hoy desk', -- transaction_description
  'approved', -- transaction_status
  'mobile_app', -- payment_channel
  NULL, -- card_type
  NULL, -- card_last_four
  0, -- transaction_fee
  95, -- confidence_score
  'https://wassenger.com/media/123.jpg', -- image_url
  '{"raw": "..."}', -- raw_vision_data
  NULL, -- validation_warnings
  'verified', -- status
  'vision_ai', -- verification_method
  NULL, -- verified_by
  NOW(), -- verified_at
  NULL, -- rejection_reason
  NOW(), -- created_at
  NOW(), -- updated_at
  NOW() -- processed_at
);
```

---

## 🎯 RESUMEN DE IMPLEMENTACIÓN

### Archivos a Modificar:

1. **`src/database/postgres-adapter.js`**
   - Agregar tabla `membership_payments`
   - Agregar tabla `reservation_payments`

2. **`src/servicios-ia/openai.js`**
   - Actualizar `analyzePaymentReceipt()` con todos los parámetros

3. **`src/servicios/membership-payment-verification.js`** (NUEVO)
   - Crear función `processMembershipPayment()`
   - Implementar todas las validaciones

4. **`src/express-servidor/endpoints-api/wassenger.js`**
   - Agregar detección de comprobantes para ALUNA
   - Integrar con `processMembershipPayment()`

### Prioridad de Implementación:

1. **FASE 1** (Crítico - 3 horas):
   - Tabla `membership_payments`
   - Extracción de 5 parámetros críticos
   - Validación básica (monto + fecha + número)

2. **FASE 2** (Importante - 2 horas):
   - Agregar 10 parámetros recomendados
   - Validación de cuenta destino
   - Anti-duplicados

3. **FASE 3** (Opcional - 2 horas):
   - Parámetros adicionales (card_type, channel, etc.)
   - Dashboard de pagos
   - Reportes contables

---

## ✅ CHECKLIST DE VALIDACIÓN

Antes de aprobar un pago automáticamente:

- [ ] **Monto** coincide con esperado (±$0.50)
- [ ] **Fecha** es válida (últimos 30 días)
- [ ] **Número de transacción** no es duplicado
- [ ] **Estado** es "approved/aprobada"
- [ ] **Cuenta destino** es 20059783069 (si está presente)
- [ ] **Confianza VisionAI** >= 70%
- [ ] **Moneda** es USD

Si **TODOS** los checks pasan → ✅ **APROBAR AUTOMÁTICAMENTE**

Si **ALGUNO** falla → ⚠️ **ENVIAR A REVISIÓN MANUAL**

---

**Documento creado por:** GitHub Copilot  
**Versión:** 1.0  
**Última actualización:** 19 de enero de 2026
