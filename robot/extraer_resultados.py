#!/usr/bin/env python3
"""
Extrae los resultados de verificación del journal de un workflow de agentes
(journal.jsonl) y los deja en un JSON listo para robot/aplicar_verificacion.py.

Uso:  python robot/extraer_resultados.py <ruta/journal.jsonl> <salida.json>
"""
import json
import sys


def main():
    ruta, salida = sys.argv[1], sys.argv[2]
    resultados, vistos = [], set()
    rotas = 0
    with open(ruta, encoding="utf-8") as f:
        for linea in f:
            if not linea.strip():
                continue
            try:
                d = json.loads(linea)
            except json.JSONDecodeError:
                rotas += 1  # línea truncada (p. ej. proceso interrumpido): se salta
                continue
            r = d.get("result")
            if d.get("type") == "result" and isinstance(r, dict) and "existe" in r and "id" in r:
                if r["id"] in vistos:      # reintentos/duplicados: gana el último
                    resultados = [x for x in resultados if x["id"] != r["id"]]
                vistos.add(r["id"])
                resultados.append(r)
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(resultados, f, ensure_ascii=False, indent=1)
    print(f"{len(resultados)} resultados → {salida}" + (f" ({rotas} líneas rotas saltadas)" if rotas else ""))


if __name__ == "__main__":
    main()
