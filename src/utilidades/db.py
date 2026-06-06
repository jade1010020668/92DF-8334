"""Acceso a la base de datos SQLite local.

La BD se guarda en ``db/dotacion.db`` (no se sube a git).
Para tests se puede usar ``:memory:`` pasando ruta personalizada.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

RAIZ_PROYECTO = Path(__file__).resolve().parents[2]
RUTA_DB_DEFAULT = RAIZ_PROYECTO / "db" / "dotacion.db"

SQL_SCHEMA = """
CREATE TABLE IF NOT EXISTS sectores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    palabras_clave TEXT NOT NULL,
    fecha_busqueda DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_empresas_encontradas INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    sector_id INTEGER REFERENCES sectores(id),
    direccion TEXT,
    telefono TEXT,
    sitio_web TEXT,
    correo TEXT,
    ciudad TEXT DEFAULT 'Bogota',
    fuente TEXT,
    validada_por_ia INTEGER DEFAULT 0,
    notas_ia TEXT,
    estado TEXT DEFAULT 'nueva',
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nombre, direccion)
);

CREATE INDEX IF NOT EXISTS idx_empresas_estado ON empresas(estado);
CREATE INDEX IF NOT EXISTS idx_empresas_sector ON empresas(sector_id);

CREATE TABLE IF NOT EXISTS correos_enviados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER REFERENCES empresas(id),
    asunto TEXT,
    cuerpo TEXT,
    fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado_envio TEXT DEFAULT 'enviado',
    mensaje_id TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_correos_mensaje_id ON correos_enviados(mensaje_id);
CREATE INDEX IF NOT EXISTS idx_correos_empresa ON correos_enviados(empresa_id);

CREATE TABLE IF NOT EXISTS respuestas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    correo_enviado_id INTEGER REFERENCES correos_enviados(id),
    empresa_id INTEGER REFERENCES empresas(id),
    asunto TEXT,
    cuerpo TEXT,
    fecha_recepcion DATETIME DEFAULT CURRENT_TIMESTAMP,
    clasificacion_ia TEXT,
    resumen_ia TEXT,
    notificada_whatsapp INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_respuestas_notificada ON respuestas(notificada_whatsapp);
CREATE INDEX IF NOT EXISTS idx_respuestas_empresa ON respuestas(empresa_id);
"""

ESTADOS_EMPRESA_VALIDOS = frozenset(
    {"nueva", "enriquecida", "sin_correo", "contactada", "respondio", "descartada"}
)
CATEGORIAS_RESPUESTA_VALIDAS = frozenset(
    {"interesado", "no_interesado", "fuera_oficina", "spam", "sin_clasificar"}
)


def inicializar_db(ruta: Path | str | None = None) -> Path | str:
    """Crea las tablas si no existen. Devuelve la ruta usada.

    Si ``ruta`` es ``None`` usa ``db/dotacion.db``. Si es ``:memory:``
    devuelve la cadena tal cual (util para tests).
    """
    destino: Path | str
    if ruta is None:
        destino = RUTA_DB_DEFAULT
        destino.parent.mkdir(parents=True, exist_ok=True)
    else:
        destino = ruta
        if isinstance(destino, Path):
            destino.parent.mkdir(parents=True, exist_ok=True)

    conexion = sqlite3.connect(str(destino))
    try:
        conexion.executescript(SQL_SCHEMA)
        conexion.commit()
    finally:
        conexion.close()
    return destino


@contextmanager
def obtener_conexion(ruta: Path | str | None = None) -> Iterator[sqlite3.Connection]:
    """Context manager que entrega una conexion configurada.

    - Habilita foreign keys.
    - Devuelve filas como ``sqlite3.Row`` (acceso por nombre).
    - Hace ``commit`` al salir limpio o ``rollback`` ante excepcion.
    """
    destino: Path | str = ruta if ruta is not None else RUTA_DB_DEFAULT
    conexion = sqlite3.connect(str(destino))
    conexion.row_factory = sqlite3.Row
    conexion.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conexion
        conexion.commit()
    except Exception:
        conexion.rollback()
        raise
    finally:
        conexion.close()
