#!/usr/bin/env python3
"""
BASE MAESTRA — la base de datos de empresas de DotaciónPro.

Consolida web/empresas-bogota.json en datos/BASE_MAESTRA.json (+ CSV para la
hoja de cálculo), con esquema de verificación: cada empresa lleva su estado
(sin_verificar / verificada / dudosa / descartada), la fecha, la evidencia y
las fuentes. NADA se borra: depurar es marcar con motivo, no destruir.

Reglas determinísticas de esta pasada (lo que se puede saber sin internet):
  - correo con formato inválido            → dudosa (motivo: correo_invalido)
  - correo duplicado                       → se queda en UNA fila (la de mejor
    prioridad); las demás pierden el correo y lo anotan en notas
  - dominio .gov.co / .mil.co              → dudosa (motivo: entidad_estatal —
    el canal para el Estado es SECOP, no correo frío)
  - nombre de ≤4 letras o genérico         → dudosa (motivo: nombre_dudoso)
  - filas idénticas (nombre+dirección)     → fusionadas conservando la más completa

El enriquecimiento con internet (sitio web, teléfonos, ¿activa?) lo hacen los
agentes de la rutina diaria, que actualizan `verificacion` con evidencia.

Uso:
  python robot/base_maestra.py              # reconstruye desde la base viva
  python robot/base_maestra.py --resumen    # solo imprime el estado actual
"""
import csv
import hashlib
import json
import os
import re
import sys
import unicodedata
from datetime import date

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(RAIZ, "web", "empresas-bogota.json")
MAESTRA_JSON = os.path.join(RAIZ, "datos", "BASE_MAESTRA.json")
MAESTRA_CSV = os.path.join(RAIZ, "datos", "BASE_MAESTRA.csv")

RE_CORREO = re.compile(r"^[\w.+-]+@[\w-]+\.[\w.-]+$")
NOMBRES_GENERICOS = {"maria", "jose", "juan", "luis", "ana", "sas", "ltda", "sa", "el", "la", "los"}

COLUMNAS = [
    "id", "nombre", "sector", "email", "emails_extra", "telefono", "contacto",
    "direccion", "sitio_web", "lat", "lon", "prioridad", "tamano", "actividad",
    "fuentes", "ver_estado", "ver_motivo", "ver_fecha", "ver_evidencia", "notas",
]


def limpiar(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


def clave_nombre(s):
    s = unicodedata.normalize("NFKD", limpiar(s).lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\W+", " ", s).strip()


def id_estable(e):
    # El id no cambia entre reconstrucciones: correo si hay, si no nombre+dirección.
    correo = limpiar(e.get("email")).lower()
    base = correo if correo else clave_nombre(e.get("nombre")) + "|" + clave_nombre(e.get("direccion"))
    return hashlib.sha1(base.encode()).hexdigest()[:12]


def construir():
    with open(ORIGEN, encoding="utf-8") as f:
        origen = json.load(f)

    hoy = date.today().isoformat()
    filas = []
    for e in origen:
        correo = limpiar(e.get("email")).lower()
        fila = {
            "id": id_estable(e),
            "nombre": limpiar(e.get("nombre")),
            "sector": limpiar(e.get("sector")),
            "email": correo,
            "emails_extra": "",
            "telefono": limpiar(e.get("telefono")),
            "contacto": limpiar(e.get("contacto")),
            "direccion": limpiar(e.get("direccion")),
            "sitio_web": "",
            "lat": e.get("lat") or "",
            "lon": e.get("lon") or "",
            "prioridad": e.get("prioridad") if e.get("prioridad") in (1, 2) else "",
            "tamano": limpiar(e.get("tamano")),
            "actividad": limpiar(e.get("actividad")),
            "fuentes": limpiar(e.get("fuente")) or "base_v3",
            "ver_estado": "sin_verificar",
            "ver_motivo": "",
            "ver_fecha": "",
            "ver_evidencia": "",
            "notas": "",
        }
        filas.append(fila)

    # --- fusión de filas idénticas (nombre+dirección) ---
    por_clave = {}
    fusionadas = 0
    for f in filas:
        k = (clave_nombre(f["nombre"]), clave_nombre(f["direccion"]))
        if k in por_clave and k[0]:
            fusionadas += 1
            base = por_clave[k]
            for campo in ("email", "telefono", "direccion", "lat", "lon", "tamano", "actividad"):
                if not base[campo] and f[campo]:
                    base[campo] = f[campo]
            if f["fuentes"] not in base["fuentes"]:
                base["fuentes"] += ";" + f["fuentes"]
        else:
            por_clave[k] = f
    filas = list(por_clave.values())

    # --- correos duplicados: el correo se queda en la fila de mejor prioridad ---
    duenos = {}
    for f in filas:
        if not f["email"]:
            continue
        actual = duenos.get(f["email"])
        if actual is None:
            duenos[f["email"]] = f
        else:
            mejor, peor = (f, actual) if str(f["prioridad"]) == "1" and str(actual["prioridad"]) != "1" else (actual, f)
            duenos[f["email"]] = mejor
            peor["notas"] = (peor["notas"] + " | " if peor["notas"] else "") + f"correo {peor['email']} repetido; lo conserva {mejor['id']}"
            peor["email"] = ""
    quitados = sum(1 for f in filas if "repetido; lo conserva" in f["notas"])

    # --- marcas de duda determinísticas ---
    marcas = {"correo_invalido": 0, "entidad_estatal": 0, "nombre_dudoso": 0}
    for f in filas:
        motivo = ""
        if f["email"] and not RE_CORREO.match(f["email"]):
            motivo = "correo_invalido"
        elif f["email"].endswith((".gov.co", ".mil.co")) or ".gov.co" in f["email"].split("@")[-1]:
            motivo = "entidad_estatal"
        else:
            k = clave_nombre(f["nombre"])
            if len(k) <= 4 or k in NOMBRES_GENERICOS:
                motivo = "nombre_dudoso"
        if motivo:
            f["ver_estado"], f["ver_motivo"], f["ver_fecha"] = "dudosa", motivo, hoy
            marcas[motivo] += 1

    filas.sort(key=lambda f: (str(f["prioridad"]) != "1", f["ver_estado"] == "dudosa", f["nombre"].lower()))

    os.makedirs(os.path.dirname(MAESTRA_JSON), exist_ok=True)
    with open(MAESTRA_JSON, "w", encoding="utf-8") as f:
        json.dump({"version": 4, "generada": hoy, "empresas": filas}, f, ensure_ascii=False, indent=1)
    with open(MAESTRA_CSV, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNAS)
        w.writeheader()
        w.writerows(filas)

    print(f"BASE MAESTRA v4 → {len(filas)} empresas")
    print(f"  fusionadas por nombre+dirección: {fusionadas}")
    print(f"  correos duplicados resueltos: {quitados}")
    print(f"  marcadas dudosas: {sum(marcas.values())} {marcas}")
    resumen()


def resumen():
    with open(MAESTRA_JSON, encoding="utf-8") as f:
        filas = json.load(f)["empresas"]
    n = len(filas)
    con = lambda c: sum(1 for f in filas if str(f.get(c) or "").strip())
    est = {}
    for f in filas:
        est[f["ver_estado"]] = est.get(f["ver_estado"], 0) + 1
    print(f"  estado de verificación: {est}")
    print(f"  con correo: {con('email')} | teléfono: {con('telefono')} | sitio web: {con('sitio_web')} | contacto: {con('contacto')}")


if __name__ == "__main__":
    if "--resumen" in sys.argv:
        resumen()
    else:
        construir()
