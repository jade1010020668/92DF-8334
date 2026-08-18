#!/usr/bin/env python3
"""
Genera datos/EMPRESAS_PARA_SHEET.csv (el archivo que se importa a la hoja
«Empresas» del motor) a partir de la base viva web/empresas-bogota.json.

Por qué existe: el CSV original se armó a mano una vez y quedó huérfano — se
desactualizó de la base (le faltaban 471 empresas con correo) y venía en un
orden cualquiera. Aunque el motor ya reordena por su cuenta al enviar, este
script deja el archivo completo, sin duplicados y en el mismo orden que usa el
motor, para que lo que Diego ve en la hoja coincida con lo que va a pasar.

Orden (el mismo de ordenDeEnvio_ en apps_script/MotorVentas.gs):
  1. prioridad 1 (compran dotación) antes que prioridad 2
  2. dentro de cada prioridad, sectores con discurso a la medida primero
  3. a empate, el orden de la base

Uso:  python robot/generar_csv_sheet.py
"""
import csv
import json
import os
import re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Fuente: la BASE MAESTRA (datos/BASE_MAESTRA.json), que lleva la verificación.
# Quedan FUERA del motor: las descartadas (basura confirmada o inactivas) y las
# dudosas por entidad_estatal o correo_invalido — a esas no se les escribe.
BASE = os.path.join(RAIZ, "datos", "BASE_MAESTRA.json")
SALIDA = os.path.join(RAIZ, "datos", "EMPRESAS_PARA_SHEET.csv")
MOTIVOS_EXCLUIDOS = {"entidad_estatal", "correo_invalido"}

# Copia del regex de sectorConGancho_ (MotorVentas.gs). Si cambias uno, cambia
# el otro: la prueba test_orden_y_gancho_legal.js vigila el del motor.
CON_GANCHO = re.compile(
    r"taller|llanta|repuesto|mec[aá]nic|ferreter|construc|pintur|el[eé]ctric"
    r"|restaur|panader|cafeter|comida|carnicer|fruter"
    r"|cl[ií]nica|salud|drogu|hospital|ips|farmacia|odont|veterinar"
    r"|aseo|limpieza|residuo|reciclaje|vigilancia|seguridad privada|celadur"
    r"|transporte|log[ií]stica|mensajer|domicilio|colegio|educaci|jard[ií]n infantil",
    re.IGNORECASE,
)


def clave(orden_original, empresa):
    prioridad = empresa.get("prioridad")
    p = prioridad if prioridad in (1, 2) else 9
    gancho = 0 if CON_GANCHO.search(str(empresa.get("sector") or "")) else 1
    return (p, gancho, orden_original)


def main():
    with open(BASE, encoding="utf-8") as f:
        base = json.load(f)["empresas"]

    con_correo = []
    vistos = set()
    excluidas = 0
    for i, e in enumerate(base):
        correo = str(e.get("email") or "").strip().lower()
        if "@" not in correo:
            continue
        if e.get("ver_estado") == "descartada" or (
            e.get("ver_estado") == "dudosa" and e.get("ver_motivo") in MOTIVOS_EXCLUIDOS
        ):
            excluidas += 1
            continue
        con_correo.append((i, correo, e))
    print(f"  excluidas por verificación (descartadas/estatales/correo roto): {excluidas}")

    con_correo.sort(key=lambda t: clave(t[0], t[2]))

    filas, duplicados = [], 0
    for _, correo, e in con_correo:
        if correo in vistos:          # tras ordenar: si se repite, gana el mejor puesto
            duplicados += 1
            continue
        vistos.add(correo)
        filas.append([
            correo,
            str(e.get("nombre") or "").strip() or "Estimados señores",
            str(e.get("sector") or "").strip(),
            e.get("prioridad") if e.get("prioridad") in (1, 2) else "",
            "", "", "",               # estado, fecha_envio, notas: los maneja la hoja
        ])

    with open(SALIDA, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["correo", "empresa", "sector", "prioridad", "estado", "fecha_envio", "notas"])
        w.writerows(filas)

    p1 = sum(1 for f in filas if f[3] == 1)
    gancho_primeros = sum(1 for f in filas[:200] if CON_GANCHO.search(f[2]))
    print(f"Escrito {SALIDA}")
    print(f"  {len(filas)} empresas con correo ({duplicados} duplicados fuera)")
    print(f"  prioridad 1: {p1} — todas al comienzo del archivo")
    print(f"  de las primeras 200 filas, {gancho_primeros} son de sectores con discurso propio")


if __name__ == "__main__":
    main()
