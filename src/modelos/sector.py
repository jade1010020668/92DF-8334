"""Modelo de Sector buscado (p.ej. 'empresas de plasticos')."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Sector:
    nombre: str
    palabras_clave: str  # separadas por '|' o JSON serializado
    id: int | None = None
    fecha_busqueda: datetime | None = None
    total_empresas_encontradas: int = 0

    @staticmethod
    def desde_fila(fila) -> "Sector":
        return Sector(
            id=fila["id"],
            nombre=fila["nombre"],
            palabras_clave=fila["palabras_clave"],
            fecha_busqueda=fila["fecha_busqueda"],
            total_empresas_encontradas=fila["total_empresas_encontradas"] or 0,
        )
