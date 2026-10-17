// ─── Station type selector ────────────────────────────────────────────────────

export type StationType = 'meteorologia' | 'niveles' | 'pluviometros';

// ─── Snapshot query parameters (shared across all three endpoints) ────────────

export interface SnapshotParams {
    fechaInicio: string;
    fechaFin?: string;
    estacionId?: string;
    page?: number;
    size?: number;
}

// ─── Generic paginated response ───────────────────────────────────────────────

export interface SnapshotResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    values: T[];
}

// ─── Meteorología snapshot value ──────────────────────────────────────────────

export interface MeteorologiaSnapshotValue {
    created_at: string;
    estacion_id: string;
    descripcion: string;
    radiacion: string | null;
    calidad_radiacion: number | null;
    temperatura: string | null;
    calidad_temperatura: number | null;
    lluvia: string | null;
    calidad_lluvia: number | null;
    humedad_relativa: string | null;
    calidad_humedad_relativa: number | null;
    direccion_viento: string | null;
    calidad_direccion_viento: number | null;
    velocidad_viento: string | null;
    calidad_velocidad_viento: number | null;
}

// ─── Niveles snapshot value ───────────────────────────────────────────────────

export interface NivelSnapshotValue {
    created_at: string;
    estacion_id: string;
    descripcion: string;
    nivel: string | null;
    calidad: number | null;
}

// ─── Pluviométros snapshot value ──────────────────────────────────────────────

export interface PluvioSnapshotValue {
    created_at: string;
    estacion_id: string;
    descripcion: string;
    muestra: string | null;
    calidad: number | null;
}
