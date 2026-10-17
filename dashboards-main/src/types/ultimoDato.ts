// ─── Station type ─────────────────────────────────────────────────────────────

export type UltimoDatoTipo = 'pluviometro' | 'meteorologia' | 'nivel';

// ─── GeoJSON feature properties per endpoint ─────────────────────────────────

interface BaseProperties {
    codigo: string;
    nombreEstacion: string;
    municipio: string;
    region: string;
    color: string;
    sum_amarillo: number;
    sum_naranja: number;
    sum_rojo: number;
    activo: boolean | null;
    conectado: boolean;
    created_at: string;
    updated_at: string;
}

export interface PluvioProperties extends BaseProperties {
    // No additional fields beyond base
}

export interface MeteoProperties extends BaseProperties {
    radiacion: number | null;
    calidad_radiacion: number | null;
    temperatura: number | null;
    calidad_temperatura: number | null;
    precipitacion: number | null;
    calidad_precipitacion: number | null;
    humedad_relativa: number | null;
    calidad_humedad_relativa: number | null;
    direccion_viento: number | null;
    calidad_direccion_viento: number | null;
    velocidad_viento: number | null;
    calidad_velocidad_viento: number | null;
}

export interface NivelProperties extends BaseProperties {
    fuente: string;
    nivelActual: number | null;
    caudalActual: number | null;
    calidad: string | null;
}

// ─── GeoJSON feature ──────────────────────────────────────────────────────────

export interface UltimoDatoFeature<P extends BaseProperties = BaseProperties> {
    type: 'Feature';
    geometry: {
        type: 'Point';
        coordinates: [number, number]; // [longitud, latitud]
    };
    properties: P;
}

export interface UltimoDatoFeatureCollection<P extends BaseProperties = BaseProperties> {
    type: 'FeatureCollection';
    features: UltimoDatoFeature<P>[];
}

// ─── Flattened row for the DataGrid ──────────────────────────────────────────

export interface UltimoDatoRow {
    // Identity
    id: string;             // = codigo
    codigo: string;
    nombreEstacion: string;
    municipio: string;
    region: string;
    tipo: UltimoDatoTipo;
    // Alert indicator
    color: string;
    sum_amarillo: number;
    sum_naranja: number;
    sum_rojo: number;
    // Connectivity
    activo: boolean | null;
    conectado: boolean;
    // Timestamps
    created_at: string;
    updated_at: string;
    // Coordinates
    latitud: number;
    longitud: number;
    // Optional – nivel
    fuente?: string;
    nivelActual?: number | null;
    caudalActual?: number | null;
    // Optional – meteorologia
    temperatura?: number | null;
    precipitacion?: number | null;
    humedad_relativa?: number | null;
    velocidad_viento?: number | null;
    direccion_viento?: number | null;
}
