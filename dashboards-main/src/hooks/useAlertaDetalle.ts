import { useQuery } from '@tanstack/react-query';
import { fetchAlertaDetalle } from '@/services/alertaDetalleService';
import { tipoDeAlertaToTopic } from '@/components/AlertMap/MarkerFactory';
import { useAlarmasStore } from '@/store/alarmasStore';

/**
 * Detalle de la alerta seleccionada.
 * Se consulta cuando la alerta activa es de tipo precipitación o
 * movimiento de masa (el snapshot_mm vive en este endpoint);
 * el dato es histórico e inmutable, así que usa un staleTime alto.
 */
export function useAlertaDetalle() {
    const { alarmaSeleccionada } = useAlarmasStore();
    const id = alarmaSeleccionada?.id;
    const topic = alarmaSeleccionada ? tipoDeAlertaToTopic(alarmaSeleccionada.tipoDeAlerta) : null;
    const habilitado = topic === 'precipitation' || topic === 'massMovement';

    return useQuery({
        queryKey: ['alertaDetalle', id],
        queryFn: () => fetchAlertaDetalle(id!),
        enabled: habilitado && id !== undefined,
        staleTime: Infinity, // histórico inmutable
        retry: 1,
    });
}
