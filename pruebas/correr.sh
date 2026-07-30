#!/usr/bin/env bash
# Corre TODAS las pruebas del proyecto: el motor de ventas (simulador de Apps
# Script) y la app web (navegador real con Playwright).
#
#   bash pruebas/correr.sh            # todo
#   bash pruebas/correr.sh motor      # solo el motor
#   bash pruebas/correr.sh navegador  # solo la web
#
# Requisitos: node y playwright. En este entorno el navegador está en
# /opt/pw-browsers/chromium (las suites ya lo apuntan).

set -uo pipefail
cd "$(dirname "$0")/.."

QUE="${1:-todo}"
FALLAS=0

if [ "$QUE" = "todo" ] || [ "$QUE" = "motor" ]; then
  echo "═══ MOTOR DE VENTAS (simulador de Google Apps Script) ═══"
  for t in pruebas/motor/test_*.js; do
    salida=$(timeout 120 node "$t" 2>&1)
    linea=$(echo "$salida" | grep -Ei "^ *TOTAL|^Total:" | tail -1)
    n=$(echo "$linea" | grep -oE "[0-9]+ pruebas" | grep -oE "[0-9]+")
    f=$(echo "$linea" | grep -oE "[0-9]+ (fallas|fallo|fallos|fallidas|fallo\(s\))" | grep -oE "[0-9]+")
    f=${f:-0}; n=${n:-?}
    printf "  %-42s %3s pruebas, %s fallas\n" "$(basename "$t")" "$n" "$f"
    if [ "$f" != "0" ]; then
      FALLAS=$((FALLAS + f))
      echo "$salida" | grep -B1 -A1 '"paso": false' | head -20
    fi
  done
fi

if [ "$QUE" = "todo" ] || [ "$QUE" = "navegador" ]; then
  echo "═══ APP WEB (Chromium real) ═══"
  for t in pruebas/navegador/*.mjs; do
    salida=$(timeout 180 node "$t" 2>&1)
    resumen=$(echo "$salida" | grep -E "^[0-9]+/[0-9]+ OK" | tail -1)
    malos=$(echo "$salida" | grep -c "^❌" || true)
    if [ -z "$resumen" ]; then
      # Sin línea de resumen la suite no llegó al final (se cayó): eso es una falla,
      # no un silencio benigno. Contarlo evita el "todo verde" que no probó nada.
      printf "  %-42s ❌ NO TERMINÓ\n" "$(basename "$t")"
      FALLAS=$((FALLAS + 1))
      echo "$salida" | tail -6 | sed 's/^/      /'
    else
      printf "  %-42s %s\n" "$(basename "$t")" "$resumen"
      if [ "${malos:-0}" != "0" ]; then
        FALLAS=$((FALLAS + malos))
        echo "$salida" | grep "^❌"
      fi
    fi
  done
fi

echo "──────────────────────────────────────────────"
if [ "$FALLAS" = "0" ]; then
  echo "✅ TODO VERDE"
else
  echo "❌ $FALLAS falla(s)"
fi
exit $([ "$FALLAS" = "0" ] && echo 0 || echo 1)
