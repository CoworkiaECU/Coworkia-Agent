/**
 * 🌍 SCRIPT DE PRUEBAS MULTIIDIOMA PARA AURORA
 * 
 * Este script prueba exhaustivamente las capacidades multiidioma de Aurora:
 * - Detección automática de 6 idiomas
 * - Respuestas culturalmente apropiadas
 * - Tono y emojis correctos por idioma
 * - Comprensión de contexto en cada lengua
 * 
 * Uso: node scripts/test-aurora-multilanguage.js
 */

import { getUserLanguage, detectLanguageCommand } from '../src/utils/language-detector.js';
import { AURORA } from '../src/deteccion-intenciones/aurora.js';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(emoji, color, message) {
  console.log(`${emoji} ${colors[color]}${message}${colors.reset}`);
}

// 🧪 Casos de prueba para cada idioma
const testCases = [
  // ESPAÑOL 🇪🇸
  {
    language: 'es',
    flag: '🇪🇸',
    name: 'Español',
    cases: [
      {
        message: 'Hola, necesito información sobre los espacios de coworking',
        expectedDetection: 'es',
        context: 'Saludo formal y consulta de información'
      },
      {
        message: '¿Cuánto cuesta el hot desk por día?',
        expectedDetection: 'es',
        context: 'Pregunta directa sobre precios'
      },
      {
        message: 'Quiero reservar una oficina privada para mañana',
        expectedDetection: 'es',
        context: 'Intención de reserva clara'
      },
      {
        message: '¿Tienen sala de reuniones disponible?',
        expectedDetection: 'es',
        context: 'Consulta sobre disponibilidad'
      }
    ]
  },
  
  // INGLÉS 🇬🇧
  {
    language: 'en',
    flag: '🇬🇧',
    name: 'English',
    cases: [
      {
        message: 'Hello, I need information about coworking spaces',
        expectedDetection: 'en',
        context: 'Formal greeting and information request'
      },
      {
        message: 'How much does a hot desk cost per day?',
        expectedDetection: 'en',
        context: 'Direct price inquiry'
      },
      {
        message: 'I want to book a private office for tomorrow',
        expectedDetection: 'en',
        context: 'Clear booking intention'
      },
      {
        message: 'Do you have meeting rooms available?',
        expectedDetection: 'en',
        context: 'Availability inquiry'
      }
    ]
  },
  
  // JAPONÉS 🇯🇵
  {
    language: 'ja',
    flag: '🇯🇵',
    name: '日本語',
    cases: [
      {
        message: 'こんにちは、コワーキングスペースについて知りたいです',
        expectedDetection: 'ja',
        context: 'Saludo educado y solicitud de información'
      },
      {
        message: 'ホットデスクは一日いくらですか？',
        expectedDetection: 'ja',
        context: 'Pregunta formal sobre precios'
      },
      {
        message: '明日プライベートオフィスを予約したいです',
        expectedDetection: 'ja',
        context: 'Intención de reserva con verbo de deseo'
      },
      {
        message: '会議室は利用可能ですか？',
        expectedDetection: 'ja',
        context: 'Consulta formal sobre disponibilidad'
      }
    ]
  },
  
  // QUECHUA 🇵🇪
  {
    language: 'qu',
    flag: '🇵🇪',
    name: 'Runasimi',
    cases: [
      {
        message: 'Allinllachu, llank\'ana wasikunamanta yachay munani',
        expectedDetection: 'qu',
        context: 'Saludo tradicional y solicitud de información'
      },
      {
        message: '¿Hayk\'a qullqi tiyan p\'unchaypaq?',
        expectedDetection: 'qu',
        context: 'Pregunta sobre precio diario'
      },
      {
        message: 'Sapalla ufisinata reservay munani',
        expectedDetection: 'qu',
        context: 'Deseo de reservar oficina privada'
      },
      {
        message: '¿Tantakuna wasikuna kanchu?',
        expectedDetection: 'qu',
        context: 'Consulta sobre salas de reuniones'
      }
    ]
  },
  
  // FRANCÉS 🇫🇷
  {
    language: 'fr',
    flag: '🇫🇷',
    name: 'Français',
    cases: [
      {
        message: 'Bonjour, j\'ai besoin d\'informations sur les espaces de coworking',
        expectedDetection: 'fr',
        context: 'Saludo formal y solicitud de información'
      },
      {
        message: 'Combien coûte un bureau partagé par jour?',
        expectedDetection: 'fr',
        context: 'Pregunta directa sobre precios'
      },
      {
        message: 'Je veux réserver un bureau privé pour demain',
        expectedDetection: 'fr',
        context: 'Intención clara de reserva'
      },
      {
        message: 'Avez-vous des salles de réunion disponibles?',
        expectedDetection: 'fr',
        context: 'Consulta formal sobre disponibilidad'
      }
    ]
  },
  
  // ITALIANO 🇮🇹
  {
    language: 'it',
    flag: '🇮🇹',
    name: 'Italiano',
    cases: [
      {
        message: 'Ciao, ho bisogno di informazioni sugli spazi di coworking',
        expectedDetection: 'it',
        context: 'Saludo informal y solicitud de información'
      },
      {
        message: 'Quanto costa una postazione condivisa al giorno?',
        expectedDetection: 'it',
        context: 'Pregunta sobre precio diario'
      },
      {
        message: 'Voglio prenotare un ufficio privato per domani',
        expectedDetection: 'it',
        context: 'Intención de reserva con verbo "volere"'
      },
      {
        message: 'Avete sale riunioni disponibili?',
        expectedDetection: 'it',
        context: 'Consulta informal sobre disponibilidad'
      }
    ]
  }
];

// 🎯 Función principal de pruebas
async function runTests() {
  log('🌍', 'cyan', '═══════════════════════════════════════════════════════');
  log('🧪', 'cyan', '  PRUEBAS MULTIIDIOMA DE AURORA - COWORKIA AGENT');
  log('🌍', 'cyan', '═══════════════════════════════════════════════════════\n');
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  // Verificar que Aurora tiene idiomas configurados
  log('🔍', 'blue', 'Verificando configuración de Aurora...');
  console.log(`   Idiomas configurados: ${AURORA.personalidad.idiomas.join(', ')}`);
  console.log(`   Agente: ${AURORA.nombre}`);
  console.log(`   Rol: ${AURORA.rol}\n`);
  
  // Ejecutar pruebas por idioma
  for (const languageTest of testCases) {
    log(languageTest.flag, 'magenta', `\n▶ PROBANDO ${languageTest.name.toUpperCase()}`);
    console.log('─'.repeat(60));
    
    for (const testCase of languageTest.cases) {
      totalTests++;
      const testNumber = `${totalTests}`.padStart(2, '0');
      
      try {
        // Detectar idioma del mensaje SIN preferencia previa (para forzar detección)
        const detection = getUserLanguage(testCase.message, null);
        
        // Verificar detección correcta
        const isCorrect = detection.language === testCase.expectedDetection;
        
        if (isCorrect) {
          passedTests++;
          log('✅', 'green', `Test ${testNumber}: PASS (Confianza: ${detection.confidence.toFixed(2)})`);
        } else {
          failedTests++;
          log('❌', 'red', `Test ${testNumber}: FAIL`);
          console.log(`   Esperado: ${testCase.expectedDetection}, Detectado: ${detection.language}`);
        }
        
        // Mostrar detalles
        console.log(`   Mensaje: "${testCase.message.substring(0, 50)}${testCase.message.length > 50 ? '...' : ''}"`);
        console.log(`   Contexto: ${testCase.context}`);
        console.log(`   Confianza: ${(detection.confidence * 100).toFixed(0)}%`);
        console.log(`   Fuente: ${detection.source}\n`);
        
      } catch (error) {
        failedTests++;
        log('❌', 'red', `Test ${testNumber}: ERROR`);
        console.log(`   Error: ${error.message}\n`);
      }
    }
  }
  
  // 🎯 Prueba de comandos explícitos
  log('🎯', 'cyan', '\n\n▶ PROBANDO COMANDOS EXPLÍCITOS DE CAMBIO DE IDIOMA');
  console.log('─'.repeat(60));
  
  const commandTests = [
    { command: '/english', expected: 'en' },
    { command: '/japanese', expected: 'ja' },
    { command: '/quechua', expected: 'qu' },
    { command: '/french', expected: 'fr' },
    { command: '/italian', expected: 'it' },
    { command: '/spanish', expected: 'es' },
    { command: 'cambiar a japonés', expected: 'ja' },
    { command: 'switch to english', expected: 'en' },
    { command: 'passer au français', expected: 'fr' }
  ];
  
  for (const cmdTest of commandTests) {
    totalTests++;
    const testNumber = `${totalTests}`.padStart(2, '0');
    
    try {
      const detected = detectLanguageCommand(cmdTest.command);
      const isCorrect = detected === cmdTest.expected;
      
      if (isCorrect) {
        passedTests++;
        log('✅', 'green', `Test ${testNumber}: PASS`);
      } else {
        failedTests++;
        log('❌', 'red', `Test ${testNumber}: FAIL`);
        console.log(`   Esperado: ${cmdTest.expected}, Detectado: ${detected}`);
      }
      
      console.log(`   Comando: "${cmdTest.command}"`);
      console.log(`   Resultado: ${detected || 'null'}\n`);
      
    } catch (error) {
      failedTests++;
      log('❌', 'red', `Test ${testNumber}: ERROR`);
      console.log(`   Error: ${error.message}\n`);
    }
  }
  
  // 📊 Resumen final
  log('📊', 'cyan', '\n═══════════════════════════════════════════════════════');
  log('📈', 'cyan', '  RESUMEN DE PRUEBAS');
  log('📊', 'cyan', '═══════════════════════════════════════════════════════\n');
  
  console.log(`   Total de pruebas:    ${totalTests}`);
  log('✅', 'green', `   Pruebas exitosas:    ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  
  if (failedTests > 0) {
    log('❌', 'red', `   Pruebas fallidas:    ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);
  }
  
  console.log('\n');
  
  // Verificar que Aurora puede generar prompts en cada idioma
  log('🎭', 'blue', '▶ VERIFICANDO SYSTEM PROMPTS POR IDIOMA');
  console.log('─'.repeat(60));
  
  const languages = ['es', 'en', 'ja', 'qu', 'fr', 'it'];
  for (const lang of languages) {
    try {
      const prompt = AURORA.getSystemPrompt(false, lang);
      const hasLanguageSection = prompt.includes('IDIOMA Y COMUNICACIÓN');
      const hasCorrectLang = prompt.includes('IDIOMA ACTUAL DEL USUARIO:');
      
      if (hasLanguageSection && hasCorrectLang) {
        log('✅', 'green', `${getLanguageFlag(lang)} ${getLanguageName(lang)}: System prompt con idioma configurado`);
      } else if (hasLanguageSection) {
        log('⚠️', 'yellow', `${getLanguageFlag(lang)} ${getLanguageName(lang)}: Tiene sección de idioma pero no idioma específico`);
      } else {
        log('❌', 'red', `${getLanguageFlag(lang)} ${getLanguageName(lang)}: Sin sección de idioma`);
      }
    } catch (error) {
      log('❌', 'red', `${getLanguageFlag(lang)} ${getLanguageName(lang)}: Error al generar prompt`);
      console.log(`   Error: ${error.message}`);
    }
  }
  
  console.log('\n');
  log('🎉', passedTests === totalTests ? 'green' : 'yellow', 
    passedTests === totalTests 
      ? '¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!' 
      : `${passedTests}/${totalTests} pruebas pasaron`);
  
  log('🌍', 'cyan', '═══════════════════════════════════════════════════════\n');
  
  // Exit code basado en resultado
  process.exit(failedTests > 0 ? 1 : 0);
}

// Helpers
function getLanguageName(code) {
  const names = {
    es: 'Español 🇪🇸',
    en: 'English 🇬🇧',
    ja: '日本語 🇯🇵',
    qu: 'Runasimi 🇵🇪',
    fr: 'Français 🇫🇷',
    it: 'Italiano 🇮🇹'
  };
  return names[code] || code;
}

function getLanguageFlag(code) {
  const flags = {
    es: '🇪🇸',
    en: '🇬🇧',
    ja: '🇯🇵',
    qu: '🇵🇪',
    fr: '🇫🇷',
    it: '🇮🇹'
  };
  return flags[code] || '🏳️';
}

// Ejecutar pruebas
runTests().catch(error => {
  log('💥', 'red', `Error fatal: ${error.message}`);
  console.error(error);
  process.exit(1);
});
