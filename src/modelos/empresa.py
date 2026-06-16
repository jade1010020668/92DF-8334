"""Modelo de Empresa prospecto."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class Empresa:
    nombre: str
    direccion: str | None = None
    sector_id: int | None = None
    telefono: str | None = None
    sitio_web: str | None = None
    correo: str | None = None
    ciudad: str = "Bogota"
    fuente: str | None = None
    validada_por_ia: bool = False
    notas_ia: str | None = None
    estado: str = "nueva"
    id: int | None = None
    fecha_creacion: datetime | None = None

    @staticmethod
    def desde_fila(fila) -> "Empresa":
        return Empresa(
            id=fila["id"],
            nombre=fila["nombre"],
            sector_id=fila["sector_id"],
            direccion=fila["direccion"],
            telefono=fila["telefono"],
            sitio_web=fila["sitio_web"],
            correo=fila["correo"],
            ciudad=fila["ciudad"] or "Bogota",
            fuente=fila["fuente"],
            validada_por_ia=bool(fila["validada_por_ia"]),
            notas_ia=fila["notas_ia"],
            estado=fila["estado"] or "nueva",
            fecha_creacion=fila["fecha_creacion"],
        )
