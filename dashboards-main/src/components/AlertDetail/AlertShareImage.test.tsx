import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlertShareImage } from './AlertShareImage';
import type { AlarmRow } from '@/types/alarmas';

// MarkerFactory importa leaflet; se reemplaza por la lógica pura de mapeo.
vi.mock('@/components/AlertMap/MarkerFactory', () => ({
    tipoDeAlertaToTopic: (tipoDeAlerta: string) => {
        const t = tipoDeAlerta.trim().toLowerCase();
        if (t.includes('movimiento') || t.includes('masa') || t.includes('deslizamiento')) return 'massMovement';
        return 'precipitation';
    },
}));

vi.mock('@/components/charts/AlertaPrecipitacionChart', () => ({
    AlertaPrecipitacionChart: () => null,
}));

const alarmaMM: AlarmRow = {
    id: 1,
    color: '#e67e22',
    codigo: 'cd_01',
    tipoDeAlerta: 'Movimiento de Masa',
    nombreEstacion: 'Estación Prueba',
    municipio: 'Manizales',
    region: 'Cuenca',
    started_at: '2026-08-01T12:00:00Z',
    ended_at: null,
    longitud: -75.5,
    latitud: 5.1,
};

const snapshot = {
    zh_id: 3,
    zh_nombre: 'Nordeste',
    rainfall_24h: 47.2,
    rainfall_prev_90d: 49.7,
    thr_lm: 38.471,
    thr_mh: 58.136,
};

describe('AlertShareImage — bloque MovimientoMasaRows', () => {
    it.each(['card', 'poster'] as const)('renderiza los valores del snapshot (variante %s)', (variant) => {
        render(<AlertShareImage alarma={alarmaMM} fechaFormateada="1 de agosto" variant={variant} snapshotMM={snapshot} />);

        expect(screen.getByText('Nordeste')).toBeTruthy();
        expect(screen.getByText('47,2 mm')).toBeTruthy();
        expect(screen.getByText('49,7 mm')).toBeTruthy();
        expect(screen.getByText('38,5 mm')).toBeTruthy();
        expect(screen.getByText('58,1 mm')).toBeTruthy();
    });

    it.each(['card', 'poster'] as const)('muestra N/D cuando el snapshot es null (variante %s)', (variant) => {
        render(<AlertShareImage alarma={alarmaMM} fechaFormateada="1 de agosto" variant={variant} snapshotMM={null} />);

        // Zona hidrográfica en N/D + las 4 filas numéricas
        expect(screen.getAllByText('N/D').length).toBe(5);
        expect(screen.queryByText('Nordeste')).toBeNull();
    });

    // En uso real, AlertDetail solo pasa snapshotMM cuando la alerta es de
    // movimiento de masa; para otros tipos llega undefined.
    it.each(['card', 'poster'] as const)('no renderiza el bloque para otros tipos de alerta (variante %s)', (variant) => {
        const alarmaPrecipitacion: AlarmRow = { ...alarmaMM, tipoDeAlerta: 'Precipitación' };
        render(
            <AlertShareImage
                alarma={alarmaPrecipitacion}
                fechaFormateada="1 de agosto"
                variant={variant}
                snapshotMM={undefined}
            />
        );

        expect(screen.queryByText(/Zona hidrográfica/)).toBeNull();
        expect(screen.queryByText('Nordeste')).toBeNull();
    });
});
