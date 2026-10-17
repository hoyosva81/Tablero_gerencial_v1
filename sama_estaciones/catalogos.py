"""Tablas de SAMA y constantes de presentación.

Los códigos de municipio y subregión de cada estación son los del monitoreo,
aunque la coordenada caiga fuera del polígono. Estas tablas fijan la ortografía
de los nombres (p. ej. «Don Matías»); la API completa los códigos que falten.
Los códigos 61 (Remedios) y 108 (Yondó) se dejan fuera a propósito: el usuario
decidió seguir la API, porque su tabla traía 108 como Remedios y no tenía el 61.
"""

# id del municipio (campo `municipio` de la estación) -> nombre
MUNICIPIOS = {
    1: "Cocorná", 6: "Rionegro", 8: "Marinilla", 9: "San Pedro de Urabá",
    14: "Caramanta", 16: "Jericó", 17: "Pueblorrico", 18: "Sonsón",
    24: "Puerto Berrío", 25: "Jardín", 27: "San Vicente", 29: "Anzá",
    33: "Bello", 35: "La Pintada", 37: "Liborina", 40: "Gómez Plata",
    48: "Uramita", 49: "San Andrés de Cuerquia", 50: "Murindó", 58: "Mutatá",
    62: "Vegachí", 63: "Amalfi", 64: "Dabeiba", 68: "Briceño",
    71: "Andes", 72: "Betania", 73: "Támesis", 74: "Ciudad Bolívar",
    77: "Montebello", 78: "Fredonia", 80: "Santa Bárbara", 81: "Venecia",
    83: "Puerto Triunfo", 84: "La Ceja", 85: "Salgar", 89: "Betulia",
    93: "San Carlos", 96: "Caracolí", 100: "San Pedro de los Milagros",
    101: "San Roque", 102: "Santo Domingo", 103: "Don Matías", 104: "Cisneros",
    105: "Urrao", 113: "Zaragoza", 115: "Chigorodó",
    116: "Carepa", 117: "Cáceres", 118: "El Bagre", 119: "Apartadó",
    120: "Caucasia", 121: "Nechí", 122: "Turbo", 123: "Necoclí",
    124: "San Juan de Urabá", 125: "Arboletes",
}

# id de la subregión (campo `region` de la estación) -> nombre
SUBREGIONES = {
    1: "Valle de Aburrá",
    2: "Bajo Cauca",
    3: "Magdalena Medio",
    4: "Nordeste",
    5: "Norte",
    6: "Occidente",
    7: "Oriente",
    8: "Suroeste",
    9: "Urabá",
}

# Tipos de estación que no se cuentan ni se dibujan (decisión del usuario).
TIPOS_EXCLUIDOS = {"COASTSNAP"}

# Tipos que se cuentan dentro de otra categoría (decisión del usuario): los
# sensores de nivel con cámara se agrupan con los sensores de nivel.
TIPOS_AGRUPADOS = {"LIMNIGRAFICA_CAMARA": "LIMNIGRAFICA"}

# Orden de presentación y color de cada categoría (el nombre visible viene de la API).
TIPOS_ORDEN = ["ALARMA", "METEOROLOGIA", "PLUVIOGRAFICA", "LIMNIGRAFICA"]
COLOR_TIPO = {
    "ALARMA": "#D62728",
    "METEOROLOGIA": "#2CA02C",
    "PLUVIOGRAFICA": "#1F77B4",
    "LIMNIGRAFICA": "#FF7F0E",
}
COLOR_TIPO_OTRO = "#7F7F7F"

COLOR_BARRAS = "#1E9FD0"
