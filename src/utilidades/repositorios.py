"""Funciones CRUD sobre la base de datos.

Todas reciben opcionalmente la ruta de la BD para facilitar tests.
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

from src.modelos.correo import CorreoEnviado
from src.modelos.empresa import Empresa
from src.modelos.respuesta import Respuesta
from src.modelos.sector import Sector
from src.utilidades.db import (
    CATEGORIAS_RESPUESTA_VALIDAS,
    ESTADOS_EMPRESA_VALIDOS,
    obtener_conexion,
)


class EstadoEmpresaInvalido(ValueError):
    pass


class CategoriaRespuestaInvalida(ValueError):
    pass


# ----------------------------- SECTORES -----------------------------


def insertar_sector(sector: Sector, ruta: Path | str | None = None) -> int:
    with obtener_conexion(ruta) as cx:
        cursor = cx.execute(
            """
            INSERT INTO sectores (nombre, palabras_clave, total_empresas_encontradas)
            VALUES (?, ?, ?)
            """,
            (sector.nombre, sector.palabras_clave, sector.total_empresas_encontradas),
        )
        return cursor.lastrowid  # type: ignore[return-value]


def listar_sectores(ruta: Path | str | None = None) -> list[Sector]:
    with obtener_conexion(ruta) as cx:
        filas = cx.execute("SELECT * FROM sectores ORDER BY fecha_busqueda DESC").fetchall()
        return [Sector.desde_fila(f) for f in filas]


def actualizar_conteo_sector(
    sector_id: int, total: int, ruta: Path | str | None = None
) -> None:
    with obtener_conexion(ruta) as cx:
        cx.execute(
            "UPDATE sectores SET total_empresas_encontradas = ? WHERE id = ?",
            (total, sector_id),
        )


# ----------------------------- EMPRESAS -----------------------------


def insertar_empresa(empresa: Empresa, ruta: Path | str | None = None) -> int | None:
    """Inserta una empresa. Si ya existe (nombre+direccion), devuelve None."""
    if empresa.estado not in ESTADOS_EMPRESA_VALIDOS:
        raise EstadoEmpresaInvalido(
            f"Estado '{empresa.estado}' no valido. Permitidos: {ESTADOS_EMPRESA_VALIDOS}"
        )
    with obtener_conexion(ruta) as cx:
        try:
            cursor = cx.execute(
                """
                INSERT INTO empresas (
                    nombre, sector_id, direccion, telefono, sitio_web,
                    correo, ciudad, fuente, validada_por_ia, notas_ia, estado
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    empresa.nombre,
                    empresa.sector_id,
                    empresa.direccion,
                    empresa.telefono,
                    empresa.sitio_web,
                    empresa.correo,
                    empresa.ciudad,
                    empresa.fuente,
                    int(empresa.validada_por_ia),
                    empresa.notas_ia,
                    empresa.estado,
                ),
            )
            return cursor.lastrowid
        except sqlite3.IntegrityError:
            return None


def buscar_empresa_por_nombre_direccion(
    nombre: str, direccion: str | None, ruta: Path | str | None = None
) -> Empresa | None:
    with obtener_conexion(ruta) as cx:
        if direccion is None:
            fila = cx.execute(
                "SELECT * FROM empresas WHERE nombre = ? AND direccion IS NULL",
                (nombre,),
            ).fetchone()
        else:
            fila = cx.execute(
                "SELECT * FROM empresas WHERE nombre = ? AND direccion = ?",
                (nombre, direccion),
            ).fetchone()
        return Empresa.desde_fila(fila) if fila else None


def obtener_empresa(empresa_id: int, ruta: Path | str | None = None) -> Empresa | None:
    with obtener_conexion(ruta) as cx:
        fila = cx.execute("SELECT * FROM empresas WHERE id = ?", (empresa_id,)).fetchone()
        return Empresa.desde_fila(fila) if fila else None


def listar_empresas_por_estado(
    estado: str, ruta: Path | str | None = None, limite: int | None = None
) -> list[Empresa]:
    if estado not in ESTADOS_EMPRESA_VALIDOS:
        raise EstadoEmpresaInvalido(f"Estado '{estado}' no valido.")
    consulta = "SELECT * FROM empresas WHERE estado = ? ORDER BY fecha_creacion DESC"
    params: tuple = (estado,)
    if limite is not None:
        consulta += " LIMIT ?"
        params = (estado, limite)
    with obtener_conexion(ruta) as cx:
        return [Empresa.desde_fila(f) for f in cx.execute(consulta, params).fetchall()]


def actualizar_estado_empresa(
    empresa_id: int, estado: str, ruta: Path | str | None = None
) -> None:
    if estado not in ESTADOS_EMPRESA_VALIDOS:
        raise EstadoEmpresaInvalido(f"Estado '{estado}' no valido.")
    with obtener_conexion(ruta) as cx:
        cx.execute("UPDATE empresas SET estado = ? WHERE id = ?", (estado, empresa_id))


def actualizar_empresa_enriquecida(
    empresa_id: int,
    correo: str | None,
    validada_por_ia: bool,
    notas_ia: str | None,
    estado: str,
    ruta: Path | str | None = None,
) -> None:
    if estado not in ESTADOS_EMPRESA_VALIDOS:
        raise EstadoEmpresaInvalido(f"Estado '{estado}' no valido.")
    with obtener_conexion(ruta) as cx:
        cx.execute(
            """
            UPDATE empresas
            SET correo = ?, validada_por_ia = ?, notas_ia = ?, estado = ?
            WHERE id = ?
            """,
            (correo, int(validada_por_ia), notas_ia, estado, empresa_id),
        )


# ----------------------------- CORREOS -----------------------------


def insertar_correo_enviado(correo: CorreoEnviado, ruta: Path | str | None = None) -> int:
    with obtener_conexion(ruta) as cx:
        cursor = cx.execute(
            """
            INSERT INTO correos_enviados (empresa_id, asunto, cuerpo, estado_envio, mensaje_id)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                correo.empresa_id,
                correo.asunto,
                correo.cuerpo,
                correo.estado_envio,
                correo.mensaje_id,
            ),
        )
        return cursor.lastrowid  # type: ignore[return-value]


def buscar_correo_por_mensaje_id(
    mensaje_id: str, ruta: Path | str | None = None
) -> CorreoEnviado | None:
    with obtener_conexion(ruta) as cx:
        fila = cx.execute(
            "SELECT * FROM correos_enviados WHERE mensaje_id = ?", (mensaje_id,)
        ).fetchone()
        return CorreoEnviado.desde_fila(fila) if fila else None


def marcar_envio_fallo(correo_id: int, ruta: Path | str | None = None) -> None:
    with obtener_conexion(ruta) as cx:
        cx.execute(
            "UPDATE correos_enviados SET estado_envio = 'fallo' WHERE id = ?", (correo_id,)
        )


def correos_enviados_ultima_semana(ruta: Path | str | None = None) -> int:
    hace_una_semana = (datetime.now() - timedelta(days=7)).isoformat()
    with obtener_conexion(ruta) as cx:
        fila = cx.execute(
            "SELECT COUNT(*) AS c FROM correos_enviados WHERE fecha_envio >= ?",
            (hace_una_semana,),
        ).fetchone()
        return int(fila["c"])


# ----------------------------- RESPUESTAS -----------------------------


def insertar_respuesta(respuesta: Respuesta, ruta: Path | str | None = None) -> int:
    if respuesta.clasificacion_ia not in CATEGORIAS_RESPUESTA_VALIDAS:
        raise CategoriaRespuestaInvalida(
            f"Categoria '{respuesta.clasificacion_ia}' no valida. "
            f"Permitidas: {CATEGORIAS_RESPUESTA_VALIDAS}"
        )
    with obtener_conexion(ruta) as cx:
        cursor = cx.execute(
            """
            INSERT INTO respuestas (
                correo_enviado_id, empresa_id, asunto, cuerpo,
                clasificacion_ia, resumen_ia, notificada_whatsapp
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                respuesta.correo_enviado_id,
                respuesta.empresa_id,
                respuesta.asunto,
                respuesta.cuerpo,
                respuesta.clasificacion_ia,
                respuesta.resumen_ia,
                int(respuesta.notificada_whatsapp),
            ),
        )
        return cursor.lastrowid  # type: ignore[return-value]


def marcar_notificada_whatsapp(respuesta_id: int, ruta: Path | str | None = None) -> None:
    with obtener_conexion(ruta) as cx:
        cx.execute(
            "UPDATE respuestas SET notificada_whatsapp = 1 WHERE id = ?", (respuesta_id,)
        )


def respuestas_no_notificadas(ruta: Path | str | None = None) -> list[Respuesta]:
    with obtener_conexion(ruta) as cx:
        filas = cx.execute(
            """
            SELECT * FROM respuestas
            WHERE notificada_whatsapp = 0
              AND clasificacion_ia = 'interesado'
            ORDER BY fecha_recepcion ASC
            """
        ).fetchall()
        return [Respuesta.desde_fila(f) for f in filas]


def respuestas_no_leidas(ruta: Path | str | None = None) -> int:
    with obtener_conexion(ruta) as cx:
        fila = cx.execute(
            "SELECT COUNT(*) AS c FROM respuestas WHERE notificada_whatsapp = 0"
        ).fetchone()
        return int(fila["c"])


# ----------------------------- KPIs DASHBOARD -----------------------------


def contar_empresas_por_estado(ruta: Path | str | None = None) -> dict[str, int]:
    with obtener_conexion(ruta) as cx:
        filas = cx.execute(
            "SELECT estado, COUNT(*) AS c FROM empresas GROUP BY estado"
        ).fetchall()
        return {f["estado"]: int(f["c"]) for f in filas}


def total_empresas(ruta: Path | str | None = None) -> int:
    with obtener_conexion(ruta) as cx:
        fila = cx.execute("SELECT COUNT(*) AS c FROM empresas").fetchone()
        return int(fila["c"])
