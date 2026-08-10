export function shouldTrackAlunaFollowupReply({ userId, messageText, duplicate = false, fromMe = false, bot = false } = {}) {
  return Boolean(userId && String(messageText || '').trim() && !duplicate && !fromMe && !bot);
}

export async function trackAlunaFollowupReply({
  userId,
  messageText,
  channel = 'whatsapp',
  duplicate = false,
  fromMe = false,
  bot = false,
  markClientResponse,
  logger = console,
} = {}) {
  if (!shouldTrackAlunaFollowupReply({ userId, messageText, duplicate, fromMe, bot })) {
    return { updated: false, reason: 'skipped' };
  }

  if (typeof markClientResponse !== 'function') {
    logger.warn?.('[ALUNA-TRACKING] Helper de respuestas no disponible');
    return { updated: false, reason: 'missing_helper' };
  }

  let result;
  try {
    result = await markClientResponse(userId, channel, messageText);
  } catch (err) {
    logger.warn?.('[ALUNA-TRACKING] Error tracking respuesta:', err.message);
    return { updated: false, reason: 'error', error: err.message };
  }

  if (result?.updated) {
    logger.info?.('[ALUNA-TRACKING] Respuesta de follow-up registrada');
  } else if (result?.reason === 'error') {
    logger.warn?.('[ALUNA-TRACKING] Error tracking respuesta:', result.error);
  } else {
    logger.debug?.('[ALUNA-TRACKING] Sin lead elegible para tracking');
  }

  return result || { updated: false, reason: 'not_eligible' };
}
