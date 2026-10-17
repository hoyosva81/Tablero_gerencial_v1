import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertDetail } from './AlertDetail';
import type { AlarmRow } from '@/types/alarmas';
import type { AlertaDetalle } from '@/types/alertaDetalle';
import { useAlarmasStore } from '@/store/alarmasStore';
import { useAlertaDetalle } from '@/hooks/useAlertaDetalle';

// MarkerFactory importa leaflet; se reemplaza por la lógica pura de mapeo.
vi.mock('@/components/AlertMap/MarkerFactory', () => ({
    tipoDeAlertaToTopic: (tipoDeAlerta: string) => {
        const t = tipoDeAlerta.trim().toLowerCase();
        if (t.includes('precipitacion') || t.includes('precipitación') || t.includes('lluvia')) return 'precipitation';
        if (t.includes('nivel')) return 'nivel';
        if (t.includes('movimiento') || t.includes('masa') || t.includes('deslizamiento')) return 'massMovement';
        if (t.includes('meteorolog')) return 'meteorologia';
        return 'alarma';
    },
}));

// Gráficas basadas en ECharts: no se evalúan en los tests.
vi.mock('@/components/charts/AlertaPrecipitacionChart', () => ({
    AlertaPrecipitacionChart: () => null,
}));
vi.mock('@/components/charts/PrecipitationChart/PrecipitationChart', () => ({
    PrecipitationChart: () => null,
}));
vi.mock('@/components/charts/MeteorologicalChart/MeteorologicalChart', () => ({
    MeteorologicalChart: () => null,
}));
vi.mock('@/components/charts/CurrentLevelChart/CurrentLevelChart', () => ({
    CurrentLevelChart: () => null,
}));
vi.mock('@/components/charts/HistoricLevelChart/HistoricLevelChart', () => ({
    HistoricLevelChart: () => null,
}));

vi.mock('@/store/alarmasStore', () => ({
    useAlarmasStore: vi.fn(),
}));

vi.mock('@/hooks/useAlertaDetalle', () => ({
    useAlertaDetalle: vi.fn(),
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

const detalleBase = {
    id: 1,
    color: '#e67e22',
    codigo: 'cd_01',
    nombreEstacion: 'Estación Prueba',
    municipio: 'Manizales',
    region: 'Cuenca',
    started_at: '2026-08-01T12:00:00Z',
    ended_at: null,
    station_id: 'cd_01',
    tipo_alerta: 'movimiento',
    longitud: -75.5,
    latitud: 5.1,
    precipitacion_acumulada_3h: null,
    serie_3h: [],
};

const snapshotCompleto = {
    zh_id: 3,
    zh_nombre: 'Nordeste',
    rainfall_24h: 47.2,
    rainfall_prev_90d: 49.7,
    thr_lm: 38.471,
    thr_mh: 58.136,
};

function renderDetalle() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <AlertDetail />
        </QueryClientProvider>
    );
}

// El detalle comparte pantalla con la imagen compartible (oculta), que
// repite las mismas etiquetas; por eso se usan variantes "All".
beforeEach(() => {
    vi.clearAllMocks();
});

/** Sustituye el resultado del hook con solo los campos que usa el componente. */
function mockUseAlertaDetalle(data: AlertaDetalle | null | undefined, isPending: boolean) {
    vi.mocked(useAlertaDetalle).mockReturnValue({
        data,
        isPending,
    } as unknown as ReturnType<typeof useAlertaDetalle>);
}

describe('AlertDetail — filas de movimiento de masa', () => {
    it('renderiza las filas con el snapshot completo', () => {
        vi.mocked(useAlarmasStore).mockReturnValue({ alarmaSeleccionada: alarmaMM });
        const detalle: AlertaDetalle = { ...detalleBase, snapshot_mm: snapshotCompleto };
        mockUseAlertaDetalle(detalle, false);

        renderDetalle();

        expect(screen.getAllByText(/Zona hidrográfica/).length).toBeGreaterThan(0);
        expect(screen.getAllByText('Nordeste').length).toBeGreaterThan(0);
        expect(screen.getAllByText('47,2 mm').length).toBeGreaterThan(0);
        expect(screen.getAllByText('49,7 mm').length).toBeGreaterThan(0);
        expect(screen.getAllByText('38,5 mm').length).toBeGreaterThan(0);
        expect(screen.getAllByText('58,1 mm').length).toBeGreaterThan(0);
    });

    it('muestra N/D cuando el snapshot viene ausente o null', () => {
        vi.mocked(useAlarmasStore).mockReturnValue({ alarmaSeleccionada: alarmaMM });
        // snapshot_mm explícitamente null
        mockUseAlertaDetalle({ ...detalleBase, snapshot_mm: null }, false);

        renderDetalle();

        // 5 filas en el detalle + 5 en la imagen compartible
        expect(screen.getAllByText('N/D').length).toBe(10);
        expect(screen.queryAllByText('Nordeste')).toHaveLength(0);
    });

    it('muestra Cargando… mientras la consulta está pendiente', () => {
        vi.mocked(useAlarmasStore).mockReturnValue({ alarmaSeleccionada: alarmaMM });
        mockUseAlertaDetalle(undefined, true);

        renderDetalle();

        expect(screen.getAllByText('Cargando…').length).toBe(5);
    });

    it('no renderiza las filas de MM para otros tipos de alerta', () => {
        const alarmaPrecipitacion: AlarmRow = { ...alarmaMM, tipoDeAlerta: 'Precipitación' };
        vi.mocked(useAlarmasStore).mockReturnValue({ alarmaSeleccionada: alarmaPrecipitacion });
        const detalle: AlertaDetalle = { ...detalleBase, snapshot_mm: snapshotCompleto };
        mockUseAlertaDetalle(detalle, false);

        renderDetalle();

        expect(screen.queryAllByText(/Zona hidrográfica/)).toHaveLength(0);
        expect(screen.queryAllByText(/Lluvia 24 h/)).toHaveLength(0);
        expect(screen.queryAllByText(/Umbral bajo\/moderado/)).toHaveLength(0);
    });
});
