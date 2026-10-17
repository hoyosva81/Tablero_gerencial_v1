// Tipos para el detalle de una alerta individual
// Endpoint: GET {VITE_API_BASE_URL}/v1/alertas/{alerta_id}/detalle

import type { AlarmProperties } from './alarmas';

/** Un bucket de 5 minutos de la serie de precipitación asociada a la alerta. */
export interface SerieTresHorasBucket {
    /** Inicio del bucket en formato ISO (ascendente, hasta 36 buckets). */
    bucket: string;
    /** Suma de precipitación del bucket en mm. */
    precip_sum: number;
}

/**
 * Respuesta del detalle de alerta. Reutiliza los campos comunes con las
 * filas del GeoJSON de alarmas (AlarmProperties) y añade la información
 * específica de precipitación.
 */
export interface AlertaDetalle
    extends Pick<
        AlarmProperties,
        | 'id'
        | 'color'
        | 'codigo'
        | 'nombreEstacion'
        | 'municipio'
        | 'region'
        | 'started_at'
        | 'ended_at'
    > {
    station_id: string;
    tipo_alerta: string;
    longitud: number;
    latitud: number;
    /** Precipitación acumulada en las 3 h previas al inicio de la alerta (mm). */
    precipitacion_acumulada_3h: number | null;
    serie_3h: SerieTresHorasBucket[];
    /**
     * Snapshot de movimiento de masa (zona hidrográfica, lluvias y umbrales).
     * Solo lo devuelve la API para alertas de movimiento de masa; null en otros casos.
     */
    snapshot_mm?: SnapshotMM | null;
}

/** Snapshot de movimiento de masa adjunto al detalle de la alerta. */
export interface SnapshotMM {
    /** Identificador de la zona hidrográfica. */
    zh_id: number;
    /** Nombre de la zona hidrográfica. */
    zh_nombre: string;
    /** Lluvia acumulada en las últimas 24 h (mm). */
    rainfall_24h: number;
    /** Lluvia acumulada en los 90 días previos (mm). */
    rainfall_prev_90d: number;
    /** Umbral bajo/moderado (LM) de la zona (mm). */
    thr_lm: number;
    /** Umbral moderado/alto (MH) de la zona (mm). */
    thr_mh: number;
}
