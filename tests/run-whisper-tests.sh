#!/bin/bash
# 🎤 Script de testing completo para sistema Whisper
# Ejecuta todos los tests relacionados con audio y transcripción
# Creado: 14 febrero 2026 - v757b

echo "═══════════════════════════════════════════════════════════"
echo "🎤 SUITE COMPLETA DE TESTS: Sistema Whisper"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Contador de tests
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 1: Audio Validator (validación formatos)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "📋 Ejecutando: Audio Validator Tests"
echo "───────────────────────────────────────────────────────────"
npm test -- tests/unit/audio-validator.test.js --silent 2>&1 | tail -10

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "✅ Audio Validator: PASS"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo "❌ Audio Validator: FAIL"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 2: Whisper Transcribe (transcripción multiidioma)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "📋 Ejecutando: Whisper Transcribe Tests"
echo "───────────────────────────────────────────────────────────"
npm test -- tests/unit/whisper-transcribe.test.js --silent 2>&1 | tail -10

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "✅ Whisper Transcribe: PASS"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo "❌ Whisper Transcribe: FAIL"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 3: Whisper Fallbacks (fallbacks multiidioma)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "📋 Ejecutando: Whisper Fallbacks Tests"
echo "───────────────────────────────────────────────────────────"
npm test -- tests/unit/whisper-fallbacks.test.js --silent 2>&1 | tail -10

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "✅ Whisper Fallbacks: PASS"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo "❌ Whisper Fallbacks: FAIL"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 4: Whisper E2E Wassenger (integración completa)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "📋 Ejecutando: Whisper E2E Wassenger Tests"
echo "───────────────────────────────────────────────────────────"
npm test -- tests/integration/whisper-wassenger.test.js --silent 2>&1 | tail -10

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "✅ Whisper E2E Wassenger: PASS"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo "❌ Whisper E2E Wassenger: FAIL"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RESUMEN FINAL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "═══════════════════════════════════════════════════════════"
echo "📊 RESUMEN FINAL: Suite Completa Whisper"
echo "═══════════════════════════════════════════════════════════"
echo "✅ Suites pasadas:  $PASSED_TESTS / $TOTAL_TESTS"
echo "❌ Suites fallidas: $FAILED_TESTS / $TOTAL_TESTS"
echo "═══════════════════════════════════════════════════════════"

if [ $FAILED_TESTS -gt 0 ]; then
  echo "❌ RESULTADO: Algunos tests fallaron"
  exit 1
else
  echo "✅ RESULTADO: Todos los tests pasaron correctamente"
  exit 0
fi
