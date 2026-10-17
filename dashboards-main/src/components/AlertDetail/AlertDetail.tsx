import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Divider, Chip, Stack, Button } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import ShareIcon from '@mui/icons-material/Share';
import { useAlarmasStore } from '@/store/alarmasStore';
import { useQuery } from '@tanstack/react-query';
import { fetchLevelSection, fetchNivelCercano } from '@/services/chartServices';
import { useAlertaDetalle } from '@/hooks/useAlertaDetalle';
import { AlertaPrecipitacionChart } from '@/components/charts/AlertaPrecipitacionChart';
import type { AlertaDetalle } from '@/types/alertaDetalle';
import { tipoDeAlertaToTopic } from '@/components/AlertMap/MarkerFactory';
import { AlertShareImage, type ShareVariant } from './AlertShareImage';
import { shareAlertImage } from '@/utils/shareAlertImage';
import type { AlarmRow } from '@/types/alarmas';
import { PrecipitationChart } from '@/components/charts/PrecipitationChart/PrecipitationChart';
import { MeteorologicalChart, type MeteoVariable } from '@/components/charts/MeteorologicalChart/MeteorologicalChart';
import { CurrentLevelChart } from '@/components/charts/CurrentLevelChart/CurrentLevelChart';
import { HistoricLevelChart } from '@/components/charts/HistoricLevelChart/HistoricLevelChart';

type LevelChartView = 'seccion' | 'serie';
type ChartTopic = ReturnType<typeof tipoDeAlertaToTopic>;
type DetailView = 'datos' | 'grafica';

const DETAIL_TABS: { value: DetailView; label: string }[] = [
    { value: 'datos', label: 'Datos' },
    { value: 'grafica', label: 'Gráfica' },
];

const SHARE_VARIANTS: { value: ShareVariant; label: string }[] = [
    { value: 'card', label: 'Tarjeta' },
    { value: 'poster', label: 'Póster' },
];

const selectStyle: React.CSSProperties = {
    padding: '3px 6px',
    fontSize: '11px',
    fontFamily: 'var(--font-sans)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text-base)',
};

export function AlertDetail() {
    const { alarmaSeleccionada } = useAlarmasStore();
    const [detailView, setDetailView] = useState<DetailView>('datos');
    const [levelView, setLevelView] = useState<LevelChartView>('seccion');
    const [meteoVariable, setMeteoVariable] = useState<MeteoVariable>('lluvia');
    const [shareVariant, setShareVariant] = useState<ShareVariant>('card');
    const [generatingImage, setGeneratingImage] = useState(false);
    const shareNodeRef = useRef<HTMLDivElement>(null);

    // Reset to 'datos' view when selected station changes
    useEffect(() => {
        setDetailView('datos');
        setLevelView('seccion');
        setMeteoVariable('lluvia');
    }, [alarmaSeleccionada?.id]);

    const stationId = alarmaSeleccionada?.codigo ?? '';
    // Stations whose code starts with 'sm_' are meteorological and expose all variables
    // (lluvia, temperatura, humedad, radiación, viento, rosa), regardless of alert type.
    const chartType: ChartTopic | null = alarmaSeleccionada
        ? stationId.startsWith('sm_')
            ? 'meteorologia'
            : tipoDeAlertaToTopic(alarmaSeleccionada.tipoDeAlerta)
        : null;
    const hasChart = chartType === 'precipitation' || chartType === 'meteorologia' || chartType === 'nivel';

    // Datos de nivel hídrico solo para alertas de nivel (nivel al inicio + umbrales).
    const isNivel = chartType === 'nivel';
    const { data: nivelCercano } = useQuery({
        queryKey: ['nivelCercano', stationId, alarmaSeleccionada?.started_at],
        queryFn: () => fetchNivelCercano(stationId, alarmaSeleccionada!.started_at),
        enabled: isNivel && !!alarmaSeleccionada,
        staleTime: 1000 * 60 * 5,
    });
    const { data: levelSection } = useQuery({
        queryKey: ['levelSection', stationId],
        queryFn: () => fetchLevelSection(stationId),
        enabled: isNivel && !!stationId,
        staleTime: 1000 * 60 * 15,
    });

    // Nivel formateado con un decimal; "N/D" si la consulta está pendiente, falló o no hay dato.
    const nivelInicio: string | null = nivelCercano
        ? parseFloat(nivelCercano.nivel).toFixed(1)
        : null;
    const umbrales = levelSection
        ? {
              amarillo: levelSection.umbral_amarillo.toFixed(1),
              naranja: levelSection.umbral_naranja.toFixed(1),
              rojo: levelSection.umbral_rojo.toFixed(1),
          }
        : null;

    // Detalle de precipitación (acumulado 3 h + serie); solo consulta para alertas de lluvia.
    const { data: alertaDetalle, isPending: detalleCargando } = useAlertaDetalle();
    const precipitacionAcumulada = alertaDetalle?.precipitacion_acumulada_3h ?? null;

    if (!alarmaSeleccionada) {
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
                <NotificationsNoneIcon sx={{ fontSize: 40, opacity: 0.4 }} />
                <Typography variant="body2" sx={{ textAlign: 'center' }}>
                    Seleccione una alerta para ver el detalle
                </Typography>
            </Box>
        );
    }

    const fechaFormateada = new Date(alarmaSeleccionada.started_at).toLocaleString(
        'es-CO',
        { dateStyle: 'long', timeStyle: 'short' }
    );

    const handleShareImage = async () => {
        const node = shareNodeRef.current;
        if (!node) return;

        setGeneratingImage(true);
        try {
            await shareAlertImage(node, `alerta-${alarmaSeleccionada.codigo}.png`);
        } catch (error) {
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
                console.error(error);
            }
        } finally {
            setGeneratingImage(false);
        }
    };

    return (
        <Box sx={{ height: '100%', p: 2, overflow: 'auto', backgroundColor: alarmaSeleccionada.color + '33' }}>
            {/* Encabezado con indicador de color */}
            <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }} spacing={1.5}>
                <Box
                    sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: alarmaSeleccionada.color,
                        border: '1px solid rgba(0,0,0,0.15)',
                        flexShrink: 0,
                    }}
                />
                <Typography variant="h6" noWrap>
                    {alarmaSeleccionada.nombreEstacion}
                </Typography>
            </Stack>

            <Stack direction="row" sx={{ alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
                <Chip
                    label={alarmaSeleccionada.tipoDeAlerta}
                    size="small"
                    sx={{
                        backgroundColor: alarmaSeleccionada.color + '33',
                        color: 'text.primary',
                        fontWeight: 600,
                    }}
                />

                {/* Pill toggle — only shown when a chart is available */}
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

            {/* Datos view */}
            {detailView === 'datos' && (
                <Stack spacing={1.5}>
                    <DetailRow label="Nombre estación" value={alarmaSeleccionada.nombreEstacion} />
                    <DetailRow label="Código" value={alarmaSeleccionada.codigo} />
                    <DetailRow label="Municipio" value={alarmaSeleccionada.municipio} />
                    <DetailRow label="Región" value={alarmaSeleccionada.region} />
                    <DetailRow label="Inicio alerta" value={fechaFormateada} />
                    {chartType === 'nivel' && (
                        <>
                            <DetailRow label="Nivel al inicio de alerta" value={nivelInicio ?? 'N/D'} />
                            <DetailRow label="Umbral amarillo" value={umbrales?.amarillo ?? 'N/D'} />
                            <DetailRow label="Umbral naranja" value={umbrales?.naranja ?? 'N/D'} />
                            <DetailRow label="Umbral rojo" value={umbrales?.rojo ?? 'N/D'} />
                        </>
                    )}
                    <AlertTypeRows alarma={alarmaSeleccionada} detalle={alertaDetalle} cargando={detalleCargando} />
                </Stack>
            )}

            {/* Gráfica view */}
            {detailView === 'grafica' && hasChart && (() => {
                if (chartType === 'precipitation') {
                    return <PrecipitationChart stationId={stationId} />;
                }

                if (chartType === 'meteorologia') {
                    return (
                        <MeteorologicalChart
                            stationId={stationId}
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
                            {levelView === 'seccion'
                                ? <CurrentLevelChart stationId={stationId} />
                                : <HistoricLevelChart stationId={stationId} />
                            }
                        </div>
                    );
                }

                return null;
            })()}

            <Stack direction="row" spacing={1} sx={{ mt: 3, alignItems: 'center' }}>
                <div
                    style={{
                        display: 'flex',
                        background: 'var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '2px',
                        gap: '2px',
                    }}
                >
                    {SHARE_VARIANTS.map((variant) => (
                        <button
                            key={variant.value}
                            onClick={() => setShareVariant(variant.value)}
                            style={{
                                padding: '4px 14px',
                                fontSize: '11px',
                                fontFamily: 'var(--font-sans)',
                                fontWeight: shareVariant === variant.value ? 600 : 400,
                                border: 'none',
                                borderRadius: 'calc(var(--radius-sm) - 2px)',
                                background: shareVariant === variant.value ? 'var(--color-surface)' : 'transparent',
                                color: 'var(--color-text-base)',
                                cursor: 'pointer',
                                transition: 'background 150ms ease',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {variant.label}
                        </button>
                    ))}
                </div>

                <Button
                    variant="contained"
                    fullWidth
                    disabled={generatingImage}
                    startIcon={<ShareIcon />}
                    onClick={handleShareImage}
                >
                    {generatingImage ? 'Generando…' : 'Compartir imagen'}
                </Button>
            </Stack>

            <div
                aria-hidden
                style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}
            >
                <AlertShareImage
                    alarma={alarmaSeleccionada}
                    fechaFormateada={fechaFormateada}
                    variant={shareVariant}
                    nodeRef={shareNodeRef}
                    nivelInicio={chartType === 'nivel' ? nivelInicio : undefined}
                    umbrales={chartType === 'nivel' ? umbrales : undefined}
                    precipitacionAcumulada={
                        chartType === 'precipitation' ? precipitacionAcumulada : undefined
                    }
                    serieTresHoras={chartType === 'precipitation' ? alertaDetalle?.serie_3h : undefined}
                    snapshotMM={
                        chartType === 'massMovement' ? alertaDetalle?.snapshot_mm : undefined
                    }
                />
            </div>
        </Box>
    );
}

function AlertTypeRows({
    alarma,
    detalle,
    cargando,
}: {
    alarma: AlarmRow;
    detalle: AlertaDetalle | null | undefined;
    cargando: boolean;
}) {
    const topic = tipoDeAlertaToTopic(alarma.tipoDeAlerta);

    if (topic === 'nivel') {
        return null;
    }

    if (topic === 'precipitation') {
        // Estado de carga discreto; sin datos o serie vacía se muestra "—".
        const valor =
            !cargando && detalle?.precipitacion_acumulada_3h != null
                ? formatearMm(detalle.precipitacion_acumulada_3h)
                : cargando
                  ? 'Cargando…'
                  : '—';

        return (
            <>
                <DetailRow label="Precipitación acumulada 3 h" value={valor} />
                {!cargando && !!detalle?.serie_3h?.length && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Serie 3 h — buckets de 5 min desde el inicio de la alerta
                        </Typography>
                        <AlertaPrecipitacionChart serie={detalle.serie_3h} />
                    </Box>
                )}
            </>
        );
    }

    if (topic === 'massMovement') {
        // Snapshot de movimiento de masa: zona hidrográfica, lluvias y umbrales.
        const snapshot = detalle?.snapshot_mm ?? null;

        return (
            <>
                <DetailRow
                    label="Zona hidrográfica"
                    value={resolverValor(cargando, snapshot?.zh_nombre)}
                />
                <DetailRow
                    label="Lluvia 24 h"
                    value={resolverValor(cargando, snapshot?.rainfall_24h != null ? formatearMm(snapshot.rainfall_24h) : null)}
                />
                <DetailRow
                    label="Lluvia 90 días previos"
                    value={resolverValor(cargando, snapshot?.rainfall_prev_90d != null ? formatearMm(snapshot.rainfall_prev_90d) : null)}
                />
                <DetailRow
                    label="Umbral bajo/moderado (LM)"
                    value={resolverValor(cargando, snapshot?.thr_lm != null ? formatearMm(snapshot.thr_lm) : null)}
                />
                <DetailRow
                    label="Umbral moderado/alto (MH)"
                    value={resolverValor(cargando, snapshot?.thr_mh != null ? formatearMm(snapshot.thr_mh) : null)}
                />
            </>
        );
    }

    return null;
}

/** Formatea un valor en mm con separador es-CO y un decimal. */
function formatearMm(valor: number): string {
    return `${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(valor)} mm`;
}

/**
 * Resuelve el valor mostrado en una fila: "Cargando…" mientras la consulta
 * está pendiente, "N/D" si falta el dato o el valor ya formateado.
 */
function resolverValor(cargando: boolean, valor: string | null | undefined): string {
    if (cargando) return 'Cargando…';
    return valor ?? 'N/D';
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
