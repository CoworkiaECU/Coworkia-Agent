// Script temporal — enviar recibo reserva María Gracia manualmente
// Ejecutar: heroku run node scripts/send-mg-reservation-receipt.mjs --app coworkia-agent
import { sendReservationReceiptByGabi } from '../src/servicios/payment-receipt-email.js';

const result = await sendReservationReceiptByGabi({
  clientName: 'María Gracia Valdivieso Torres',
  clientEmail: 'mgvaldivieso@icloud.com',
  serviceType: 'Hot Desk',
  reservationDate: 'Lunes 11 – Jueves 14 de mayo 2026',
  startTime: '08:00',
  endTime: '18:00',
  totalAmount: 30.00,
  paymentMethod: 'Transferencia a otras instituciones',
  bankName: 'Banco Guayaquil → Produbanco',
  transactionReference: '0000986388',
  authorizationCode: 'BG-0000986388',
  reservationId: '0d43aed4-7af5-418a-8b6e-86fb05785a1d'
});

console.log('RESULTADO FINAL:', JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);
