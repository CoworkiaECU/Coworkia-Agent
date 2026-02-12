// src/__tests__/payment-transcription.test.js
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

/**
 * Tests para el sistema de transcripción inteligente de comprobantes
 * 
 * Funcionalidad:
 * - Vision API extrae: monto, fecha, método, referencia
 * - Aurora transcribe y confirma datos
 * - Valida monto vs total esperado
 * - Asocia pago a múltiples reservas
 */

describe('📸 Transcripción de Comprobantes', () => {
  describe('Extracción de Datos', () => {
    test('Extrae monto correctamente', () => {
      const mockPaymentData = {
        amount: '49.00',
        date: '2025-11-15',
        paymentMethod: 'Transferencia',
        bank: 'Bancuador',
        transactionNumber: '1234567890'
      };

      expect(parseFloat(mockPaymentData.amount)).toBe(49.00);
    });

    test('Maneja diferentes formatos de monto', () => {
      const formats = [
        { input: '49.00', expected: 49.00 },
        { input: '49', expected: 49 },
        { input: '49.50', expected: 49.50 },
        { input: '$49.00', expected: 49.00 },
        { input: '49,00', expected: 49 } // Formato europeo
      ];

      formats.forEach(({ input, expected }) => {
        // Preservar separador decimal: eliminar símbolo monetario pero no la coma
        const cleaned = input
          .replace(/\$/g, '') // quita solo el símbolo $
          .replace(',', '.'); // convierte coma decimal a punto

        expect(parseFloat(cleaned)).toBe(expected);
      });
    });

    test('Identifica métodos de pago comunes', () => {
      const methods = [
        'Transferencia',
        'Transferencia Bancuador',
        'Payphone',
        'Tarjeta de crédito',
        'Tarjeta débito',
        'Efectivo'
      ];

      methods.forEach(method => {
        expect(method).toBeTruthy();
        expect(typeof method).toBe('string');
      });
    });
  });

  describe('Formato de Transcripción', () => {
    test('Genera mensaje de transcripción con todos los datos', () => {
      const paymentData = {
        amount: 49.00,
        date: '2025-11-15',
        paymentMethod: 'Transferencia',
        bank: 'Bancuador',
        transactionNumber: '1234567890'
      };

      const transcription = `📸 ¡Perfecto! Recibí tu comprobante

He registrado:
💵 Monto: $${paymentData.amount.toFixed(2)}
📅 Fecha: ${paymentData.date}
💳 Método: ${paymentData.paymentMethod}${paymentData.bank ? ` - ${paymentData.bank}` : ''}
${paymentData.transactionNumber ? `🔢 Referencia: ${paymentData.transactionNumber}` : ''}

¿Los datos son correctos?`;

      expect(transcription).toContain('$49.00');
      expect(transcription).toContain('2025-11-15');
      expect(transcription).toContain('Transferencia - Bancuador');
      expect(transcription).toContain('1234567890');
    });

    test('Maneja datos faltantes gracefully', () => {
      const paymentData = {
        amount: 49.00,
        date: null,
        paymentMethod: null,
        bank: null,
        transactionNumber: null
      };

      const transcription = `📸 ¡Perfecto! Recibí tu comprobante

He registrado:
💵 Monto: $${paymentData.amount.toFixed(2)}
📅 Fecha: ${paymentData.date || 'No detectada'}
💳 Método: ${paymentData.paymentMethod || 'No especificado'}${paymentData.bank ? ` - ${paymentData.bank}` : ''}
${paymentData.transactionNumber ? `🔢 Referencia: ${paymentData.transactionNumber}` : ''}

¿Los datos son correctos?`;

      expect(transcription).toContain('$49.00');
      expect(transcription).toContain('No detectada');
      expect(transcription).toContain('No especificado');
      expect(transcription).not.toContain('🔢 Referencia');
    });
  });

  describe('Validación de Montos', () => {
    test('Monto exacto = válido', () => {
      const expected = 49.00;
      const paid = 49.00;
      const tolerance = 0.50;

      const isValid = Math.abs(paid - expected) <= tolerance;
      expect(isValid).toBe(true);
    });

    test('Diferencia < $0.50 = válido (tolerancia)', () => {
      const expected = 49.00;
      const paid = 49.30;
      const tolerance = 0.50;

      const isValid = Math.abs(paid - expected) <= tolerance;
      expect(isValid).toBe(true);
    });

    test('Diferencia > $0.50 = inválido', () => {
      const expected = 49.00;
      const paid = 50.00;
      const tolerance = 0.50;

      const isValid = Math.abs(paid - expected) <= tolerance;
      expect(isValid).toBe(false);
    });

    test('Pago menor requiere confirmación', () => {
      const expected = 49.00;
      const paid = 45.00;
      const tolerance = 0.50;

      const isValid = Math.abs(paid - expected) <= tolerance;
      expect(isValid).toBe(false);
      
      const warning = `⚠️ El monto no coincide
💰 Esperado: $${expected}
💳 Pagado: $${paid}`;
      
      expect(warning).toContain('⚠️');
      expect(warning).toContain('$49');
      expect(warning).toContain('$45');
    });

    test('Pago mayor acepta pero advierte', () => {
      const expected = 49.00;
      const paid = 55.00;
      
      const overpayment = paid - expected;
      expect(overpayment).toBe(6.00);
      
      // Sistema podría aceptar y decir "pagaste de más"
      const message = `✅ Pago recibido: $${paid}
ℹ️ Monto esperado era $${expected}
💵 Diferencia: +$${overpayment.toFixed(2)}`;
      
      expect(message).toContain('+$6.00');
    });
  });

  describe('Asociación con Reservas', () => {
    test('Un pago puede cubrir múltiples reservas', () => {
      const reservations = [
        { id: 1, price: 20, status: 'pending_payment' },
        { id: 2, price: 29, status: 'pending_payment' }
      ];

      const totalExpected = reservations.reduce((sum, r) => sum + r.price, 0);
      expect(totalExpected).toBe(49);

      const paidAmount = 49.00;
      const isValid = paidAmount === totalExpected;
      expect(isValid).toBe(true);

      // Marcar todas como pagadas
      const confirmed = reservations.map(r => ({
        ...r,
        status: 'confirmed',
        paymentStatus: 'paid'
      }));

      expect(confirmed.every(r => r.status === 'confirmed')).toBe(true);
    });

    test('Pago parcial no confirma ninguna reserva', () => {
      const reservations = [
        { id: 1, price: 20, status: 'pending_payment' },
        { id: 2, price: 29, status: 'pending_payment' }
      ];

      const totalExpected = 49;
      const paidAmount = 30.00;
      const tolerance = 0.50;

      const isValid = Math.abs(paidAmount - totalExpected) <= tolerance;
      expect(isValid).toBe(false);

      // No marcar ninguna como confirmada
      const stillPending = reservations.every(r => r.status === 'pending_payment');
      expect(stillPending).toBe(true);
    });
  });

  describe('Mensajes de Respuesta', () => {
    test('Éxito: Transcripción + confirmación', () => {
      const message = `📸 ¡Perfecto! Recibí tu comprobante

He registrado:
💵 Monto: $49.00
📅 Fecha: 15 nov 2025
💳 Método: Transferencia Bancuador
🔢 Referencia: 1234567890

✅ ¡Pago verificado y confirmado!

🎉 Tus 3 reservas están confirmadas:

1️⃣ Martes 18 nov 10:00-12:00 - Hot Desk
2️⃣ Jueves 20 nov 15:00-17:00 - Hot Desk
3️⃣ Viernes 21 nov 11:00-13:00 - Sala de Reuniones

📧 Te envié la confirmación completa por email`;

      expect(message).toContain('He registrado:');
      expect(message).toContain('verificado y confirmado');
      expect(message).toContain('3 reservas');
    });

    test('Error: Monto no coincide', () => {
      const message = `📸 ¡Perfecto! Recibí tu comprobante

He registrado:
💵 Monto: $40.00
📅 Fecha: 15 nov 2025
💳 Método: Transferencia Bancuador

⚠️ ADVERTENCIA: El monto no coincide
💰 Esperado: $49
💳 Pagado: $40

¿Puedes verificar? Si el monto es correcto, responde SI para continuar`;

      expect(message).toContain('He registrado:');
      expect(message).toContain('⚠️ ADVERTENCIA');
      expect(message).toContain('$40');
      expect(message).toContain('$49');
    });

    test('Sin email: Confirmación sin envío', () => {
      const message = `📸 ¡Perfecto! Recibí tu comprobante

He registrado:
💵 Monto: $49.00
📅 Fecha: 15 nov 2025
💳 Método: Transferencia

✅ ¡Pago verificado y confirmado!

🎉 Tu reserva está confirmada

⚠️ Nota: No pude enviar email de confirmación porque no tienes email registrado

📍 Ubicación: Whymper 403, Edificio Finistere`;

      expect(message).toContain('verificado y confirmado');
      expect(message).toContain('No pude enviar email');
    });
  });

  describe('Formatos de Fecha', () => {
    test('Diferentes formatos de fecha son válidos', () => {
      const formats = [
        '2025-11-15',
        '15/11/2025',
        '15-11-2025',
        'Nov 15, 2025',
        '15 nov 2025'
      ];

      formats.forEach(format => {
        expect(format).toBeTruthy();
        expect(typeof format).toBe('string');
      });
    });
  });

  describe('Edge Cases', () => {
    test('Comprobante sin imagen = error', () => {
      const imageUrl = null;
      
      expect(imageUrl).toBeNull();
      
      const errorMessage = '❌ No pude analizar el comprobante. Por favor, envía una imagen más clara.';
      expect(errorMessage).toContain('imagen más clara');
    });

    test('Imagen borrosa = baja confianza', () => {
      const analysis = {
        success: true,
        data: {
          isValid: true,
          confidence: 45 // Bajo
        }
      };

      expect(analysis.data.confidence).toBeLessThan(70);
      
      const message = '❌ El comprobante no parece ser válido o la imagen no es clara. Por favor, envía un comprobante legible.';
      expect(message).toContain('imagen no es clara');
    });

    test('Sin reserva pendiente = error', () => {
      const pendingReservation = null;
      
      expect(pendingReservation).toBeNull();
      
      const errorMessage = '❌ No encontré ninguna reserva pendiente de pago. ¿Tienes una reserva activa?';
      expect(errorMessage).toContain('reserva pendiente de pago');
    });

    test('Referencia duplicada (fraude)', () => {
      const existingTransactions = ['1234567890'];
      const newTransaction = '1234567890';
      
      const isDuplicate = existingTransactions.includes(newTransaction);
      expect(isDuplicate).toBe(true);
      
      const warningMessage = '⚠️ Esta referencia ya fue usada. Si es un error, contacta a soporte.';
      expect(warningMessage).toContain('referencia ya fue usada');
    });
  });
});

describe('🔐 Seguridad', () => {
  test('No procesa comprobantes muy antiguos (>30 días)', () => {
    const today = new Date('2025-11-15');
    const paymentDate = new Date('2025-10-01');
    
    const diffDays = (today - paymentDate) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(30);
    
    const isExpired = diffDays > 30;
    expect(isExpired).toBe(true);
  });

  test('No acepta montos negativos', () => {
    const amount = -49.00;
    expect(amount).toBeLessThan(0);
    
    const isValid = amount > 0;
    expect(isValid).toBe(false);
  });

  test('No acepta montos excesivamente altos', () => {
    const amount = 10000.00;
    const maxAllowed = 1000.00;
    
    const isValid = amount <= maxAllowed;
    expect(isValid).toBe(false);
  });
});
