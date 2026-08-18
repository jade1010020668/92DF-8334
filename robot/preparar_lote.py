#!/usr/bin/env python3
"""
Prepara el siguiente lote de verificación de la BASE MAESTRA.

Selecciona las N empresas sin verificar de mayor valor, en el MISMO orden en
que el motor les va a escribir (prioridad 1 → sectores con discurso propio →
resto), para que la verificación siempre vaya por delante de los envíos.

No necesita archivo de estado: las verificadas/dudosas/descartadas salen de
`ver_estado`, así que el cursor es la propia base — correr esto dos veces
seguidas da lotes distintos solo si entre medias se aplicaron resultados.

Uso:  python robot/preparar_lote.py 250 > lote.json
      python robot/preparar_lote.py 250 --sin-correo   # frente telefónico/mapas
"""
import json
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAESTRA = os.path.join(RAIZ, "datos", "BASE_MAESTRA.json")

CON_GANCHO = re.compile(
    r"taller|llanta|repuesto|mec[aá]nic|ferreter|construc|pintur|el[eé]ctric"
    r"|restaur|panader|cafeter|comida|carnicer|fruter"
    r"|cl[ií]nica|salud|drogu|hospital|ips|farmacia|odont|veterinar"
    r"|aseo|limpieza|residuo|reciclaje|vigilancia|seguridad privada|celadur"
    r"|transporte|log[ií]stica|mensajer|domicilio|colegio|educaci|jard[ií]n infantil",
    re.IGNORECASE,
)


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    sin_correo = "--sin-correo" in sys.argv

    with open(MAESTRA, encoding="utf-8") as f:
        empresas = json.load(f)["empresas"]

    candidatas = [
        e for e in empresas
        if e["ver_estado"] == "sin_verificar"
        and (bool(e["email"]) != sin_correo)
    ]
    candidatas.sort(key=lambda e: (
        str(e["prioridad"]) != "1",
        not CON_GANCHO.search(e["sector"] or ""),
        e["nombre"].lower(),
    ))
    lote = candidatas[:n]
    campos = ["id", "nombre", "sector", "email", "telefono", "direccion"]
    print(json.dumps([{c: e[c] for c in campos} for e in lote], ensure_ascii=False))
    print(f"lote de {len(lote)} (quedan {len(candidatas) - len(lote)} candidatas en esta cola)", file=sys.stderr)


if __name__ == "__main__":
    main()
