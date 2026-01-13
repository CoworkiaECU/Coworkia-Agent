#!/usr/bin/env node

/**
 * 🧪 Script de pruebas manuales para validaciones de reservas
 * Prueba diferentes escenarios de reserva
 */

import {
  validateReservation,
  suggestAlternativeSlots,
  formatValidationErrors,
  CONFIG
} from '../src/servicios/reservation-validation.js';

console.log('🧪 PRUEBAS DE VALIDACIÓN DE RESERVAS\n');
console.log('📋 Configuración:');
console.log(`   - Duración: ${CONFIG.minDurationHours}h - ${CONFIG.maxDurationHours}h`);
console.log(`   - Horario laboral lunes-viernes: ${CONFIG.weekdayStart} - ${CONFIG.weekdayEnd}`);
console.log(`   - Horario laboral fin de semana: ${CONFIG.weekendStart} - ${CONFIG.weekendEnd}`);
console.log(`   - Almuerzo: ${CONFIG.lunchBreakStart} - ${CONFIG.lunchBreakEnd}\n`);

// Test 1: Duración muy corta
console.log('═══════════════════════════════════════');
console.log('TEST 1: Duración muy corta (30 min)');
console.log('═══════════════════════════════════════');
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const date = tomorrow.toISOString().split('T')[0];

let validation = validateReservation(date, '10:00', '10:30', 0.5);
console.log('Resultado:', validation.valid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
if (!validation.valid) {
  console.log('\n' + formatValidationErrors(validation));
}
console.log('\n');

// Test 2: Duración muy larga
console.log('═══════════════════════════════════════');
console.log('TEST 2: Duración muy larga (9 horas)');
console.log('═══════════════════════════════════════');
validation = validateReservation(date, '09:00', '18:00', 9);
console.log('Resultado:', validation.valid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
if (!validation.valid) {
  console.log('\n' + formatValidationErrors(validation));
}
console.log('\n');

// Test 3: Horario temprano pero válido
console.log('═══════════════════════════════════════');
console.log('TEST 3: Horario válido temprano (7:00 AM)');
console.log('═══════════════════════════════════════');
validation = validateReservation(date, '07:00', '09:00', 2);
console.log('Resultado:', validation.valid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
if (!validation.valid) {
  console.log('\n' + formatValidationErrors(validation));
}
console.log('\n');

// Test 4: Fuera de horario laboral (muy tarde)
console.log('═══════════════════════════════════════');
console.log('TEST 4: Fuera de horario (8:00 PM - 10:00 PM)');
console.log('═══════════════════════════════════════');
validation = validateReservation(date, '20:00', '22:00', 2);
console.log('Resultado:', validation.valid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
if (!validation.valid) {
  console.log('\n' + formatValidationErrors(validation));
}
console.log('\n');

// Test 5: Reserva con muy poca anticipación (ayer)
console.log('═══════════════════════════════════════');
console.log('TEST 5: Muy poca anticipación (ayer)');
console.log('═══════════════════════════════════════');
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayDate = yesterday.toISOString().split('T')[0];
validation = validateReservation(yesterdayDate, '10:00', '12:00', 2);
console.log('Resultado:', validation.valid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
if (!validation.valid) {
  console.log('\n' + formatValidationErrors(validation));
}
console.log('\n');

// Test 6: Reserva demasiado adelante (40 días)
console.log('═══════════════════════════════════════');
console.log('TEST 6: Demasiado adelante (40 días)');
console.log('═══════════════════════════════════════');
const farFuture = new Date();
farFuture.setDate(farFuture.getDate() + 40);
const farDate = farFuture.toISOString().split('T')[0];
validation = validateReservation(farDate, '10:00', '12:00', 2);
console.log('Resultado:', validation.valid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
if (!validation.valid) {
  console.log('\n' + formatValidationErrors(validation));
}
console.log('\n');

// Test 7: Overlap con almuerzo
console.log('═══════════════════════════════════════');
console.log('TEST 7: Overlap con horario de almuerzo');
console.log('═══════════════════════════════════════');
validation = validateReservation(date, '12:00', '14:00', 2);
console.log('Resultado:', validation.valid ? '✅ VÁLIDO (con advertencia)' : '❌ INVÁLIDO');
if (validation.hasWarnings) {
  console.log('\n' + formatValidationErrors(validation));
}
console.log('\n');

// Test 8: Reserva válida
console.log('═══════════════════════════════════════');
console.log('TEST 8: Reserva VÁLIDA (mañana 10:00-12:00)');
console.log('═══════════════════════════════════════');
validation = validateReservation(date, '10:00', '12:00', 2);
console.log('Resultado:', validation.valid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
console.log('\n');

// Test 9: Sugerencias de horarios alternativos
console.log('═══════════════════════════════════════');
console.log('TEST 9: Sugerencias de horarios alternativos');
console.log('═══════════════════════════════════════');
const alternatives = suggestAlternativeSlots(date, '10:00', 2, [
  { date, startTime: '10:00', endTime: '12:00', status: 'confirmed' },
  { date, startTime: '14:00', endTime: '16:00', status: 'confirmed' }
]);
console.log(`Encontradas ${alternatives.length} alternativas:`);
alternatives.forEach((alt, idx) => {
  const icon = alt.recommended ? '⭐' : '  ';
  console.log(`${icon} ${idx + 1}. ${alt.startTime} - ${alt.endTime} (${alt.durationHours}h)`);
});
console.log('\n');

// Test 10: Fin de semana (horario diferente)
console.log('═══════════════════════════════════════');
console.log('TEST 10: Fin de semana (horario 8:00-18:00)');
console.log('═══════════════════════════════════════');
const nextSaturday = new Date();
nextSaturday.setDate(nextSaturday.getDate() + ((6 - nextSaturday.getDay() + 7) % 7));
const saturdayDate = nextSaturday.toISOString().split('T')[0];
validation = validateReservation(saturdayDate, '08:00', '10:00', 2);
console.log('Fecha:', saturdayDate, '(Sábado)');
console.log('Resultado:', validation.valid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
if (!validation.valid) {
  console.log('\n' + formatValidationErrors(validation));
}
console.log('\n');

// Test 11: Validar que 7 AM es válido entre semana
console.log('═══════════════════════════════════════');
console.log('TEST 11: 7:00 AM entre semana (debe ser VÁLIDO)');
console.log('═══════════════════════════════════════');
validation = validateReservation(date, '07:00', '09:00', 2);
console.log('Resultado:', validation.valid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
if (!validation.valid) {
  console.log('\n' + formatValidationErrors(validation));
}
console.log('\n');

console.log('═══════════════════════════════════════');
console.log('✅ Pruebas completadas');
console.log('═══════════════════════════════════════');
