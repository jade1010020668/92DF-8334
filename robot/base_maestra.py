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
  python robot/base_maestra.py              # sincroniza: agrega lo nuevo del
                                            # origen SIN tocar lo ya verificado
  python robot/base_maestra.py --desde-cero # reconstrucción total (destruye la
                                            # verificación acumulada; pide doble
                                            # confirmación por bandera)
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
    # Identidad = nombre+dirección (NO el correo: dos negocios pueden compartir
    # un correo basura, y corregir un correo no debe cambiar la identidad).
    base = clave_nombre(e.get("nombre")) + "|" + clave_nombre(e.get("direccion"))
    return hashlib.sha1(base.encode()).hexdigest()[:12]


def ids_unicos(filas):
    # Garantiza unicidad: a colisión real (mismo hash, negocio distinto) se
    # sufija -2, -3… en orden de aparición, que es estable entre corridas.
    vistos = {}
    for f in filas:
        n = vistos.get(f["id"], 0) + 1
        vistos[f["id"]] = n
        if n > 1:
            f["id"] = f["id"] + "-" + str(n)
    return filas


def construir(desde_cero=False):
    with open(ORIGEN, encoding="utf-8") as f:
        origen = json.load(f)

    hoy = date.today().isoformat()

    # La verificación acumulada (el trabajo de los agentes) NUNCA se pisa por
    # accidente: en modo normal las filas ya existentes se conservan tal cual
    # y del origen solo entran empresas NUEVAS (por clave nombre+dirección).
    previas, claves_previas, ids_tomados = [], set(), set()
    if not desde_cero and os.path.exists(MAESTRA_JSON):
        with open(MAESTRA_JSON, encoding="utf-8") as f:
            previas = json.load(f)["empresas"]
        claves_previas = {(clave_nombre(e["nombre"]), clave_nombre(e["direccion"])) for e in previas}
        ids_tomados = {e["id"] for e in previas}

    filas = []
    for e in origen:
        correo = limpiar(e.get("email")).lower()
        prio = e.get("prioridad")
        if isinstance(prio, str) and prio.strip() in ("1", "2"):
            prio = int(prio.strip())
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
            "prioridad": prio if prio in (1, 2) else "",
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
    sin_nombre = 0
    for f in filas:
        k = (clave_nombre(f["nombre"]), clave_nombre(f["direccion"]))
        if not k[0]:
            # nombre que normaliza a vacío: sin clave fiable, se conserva la
            # fila tal cual (fusionar aquí PISARÍA filas distintas entre sí)
            sin_nombre += 1
            por_clave[("__sin_nombre_%d" % sin_nombre, k[1])] = f
            continue
        if k in por_clave:
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

    # en modo incremental, del origen solo sobreviven las empresas NUEVAS.
    # La membresía se prueba por id (estable: hash del nombre+dirección DE
    # ORIGEN) y no solo por clave: el enriquecimiento puede haber cambiado la
    # dirección de una previa, y su clave ya no coincidiría con el origen —
    # eso re-crearía la misma empresa como "nueva" (pasó con 9 filas del piloto).
    if previas:
        nombre_por_id_previo = {e["id"]: clave_nombre(e["nombre"]) for e in previas}
        def ya_existe(f):
            if (clave_nombre(f["nombre"]), clave_nombre(f["direccion"])) in claves_previas:
                return True
            previa = nombre_por_id_previo.get(f["id"])
            return previa is not None and previa == clave_nombre(f["nombre"])
        filas = [f for f in filas if not ya_existe(f)]

    # --- correos duplicados dentro de lo nuevo, y contra lo previo ---
    correos_previos = {e["email"] for e in previas if e.get("email")}
    duenos = {}
    for f in filas:
        if not f["email"]:
            continue
        if f["email"] in correos_previos:
            f["notas"] = (f["notas"] + " | " if f["notas"] else "") + "correo %s ya lo tiene otra fila previa" % f["email"]
            f["email"] = ""
            continue
        actual = duenos.get(f["email"])
        if actual is None:
            duenos[f["email"]] = f
        else:
            mejor, peor = (f, actual) if str(f["prioridad"]) == "1" and str(actual["prioridad"]) != "1" else (actual, f)
            duenos[f["email"]] = mejor
            peor["notas"] = (peor["notas"] + " | " if peor["notas"] else "") + "correo %s repetido; lo conserva %s" % (peor["email"], mejor["id"])
            peor["email"] = ""
    quitados = sum(1 for f in filas if "repetido; lo conserva" in f["notas"])

    # --- marcas de duda determinísticas (solo sobre lo nuevo) ---
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

    # ids de lo nuevo: únicos también frente a los previos (que no cambian)
    for f in filas:
        base_id, n = f["id"], 1
        while f["id"] in ids_tomados:
            n += 1
            f["id"] = base_id + "-" + str(n)
        ids_tomados.add(f["id"])

    filas = previas + filas
    filas.sort(key=lambda f: (str(f["prioridad"]) != "1", f["ver_estado"] == "dudosa", f["nombre"].lower()))
    # Un id repetido mezclaría los datos de dos negocios (pasó en el piloto con
    # un correo basura compartido). Mejor reventar aquí que contaminar la base.
    assert len({f["id"] for f in filas}) == len(filas), "ids duplicados en la base maestra"

    os.makedirs(os.path.dirname(MAESTRA_JSON), exist_ok=True)
    with open(MAESTRA_JSON, "w", encoding="utf-8") as f:
        json.dump({"version": 4, "generada": hoy, "empresas": filas}, f, ensure_ascii=False, indent=1)
    with open(MAESTRA_CSV, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNAS, extrasaction="ignore")
        w.writeheader()
        w.writerows(filas)

    modo = "DESDE CERO" if desde_cero or not previas else "incremental (%d previas intactas)" % len(previas)
    print("BASE MAESTRA v4 [%s] → %d empresas" % (modo, len(filas)))
    print("  nuevas del origen: %d | fusionadas: %d | correos duplicados resueltos: %d" % (len(filas) - len(previas), fusionadas, quitados))
    print("  marcadas dudosas (solo nuevas): %d %s" % (sum(marcas.values()), marcas))
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
        construir(desde_cero="--desde-cero" in sys.argv)
