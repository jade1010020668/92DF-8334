"""Modelo de respuesta recibida de una empresa."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class Respuesta:
    empresa_id: int
    correo_enviado_id: int
    asunto: str | None = None
    cuerpo: str | None = None
    clasificacion_ia: str = "sin_clasificar"
    resumen_ia: str | None = None
    notificada_whatsapp: bool = False
    id: int | None = None
    fecha_recepcion: datetime | None = None

    @staticmethod
    def desde_fila(fila) -> "Respuesta":
        return Respuesta(
            id=fila["id"],
            empresa_id=fila["empresa_id"],
            correo_enviado_id=fila["correo_enviado_id"],
            asunto=fila["asunto"],
            cuerpo=fila["cuerpo"],
            fecha_recepcion=fila["fecha_recepcion"],
            clasificacion_ia=fila["clasificacion_ia"] or "sin_clasificar",
            resumen_ia=fila["resumen_ia"],
            notificada_whatsapp=bool(fila["notificada_whatsapp"]),
        )
