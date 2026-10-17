import type {
    UltimoDatoFeatureCollection,
    UltimoDatoRow,
    PluvioProperties,
    MeteoProperties,
    NivelProperties,
    UltimoDatoTipo,
} from '@/types/ultimoDato';

function getBase(): string {
    return (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
}

// ─── GeoJSON → rows ───────────────────────────────────────────────────────────

/**
 * Deduplicates an array of rows by `codigo`, keeping the row with the most
 * recent `updated_at`. The API (especially /api/niveles) can return multiple
 * features per station (one per measurement section), which would break
 * DataGrid pagination due to duplicate IDs.
 */
function deduplicateByCodigo(rows: UltimoDatoRow[]): UltimoDatoRow[] {
    const map = new Map<string, UltimoDatoRow>();
    for (const row of rows) {
        const existing = map.get(row.codigo);
        if (!existing) {
            map.set(row.codigo, row);
        } else {
            const existingTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
            const rowTime = row.updated_at ? new Date(row.updated_at).getTime() : 0;
            if (rowTime > existingTime) {
                map.set(row.codigo, row);
            }
        }
    }
    // Re-assign stable numeric-style IDs after deduplication
    return Array.from(map.values()).map((row, i) => ({ ...row, id: `${row.tipo}-${i}-${row.codigo}` }));
}

function geoJSONToRows<P extends PluvioProperties | MeteoProperties | NivelProperties>(
    collection: UltimoDatoFeatureCollection<P>,
    tipo: UltimoDatoTipo,
): UltimoDatoRow[] {
    const rows = collection.features.map((feature) => {
        const p = feature.properties;
        const [longitud, latitud] = feature.geometry.coordinates;

        const base: UltimoDatoRow = {
            id: p.codigo,
            codigo: p.codigo,
            nombreEstacion: p.nombreEstacion,
            municipio: p.municipio,
            region: p.region,
            tipo,
            color: p.color,
            sum_amarillo: p.sum_amarillo,
            sum_naranja: p.sum_naranja,
            sum_rojo: p.sum_rojo,
            activo: p.activo,
            conectado: p.conectado,
            created_at: p.created_at,
            updated_at: p.updated_at,
            latitud,
            longitud,
        };

        if (tipo === 'meteorologia') {
            const mp = p as MeteoProperties;
            return {
                ...base,
                temperatura: mp.temperatura,
                precipitacion: mp.precipitacion,
                humedad_relativa: mp.humedad_relativa,
                velocidad_viento: mp.velocidad_viento,
                direccion_viento: mp.direccion_viento,
            };
        }

        if (tipo === 'nivel') {
            const np = p as NivelProperties;
            return {
                ...base,
                fuente: np.fuente,
                nivelActual: np.nivelActual,
                caudalActual: np.caudalActual,
            };
        }

        return base;
    });
    return deduplicateByCodigo(rows);
}

// ─── Individual fetchers ──────────────────────────────────────────────────────

async function fetchPluviometros(): Promise<UltimoDatoRow[]> {
    const response = await fetch(`${getBase()}/v1/pluviometros`);
    if (!response.ok) throw new Error(`Error al obtener pluviómetros: ${response.statusText}`);
    const data = await response.json() as UltimoDatoFeatureCollection<PluvioProperties>;
    return geoJSONToRows(data, 'pluviometro');
}

async function fetchMeteorologiaEstaciones(): Promise<UltimoDatoRow[]> {
    const response = await fetch(`${getBase()}/v1/meteorologia`);
    if (!response.ok) throw new Error(`Error al obtener meteorología: ${response.statusText}`);
    const data = await response.json() as UltimoDatoFeatureCollection<MeteoProperties>;
    return geoJSONToRows(data, 'meteorologia');
}

async function fetchNivelesEstaciones(): Promise<UltimoDatoRow[]> {
    const response = await fetch(`${getBase()}/v1/niveles`);
    if (!response.ok) throw new Error(`Error al obtener niveles: ${response.statusText}`);
    const data = await response.json() as UltimoDatoFeatureCollection<NivelProperties>;
    return geoJSONToRows(data, 'nivel');
}

// ─── Combined fetcher ─────────────────────────────────────────────────────────

export async function fetchUltimoDato(): Promise<UltimoDatoRow[]> {
    const [pluvio, meteo, nivel] = await Promise.all([
        fetchPluviometros(),
        fetchMeteorologiaEstaciones(),
        fetchNivelesEstaciones(),
    ]);
    return [...pluvio, ...meteo, ...nivel];
}
