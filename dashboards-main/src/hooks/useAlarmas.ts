import { useQuery } from '@tanstack/react-query';
import { fetchAlarmas } from '@/services/alarmasService';
import type { AlarmRow } from '@/types/alarmas';

export function useAlarmas(page = 1) {
    return useQuery<{ rows: AlarmRow[]; count: number }>({
        queryKey: ['alarmas', page],
        queryFn: () => fetchAlarmas(page),
        staleTime: 1000 * 60 * 5, // 5 minutos
        // La tabla se refresca sola cada 5 minutos (misma cadencia que el
        // polling de fondo de notificaciones)
        refetchInterval: 5 * 60 * 1000,
    });
}
