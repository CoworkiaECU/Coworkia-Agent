#!/usr/bin/env python3
"""One-shot script: insert Adriana vehicle-document block into wassenger.js"""
import sys, os

TARGET = 'src/express-servidor/endpoints-api/wassenger.js'

# The anchor we'll insert BEFORE (using exact Unicode chars from the file)
ANCHOR = (
    '    // \u201cMedia event\u201d para Aurora Core: '
    'si no hay texto pero hay media, damos un texto t\u00e9cnico controlado\n'
    '    let auroraInput = processedText;'
)

BLOCK = r"""
    // 🛡️ ADRIANA VEHICLE DOCUMENTS: Extraer datos vehiculares y cotizar automáticamente
    if (mediaUrl && type === 'image' && profile.activeAgent === 'ADRIANA') {
      console.log('[ADRIANA] 🚗 Imagen recibida — analizando documento vehicular...');
      try {
        const docType = detectDocumentType(processedText || '');
        const vehicleDocTypes = [
          DOCUMENT_TYPES.VEHICLE_REGISTRATION,
          DOCUMENT_TYPES.ID_CARD,
          DOCUMENT_TYPES.CAR_APPRAISAL
        ];

        if (vehicleDocTypes.includes(docType)) {
          await enviarWhatsApp(userId, '📸 Recibí tu documento. Analizando con IA... un momento 🔍');

          const analysis = await analyzeInsuranceDocument(mediaUrl, processedText || '', { documentType: docType });

          if (!analysis.success) {
            await enviarWhatsApp(userId,
              '⚠️ No pude leer el documento automáticamente.\n\nPor favor envíame los datos en texto:\n📋 *Marca, modelo y año*\n💵 *Precio del vehículo*');
            return;
          }

          const extracted = extractVehicleData(analysis.analysis);

          if (extracted.success && extracted.data) {
            const d = extracted.data;
            const year = d.year || d.vehicleYear || null;
            const value = d.commercial_value || d.recommended_sum || d.commercialValue || null;
            const brandModel = [d.brand, d.model].filter(Boolean).join(' ') || 'Vehículo';
            const category = inferVehicleCategory(`${d.brand || ''} ${d.model || ''}`);

            if (year && value) {
              const quotes = calculateAllCoverages({
                commercialValue: parseFloat(value),
                vehicleYear: parseInt(year),
                vehicleCategory: category
              });

              const msgParts = [
                `✅ *Datos extraídos:*`,
                `🚗 ${brandModel} ${year}`,
                `💵 Valor: $${parseFloat(value).toLocaleString()}`,
                ``,
                `🛡️ *Opciones de seguro VAZ:*`,
              ];
              for (const result of Object.values(quotes.options)) {
                if (result.success) {
                  msgParts.push('');
                  msgParts.push(formatPremiumForWhatsApp(result, `${brandModel} ${year}`));
                }
              }
              msgParts.push('');
              msgParts.push('¿Cuál cobertura te interesa? Responde *1* (Básica), *2* (Todo Riesgo), o *3* (Premium) y te envío la propuesta completa por email. 📧');

              const cotizMsg = msgParts.join('\n');
              await enviarWhatsApp(userId, cotizMsg);
              await saveConversationMessage(userId, { role: 'assistant', content: cotizMsg, agent: 'ADRIANA' });
              await saveInsuranceLead({
                userId,
                clientName: profile.name || userId,
                vehicleData: JSON.stringify({ brand: d.brand, model: d.model, year, plate: d.plate }),
                commercialValue: parseFloat(value),
                source: 'vision_ai_document',
                status: 'quote_sent'
              }).catch(() => {});
              await saveInteraction({
                userId, agent: 'ADRIANA', agentName: 'Adriana - SegPopular',
                intentReason: 'vehicle_document_quote',
                input: `[VEHICLE_DOC:${docType}] ${processedText || ''}`,
                output: cotizMsg,
                meta: { envelope, docType, year, value, category }
              });
              return;
            }

            if (!year) {
              await enviarWhatsApp(userId, '📋 Extraje el documento pero necesito el *año del vehículo*.\n\n¿De qué año es? (ej: 2021)');
              return;
            }
            if (!value) {
              await enviarWhatsApp(userId, `📋 Vehículo: *${brandModel} ${year}*\n\n¿Cuál es el *valor comercial*? (ej: $25,000)`);
              return;
            }
          }

          const fallbackMsg = `📋 *Análisis del documento:*\n\n${(analysis.analysis || '').slice(0, 1000)}\n\n¿Quieres cotizar? Envíame *marca, modelo, año y valor* del vehículo.`;
          await enviarWhatsApp(userId, fallbackMsg);
          await saveConversationMessage(userId, { role: 'assistant', content: fallbackMsg, agent: 'ADRIANA' });
          return;

        }
        // Si no es documento vehicular → cae al orquestador
      } catch (err) {
        console.error('[ADRIANA] ❌ Error procesando imagen vehicular:', err);
        await enviarWhatsApp(userId,
          '⚠️ Tuve un problema analizando el documento.\n\nEnvíame los datos en texto:\n📋 *Marca, modelo y año*\n💵 *Valor del vehículo*');
        return;
      }
    }

"""

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

with open(TARGET, 'r', encoding='utf-8') as f:
    content = f.read()

if ANCHOR not in content:
    print('❌ ANCHOR NOT FOUND — aborting')
    sys.exit(1)

if 'ADRIANA VEHICLE DOCUMENTS' in content:
    print('ℹ️  Block already present — nothing to do')
    sys.exit(0)

new_content = content.replace(ANCHOR, BLOCK + ANCHOR, 1)

with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(new_content)

lines_added = new_content.count('\n') - content.count('\n')
print(f'✅ Inserted Adriana block (+{lines_added} lines). Total lines now: {new_content.count(chr(10))}')
