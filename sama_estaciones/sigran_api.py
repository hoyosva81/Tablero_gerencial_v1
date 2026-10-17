"""Descarga y normalización de los datos de la API de SIGRAN."""

import json
import os
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import truststore

# Usa el almacén de certificados del sistema. Necesario cuando un antivirus
# (p. ej. Avast) inspecciona HTTPS y re-firma con su propia CA, que Python
# no conoce. Debe ejecutarse antes de importar requests.
truststore.inject_into_ssl()

import requests  # noqa: E402
import streamlit as st  # noqa: E402

from catalogos import MUNICIPIOS, SUBREGIONES, TIPOS_AGRUPADOS, TIPOS_EXCLUIDOS  # noqa: E402

BASE_URL = os.environ.get("SIGRAN_BASE_URL", "https://sigran.antioquia.gov.co/api/v1")
TTL_SEGUNDOS = 24 * 60 * 60
SNAPSHOT = Path(__file__).parent / "data" / "snapshot.json"
BOGOTA = timezone(timedelta(hours=-5))  # Colombia no tiene horario de verano


@dataclass
class Datos:
    estaciones: pd.DataFrame
    subregiones_geojson: dict | None
    municipios_geojson: dict | None
    consultado: datetime
    desde_respaldo: bool = False


def _get(ruta: str) -> list[dict]:
    resp = requests.get(
        f"{BASE_URL}/{ruta}/", params={"format": "json"}, timeout=(10, 60)
    )
    resp.raise_for_status()
    resp.encoding = "utf-8"
    return resp.json()["values"]


def descargar_crudo() -> dict:
    """Consulta las tres rutas. `estaciones` es obligatoria; si fallan las otras
    dos se usan los catálogos de `catalogos.py` y el mapa pierde los polígonos."""
    crudo = {
        "consultado": datetime.now(BOGOTA).isoformat(),
        "estaciones": _get("estaciones"),
        "municipios": None,
        "regiones": None,
    }
    for clave in ("municipios", "regiones"):
        try:
            crudo[clave] = _get(clave)
        except (requests.RequestException, ValueError, KeyError):
            pass
    return crudo


def clave(nombre: str) -> str:
    """Nombre sin tildes, espacios ni mayúsculas ('Don Matías' == 'Donmatías')."""
    sin_tildes = unicodedata.normalize("NFD", nombre)
    return "".join(c for c in sin_tildes if c.isalnum() and ord(c) < 128).lower()


def _redondear(coords, decimales=4):
    """Reduce la precisión de las coordenadas (~11 m) para aligerar el mapa."""
    if coords and isinstance(coords[0], (int, float)):
        return [round(c, decimales) for c in coords]
    return [_redondear(c, decimales) for c in coords]


def _feature(registro: dict, propiedades: dict) -> dict:
    geom = registro["poligono"]
    return {
        "type": "Feature",
        "properties": propiedades,
        "geometry": {"type": geom["type"], "coordinates": _redondear(geom["coordinates"])},
    }


def construir(crudo: dict) -> Datos:
    municipios = crudo.get("municipios")
    regiones = crudo.get("regiones")

    # La tabla de SAMA (catalogos.py) fija la ortografía; la API aporta los
    # nombres de los códigos que la tabla no tenga (p. ej. 61 y 108).
    nombre_mun = {m["id"]: m["nombre"] for m in municipios} if municipios else {}
    nombre_mun.update(MUNICIPIOS)
    nombre_reg = {r["id"]: r["nombre"] for r in regiones} if regiones else {}
    nombre_reg.update(SUBREGIONES)

    df = pd.DataFrame(crudo["estaciones"])
    df = df[df["activo"] & ~df["tipo"].isin(TIPOS_EXCLUIDOS)].copy()
    df["latitud"] = pd.to_numeric(df["latitud"], errors="coerce")
    df["longitud"] = pd.to_numeric(df["longitud"], errors="coerce")
    df = df.dropna(subset=["latitud", "longitud"])
    # `tipo` / `tipo_nombre` son los de la API; `categoria` agrupa para contar y filtrar.
    df["categoria"] = df["tipo"].map(lambda t: TIPOS_AGRUPADOS.get(t, t))
    nombre_categoria = df.drop_duplicates("tipo").set_index("tipo")["tipo_nombre"]
    df["categoria_nombre"] = df["categoria"].map(nombre_categoria).fillna(df["tipo_nombre"])
    df["municipio_nombre"] = df["municipio"].map(
        lambda i: nombre_mun.get(i, f"Municipio {i}")
    )
    df["subregion"] = df["region"].map(lambda i: nombre_reg.get(i, f"Subregión {i}"))
    df["actualizado"] = pd.to_datetime(
        df["updated"], utc=True, format="ISO8601", errors="coerce"
    ).dt.tz_convert(BOGOTA)
    df = df.sort_values(["subregion", "municipio_nombre", "codigo"]).reset_index(drop=True)

    subregiones_geojson = municipios_geojson = None
    if regiones:
        subregiones_geojson = {
            "type": "FeatureCollection",
            "features": [_feature(r, {"nombre": r["nombre"]}) for r in regiones],
        }
    if municipios:
        # Los polígonos se buscan por nombre: los ids de la API no coinciden con
        # los códigos de SAMA (p. ej. 108).
        por_clave = {clave(m["nombre"]): m for m in municipios}
        features = []
        for nombre in sorted(df["municipio_nombre"].unique()):
            m = por_clave.get(clave(nombre))
            if m:
                features.append(_feature(m, {"nombre": nombre}))
        municipios_geojson = {"type": "FeatureCollection", "features": features}

    return Datos(
        estaciones=df,
        subregiones_geojson=subregiones_geojson,
        municipios_geojson=municipios_geojson,
        consultado=datetime.fromisoformat(crudo["consultado"]),
    )


@st.cache_data(ttl=TTL_SEGUNDOS, show_spinner="Consultando la API de SIGRAN…")
def cargar_api() -> Datos:
    """Datos frescos de la API, en caché 24 h. Si la API falla lanza la excepción,
    que st.cache_data no guarda, así el siguiente intento vuelve a consultarla."""
    crudo = descargar_crudo()
    if crudo["municipios"] and crudo["regiones"]:
        SNAPSHOT.parent.mkdir(exist_ok=True)
        SNAPSHOT.write_text(json.dumps(crudo, ensure_ascii=False), encoding="utf-8")
    return construir(crudo)


def cargar_respaldo() -> Datos | None:
    """Última respuesta completa guardada en disco, o None si no existe."""
    if not SNAPSHOT.exists():
        return None
    datos = construir(json.loads(SNAPSHOT.read_text(encoding="utf-8")))
    datos.desde_respaldo = True
    return datos
