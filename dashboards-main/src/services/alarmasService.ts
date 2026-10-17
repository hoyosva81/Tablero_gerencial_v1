import type { AlarmPagedGeoJSON, AlarmRow } from '@/types/alarmas';

// Convierte el GeoJSON paginado de la API a filas planas para el DataGrid
export function geoJSONToRows(geoJSON: AlarmPagedGeoJSON): AlarmRow[] {
    return geoJSON.features.map((feature) => ({
        ...feature.properties,
        longitud: feature.geometry.coordinates[0],
        latitud: feature.geometry.coordinates[1],
    }));
}

export async function fetchAlarmas(page = 1): Promise<{ rows: AlarmRow[]; count: number }> {
    const base = import.meta.env.VITE_API_BASE_URL as string;
    const response = await fetch(`${base}/v1/alertas?page=${page}`);
    if (!response.ok) {
        console.error('Error al obtener alarmas:', response.statusText);
        return { rows: [], count: 0 };
    }
    const data = await response.json() as AlarmPagedGeoJSON;
    return {
        rows: geoJSONToRows(data),
        count: data.count,
    };
}
