import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
    fetchMeteorologiaSnapshots,
    fetchNivelesSnapshots,
    fetchPluviosSnapshots,
} from '@/services/chartServices';
import type { SnapshotParams, SnapshotResponse, MeteorologiaSnapshotValue, NivelSnapshotValue, PluvioSnapshotValue } from '@/types/snapshots';
import type { StationType } from '@/types/snapshots';

/** Cache TTL mirrors the API: historical (fechaFin < today) → 1 h; current day → 2 min */
function staleTime(fechaFin?: string): number {
    const today = dayjs().format('YYYY-MM-DD');
    const fin = fechaFin ?? today;
    return fin < today ? 60 * 60 * 1000 : 2 * 60 * 1000;
}

export function useMeteorologiaSnapshots(params: SnapshotParams, enabled = true) {
    return useQuery<SnapshotResponse<MeteorologiaSnapshotValue>>({
        queryKey: ['snapshots', 'meteorologia', params],
        queryFn: () => fetchMeteorologiaSnapshots(params),
        staleTime: staleTime(params.fechaFin),
        enabled,
    });
}

export function useNivelesSnapshots(params: SnapshotParams, enabled = true) {
    return useQuery<SnapshotResponse<NivelSnapshotValue>>({
        queryKey: ['snapshots', 'niveles', params],
        queryFn: () => fetchNivelesSnapshots(params),
        staleTime: staleTime(params.fechaFin),
        enabled,
    });
}

export function usePluviosSnapshots(params: SnapshotParams, enabled = true) {
    return useQuery<SnapshotResponse<PluvioSnapshotValue>>({
        queryKey: ['snapshots', 'pluviometros', params],
        queryFn: () => fetchPluviosSnapshots(params),
        staleTime: staleTime(params.fechaFin),
        enabled,
    });
}

/** Unified hook — dispatches to the correct endpoint based on `type` */
export function useSnapshots(type: StationType, params: SnapshotParams) {
    const meteo = useMeteorologiaSnapshots(params, type === 'meteorologia');
    const nivel = useNivelesSnapshots(params, type === 'niveles');
    const pluvio = usePluviosSnapshots(params, type === 'pluviometros');

    if (type === 'meteorologia') return meteo;
    if (type === 'niveles') return nivel;
    return pluvio;
}
