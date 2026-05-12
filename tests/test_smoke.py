"""Test de humo: verifica que la infraestructura basica esta en su lugar."""

from __future__ import annotations

from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parents[1]


def test_archivos_basicos_existen() -> None:
    assert (RAIZ / ".gitignore").is_file()
    assert (RAIZ / ".env.ejemplo").is_file()
    assert (RAIZ / "requirements.txt").is_file()
    assert (RAIZ / "config" / "configuracion.yaml").is_file()


def test_estructura_carpetas() -> None:
    for carpeta in [
        "src",
        "src/paginas",
        "src/servicios",
        "src/modelos",
        "src/utilidades",
        "plantillas",
        "whatsapp_service",
        "db",
        "logs",
        "tests",
    ]:
        assert (RAIZ / carpeta).is_dir(), f"Falta la carpeta {carpeta}"


def test_logger_escribe_a_archivo(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from src.utilidades import logger as modulo_logger

    dir_temporal = tmp_path / "logs"
    dir_temporal.mkdir()
    archivo_temporal = dir_temporal / "sistema.log"

    monkeypatch.setattr(modulo_logger, "DIR_LOGS", dir_temporal)
    monkeypatch.setattr(modulo_logger, "ARCHIVO_LOG", archivo_temporal)
    monkeypatch.setattr(modulo_logger, "_configurado", False)

    import logging

    logging.getLogger("dotacion").handlers.clear()

    log = modulo_logger.obtener_logger("dotacion.test_smoke")
    mensaje = "smoke test escribiendo a archivo"
    log.info(mensaje)

    for handler in logging.getLogger("dotacion").handlers:
        handler.flush()

    assert archivo_temporal.is_file()
    contenido = archivo_temporal.read_text(encoding="utf-8")
    assert mensaje in contenido


def test_gitignore_protege_secretos() -> None:
    contenido = (RAIZ / ".gitignore").read_text(encoding="utf-8")
    for patron in [".env", "db/*.db", "logs/", "node_modules/", ".wwebjs_auth/"]:
        assert patron in contenido, f"El .gitignore no protege {patron}"
