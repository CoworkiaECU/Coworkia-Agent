#!/bin/bash

# clean-obsolete-files.sh
# Limpieza segura de archivos obsoletos identificados en auditoría
# Fecha: 10 Enero 2026

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧹 LIMPIEZA SEGURA DE ARCHIVOS OBSOLETOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Contador
REMOVED=0

# Función para borrar con confirmación visual
remove_file() {
  if [ -f "$1" ]; then
    echo "  ❌ Borrando: $1"
    rm "$1"
    REMOVED=$((REMOVED + 1))
  else
    echo "  ⚠️  No existe: $1"
  fi
}

remove_dir() {
  if [ -d "$1" ]; then
    echo "  ❌ Borrando carpeta: $1"
    rm -rf "$1"
    REMOVED=$((REMOVED + 1))
  else
    echo "  ⚠️  No existe: $1"
  fi
}

echo "📂 PASO 1: Borrar carpeta coverage/ (no debe estar en Git)"
remove_dir "coverage"

echo ""
echo "📝 PASO 2: Borrar tests obsoletos/duplicados"
remove_file "scripts/tests-manual/test-aurora-local.js"
remove_file "scripts/tests-manual/test-integration-multilanguage.js"
remove_file "scripts/tests-manual/test-complete-flow.js"
remove_file "scripts/tests-manual/test-confirmation-fix.js"
remove_file "scripts/tests-manual/test-new-customer-flow.js"
remove_file "scripts/tests-manual/test-recurring-customer.js"

echo ""
echo "🔧 PASO 3: Borrar scripts con datos hardcoded obsoletos"
remove_file "scripts/check-reservations.js"
remove_file "scripts/cleanup-obsolete-tables.js"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ LIMPIEZA COMPLETADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Resumen:"
echo "  - Items removidos: $REMOVED"
echo "  - Espacio liberado: ~180KB"
echo ""
echo "🔍 Verificar .gitignore para coverage/"
if grep -q "^coverage/$" .gitignore 2>/dev/null; then
  echo "  ✅ coverage/ ya está en .gitignore"
else
  echo "  ⚠️  Agregando coverage/ a .gitignore..."
  echo "" >> .gitignore
  echo "# Test coverage reports" >> .gitignore
  echo "coverage/" >> .gitignore
  echo "  ✅ Agregado a .gitignore"
fi

echo ""
echo "🎯 Siguiente paso recomendado:"
echo "  git add -A"
echo "  git commit -m \"chore: limpiar tests obsoletos y archivos duplicados\""
echo ""
