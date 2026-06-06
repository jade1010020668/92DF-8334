"""Tests de la capa de datos.

Usan SQLite en archivo temporal (no :memory: porque la API de
``obtener_conexion`` abre y cierra conexion en cada llamada, y la
BD en memoria desaparece entre llamadas).
"""

from __future__ import annotations

from pathlib import Path

import pytest

from src.modelos.correo import CorreoEnviado
from src.modelos.empresa import Empresa
from src.modelos.respuesta import Respuesta
from src.modelos.sector import Sector
from src.utilidades.db import (
    CATEGORIAS_RESPUESTA_VALIDAS,
    ESTADOS_EMPRESA_VALIDOS,
    inicializar_db,
)
from src.utilidades.repositorios import (
    CategoriaRespuestaInvalida,
    EstadoEmpresaInvalido,
    actualizar_conteo_sector,
    actualizar_empresa_enriquecida,
    actualizar_estado_empresa,
    buscar_correo_por_mensaje_id,
    buscar_empresa_por_nombre_direccion,
    contar_empresas_por_estado,
    correos_enviados_ultima_semana,
    insertar_correo_enviado,
    insertar_empresa,
    insertar_respuesta,
    insertar_sector,
    listar_empresas_por_estado,
    listar_sectores,
    marcar_notificada_whatsapp,
    obtener_empresa,
    respuestas_no_leidas,
    respuestas_no_notificadas,
    total_empresas,
)


@pytest.fixture
def bd_temporal(tmp_path: Path) -> Path:
    ruta = tmp_path / "test_dotacion.db"
    inicializar_db(ruta)
    return ruta


def test_inicializar_db_crea_tablas(bd_temporal: Path) -> None:
    import sqlite3

    cx = sqlite3.connect(str(bd_temporal))
    try:
        filas = cx.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).fetchall()
    finally:
        cx.close()
    nombres = {f[0] for f in filas}
    assert {"sectores", "empresas", "correos_enviados", "respuestas"} <= nombres


def test_insertar_y_listar_sector(bd_temporal: Path) -> None:
    sector_id = insertar_sector(
        Sector(nombre="empresas de plasticos", palabras_clave="plasticos|fabrica"),
        bd_temporal,
    )
    assert sector_id is not None
    actualizar_conteo_sector(sector_id, 42, bd_temporal)

    sectores = listar_sectores(bd_temporal)
    assert len(sectores) == 1
    assert sectores[0].nombre == "empresas de plasticos"
    assert sectores[0].total_empresas_encontradas == 42


def test_insertar_empresa_y_buscar(bd_temporal: Path) -> None:
    empresa_id = insertar_empresa(
        Empresa(
            nombre="Plasticos del Sur",
            direccion="Calle 1 # 2-3",
            telefono="6011234567",
            sitio_web="https://plasticossur.co",
            fuente="google_maps",
        ),
        bd_temporal,
    )
    assert empresa_id is not None

    encontrada = buscar_empresa_por_nombre_direccion(
        "Plasticos del Sur", "Calle 1 # 2-3", bd_temporal
    )
    assert encontrada is not None
    assert encontrada.telefono == "6011234567"
    assert encontrada.estado == "nueva"
    assert encontrada.ciudad == "Bogota"


def test_empresa_unica_por_nombre_y_direccion(bd_temporal: Path) -> None:
    e = Empresa(nombre="Acme", direccion="Av 1 # 2-3")
    primer_id = insertar_empresa(e, bd_temporal)
    segundo_id = insertar_empresa(e, bd_temporal)
    assert primer_id is not None
    assert segundo_id is None


def test_estado_empresa_invalido_lanza_error(bd_temporal: Path) -> None:
    with pytest.raises(EstadoEmpresaInvalido):
        insertar_empresa(
            Empresa(nombre="X", direccion="Y", estado="estado_inventado"), bd_temporal
        )


def test_transicion_de_estado(bd_temporal: Path) -> None:
    eid = insertar_empresa(Empresa(nombre="A", direccion="B"), bd_temporal)
    assert eid is not None
    actualizar_estado_empresa(eid, "enriquecida", bd_temporal)
    empresa = obtener_empresa(eid, bd_temporal)
    assert empresa is not None and empresa.estado == "enriquecida"


def test_enriquecimiento_actualiza_campos(bd_temporal: Path) -> None:
    eid = insertar_empresa(Empresa(nombre="E", direccion="D"), bd_temporal)
    assert eid is not None
    actualizar_empresa_enriquecida(
        eid,
        correo="contacto@e.co",
        validada_por_ia=True,
        notas_ia="encaja con dotacion industrial",
        estado="enriquecida",
        ruta=bd_temporal,
    )
    empresa = obtener_empresa(eid, bd_temporal)
    assert empresa is not None
    assert empresa.correo == "contacto@e.co"
    assert empresa.validada_por_ia is True
    assert empresa.estado == "enriquecida"


def test_listar_empresas_por_estado_y_contar(bd_temporal: Path) -> None:
    insertar_empresa(Empresa(nombre="A", direccion="1"), bd_temporal)
    insertar_empresa(Empresa(nombre="B", direccion="2", estado="enriquecida"), bd_temporal)
    insertar_empresa(Empresa(nombre="C", direccion="3", estado="enriquecida"), bd_temporal)

    nuevas = listar_empresas_por_estado("nueva", bd_temporal)
    enriquecidas = listar_empresas_por_estado("enriquecida", bd_temporal)
    assert len(nuevas) == 1
    assert len(enriquecidas) == 2

    conteo = contar_empresas_por_estado(bd_temporal)
    assert conteo.get("nueva") == 1
    assert conteo.get("enriquecida") == 2
    assert total_empresas(bd_temporal) == 3


def test_correo_enviado_y_mensaje_id_unico(bd_temporal: Path) -> None:
    eid = insertar_empresa(Empresa(nombre="K", direccion="L"), bd_temporal)
    assert eid is not None
    cid = insertar_correo_enviado(
        CorreoEnviado(
            empresa_id=eid,
            asunto="Cotizacion dotacion",
            cuerpo="Buenas tardes...",
            mensaje_id="<msg-1@dotacion>",
        ),
        bd_temporal,
    )
    assert cid is not None

    encontrado = buscar_correo_por_mensaje_id("<msg-1@dotacion>", bd_temporal)
    assert encontrado is not None
    assert encontrado.asunto == "Cotizacion dotacion"

    assert correos_enviados_ultima_semana(bd_temporal) == 1


def test_respuesta_categoria_invalida(bd_temporal: Path) -> None:
    eid = insertar_empresa(Empresa(nombre="M", direccion="N"), bd_temporal)
    assert eid is not None
    cid = insertar_correo_enviado(
        CorreoEnviado(empresa_id=eid, asunto="a", cuerpo="b", mensaje_id="<x@y>"),
        bd_temporal,
    )
    assert cid is not None

    with pytest.raises(CategoriaRespuestaInvalida):
        insertar_respuesta(
            Respuesta(
                empresa_id=eid,
                correo_enviado_id=cid,
                clasificacion_ia="categoria_inventada",
            ),
            bd_temporal,
        )


def test_flujo_respuesta_y_notificacion(bd_temporal: Path) -> None:
    eid = insertar_empresa(Empresa(nombre="R", direccion="S"), bd_temporal)
    assert eid is not None
    cid = insertar_correo_enviado(
        CorreoEnviado(empresa_id=eid, asunto="a", cuerpo="b", mensaje_id="<m@x>"),
        bd_temporal,
    )
    assert cid is not None

    rid = insertar_respuesta(
        Respuesta(
            empresa_id=eid,
            correo_enviado_id=cid,
            asunto="Re: cotizacion",
            cuerpo="Si, nos interesa.",
            clasificacion_ia="interesado",
            resumen_ia="Cliente interesado en EPP",
        ),
        bd_temporal,
    )
    assert rid is not None

    pendientes = respuestas_no_notificadas(bd_temporal)
    assert len(pendientes) == 1
    assert respuestas_no_leidas(bd_temporal) == 1

    marcar_notificada_whatsapp(rid, bd_temporal)
    assert len(respuestas_no_notificadas(bd_temporal)) == 0
    assert respuestas_no_leidas(bd_temporal) == 0


def test_constantes_estados_y_categorias() -> None:
    # Garantiza que el codigo de aplicacion siempre puede confiar en estos valores.
    assert "nueva" in ESTADOS_EMPRESA_VALIDOS
    assert "enriquecida" in ESTADOS_EMPRESA_VALIDOS
    assert "sin_correo" in ESTADOS_EMPRESA_VALIDOS
    assert "interesado" in CATEGORIAS_RESPUESTA_VALIDAS
    assert "no_interesado" in CATEGORIAS_RESPUESTA_VALIDAS
