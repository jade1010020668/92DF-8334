#!/usr/bin/env python3
"""
Aplica a la BASE MAESTRA los resultados de una tanda de verificación web
(los objetos que devuelven los agentes: id, existe, correo_pertenece,
sitio_web, telefonos, direccion, correos_nuevos, contacto, evidencia, nota).

Reglas de decisión (conservadoras: en la duda, dudosa — nunca se borra nada):
  - existe=activa  y correo_pertenece=si          → verificada
  - existe=activa  y correo_pertenece=no          → se quita ese correo; si el
    agente trajo correos del negocio, entra el mejor; queda verificada si hay
    algún canal (correo/tel/web) o dudosa si no
  - existe=inactiva (con evidencia)               → descartada (motivo: inactiva)
  - existe=no_claro y correo_pertenece=no y el
    agente no encontró NINGÚN dato del negocio    → descartada
    (motivo: registro_cruzado_invalido — basura de dataset mal cruzado)
  - cualquier otro caso                           → dudosa (motivo: sin_rastro_claro)

Los campos solo se completan si estaban vacíos (lo encontrado no pisa lo que
ya había, salvo el correo cuando se demostró que no pertenece).

Uso:  python robot/aplicar_verificacion.py resultados.json
"""
import json
import os
import re
import sys
from datetime import date

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAESTRA = os.path.join(RAIZ, "datos", "BASE_MAESTRA.json")
RE_CORREO = re.compile(r"^[\w.+-]+@[\w-]+\.[\w.-]+$")


def aplicar(ruta_resultados):
    with open(MAESTRA, encoding="utf-8") as f:
        doc = json.load(f)
    por_id = {e["id"]: e for e in doc["empresas"]}
    with open(ruta_resultados, encoding="utf-8") as f:
        resultados = json.load(f)

    hoy = date.today().isoformat()
    conteo = {"verificada": 0, "dudosa": 0, "descartada": 0, "sin_fila": 0,
              "telefonos": 0, "sitios": 0, "direcciones": 0, "correos_cambiados": 0, "contactos": 0}

    for r in resultados:
        e = por_id.get(r.get("id"))
        if not e:
            conteo["sin_fila"] += 1
            continue

        trajo_algo = bool(r.get("sitio_web") or r.get("telefonos") or r.get("direccion") or r.get("correos_nuevos"))

        # correo que no pertenece: fuera, y entra el mejor correo real si lo hay
        if r.get("correo_pertenece") == "no" and e["email"]:
            e["notas"] = (e["notas"] + " | " if e["notas"] else "") + f"correo {e['email']} no pertenece (verificación {hoy})"
            e["email"] = ""
            conteo["correos_cambiados"] += 1
        nuevos = [c.strip().lower() for c in (r.get("correos_nuevos") or []) if RE_CORREO.match(c.strip().lower())]
        if nuevos and not e["email"]:
            e["email"] = nuevos[0]
            nuevos = nuevos[1:]
        if nuevos:
            ya = set(filter(None, e["emails_extra"].split(";")))
            e["emails_extra"] = ";".join(sorted(ya | set(nuevos)))

        # completar huecos (sin pisar lo existente)
        if r.get("sitio_web") and not e["sitio_web"]:
            e["sitio_web"] = r["sitio_web"].strip(); conteo["sitios"] += 1
        if r.get("telefonos") and not e["telefono"]:
            e["telefono"] = ";".join(t.strip() for t in r["telefonos"][:3]); conteo["telefonos"] += 1
        if r.get("direccion") and not e["direccion"]:
            e["direccion"] = r["direccion"].strip(); conteo["direcciones"] += 1
        if r.get("contacto") and not e["contacto"]:
            e["contacto"] = r["contacto"].strip(); conteo["contactos"] += 1

        # veredicto
        if r.get("existe") == "activa" and (r.get("correo_pertenece") == "si" or (e["email"] or e["telefono"] or e["sitio_web"])):
            estado, motivo = "verificada", ""
        elif r.get("existe") == "inactiva":
            estado, motivo = "descartada", "inactiva"
        elif r.get("existe") == "no_claro" and r.get("correo_pertenece") == "no" and not trajo_algo:
            estado, motivo = "descartada", "registro_cruzado_invalido"
        else:
            estado, motivo = "dudosa", "sin_rastro_claro"

        e["ver_estado"], e["ver_motivo"], e["ver_fecha"] = estado, motivo, hoy
        e["ver_evidencia"] = ";".join((r.get("evidencia") or [])[:2])
        if r.get("nota"):
            e["ver_evidencia"] += (" — " if e["ver_evidencia"] else "") + r["nota"][:160]
        conteo[estado] += 1

    with open(MAESTRA, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    print(f"Aplicados {len(resultados)} resultados: {conteo}")
    return conteo


if __name__ == "__main__":
    aplicar(sys.argv[1])
