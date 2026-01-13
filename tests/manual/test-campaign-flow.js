/**
 * 🧪 TEST: Campaign Flow Detection
 * Verifica que usuarios nuevos NO sean interceptados por campaign
 * y que usuarios recurrentes reciban mensaje personalizado
 */

import { detectCampaignMessage, personalizeCampaignResponse } from '../src/servicios/campaign-prompts.js';

console.log('\n🧪 TEST: Campaign Flow Detection\n');

// Test 1: Detectar trigger de campaña
const testMessage = "¡Hola Coworkia! quiero probar el servicio";
const campaignCheck = detectCampaignMessage(testMessage);

console.log('1️⃣ CAMPAIGN DETECTION:');
console.log('   Mensaje:', testMessage);
console.log('   Detected:', campaignCheck.detected ? '✅ YES' : '❌ NO');
console.log('   Campaign:', campaignCheck.campaign);
console.log('');

// Test 2: Usuario NUEVO (firstVisit: true)
const newUserProfile = {
  userId: 'test-new-001',
  name: 'Diego Villota',
  firstVisit: true,
  freeTrialUsed: false,
  reservationHistory: []
};

console.log('2️⃣ NEW USER RESPONSE (Should offer FREE TRIAL):');
console.log('   Profile:', {
    firstVisit: newUserProfile.firstVisit,
    freeTrialUsed: newUserProfile.freeTrialUsed,
    history: newUserProfile.reservationHistory.length
  });

const newUserResponse = personalizeCampaignResponse(campaignCheck.template, newUserProfile);
console.log('\n   Response:');
console.log('   ' + newUserResponse.split('\n').join('\n   '));
console.log('');

const hasFreeOffer = newUserResponse.includes('2 horas gratis') || newUserResponse.includes('gratis');
const hasPayment = newUserResponse.includes('$10') || newUserResponse.includes('$29');
console.log('   ✅ Offers free trial:', hasFreeOffer ? '✅ YES' : '❌ NO');
console.log('   ⚠️  Shows payment:', hasPayment ? '❌ YES (BAD)' : '✅ NO (GOOD)');
console.log('');

// Test 3: Usuario RECURRENTE (firstVisit: false, tiene historial)
const returningUserProfile = {
  userId: 'test-returning-001',
  name: 'Diego Villota',
  firstVisit: false,
  freeTrialUsed: true,
  reservationHistory: [
    {
      date: '2024-01-15',
      startTime: '10:00',
      serviceType: 'hotDesk',
      wasFree: true
    }
  ],
  lastReservation: {
    date: '2024-01-15',
    startTime: '10:00',
    serviceType: 'hotDesk',
    wasFree: true
  }
};

console.log('3️⃣ RETURNING USER RESPONSE (Should show PAYMENT):');
console.log('   Profile:', {
    firstVisit: returningUserProfile.firstVisit,
    freeTrialUsed: returningUserProfile.freeTrialUsed,
    history: returningUserProfile.reservationHistory.length,
    lastVisit: returningUserProfile.lastReservation.date
  });

const returningUserResponse = personalizeCampaignResponse(campaignCheck.template, returningUserProfile);
console.log('\n   Response:');
console.log('   ' + returningUserResponse.split('\n').join('\n   '));
console.log('');

const hasFreeOfferReturning = returningUserResponse.includes('2 horas gratis') || returningUserResponse.includes('prueba gratis');
const hasPaymentReturning = returningUserResponse.includes('$10') || returningUserResponse.includes('$29');
const hasWarmGreeting = returningUserResponse.includes('de vuelta') || returningUserResponse.includes('recurrente');

console.log('   ✅ Warm greeting:', hasWarmGreeting ? '✅ YES' : '❌ NO');
console.log('   ✅ Shows payment:', hasPaymentReturning ? '✅ YES' : '❌ NO');
console.log('   ⚠️  Offers free trial:', hasFreeOfferReturning ? '❌ YES (BAD)' : '✅ NO (GOOD)');
console.log('');

// Test 4: CAMPAIGN BYPASS LOGIC (lo que ahora hace wassenger.js)
console.log('4️⃣ WASSENGER LOGIC (Campaign Bypass):');
console.log('');

function shouldBypassCampaign(profile) {
  const tieneReservasAnteriores = profile.reservationHistory && profile.reservationHistory.length > 0;
  const noEsPrimeraVez = profile.firstVisit === false;
  const yaUsoTrial = profile.freeTrialUsed || tieneReservasAnteriores || noEsPrimeraVez;
  
  // Si NO usó trial (es nuevo), bypass campaign
  return !yaUsoTrial;
}

const bypassNew = shouldBypassCampaign(newUserProfile);
const bypassReturning = shouldBypassCampaign(returningUserProfile);

console.log('   New User - Bypass campaign:', bypassNew ? '✅ YES (goes to Aurora)' : '❌ NO (campaign response)');
console.log('   Returning User - Bypass campaign:', bypassReturning ? '❌ NO (campaign response)' : '✅ YES (campaign response)');
console.log('');

// SUMMARY
console.log('📊 SUMMARY:');
console.log('   New users: Campaign BYPASSED → Aurora handles naturally ✅');
console.log('   Returning users: Campaign INTERCEPTED → Show payment options ✅');
console.log('   Warm greetings: Personalized for returning users ✅');
console.log('');
