import { useQuery } from '@tanstack/react-query';
import { fetchAlarmas } from '@/services/alarmasService';
import type { AlarmRow } from '@/types/alarmas';

// Polling de fondo de la página 1 de alertas, usado por el sistema de
// notificaciones (AlertNotifications).
//
// IMPORTANTE: usa exactamente la misma query key que la tabla del Registro
// de Alertas cuando muestra su primera página (useAlarmas(1) →
// ['alarmas', 1]). Así ambas consultas comparten la misma entrada de caché
// y no se duplican peticiones cuando el usuario está en esa vista.
export function useAlertasBackground() {
    return useQuery<{ rows: AlarmRow[]; count: number }>({
        queryKey: ['alarmas', 1],
        queryFn: () => fetchAlarmas(1),
        // Refresco cada 5 minutos para detectar alertas nuevas
        refetchInterval: 5 * 60 * 1000,
        staleTime: 1000 * 60 * 5, // 5 minutos
    });
}
