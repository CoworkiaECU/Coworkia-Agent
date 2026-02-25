import { detectarIntencion } from '../../src/deteccion-intenciones/detectar-intencion.js';
import { procesarMensaje } from '../../src/deteccion-intenciones/orquestador.js';
import { processMessageWithForm } from '../../src/servicios/partial-reservation-form.js';
import databaseService from '../../src/database/database.js';

const msg = '¡Hola Coworkia! quiero probar el servicio ☕️';

await databaseService.initialize();

const profile = {
  userId: 'ad-test-user',
  name: 'Lead Ads',
  freeTrialUsed: false,
  preferredLanguage: 'es',
  activeAgent: 'AURORA'
};

const intent = detectarIntencion(msg, profile.activeAgent);
const orchestrator = await procesarMensaje(msg, profile, []);
const formResult = await processMessageWithForm(profile.userId, msg, profile, null);

console.log(JSON.stringify({
  message: msg,
  intent: {
    reason: intent.reason,
    agent: intent.agent,
    flags: intent.flags
  },
  orchestrator: {
    agenteKey: orchestrator.agenteKey,
    razonSeleccion: orchestrator.razonSeleccion,
    specialMode: orchestrator.metadata?.specialMode
  },
  form: {
    needsMoreInfo: formResult?.needsMoreInfo,
    isComplete: !!formResult?.isComplete,
    hasValidationError: !!formResult?.validationError,
    nextQuestion: formResult?.nextQuestion || null,
    missingFields: formResult?.form?.getMissingFields?.() || []
  }
}, null, 2));
