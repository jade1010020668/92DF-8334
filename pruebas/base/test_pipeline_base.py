#!/usr/bin/env python3
"""
Pruebas del pipeline de la BASE MAESTRA (regresiones del reevalúo 18/08/2026).
Trabajan sobre copias en un directorio temporal — jamás tocan datos/ reales.
"""
import importlib.util
import json
import os
import sys
import tempfile

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
resultados = []


def prueba(nombre):
    def deco(fn):
        try:
            detalle = fn()
            resultados.append({"nombre": nombre, "paso": True, "detalle": detalle or "ok"})
        except Exception as e:
            resultados.append({"nombre": nombre, "paso": False, "detalle": f"{type(e).__name__}: {e}"})
    return deco


def cargar(modulo, **rutas):
    """Importa un robot/*.py fresco con sus rutas globales apuntando al tempdir."""
    ruta = os.path.join(RAIZ, "robot", modulo + ".py")
    spec = importlib.util.spec_from_file_location(modulo + "_prueba", ruta)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    for k, v in rutas.items():
        setattr(m, k, v)
    return m


def maestra_de(tmp, empresas):
    ruta = os.path.join(tmp, "BASE_MAESTRA.json")
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump({"version": 4, "generada": "2026-08-18", "empresas": empresas}, f, ensure_ascii=False)
    return ruta


def fila(**kw):
    base = {"id": "x", "nombre": "X", "sector": "Taller", "email": "", "emails_extra": "",
            "telefono": "", "contacto": "", "direccion": "", "sitio_web": "", "lat": "", "lon": "",
            "prioridad": 2, "tamano": "", "actividad": "", "fuentes": "t",
            "ver_estado": "sin_verificar", "ver_motivo": "", "ver_fecha": "", "ver_evidencia": "", "notas": ""}
    base.update(kw)
    return base


@prueba("aplicar: null dentro de correos_nuevos/telefonos no revienta la tanda")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        ruta = maestra_de(tmp, [fila(id="a1", email="viejo@x.co")])
        m = cargar("aplicar_verificacion", MAESTRA=ruta)
        res = os.path.join(tmp, "r.json")
        json.dump([{"id": "a1", "existe": "activa", "correo_pertenece": "si",
                    "correos_nuevos": ["nuevo@x.co", None], "telefonos": [None, "601555"],
                    "evidencia": ["https://x.co"], "nota": "ok"}], open(res, "w"))
        c = m.aplicar(res)
        assert c["verificada"] == 1, c
        e = json.load(open(ruta))["empresas"][0]
        assert e["telefono"] == "601555", e["telefono"]
        return "el null se filtra, el teléfono bueno entra, la tanda completa se aplica"


@prueba("aplicar: evidencia que llega como string no se corrompe en 'h;t'")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        ruta = maestra_de(tmp, [fila(id="a1", email="v@x.co")])
        m = cargar("aplicar_verificacion", MAESTRA=ruta)
        res = os.path.join(tmp, "r.json")
        json.dump([{"id": "a1", "existe": "activa", "correo_pertenece": "si",
                    "evidencia": "https://ejemplo.com/pagina", "nota": ""}], open(res, "w"))
        m.aplicar(res)
        e = json.load(open(ruta))["empresas"][0]
        assert e["ver_evidencia"] == "https://ejemplo.com/pagina", repr(e["ver_evidencia"])
        return "string suelto → se trata como lista de uno, la URL queda entera"


@prueba("aplicar: no marca verificada con correo sin confirmar como único canal")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        ruta = maestra_de(tmp, [fila(id="a1", email="dudoso@x.co")])
        m = cargar("aplicar_verificacion", MAESTRA=ruta)
        res = os.path.join(tmp, "r.json")
        json.dump([{"id": "a1", "existe": "activa", "correo_pertenece": "no_claro",
                    "evidencia": ["https://x.co"], "nota": ""}], open(res, "w"))
        m.aplicar(res)
        e = json.load(open(ruta))["empresas"][0]
        assert e["ver_estado"] == "dudosa", e["ver_estado"]
        return "activa + correo no confirmado + sin tel/web → dudosa (antes quedaba verificada)"


@prueba("aplicar: no reintroduce un correo que ya posee otra fila")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        ruta = maestra_de(tmp, [fila(id="a1", email="unico@x.co"), fila(id="a2", nombre="Y", email="")])
        m = cargar("aplicar_verificacion", MAESTRA=ruta)
        res = os.path.join(tmp, "r.json")
        json.dump([{"id": "a2", "existe": "activa", "correo_pertenece": "no_claro",
                    "correos_nuevos": ["unico@x.co"], "telefonos": ["601"],
                    "evidencia": ["https://y.co"], "nota": ""}], open(res, "w"))
        m.aplicar(res)
        emp = {e["id"]: e for e in json.load(open(ruta))["empresas"]}
        assert emp["a2"]["email"] == "", emp["a2"]["email"]
        assert "ya lo tiene otra fila" in emp["a2"]["notas"], emp["a2"]["notas"]
        return "el correo duplicado se rechaza con nota; la unicidad global se conserva"


@prueba("extraer: una línea rota en el journal no aborta la extracción")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        j = os.path.join(tmp, "journal.jsonl")
        with open(j, "w") as f:
            f.write(json.dumps({"type": "result", "result": {"id": "a1", "existe": "activa"}}) + "\n")
            f.write("\n{esto quedó trunc\n")
            f.write(json.dumps({"type": "result", "result": {"id": "a2", "existe": "no_claro"}}) + "\n")
        salida = os.path.join(tmp, "out.json")
        m = cargar("extraer_resultados")
        vieja = sys.argv
        sys.argv = ["x", j, salida]
        try:
            m.main()
        finally:
            sys.argv = vieja
        res = json.load(open(salida))
        assert len(res) == 2, res
        return "2 resultados válidos sobreviven a la línea truncada del medio"


@prueba("construir: la sincronización preserva la verificación y no re-crea enriquecidas")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        origen = os.path.join(tmp, "origen.json")
        json.dump([
            {"nombre": "Taller Pérez", "sector": "Taller", "email": "p@x.co", "direccion": "", "prioridad": 1, "fuente": "t"},
            {"nombre": "Nueva Empresa", "sector": "Ferretería", "email": "n@x.co", "direccion": "Calle 1", "prioridad": 2, "fuente": "t"},
        ], open(origen, "w"))
        mj = os.path.join(tmp, "BASE_MAESTRA.json")
        mc = os.path.join(tmp, "BASE_MAESTRA.csv")
        m = cargar("base_maestra", ORIGEN=origen, MAESTRA_JSON=mj, MAESTRA_CSV=mc)
        # 1ª construcción: solo Taller Pérez en el origen inicial
        json.dump([{"nombre": "Taller Pérez", "sector": "Taller", "email": "p@x.co", "direccion": "", "prioridad": 1, "fuente": "t"}], open(origen, "w"))
        m.construir()
        # se verifica y se enriquece (cambia su dirección — la clave ya no coincide con el origen)
        doc = json.load(open(mj))
        doc["empresas"][0].update(ver_estado="verificada", ver_fecha="2026-08-18",
                                  sitio_web="https://perez.co", direccion="Calle 99 #9-99")
        json.dump(doc, open(mj, "w"))
        # 2ª sincronización, ya con la empresa nueva en el origen
        json.dump([
            {"nombre": "Taller Pérez", "sector": "Taller", "email": "p@x.co", "direccion": "", "prioridad": 1, "fuente": "t"},
            {"nombre": "Nueva Empresa", "sector": "Ferretería", "email": "n@x.co", "direccion": "Calle 1", "prioridad": 2, "fuente": "t"},
        ], open(origen, "w"))
        m.construir()
        emp = json.load(open(mj))["empresas"]
        assert len(emp) == 2, [e["nombre"] for e in emp]
        perez = next(e for e in emp if e["nombre"] == "Taller Pérez")
        assert perez["ver_estado"] == "verificada" and perez["sitio_web"] == "https://perez.co", perez
        assert perez["direccion"] == "Calle 99 #9-99", perez["direccion"]
        assert any(e["nombre"] == "Nueva Empresa" for e in emp)
        return "la verificada enriquecida queda intacta (aun con dirección cambiada) y la nueva entra"


print(json.dumps(resultados, ensure_ascii=False, indent=2))
fallas = sum(1 for r in resultados if not r["paso"])
print(f"TOTAL: {len(resultados)} pruebas, {fallas} fallas")
sys.exit(0)
