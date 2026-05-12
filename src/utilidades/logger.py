"""Logger central del sistema.

Escribe a logs/sistema.log con rotacion diaria.
El usuario final (papa) nunca ve estos logs; son para Diego.
"""

from __future__ import annotations

import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

RAIZ_PROYECTO = Path(__file__).resolve().parents[2]
DIR_LOGS = RAIZ_PROYECTO / "logs"
ARCHIVO_LOG = DIR_LOGS / "sistema.log"

_FORMATO = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_FECHA = "%Y-%m-%d %H:%M:%S"

_configurado = False


def obtener_logger(nombre: str = "dotacion") -> logging.Logger:
    """Devuelve un logger configurado. Idempotente.

    Los handlers se montan una sola vez sobre el logger raiz "dotacion".
    Los loggers hijos (p.ej. "dotacion.scraper") heredan via propagacion.
    """
    global _configurado

    if not _configurado:
        DIR_LOGS.mkdir(parents=True, exist_ok=True)

        raiz = logging.getLogger("dotacion")
        raiz.setLevel(logging.INFO)
        raiz.propagate = False

        handler_archivo = TimedRotatingFileHandler(
            ARCHIVO_LOG,
            when="midnight",
            interval=1,
            backupCount=14,
            encoding="utf-8",
        )
        handler_archivo.setFormatter(logging.Formatter(_FORMATO, _FECHA))
        handler_archivo.setLevel(logging.INFO)

        handler_consola = logging.StreamHandler()
        handler_consola.setFormatter(logging.Formatter(_FORMATO, _FECHA))
        handler_consola.setLevel(logging.WARNING)

        raiz.addHandler(handler_archivo)
        raiz.addHandler(handler_consola)

        _configurado = True

    if nombre == "dotacion" or nombre.startswith("dotacion."):
        return logging.getLogger(nombre)
    return logging.getLogger(f"dotacion.{nombre}")
