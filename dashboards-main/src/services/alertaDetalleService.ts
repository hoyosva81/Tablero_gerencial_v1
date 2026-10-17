// Servicio para el detalle individual de una alerta
// Endpoint: GET {VITE_API_BASE_URL}/v1/alertas/{alerta_id}/detalle

import type { AlertaDetalle } from '@/types/alertaDetalle';

/**
 * Obtiene el detalle de una alerta por su id.
 * Devuelve null si la alerta no existe (404); lanza en otros errores.
 */
export async function fetchAlertaDetalle(alertaId: number): Promise<AlertaDetalle | null> {
    const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
    const response = await fetch(`${base}/v1/alertas/${alertaId}/detalle`);
    if (response.status === 404) return null;
    if (!response.ok) {
        throw new Error(`Error al obtener el detalle de la alerta: ${response.statusText}`);
    }
    return response.json() as Promise<AlertaDetalle>;
}
