// ─── Chart data services ──────────────────────────────────────────────────────
// Adapted from geoportal/src/services/LayersServices.tsx.
// Uses VITE_API_BASE_URL (already includes /api, e.g. http://host/api)
// and VITE_STRAPI_URL for Strapi-backed endpoints (nivel sections).

/** Returns YYYY-MM-DD of the day after `date` — used to make endDate inclusive with fecha__lt. */
function dayAfter(date: string): string {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
}

// ─── Precipitation ────────────────────────────────────────────────────────────

export interface PrecipitationValue {
    created_at: string;
    muestra: string;
    calidad: number;
}

export interface PrecipitationHistoryResponse {
    next: string | null;
    previous: string | null;
    count: number;
    values: PrecipitationValue[];
}

export async function fetchPrecipitationHistory(
    stationId: string,
    page?: number | null,
    size: number = 250,
    endDate?: string,
    startDate?: string,
): Promise<PrecipitationHistoryResponse> {
    const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
    const params = new URLSearchParams({ size: String(size) });
    if (startDate) params.append('fecha__gte', startDate);
    if (endDate) params.append('fecha__lt', dayAfter(endDate));
    if (page) params.append('page', String(page));

    const response = await fetch(`${base}/v1/pluviometros/${stationId}?${params.toString()}`);
    if (!response.ok) throw new Error(`Error fetching precipitation history: ${response.statusText}`);
    return response.json();
}

// ─── Meteorological ───────────────────────────────────────────────────────────

export interface MeteorologicalValue {
    created_at: string;
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

export interface MeteorologicalHistoryResponse {
    next: string | null;
    previous: string | null;
    count: number;
    values: MeteorologicalValue[];
}

export async function fetchMeteorologicalHistory(
    stationId: string,
    page?: number | null,
    size: number = 250,
    endDate?: string,
    startDate?: string,
): Promise<MeteorologicalHistoryResponse> {
    const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
    const params = new URLSearchParams({ size: String(size) });
    if (startDate) params.append('fecha__gte', startDate);
    if (endDate) params.append('fecha__lt', dayAfter(endDate));
    if (page) params.append('page', String(page));

    const response = await fetch(`${base}/v1/meteorologia/${stationId}?${params.toString()}`);
    if (!response.ok) throw new Error(`Error fetching meteorological history: ${response.statusText}`);
    return response.json();
}

// ─── Level history ────────────────────────────────────────────────────────────

export interface LevelHistoryValue {
    created_at: string;
    nivel: string;
    caudal: string | null;
    calidad: number;
}

export interface LevelHistoryResponse {
    next: string | null;
    previous: string | null;
    count: number;
    values: LevelHistoryValue[];
}

export async function fetchLevelHistory(
    stationId: string,
    page?: number | null,
    size: number = 250,
    endDate?: string,
    startDate?: string,
): Promise<LevelHistoryResponse> {
    const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
    const params = new URLSearchParams({ calidad: '1', size: String(size) });
    if (startDate) params.append('fecha__gte', startDate);
    if (endDate) params.append('fecha__lt', dayAfter(endDate));
    if (page) params.append('page', String(page));

    const response = await fetch(`${base}/v1/niveles/${stationId}?${params.toString()}`);
    if (!response.ok) throw new Error(`Error fetching level history: ${response.statusText}`);
    return response.json();
}

// ─── Nivel más cercano a una fecha (para detalle de alerta) ──────────────────

export interface NivelCercanoValue {
    created_at: string;
    nivel: string;
    calidad: number;
}

export async function fetchNivelCercano(stationId: string, fechaISO: string): Promise<NivelCercanoValue | null> {
    const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
    const params = new URLSearchParams({ fecha: fechaISO });
    const response = await fetch(`${base}/v1/niveles/${stationId}?${params.toString()}`);
    if (!response.ok) throw new Error(`Error fetching nivel cercano: ${response.statusText}`);
    const json = await response.json();
    return json.values?.[0] ?? null;
}

// ─── Level section / thresholds (Strapi) ─────────────────────────────────────

export interface LevelSection {
    estacion_id: string;
    x: number[];
    y: number[];
    umbral_amarillo: number;
    umbral_naranja: number;
    umbral_rojo: number;
    offset: number;
}

export async function fetchLevelSection(stationId: string): Promise<LevelSection | null> {
    const base = (import.meta.env.VITE_STRAPI_URL ?? '').replace(/\/$/, '');
    const params = new URLSearchParams({ 'filters[estacion_id][$eq]': stationId });
    const response = await fetch(`${base}/api/niveles?${params.toString()}`);
    if (!response.ok) throw new Error(`Error fetching level section: ${response.statusText}`);
    const json = await response.json();
    return (json?.data?.[0] as LevelSection) ?? null;
}

// ─── Hourly snapshots ─────────────────────────────────────────────────────────

import type {
    SnapshotParams,
    SnapshotResponse,
    MeteorologiaSnapshotValue,
    NivelSnapshotValue,
    PluvioSnapshotValue,
} from '@/types/snapshots';

function buildSnapshotParams(p: SnapshotParams): URLSearchParams {
    const params = new URLSearchParams({ fecha_inicio: p.fechaInicio });
    if (p.fechaFin) params.append('fecha_fin', p.fechaFin);
    if (p.estacionId) params.append('estacion_id', p.estacionId);
    if (p.page) params.append('page', String(p.page));
    if (p.size) params.append('size', String(p.size));
    return params;
}

export async function fetchMeteorologiaSnapshots(
    p: SnapshotParams,
): Promise<SnapshotResponse<MeteorologiaSnapshotValue>> {
    const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
    const response = await fetch(`${base}/v1/meteorologia/snapshots?${buildSnapshotParams(p).toString()}`);
    if (!response.ok) throw new Error(`Error fetching meteorología snapshots: ${response.statusText}`);
    return response.json();
}

export async function fetchNivelesSnapshots(
    p: SnapshotParams,
): Promise<SnapshotResponse<NivelSnapshotValue>> {
    const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
    const response = await fetch(`${base}/v1/niveles/snapshots?${buildSnapshotParams(p).toString()}`);
    if (!response.ok) throw new Error(`Error fetching niveles snapshots: ${response.statusText}`);
    return response.json();
}

export async function fetchPluviosSnapshots(
    p: SnapshotParams,
): Promise<SnapshotResponse<PluvioSnapshotValue>> {
    const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
    const response = await fetch(`${base}/v1/pluviometros/snapshots?${buildSnapshotParams(p).toString()}`);
    if (!response.ok) throw new Error(`Error fetching pluviometros snapshots: ${response.statusText}`);
    return response.json();
}
