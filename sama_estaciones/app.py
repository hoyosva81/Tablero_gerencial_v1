"""Tablero SAMA: estaciones de monitoreo de Antioquia (datos de la API de SIGRAN), en Dash.

Ejecutar:  python app.py   (sirve con waitress en http://localhost:8502; puerto con la variable PORT)
"""

import os

import dash_leaflet as dl
import pandas as pd
import plotly.graph_objects as go
from dash import Dash, Input, Output, State, ctx, dash_table, dcc, html
from dash.exceptions import PreventUpdate

import sigran_api
from catalogos import COLOR_BARRAS, COLOR_TIPO, COLOR_TIPO_OTRO, TIPOS_ORDEN

LOGO_ALIADOS = "EAFIT_DAGRAN.png"  # EAFIT, DAGRAN y Gobernación en una sola imagen (513×111 px)
ANCHO_SAMA = 150  # px
ANCHO_ALIADOS = 220  # px; con este ancho la imagen mide casi lo mismo de alto que el logo SAMA
REVISION_MS = 60 * 60 * 1000  # la página revisa cada hora; la caché de 24 h decide si consulta la API

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

DETALLE = {  # columna del DataFrame -> encabezado de la tabla de detalle y del CSV
    "codigo": "Código", "descripcion": "Descripción", "tipo_nombre": "Tipo",
    "municipio_nombre": "Municipio", "subregion": "Subregión", "fuente": "Fuente",
    "ubicacion": "Ubicación", "conectado": "Conectada", "latitud": "Latitud",
    "longitud": "Longitud", "actualizado": "Actualizada",
}

FUENTE = '"Source Sans 3", "Source Sans Pro", "Segoe UI", system-ui, sans-serif'  # igual que style.css
ESTILO_CELDA = {"fontFamily": FUENTE, "fontSize": ".9rem", "padding": "6px 10px",
                "textAlign": "left", "border": "none", "borderBottom": "1px solid #E3E7EC"}
ESTILO_ENCABEZADO = {"fontWeight": 600, "backgroundColor": "#F6F8FA", "color": "#5B6B7B",
                     "whiteSpace": "normal", "height": "auto"}

app = Dash(__name__, title="SAMA · Estaciones", update_title=None)
server = app.server  # para waitress o gunicorn


# ---------------------------------------------------------------- utilidades

def val(valor) -> str:
    """La API deja muchos campos vacíos (NaN en pandas)."""
    return "—" if pd.isna(valor) or valor == "" else str(valor)


def fmt_fecha(valor) -> str:
    return "—" if pd.isna(valor) else valor.strftime("%d/%m/%Y %H:%M")


def tipos_de(df: pd.DataFrame) -> tuple[list[str], dict]:
    nombres = df.drop_duplicates("categoria").set_index("categoria")["categoria_nombre"].to_dict()
    tipos = [t for t in TIPOS_ORDEN if t in nombres] + sorted(t for t in nombres if t not in TIPOS_ORDEN)
    return tipos, nombres


def filtrar(df: pd.DataFrame, tipos, subregiones, municipios) -> pd.DataFrame:
    if tipos:
        df = df[df.categoria.isin(tipos)]
    if subregiones:
        df = df[df.subregion.isin(subregiones)]
    if municipios:
        df = df[df.municipio_nombre.isin(municipios)]
    return df


def texto_ultima(datos: sigran_api.Datos) -> str:
    return f"Última actualización de los datos: {datos.consultado:%d/%m/%Y %H:%M}"


def detalle(f: pd.DataFrame) -> pd.DataFrame:
    d = f[list(DETALLE)].copy()
    d["actualizado"] = d["actualizado"].map(fmt_fecha)
    d["conectado"] = d["conectado"].map({True: "Sí", False: "No"})
    return d.fillna("").rename(columns=DETALLE)


# ---------------------------------------------------------------- componentes

def encabezado() -> html.Div:
    return html.Div(className="encabezado", children=[
        html.Div(className="tarjeta izq", children=html.Img(
            src=app.get_asset_url("logo.svg"), alt="SAMA", style={"width": f"{ANCHO_SAMA}px"})),
        html.Div(className="tarjeta der", children=html.Img(
            src=app.get_asset_url(LOGO_ALIADOS), alt="EAFIT, DAGRAN y Gobernación de Antioquia",
            style={"width": f"{ANCHO_ALIADOS}px"})),
    ])


def mapa(datos: sigran_api.Datos) -> dl.Map:
    capas = [
        dl.BaseLayer(dl.TileLayer(url=url, attribution=atribucion, maxZoom=zoom_max),
                     name=nombre, checked=(i == 0))
        for i, (nombre, url, atribucion, zoom_max) in enumerate(MAPAS_BASE)
    ]
    if datos.municipios_geojson:
        capas.append(dl.Overlay(dl.GeoJSON(
            data=datos.municipios_geojson,
            style={"color": "#8A97A6", "weight": 0.8, "fill": False},
        ), name="Municipios monitoreados", checked=True))
    if datos.subregiones_geojson:
        capas.append(dl.Overlay(dl.GeoJSON(
            data=datos.subregiones_geojson,
            style={"color": "#3B4A5A", "weight": 2, "fill": False, "dashArray": "6 4"},
        ), name="Subregiones", checked=True))
    capas.append(dl.Overlay(dl.LayerGroup(id="estaciones"), name="Estaciones", checked=True))
    return dl.Map(
        id="mapa", center=[6.9, -75.5], zoom=8, style={"height": "720px"},
        children=[dl.LayersControl(capas, collapsed=True), dl.ScaleControl(position="bottomleft")],
    )


def popup(e) -> html.Div:
    filas = [("Municipio", e.municipio_nombre), ("Subregión", e.subregion), ("Fuente", e.fuente),
             ("Ubicación", e.ubicacion), ("Conectada", "Sí" if e.conectado else "No"),
             ("Actualizada", fmt_fecha(e.actualizado))]
    return html.Div(className="popup", children=[
        html.B(e.codigo), html.Br(), val(e.descripcion), html.Br(), html.I(e.tipo_nombre), html.Hr(),
        *[html.Div([html.B(f"{etiqueta}: "), val(valor)]) for etiqueta, valor in filas],
    ])


def marcadores(f: pd.DataFrame) -> list:
    salida = []
    for e in f.itertuples():
        etiqueta = e.codigo if pd.isna(e.descripcion) else f"{e.codigo} · {e.descripcion}"
        salida.append(dl.CircleMarker(
            center=[e.latitud, e.longitud], radius=6, className="estacion",
            color="#FFFFFF" if e.conectado else "#000000", weight=1.5 if e.conectado else 3,
            fill=True, fillColor=COLOR_TIPO.get(e.categoria, COLOR_TIPO_OTRO), fillOpacity=0.95,
            children=[dl.Tooltip(f"{etiqueta} ({e.tipo_nombre})"), dl.Popup(popup(e), maxWidth=300)],
        ))
    return salida


def grafico_tipos(conteo: pd.Series, tipos: list[str], nombres_tipo: dict) -> go.Figure:
    valores = [int(conteo.get(t, 0)) for t in tipos]
    fig = go.Figure(go.Bar(
        x=valores, y=[nombres_tipo[t] for t in tipos], orientation="h",
        marker_color=COLOR_BARRAS, text=valores, textposition="outside",
        cliponaxis=False, hovertemplate="%{y}: %{x}<extra></extra>",
    ))
    fig.update_layout(
        height=280, margin=dict(l=0, r=30, t=10, b=0), bargap=0.35,
        yaxis=dict(autorange="reversed"), xaxis=dict(rangemode="tozero", gridcolor="#E3E7EC"),
        plot_bgcolor="white", paper_bgcolor="rgba(0,0,0,0)",
    )
    return fig


def conteo(f: pd.DataFrame, columna: str) -> tuple[list[dict], int]:
    c = f.groupby(columna).size().rename("n").reset_index().rename(columns={columna: "nombre"})
    c = c.sort_values(["n", "nombre"], ascending=[False, True])
    return c.to_dict("records"), int(c["n"].sum())


def tabla_conteo(id_: str, titulo: str, col_nro: str) -> html.Div:
    return html.Div(className="tarjeta tabla", children=[
        dash_table.DataTable(
            id=id_, columns=[{"name": titulo, "id": "nombre"},
                             {"name": col_nro, "id": "n", "type": "numeric"}],
            fixed_rows={"headers": True}, style_table={"height": "320px", "overflowY": "auto"},
            style_cell=ESTILO_CELDA, style_header=ESTILO_ENCABEZADO,
            style_cell_conditional=[{"if": {"column_id": "nombre"}, "width": "62%"},
                                    {"if": {"column_id": "n"}, "textAlign": "right", "width": "38%"}],
        ),
        html.Div(className="total", children=[html.Span("Total"), html.Span(id=f"{id_}-total")]),
    ])


def kpi(id_: str, etiqueta: str) -> html.Div:
    return html.Div(className="kpi", children=[
        html.Div(id=id_, className="valor"), html.Div(etiqueta, className="etiqueta"),
    ])


def layout():
    """Se arma en cada carga de página, para que filtros y fecha reflejen los datos vigentes."""
    try:
        datos = sigran_api.obtener()
    except Exception as exc:
        return html.Div(className="error", children=(
            f"No se pudo consultar la API de SIGRAN y no hay datos guardados: {exc}"))
    df = datos.estaciones
    tipos, nombres = tipos_de(df)
    return html.Div(className="pagina", children=[
        dcc.Store(id="version", data=datos.consultado.isoformat()),
        dcc.Interval(id="revision", interval=REVISION_MS),
        dcc.Download(id="descarga"),
        html.Aside(className="barra", children=[
            html.H2("Filtros"),
            html.Label("Tipo de estación", htmlFor="f-tipo"),
            dcc.Dropdown(id="f-tipo", multi=True, placeholder="Todos",
                         options=[{"label": nombres[t], "value": t} for t in tipos]),
            html.Label("Subregión", htmlFor="f-sub"),
            dcc.Dropdown(id="f-sub", multi=True, placeholder="Todas",
                         options=sorted(df.subregion.unique(), key=sigran_api.clave)),
            html.Label("Municipio", htmlFor="f-mun"),
            dcc.Dropdown(id="f-mun", multi=True, placeholder="Todos"),
            html.Hr(),
            html.P(texto_ultima(datos), id="ultima", className="nota"),
            html.P("La consulta a la API se repite automáticamente cada 24 horas.", className="nota"),
            html.Button("Actualizar ahora", id="actualizar", className="boton"),
        ]),
        html.Main(className="contenido", children=[
            encabezado(),
            html.Div(datos.aviso, id="aviso", className="aviso", hidden=not datos.aviso),
            html.Div(className="cuerpo", children=[
                html.Div(className="tarjeta", children=[
                    mapa(datos), html.Div(id="leyenda", className="leyenda"),
                ]),
                html.Div(className="panel", children=[
                    html.Div(className="kpis", children=[
                        kpi("kpi-estaciones", "Estaciones"),
                        kpi("kpi-municipios", "Municipios monitoreados"),
                    ]),
                    html.Div(className="tarjeta", children=dcc.Graph(
                        id="grafico", config={"displayModeBar": False})),
                    html.Div(className="tablas", children=[
                        tabla_conteo("t-sub", "Subregión", "Nro estaciones"),
                        tabla_conteo("t-mun", "Municipio", "Nro. estaciones"),
                    ]),
                ]),
            ]),
            html.Details(className="tarjeta detalle", children=[
                html.Summary("Detalle de estaciones"),
                dash_table.DataTable(
                    id="t-detalle", columns=[{"name": c, "id": c} for c in DETALLE.values()],
                    page_size=15, sort_action="native", filter_action="native",
                    style_table={"overflowX": "auto"}, style_cell=ESTILO_CELDA,
                    style_header=ESTILO_ENCABEZADO,
                ),
                html.Button("Descargar CSV", id="btn-csv", className="boton boton-auto"),
            ]),
            html.P("Fuente: API de SIGRAN, Gobernación de Antioquia (sigran.antioquia.gov.co). "
                   "No incluye estaciones CoastSnap.", className="nota"),
        ]),
    ])


app.layout = layout


# ---------------------------------------------------------------- callbacks

@app.callback(
    Output("version", "data"), Output("ultima", "children"),
    Output("aviso", "children"), Output("aviso", "hidden"),
    Input("actualizar", "n_clicks"), Input("revision", "n_intervals"),
    State("version", "data"),
    prevent_initial_call=True,
)
def refrescar(_clics, _intervalos, version):
    """Botón 'Actualizar ahora' (fuerza la consulta) y revisión horaria (respeta la caché)."""
    forzar = ctx.triggered_id == "actualizar"
    try:
        datos = sigran_api.obtener(forzar=forzar)
    except Exception:
        raise PreventUpdate  # sin API ni respaldo: se conservan los datos en pantalla
    nueva = datos.consultado.isoformat()
    if nueva == version and not forzar:
        raise PreventUpdate  # nada nuevo: no se mueve el mapa del usuario
    return nueva, texto_ultima(datos), datos.aviso, not datos.aviso


@app.callback(
    Output("f-mun", "options"), Output("f-mun", "value"),
    Input("f-sub", "value"), Input("version", "data"), State("f-mun", "value"),
)
def opciones_municipio(subregiones, _version, actuales):
    df = sigran_api.obtener().estaciones
    base = df[df.subregion.isin(subregiones)] if subregiones else df
    nombres = sorted(base.municipio_nombre.unique(), key=sigran_api.clave)
    return nombres, [m for m in (actuales or []) if m in nombres]


@app.callback(
    Output("estaciones", "children"), Output("mapa", "viewport"), Output("leyenda", "children"),
    Output("kpi-estaciones", "children"), Output("kpi-municipios", "children"),
    Output("grafico", "figure"),
    Output("t-sub", "data"), Output("t-sub-total", "children"),
    Output("t-mun", "data"), Output("t-mun-total", "children"),
    Output("t-detalle", "data"),
    Input("f-tipo", "value"), Input("f-sub", "value"), Input("f-mun", "value"),
    Input("version", "data"),
)
def actualizar_tablero(sel_tipos, sel_sub, sel_mun, _version):
    df = sigran_api.obtener().estaciones
    tipos, nombres = tipos_de(df)
    f = filtrar(df, sel_tipos, sel_sub, sel_mun)
    por_tipo = f.groupby("categoria").size()

    viewport = {"center": [6.9, -75.5], "zoom": 8}
    if len(f):
        viewport = {
            "bounds": [[float(f.latitud.min()), float(f.longitud.min())],
                       [float(f.latitud.max()), float(f.longitud.max())]],
            "transition": "flyToBounds", "options": {"padding": [30, 30], "maxZoom": 11},
        }

    leyenda = []
    for t in tipos:
        if leyenda:
            leyenda.append(" · ")
        leyenda += [html.Span("●", style={"color": COLOR_TIPO.get(t, COLOR_TIPO_OTRO)}),
                    f" {nombres[t]} ({int(por_tipo.get(t, 0))})"]
    if not f.conectado.all():
        leyenda.append(" · borde negro = sin conexión")

    filas_sub, total_sub = conteo(f, "subregion")
    filas_mun, total_mun = conteo(f, "municipio_nombre")
    return (
        marcadores(f), viewport, leyenda,
        len(f), f.municipio.nunique(),
        grafico_tipos(por_tipo, tipos, nombres),
        filas_sub, total_sub, filas_mun, total_mun,
        detalle(f).to_dict("records"),
    )


@app.callback(
    Output("descarga", "data"), Input("btn-csv", "n_clicks"),
    State("f-tipo", "value"), State("f-sub", "value"), State("f-mun", "value"),
    prevent_initial_call=True,
)
def descargar_csv(_clics, sel_tipos, sel_sub, sel_mun):
    f = filtrar(sigran_api.obtener().estaciones, sel_tipos, sel_sub, sel_mun)
    contenido = detalle(f).to_csv(index=False).encode("utf-8-sig")  # BOM: Excel lee bien las tildes
    return dcc.send_bytes(contenido, "estaciones_sama.csv")


if __name__ == "__main__":
    # waitress y no app.run(): el servidor de desarrollo de Flask cortaba a veces la
    # descarga de los paquetes JS de Dash en Windows y la página quedaba en "Loading...".
    from waitress import serve

    puerto = int(os.environ.get("PORT", "8502"))
    print(f"Tablero SAMA en http://localhost:{puerto}")
    serve(server, host="127.0.0.1", port=puerto, threads=8)
