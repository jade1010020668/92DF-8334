"""Modelo de correo enviado (cotizacion)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class CorreoEnviado:
    empresa_id: int
    asunto: str
    cuerpo: str
    mensaje_id: str
    id: int | None = None
    fecha_envio: datetime | None = None
    estado_envio: str = "enviado"

    @staticmethod
    def desde_fila(fila) -> "CorreoEnviado":
        return CorreoEnviado(
            id=fila["id"],
            empresa_id=fila["empresa_id"],
            asunto=fila["asunto"],
            cuerpo=fila["cuerpo"],
            fecha_envio=fila["fecha_envio"],
            estado_envio=fila["estado_envio"] or "enviado",
            mensaje_id=fila["mensaje_id"],
        )
