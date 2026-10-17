"""Tablero SAMA: estaciones de monitoreo de Antioquia (datos de la API de SIGRAN)."""

import base64
import html
from functools import lru_cache
from pathlib import Path

import folium
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from streamlit_folium import st_folium

import sigran_api
from catalogos import COLOR_BARRAS, COLOR_TIPO, COLOR_TIPO_OTRO, TIPOS_ORDEN

ASSETS = Path(__file__).parent / "assets"
LOGO_ALIADOS = "EAFIT_DAGRAN.png"  # EAFIT, DAGRAN y Gobernación en una sola imagen (513×111 px)
ANCHO_SAMA = 150  # px
ANCHO_ALIADOS = 220  # px; con este ancho la imagen mide casi lo mismo de alto que el logo SAMA

st.set_page_config(page_title="SAMA · Estaciones", page_icon="📍", layout="wide")

st.markdown(
    """
    <style>
    .block-container {padding-top: 2.5rem; padding-bottom: 1rem; max-width: 100%;}
    /* Cuadrícula: las dos tarjetas siempre tienen la misma altura, aunque una etiqueta ocupe dos líneas. */
    .kpis {display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem;}
    .kpi {text-align: center; padding: 1.1rem 1rem .9rem;
          border: 1px solid rgba(11, 42, 74, .2); border-radius: .5rem;}
    /* El tamaño de letra sigue el ancho de la cuadrícula (cqw) para que no se corten palabras. */
    .kpis {container-type: inline-size;}
    .kpi .valor {font-size: clamp(2.6rem, 13cqw, 4.2rem); font-weight: 500; line-height: 1.05;}
    .kpi .etiqueta {font-size: clamp(.9rem, 5.5cqw, 1.7rem); margin-top: .4rem;
                    overflow-wrap: normal; word-break: normal;}
    .total {display: flex; justify-content: space-between; font-weight: 700;
            padding: .3rem .8rem; border-top: 2px solid #C9D1DA;}
    .leyenda {font-size: .85rem; padding-top: .3rem;}
    /* Encabezado: misma cuadrícula 11:9 que el cuerpo; las dos tarjetas tienen siempre la misma altura. */
    .encabezado {display: grid; grid-template-columns: minmax(0, 11fr) minmax(0, 9fr); gap: 1rem;}
    .encabezado .tarjeta {display: flex; align-items: center; padding: .9rem 1rem;
                          border: 1px solid rgba(11, 42, 74, .2); border-radius: .5rem;}
    .encabezado .izq {justify-content: flex-start;}
    .encabezado .der {justify-content: flex-end;}
    .encabezado img {display: block; height: auto; max-width: 100%;}
    </style>
    """,
    unsafe_allow_html=True,
)


def obtener_datos() -> sigran_api.Datos:
    try:
        return sigran_api.cargar_api()
    except Exception as exc:  # la API puede fallar de muchas formas; no se cae el tablero
        respaldo = sigran_api.cargar_respaldo()
        if respaldo is None:
            st.error(f"No se pudo consultar la API de SIGRAN y no hay datos guardados: {exc}")
            st.stop()
        st.warning(
            f"No se pudo consultar la API de SIGRAN ({type(exc).__name__}). "
            f"Se muestran los datos guardados el {respaldo.consultado:%d/%m/%Y %H:%M}."
        )
        return respaldo


@lru_cache(maxsize=None)
def data_uri(ruta: Path) -> str:
    """Imagen incrustada en el HTML, para poder alinearla y igualar la altura de las tarjetas."""
    datos = ruta.read_bytes()
    if ruta.suffix == ".svg":
        mime = "image/svg+xml"
    elif datos[:2] == b"\xff\xd8":  # algunos .png de EAFIT son en realidad JPEG
        mime = "image/jpeg"
    else:
        mime = "image/png"
    return f"data:{mime};base64,{base64.b64encode(datos).decode()}"


def encabezado() -> None:
    sama = data_uri(ASSETS / "logo.svg")
    aliados = data_uri(ASSETS / LOGO_ALIADOS)
    st.markdown(
        '<div class="encabezado">'
        f'<div class="tarjeta izq"><img src="{sama}" style="width:{ANCHO_SAMA}px" alt="SAMA"></div>'
        f'<div class="tarjeta der"><img src="{aliados}" style="width:{ANCHO_ALIADOS}px" '
        'alt="EAFIT, DAGRAN y Gobernación de Antioquia"></div>'
        "</div>",
        unsafe_allow_html=True,
    )


def fmt_fecha(valor) -> str:
    return "—" if pd.isna(valor) else valor.strftime("%d/%m/%Y %H:%M")


def txt(valor) -> str:
    """Texto seguro para HTML; la API deja muchos campos vacíos (NaN en pandas)."""
    return "—" if pd.isna(valor) or valor == "" else html.escape(str(valor))


# (nombre, url, atribución, zoom máximo). El primero se muestra por defecto.
MAPAS_BASE = [
    ("Esri Topográfico",
     "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
     "Tiles © Esri", 19),
    ("Esri Gris claro",
     "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
     "Tiles © Esri", 16),
    ("OpenStreetMap", "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
     "© OpenStreetMap contributors", 19),
]


def mapa(f: pd.DataFrame, datos: sigran_api.Datos, nombres_tipo: dict) -> folium.Map:
    m = folium.Map(
        location=[6.9, -75.5], zoom_start=8, tiles=None, control_scale=True,
        prefer_canvas=True,
    )
    for i, (nombre, url, atribucion, zoom_max) in enumerate(MAPAS_BASE):
        folium.TileLayer(
            tiles=url, attr=atribucion, name=nombre, max_zoom=zoom_max, show=(i == 0)
        ).add_to(m)
    if datos.municipios_geojson:
        folium.GeoJson(
            datos.municipios_geojson, name="Municipios monitoreados", interactive=False,
            style_function=lambda _: {"color": "#8A97A6", "weight": 0.8, "fill": False},
        ).add_to(m)
    if datos.subregiones_geojson:
        folium.GeoJson(
            datos.subregiones_geojson, name="Subregiones", interactive=False,
            style_function=lambda _: {
                "color": "#3B4A5A", "weight": 2, "fill": False, "dashArray": "6 4",
            },
        ).add_to(m)

    grupos = {}
    for t, nombre in nombres_tipo.items():
        grupos[t] = folium.FeatureGroup(name=nombre).add_to(m)
    for e in f.itertuples():
        popup = (
            f"<b>{txt(e.codigo)}</b><br>{txt(e.descripcion)}<br>"
            f"<i>{txt(e.tipo_nombre)}</i><hr style='margin:4px 0'>"
            f"<b>Municipio:</b> {txt(e.municipio_nombre)}<br>"
            f"<b>Subregión:</b> {txt(e.subregion)}<br>"
            f"<b>Fuente:</b> {txt(e.fuente)}<br>"
            f"<b>Ubicación:</b> {txt(e.ubicacion)}<br>"
            f"<b>Conectada:</b> {'Sí' if e.conectado else 'No'}<br>"
            f"<b>Actualizada:</b> {fmt_fecha(e.actualizado)}"
        )
        etiqueta = e.codigo if pd.isna(e.descripcion) else f"{e.codigo} · {e.descripcion}"
        folium.CircleMarker(
            [e.latitud, e.longitud], radius=6,
            color="#FFFFFF" if e.conectado else "#000000",
            weight=1.5 if e.conectado else 3,
            fill=True, fill_color=COLOR_TIPO.get(e.categoria, COLOR_TIPO_OTRO), fill_opacity=0.95,
            tooltip=f"{etiqueta} ({e.tipo_nombre})",
            popup=folium.Popup(popup, max_width=300),
        ).add_to(grupos[e.categoria])

    folium.LayerControl(collapsed=True).add_to(m)
    if len(f):
        m.fit_bounds(
            [[f.latitud.min(), f.longitud.min()], [f.latitud.max(), f.longitud.max()]],
            padding=(30, 30), max_zoom=11,
        )
    return m


def grafico_tipos(conteo: pd.Series, tipos: list[str], nombres_tipo: dict) -> go.Figure:
    valores = [int(conteo.get(t, 0)) for t in tipos]
    fig = go.Figure(
        go.Bar(
            x=valores, y=[nombres_tipo[t] for t in tipos], orientation="h",
            marker_color=COLOR_BARRAS, text=valores, textposition="outside",
            cliponaxis=False, hovertemplate="%{y}: %{x}<extra></extra>",
        )
    )
    fig.update_layout(
        height=280, margin=dict(l=0, r=30, t=10, b=0), bargap=0.35,
        yaxis=dict(autorange="reversed"),
        xaxis=dict(rangemode="tozero", gridcolor="#E3E7EC"),
        plot_bgcolor="white", paper_bgcolor="rgba(0,0,0,0)",
    )
    return fig


def tabla_conteo(f: pd.DataFrame, columna: str, titulo: str, col_nro: str) -> None:
    c = f.groupby(columna).size().rename(col_nro).reset_index()
    c = c.rename(columns={columna: titulo}).sort_values(
        [col_nro, titulo], ascending=[False, True]
    )
    st.dataframe(
        c, hide_index=True, height=320, width="stretch",
        column_config={col_nro: st.column_config.NumberColumn(col_nro, format="%d")},
    )
    st.markdown(
        f'<div class="total"><span>Total</span><span>{int(c[col_nro].sum())}</span></div>',
        unsafe_allow_html=True,
    )


# ---------------------------------------------------------------- aplicación
encabezado()
datos = obtener_datos()
df = datos.estaciones

nombres_tipo = df.drop_duplicates("categoria").set_index("categoria")["categoria_nombre"].to_dict()
tipos = [t for t in TIPOS_ORDEN if t in nombres_tipo] + sorted(
    t for t in nombres_tipo if t not in TIPOS_ORDEN
)

with st.sidebar:
    st.header("Filtros")
    sel_tipos = st.multiselect(
        "Tipo de estación", tipos, format_func=lambda t: nombres_tipo[t], placeholder="Todos"
    )
    sel_sub = st.multiselect(
        "Subregión", sorted(df.subregion.unique(), key=sigran_api.clave), placeholder="Todas"
    )
    base = df[df.subregion.isin(sel_sub)] if sel_sub else df
    sel_mun = st.multiselect(
        "Municipio", sorted(base.municipio_nombre.unique(), key=sigran_api.clave),
        placeholder="Todos",
    )
    st.divider()
    st.caption(f"Última actualización de los datos: {datos.consultado:%d/%m/%Y %H:%M}")
    st.caption("La consulta a la API se repite automáticamente cada 24 horas.")
    if st.button("Actualizar ahora", width="stretch"):
        st.cache_data.clear()
        st.rerun()

f = df
if sel_tipos:
    f = f[f.categoria.isin(sel_tipos)]
if sel_sub:
    f = f[f.subregion.isin(sel_sub)]
if sel_mun:
    f = f[f.municipio_nombre.isin(sel_mun)]

col_mapa, col_der = st.columns([11, 9])

with col_mapa:
    with st.container(border=True):
        st_folium(
            mapa(f, datos, nombres_tipo), height=720, use_container_width=True,
            returned_objects=[], key="mapa",
        )
        por_tipo = f.groupby("categoria").size()
        leyenda = " &nbsp;·&nbsp; ".join(
            f'<span style="color:{COLOR_TIPO.get(t, COLOR_TIPO_OTRO)}">●</span> '
            f"{nombres_tipo[t]} ({int(por_tipo.get(t, 0))})"
            for t in tipos
        )
        if not f.conectado.all():
            leyenda += " &nbsp;·&nbsp; borde negro = sin conexión"
        st.markdown(f'<div class="leyenda">{leyenda}</div>', unsafe_allow_html=True)

with col_der:
    tarjetas = "".join(
        f'<div class="kpi"><div class="valor">{valor}</div>'
        f'<div class="etiqueta">{etiqueta}</div></div>'
        for valor, etiqueta in (
            (len(f), "Estaciones"),
            (f.municipio.nunique(), "Municipios monitoreados"),
        )
    )
    st.markdown(f'<div class="kpis">{tarjetas}</div>', unsafe_allow_html=True)

    with st.container(border=True):
        st.plotly_chart(
            grafico_tipos(por_tipo, tipos, nombres_tipo), width="stretch",
            config={"displayModeBar": False},
        )

    t1, t2 = st.columns(2)
    with t1:
        tabla_conteo(f, "subregion", "Subregión", "Nro estaciones")
    with t2:
        tabla_conteo(f, "municipio_nombre", "Municipio", "Nro. estaciones")

with st.expander("Detalle de estaciones"):
    detalle = f[
        ["codigo", "descripcion", "tipo_nombre", "municipio_nombre", "subregion",
         "fuente", "ubicacion", "conectado", "latitud", "longitud", "actualizado"]
    ].copy()
    detalle["actualizado"] = detalle["actualizado"].map(fmt_fecha)
    detalle.columns = [
        "Código", "Descripción", "Tipo", "Municipio", "Subregión",
        "Fuente", "Ubicación", "Conectada", "Latitud", "Longitud", "Actualizada",
    ]
    st.dataframe(detalle, hide_index=True, width="stretch")
    st.download_button(
        "Descargar CSV", detalle.to_csv(index=False).encode("utf-8-sig"),
        file_name="estaciones_sama.csv", mime="text/csv",
    )

st.caption(
    "Fuente: API de SIGRAN, Gobernación de Antioquia (sigran.antioquia.gov.co). "
    "No incluye estaciones CoastSnap."
)
