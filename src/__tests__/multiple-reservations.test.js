// src/__tests__/multiple-reservations.test.js
import { describe, test, expect, beforeEach } from '@jest/globals';
import { generateConsolidatedTicket, calculateReservationPrice } from '../servicios/campaign-prompts.js';

describe('🎫 Sistema de Múltiples Reservas', () => {
  describe('calculateReservationPrice()', () => {
    test('Hot Desk - 1 persona = $10', () => {
      const price = calculateReservationPrice('hotDesk', 1, false);
      expect(price).toBe(10);
    });

    test('Hot Desk - 2 personas = $20', () => {
      const price = calculateReservationPrice('hotDesk', 2, false);
      expect(price).toBe(20);
    });

    test('Hot Desk - 3 personas = $30', () => {
      const price = calculateReservationPrice('hotDesk', 3, false);
      expect(price).toBe(30);
    });

    test('Sala de Reuniones = $29 (fijo, sin importar personas)', () => {
      expect(calculateReservationPrice('meetingRoom', 1, false)).toBe(29);
      expect(calculateReservationPrice('meetingRoom', 2, false)).toBe(29);
      expect(calculateReservationPrice('meetingRoom', 3, false)).toBe(29);
      expect(calculateReservationPrice('meetingRoom', 4, false)).toBe(29);
    });

    test('Primera visita gratis = $0', () => {
      const price = calculateReservationPrice('hotDesk', 1, true);
      expect(price).toBe(0);
    });
  });

  describe('generateConsolidatedTicket()', () => {
    test('Genera ticket para una reserva gratis', () => {
      const reservations = [
        {
          date: '2025-11-18',
          time: '10:00',
          serviceType: 'hotDesk',
          numPeople: 1,
          wasFree: true
        }
      ];

      const ticket = generateConsolidatedTicket(reservations);
      
      expect(ticket).toContain('RESUMEN DE TUS RESERVAS');
      expect(ticket).toContain('2025-11-18 10:00');
      expect(ticket).toContain('Hot Desk');
      expect(ticket).toContain('solo tú');
      expect(ticket).toContain('GRATIS 🎉');
      expect(ticket).toContain('primera visita es totalmente gratis');
    });

    test('Genera ticket con múltiples reservas y calcula total', () => {
      const reservations = [
        {
          date: '2025-11-18',
          time: '10:00',
          serviceType: 'hotDesk',
          numPeople: 1,
          wasFree: true
        },
        {
          date: '2025-11-20',
          time: '15:00',
          serviceType: 'hotDesk',
          numPeople: 2,
          wasFree: false
        },
        {
          date: '2025-11-21',
          time: '11:00',
          serviceType: 'meetingRoom',
          numPeople: 3,
          wasFree: false
        }
      ];

      const ticket = generateConsolidatedTicket(reservations);
      
      // Verificar estructura
      expect(ticket).toContain('1️⃣');
      expect(ticket).toContain('2️⃣');
      expect(ticket).toContain('3️⃣');
      
      // Verificar precios
      expect(ticket).toContain('GRATIS 🎉'); // Primera
      expect(ticket).toContain('$20'); // 2 personas hot desk
      expect(ticket).toContain('$29'); // Sala
      
      // Verificar total
      expect(ticket).toContain('TOTAL A PAGAR: $49');
      
      // Verificar opciones de pago
      expect(ticket).toContain('Transferencia/Payphone: $49.00');
      expect(ticket).toContain('Tarjeta débito/crédito: $51.45'); // +5%
    });

    test('Calcula recargo de 5% para tarjeta correctamente', () => {
      const reservations = [
        {
          date: '2025-11-20',
          time: '10:00',
          serviceType: 'hotDesk',
          numPeople: 1,
          wasFree: false
        }
      ];

      const ticket = generateConsolidatedTicket(reservations);
      
      // $10 + 5% = $10.50
      expect(ticket).toContain('TOTAL A PAGAR: $10');
      expect(ticket).toContain('Tarjeta débito/crédito: $10.50');
    });

    test('Maneja reserva sin datos completos', () => {
      const reservations = [
        {
          date: 'Fecha pendiente',
          serviceType: 'hotDesk',
          numPeople: 1
        }
      ];

      const ticket = generateConsolidatedTicket(reservations);
      
      expect(ticket).toContain('Fecha pendiente');
      expect(ticket).toContain('Hot Desk');
    });

    test('Retorna null para array vacío', () => {
      const ticket = generateConsolidatedTicket([]);
      expect(ticket).toBeNull();
    });

    test('Retorna null para null/undefined', () => {
      expect(generateConsolidatedTicket(null)).toBeNull();
      expect(generateConsolidatedTicket(undefined)).toBeNull();
    });

    test('Formato de personas: 1 = "solo tú", 2+ = "X personas"', () => {
      const reservations1 = [{
        date: '2025-11-18',
        time: '10:00',
        serviceType: 'hotDesk',
        numPeople: 1
      }];
      
      const reservations2 = [{
        date: '2025-11-18',
        time: '10:00',
        serviceType: 'hotDesk',
        numPeople: 2
      }];

      const ticket1 = generateConsolidatedTicket(reservations1);
      const ticket2 = generateConsolidatedTicket(reservations2);
      
      expect(ticket1).toContain('solo tú');
      expect(ticket2).toContain('2 personas');
    });

    test('Identifica correctamente serviceType vs spaceType', () => {
      const reservations = [
        {
          date: '2025-11-18',
          time: '10:00',
          serviceType: 'hotDesk', // Nuevo formato
          numPeople: 1
        },
        {
          date: '2025-11-19',
          time: '11:00',
          spaceType: 'meetingRoom', // Formato antiguo
          numPeople: 3
        }
      ];

      const ticket = generateConsolidatedTicket(reservations);
      
      expect(ticket).toContain('Hot Desk');
      expect(ticket).toContain('Sala de Reuniones');
    });

    test('Suma correcta para 5 reservas mixtas', () => {
      const reservations = [
        { serviceType: 'hotDesk', numPeople: 1, wasFree: true },
        { serviceType: 'hotDesk', numPeople: 2, wasFree: false },
        { serviceType: 'meetingRoom', numPeople: 3, wasFree: false },
        { serviceType: 'hotDesk', numPeople: 1, wasFree: false },
        { serviceType: 'hotDesk', numPeople: 3, wasFree: false }
      ];

      const ticket = generateConsolidatedTicket(reservations);
      
      // GRATIS + $20 + $29 + $10 + $30 = $89
      expect(ticket).toContain('TOTAL A PAGAR: $89');
      
      // $89 * 1.05 = $93.45
      expect(ticket).toContain('Tarjeta débito/crédito: $93.45');
    });
  });

  describe('Casos Edge', () => {
    test('Todas las reservas gratis (solo muestra mensaje especial si es 1)', () => {
      const reservations = [
        { serviceType: 'hotDesk', numPeople: 1, wasFree: true, date: '2025-11-18' }
      ];

      const ticket = generateConsolidatedTicket(reservations);
      expect(ticket).toContain('primera visita es totalmente gratis');
    });

    test('10 reservas - genera 10 líneas', () => {
      const reservations = Array.from({ length: 10 }, (_, i) => ({
        date: `2025-11-${18 + i}`,
        time: '10:00',
        serviceType: 'hotDesk',
        numPeople: 1,
        wasFree: i === 0
      }));

      const ticket = generateConsolidatedTicket(reservations);
      
      // Debería tener 10 emojis numerados
      for (let i = 1; i <= 10; i++) {
        expect(ticket).toContain(`${i}️⃣`);
      }
      
      // Total: 9 * $10 = $90 (primera gratis)
      expect(ticket).toContain('TOTAL A PAGAR: $90');
    });

    test('Precio custom respetado si se proporciona', () => {
      const reservations = [
        {
          date: '2025-11-18',
          time: '10:00',
          serviceType: 'hotDesk',
          numPeople: 1,
          price: 15, // Precio custom
          wasFree: false
        }
      ];

      const ticket = generateConsolidatedTicket(reservations);
      expect(ticket).toContain('TOTAL A PAGAR: $15');
    });
  });
});

describe('🧮 Cálculos de Recargo', () => {
  test('Recargo 5% para montos pequeños', () => {
    const ticket = generateConsolidatedTicket([
      { serviceType: 'hotDesk', numPeople: 1, wasFree: false }
    ]);
    
    // $10 * 1.05 = $10.50
    expect(ticket).toContain('$10.50');
  });

  test('Recargo 5% para montos grandes', () => {
    const reservations = Array.from({ length: 10 }, () => ({
      serviceType: 'meetingRoom',
      numPeople: 3,
      wasFree: false
    }));

    const ticket = generateConsolidatedTicket(reservations);
    
    // $290 * 1.05 = $304.50
    expect(ticket).toContain('TOTAL A PAGAR: $290');
    expect(ticket).toContain('$304.50');
  });

  test('Redondeo correcto a 2 decimales', () => {
    const reservations = [
      { serviceType: 'hotDesk', numPeople: 3, wasFree: false } // $30
    ];

    const ticket = generateConsolidatedTicket(reservations);
    
    // $30 * 1.05 = $31.50 (no $31.500)
    expect(ticket).toContain('$31.50');
    expect(ticket).not.toContain('$31.500');
  });
});
