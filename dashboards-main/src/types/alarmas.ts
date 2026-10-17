// Tipos para el GeoJSON de alarmas

export interface AlarmProperties {
    id: number;
    color: string;
    codigo: string;
    tipoDeAlerta: string;
    nombreEstacion: string;
    municipio: string;
    region: string;
    started_at: string;
    ended_at: string | null;
}

export interface AlarmFeature {
    type: 'Feature';
    geometry: {
        type: 'Point';
        coordinates: [number, number]; // [longitud, latitud]
    };
    properties: AlarmProperties;
}

// Respuesta paginada del endpoint /api/v1/alertas
export interface AlarmPagedGeoJSON {
    type: 'FeatureCollection';
    count: number;
    next: string | null;
    previous: string | null;
    features: AlarmFeature[];
}

// Fila aplanada para el DataGrid
export interface AlarmRow extends AlarmProperties {
    longitud: number;
    latitud: number;
}
