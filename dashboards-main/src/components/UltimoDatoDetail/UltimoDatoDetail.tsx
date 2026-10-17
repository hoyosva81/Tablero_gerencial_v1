import { useState, useEffect } from 'react';
import { Box, Typography, Divider, Stack } from '@mui/material';
import SensorsOffIcon from '@mui/icons-material/SensorsOff';
import { useUltimoDatoStore } from '@/store/ultimoDatoStore';
import { PrecipitationChart } from '@/components/charts/PrecipitationChart/PrecipitationChart';
import { MeteorologicalChart, type MeteoVariable } from '@/components/charts/MeteorologicalChart/MeteorologicalChart';
import { CurrentLevelChart } from '@/components/charts/CurrentLevelChart/CurrentLevelChart';
import { HistoricLevelChart } from '@/components/charts/HistoricLevelChart/HistoricLevelChart';

// ─── Types ────────────────────────────────────────────────────────────────────

type LevelChartView = 'seccion' | 'serie';
type DetailView = 'datos' | 'grafica';

type ChartType = 'precipitation' | 'meteorologia' | 'nivel' | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chartTypeFromCodigo(codigo: string): ChartType {
    if (codigo.startsWith('sp_')) return 'precipitation';
    if (codigo.startsWith('sm_')) return 'meteorologia';
    if (codigo.startsWith('sn_')) return 'nivel';
    return null;
}

function formatDateTime(value: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('es-CO', {
        dateStyle: 'long',
        timeStyle: 'short',
    });
}

const selectStyle: React.CSSProperties = {
    padding: '3px 6px',
    fontSize: '11px',
    fontFamily: 'var(--font-sans)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text-base)',
};

const DETAIL_TABS: { value: DetailView; label: string }[] = [
    { value: 'datos', label: 'Datos' },
    { value: 'grafica', label: 'Gráfica' },
];

const TIPO_LABEL: Record<string, string> = {
    pluviometro: 'Pluviométrico',
    meteorologia: 'Meteorológica',
    nivel: 'Nivel',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function UltimoDatoDetail() {
    const { estacionSeleccionada } = useUltimoDatoStore();
    const [detailView, setDetailView] = useState<DetailView>('datos');
    const [levelView, setLevelView] = useState<LevelChartView>('seccion');
    const [meteoVariable, setMeteoVariable] = useState<MeteoVariable>('lluvia');

    // Resetear vista al cambiar de estación
    useEffect(() => {
        setDetailView('datos');
        setLevelView('seccion');
        setMeteoVariable('lluvia');
    }, [estacionSeleccionada?.id]);

    if (!estacionSeleccionada) {
        return (
            <Box
                sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    color: 'text.secondary',
                    p: 2,
                }}
            >
                <SensorsOffIcon sx={{ fontSize: 40, opacity: 0.4 }} />
                <Typography variant="body2" sx={{ textAlign: 'center' }}>
                    Seleccione una estación para ver el detalle
                </Typography>
            </Box>
        );
    }

    const chartType = chartTypeFromCodigo(estacionSeleccionada.codigo);
    const hasChart = chartType !== null;

    return (
        <Box sx={{ height: '100%', p: 2, overflow: 'auto' }}>
            {/* Encabezado con indicador de color */}
            <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }} spacing={1.5}>
                <Box
                    sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: estacionSeleccionada.color,
                        border: '1px solid rgba(0,0,0,0.15)',
                        flexShrink: 0,
                    }}
                />
                <Typography variant="h6" noWrap>
                    {estacionSeleccionada.nombreEstacion}
                </Typography>
            </Stack>

            <Stack direction="row" sx={{ alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
                {/* Pill toggle — solo cuando hay gráfica disponible */}
                {hasChart && (
                    <div
                        style={{
                            display: 'flex',
                            background: 'var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '2px',
                            gap: '2px',
                            marginLeft: 'auto',
                        }}
                    >
                        {DETAIL_TABS.map((tab) => (
                            <button
                                key={tab.value}
                                onClick={() => setDetailView(tab.value)}
                                style={{
                                    padding: '4px 14px',
                                    fontSize: '11px',
                                    fontFamily: 'var(--font-sans)',
                                    fontWeight: detailView === tab.value ? 600 : 400,
                                    border: 'none',
                                    borderRadius: 'calc(var(--radius-sm) - 2px)',
                                    background: detailView === tab.value ? 'var(--color-surface)' : 'transparent',
                                    color: 'var(--color-text-base)',
                                    cursor: 'pointer',
                                    transition: 'background 150ms ease',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {/* Vista Datos */}
            {detailView === 'datos' && (
                <Stack spacing={1.5}>
                    <DetailRow label="Código" value={estacionSeleccionada.codigo} />
                    <DetailRow
                        label="Tipo"
                        value={TIPO_LABEL[estacionSeleccionada.tipo] ?? estacionSeleccionada.tipo}
                    />
                    <DetailRow label="Municipio" value={estacionSeleccionada.municipio} />
                    <DetailRow label="Región" value={estacionSeleccionada.region} />
                    <DetailRow
                        label="Conectado"
                        value={estacionSeleccionada.conectado ? 'Sí' : 'No'}
                    />
                    <DetailRow
                        label="Último dato"
                        value={formatDateTime(estacionSeleccionada.updated_at)}
                    />
                    {estacionSeleccionada.tipo === 'nivel' && estacionSeleccionada.fuente && (
                        <DetailRow label="Fuente" value={estacionSeleccionada.fuente} />
                    )}
                    {estacionSeleccionada.tipo === 'nivel' &&
                        estacionSeleccionada.nivelActual != null && (
                            <DetailRow
                                label="Nivel actual"
                                value={`${estacionSeleccionada.nivelActual} m`}
                            />
                        )}
                    {estacionSeleccionada.tipo === 'meteorologia' &&
                        estacionSeleccionada.temperatura != null && (
                            <DetailRow
                                label="Temperatura"
                                value={`${estacionSeleccionada.temperatura} °C`}
                            />
                        )}
                    {estacionSeleccionada.tipo === 'meteorologia' &&
                        estacionSeleccionada.precipitacion != null && (
                            <DetailRow
                                label="Precipitación"
                                value={`${estacionSeleccionada.precipitacion} mm`}
                            />
                        )}
                </Stack>
            )}

            {/* Vista Gráfica */}
            {detailView === 'grafica' &&
                hasChart &&
                (() => {
                    if (chartType === 'precipitation') {
                        return <PrecipitationChart stationId={estacionSeleccionada.codigo} />;
                    }
                    if (chartType === 'meteorologia') {
                        return (
                            <MeteorologicalChart
                                stationId={estacionSeleccionada.codigo}
                                selectedVariable={meteoVariable}
                                onVariableChange={setMeteoVariable}
                            />
                        );
                    }
                    if (chartType === 'nivel') {
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <select
                                    style={selectStyle}
                                    value={levelView}
                                    onChange={(e) => setLevelView(e.target.value as LevelChartView)}
                                >
                                    <option value="seccion">Sección transversal</option>
                                    <option value="serie">Serie histórica</option>
                                </select>
                                {levelView === 'seccion' ? (
                                    <CurrentLevelChart stationId={estacionSeleccionada.codigo} />
                                ) : (
                                    <HistoricLevelChart stationId={estacionSeleccionada.codigo} />
                                )}
                            </div>
                        );
                    }
                    return null;
                })()}
        </Box>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {label}
            </Typography>
            <Typography variant="body1">{value}</Typography>
        </Box>
    );
}
