import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useDarkMode } from '@/hooks/useDarkMode';
import dayjs from 'dayjs';
import {
    fetchPrecipitationHistory,
    fetchMeteorologicalHistory,
    type MeteorologicalHistoryResponse,
    type PrecipitationHistoryResponse,
} from '@/services/chartServices';
import { TimePresetButtons, type TimeButton } from '@/components/ui/TimePresetButtons/TimePresetButtons';
import { ChartDateRange } from '@/components/ui/ChartDateRange/ChartDateRange';

// ─── Types ────────────────────────────────────────────────────────────────────

type PrecipChartMode = 'pluviometro' | 'meteorologia';

interface PrecipitationChartProps {
    stationId: string;
    mode?: PrecipChartMode;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const today = dayjs().format('YYYY-MM-DD');

/** Max record count accepted by the pluviometros API endpoint */
const MAX_SIZE = 3000;

const BUTTONS: TimeButton[] = [
    { label: '3h', value: 36, durationDays: 1 },
    { label: '6h', value: 72, durationDays: 1 },
    { label: '24h', value: 288, durationDays: 1 },
    { label: '72h', value: 864, durationDays: 3 },
    { label: '5d', value: 1440, durationDays: 5 },
    { label: '30d', value: MAX_SIZE, durationDays: 30 },
];

const DEFAULT_VALUE = 288; // 24h

const btnStyle: React.CSSProperties = {
    padding: '4px 10px',
    fontSize: 'var(--font-size-xs)',
    fontFamily: 'var(--font-sans)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text-base)',
    cursor: 'pointer',
};

const disabledBtnStyle: React.CSSProperties = {
    ...btnStyle,
    opacity: 0.35,
    cursor: 'not-allowed',
};

// ─── Chart option builder ─────────────────────────────────────────────────────

function buildPrecipOption(
    sortedValues: { fecha: string; value: number; cumsum: number }[],
    acumuladoLabel: string,
    isDark: boolean
) {
    const textColor = isDark ? '#e2e8f0' : '#002040';
    const mutedColor = isDark ? '#94a3b8' : '#4A5568';
    const primaryColor = isDark ? '#A8D4EA' : '#002040';
    const cautionColor = '#FFD152';

    const lastRow = sortedValues[sortedValues.length - 1];
    return {
        backgroundColor: 'transparent',
        textStyle: { fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-sm)', color: textColor },
        useUTC: false,
        color: [primaryColor, cautionColor],
        grid: { top: 20, bottom: 80, right: 50, left: 30, containLabel: true },
        tooltip: {
            trigger: 'axis',
            valueFormatter: (value: unknown) =>
                typeof value === 'number' ? `${value.toFixed(2)} mm` : String(value),
            axisPointer: { type: 'cross', animation: false },
        },
        legend: {
            data: ['Precipitación (mm)', acumuladoLabel],
            orient: 'horizontal' as const,
            bottom: 40,
            textStyle: { fontSize: 'var(--font-size-sm)', color: mutedColor },
            formatter: (name: string) => {
                if (name === 'Precipitación (mm)' && lastRow !== undefined)
                    return `Precipitación (mm) — ${lastRow.value.toFixed(2)} mm`;
                if (name === acumuladoLabel && lastRow !== undefined)
                    return `${acumuladoLabel} — ${lastRow.cumsum.toFixed(2)} mm`;
                return name;
            },
        },
        dataZoom: [
            {
                type: 'slider',
                show: true,
                realtime: true,
                start: 0,
                end: 100,
                bottom: 10,
                filterMode: 'none',
                fillerColor: 'rgba(12, 35, 64, 0.1)',
                selectedDataBackground: {
                    lineStyle: { color: '#0c2340' },
                    areaStyle: { color: 'rgba(8,30,61,0.8)', opacity: 0.8 },
                },
            },
            { type: 'inside', realtime: true, start: 0, end: 100 },
        ],
        xAxis: [
            {
                type: 'time',
                boundaryGap: false,
                axisLine: { onZero: false },
                name: 'Fecha',
                nameLocation: 'middle' as const,
                nameGap: 30,
                nameTextStyle: { color: mutedColor },
                axisLabel: {
                    fontSize: 'var(--font-size-sm)',
                    color: mutedColor,
                    formatter: {
                        year: '{d} {MMM}\n{yyyy}',
                        month: '{d} {MMM}\n{yyyy}',
                        day: '{d} {MMM}\n{yyyy}',
                        hour: '{HH}:{mm}',
                    },
                },
            },
        ],
        yAxis: [
            {
                name: 'Precipitación (mm)',
                type: 'value',
                nameLocation: 'middle' as const,
                nameGap: 27,
                nameTextStyle: { color: mutedColor },
                axisLine: { show: true },
                axisLabel: { fontSize: 'var(--font-size-sm)', color: mutedColor },
                splitLine: { show: true },
                position: 'left' as const,
            },
            {
                name: 'Acumulado (mm)',
                type: 'value',
                alignTicks: true,
                position: 'right' as const,
                nameLocation: 'middle' as const,
                nameGap: 45,
                nameTextStyle: { color: mutedColor },
                axisLabel: { fontSize: 'var(--font-size-sm)', color: mutedColor },
            },
        ],
        dataset: {
            source: sortedValues,
            dimensions: ['fecha', 'value', 'cumsum'],
        },
        series: [
            {
                name: 'Precipitación (mm)',
                type: 'bar' as const,
                emphasis: { focus: 'series' },
                encode: { x: 'fecha', y: 'value' },
            },
            {
                name: acumuladoLabel,
                type: 'line' as const,
                yAxisIndex: 1,
                symbolSize: 0,
                showSymbol: false,
                lineStyle: { opacity: 0.7, width: 1.5 },
                emphasis: { focus: 'series' },
                encode: { x: 'fecha', y: 'cumsum' },
            },
        ],
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addCumsum(
    data: { fecha: string; value: number }[],
): { fecha: string; value: number; cumsum: number }[] {
    let running = 0;
    return data.map((row) => {
        running = Math.round((running + row.value) * 1000) / 1000;
        return { ...row, cumsum: running };
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PrecipitationChart = ({ stationId, mode = 'pluviometro' }: PrecipitationChartProps) => {
    const isMobile = useIsMobile();
    const isDark = useDarkMode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chartRef = useRef<any>(null);
    const [startDate, setStartDate] = useState<string>(
        dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    );
    const [endDate, setEndDate] = useState<string>(today);
    const [activeValue, setActiveValue] = useState<number | null>(DEFAULT_VALUE);
    const [page, setPage] = useState<number | null>(null);

    const timeSize = activeValue ?? MAX_SIZE;

    useEffect(() => {
        setPage(null);
    }, [startDate, endDate, timeSize]);

    const queryKey =
        mode === 'pluviometro'
            ? ['precipitationHistory', stationId, startDate, endDate, timeSize, page]
            : ['meteorologicalHistoryLluvia', stationId, startDate, endDate, timeSize, page];

    const { isPending, isError, error, data } = useQuery<MeteorologicalHistoryResponse | PrecipitationHistoryResponse>({
        queryKey,
        queryFn: () =>
            mode === 'pluviometro'
                ? fetchPrecipitationHistory(
                    stationId, page, timeSize,
                    activeValue !== null ? undefined : endDate,
                    activeValue !== null ? undefined : startDate,
                )
                : fetchMeteorologicalHistory(
                    stationId, page, timeSize,
                    activeValue !== null ? undefined : endDate,
                    activeValue !== null ? undefined : startDate,
                ),
        staleTime: 1000 * 60 * 5,
        refetchInterval: 1000 * 60 * 5,
    });

    // ── Process data ──────────────────────────────────────────────────────────

    const rawValues = data?.values ?? [];

    const filtered: { fecha: string; value: number }[] = rawValues
        .filter((v) => {
            if (mode === 'pluviometro') {
                const pv = v as { created_at: string; muestra: string; calidad: number };
                return pv.calidad === 1;
            } else {
                const mv = v as { created_at: string; lluvia: string | null; calidad_lluvia: number | null };
                return mv.calidad_lluvia === 1 && mv.lluvia !== null;
            }
        })
        .map((v) => {
            if (mode === 'pluviometro') {
                const pv = v as { created_at: string; muestra: string };
                return { fecha: pv.created_at, value: parseFloat(pv.muestra) || 0 };
            } else {
                const mv = v as { created_at: string; lluvia: string | null };
                return { fecha: mv.created_at, value: parseFloat(mv.lluvia ?? '0') || 0 };
            }
        })
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const precipValues = addCumsum(filtered);

    const acumuladoLabel = (() => {
        if (activeValue !== null) {
            const activeBtn = BUTTONS.find((b) => b.value === activeValue);
            if (activeBtn) return `Acumulado ${activeBtn.label} (mm)`;
        }
        const diffDays = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
        return `Acumulado ${diffDays} día${diffDays !== 1 ? 's' : ''} (mm)`;
    })();

    // ── Download ──────────────────────────────────────────────────────────────

    const downloadData = (format: 'json' | 'csv') => {
        if (!precipValues.length) return;
        let content: string;
        let mime: string;
        let ext: string;
        if (format === 'json') {
            content = JSON.stringify(precipValues, null, 2);
            mime = 'application/json';
            ext = 'json';
        } else {
            const header = 'fecha,precipitacion,acumulado';
            const lines = precipValues.map((r) => `${r.fecha},${r.value},${r.cumsum}`);
            content = [header, ...lines].join('\n');
            mime = 'text/csv';
            ext = 'csv';
        }
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${stationId}_precipitacion_${startDate}_${endDate}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (isError) {
        return (
            <div style={{ padding: '12px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                Error: {(error as Error)?.message ?? 'No se pudo cargar los datos de precipitación.'}
            </div>
        );
    }

    const hasData = precipValues.length > 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <TimePresetButtons
                buttons={BUTTONS}
                activeValue={activeValue}
                startDate={startDate}
                endDate={endDate}
                onSelect={(newStart, newEnd, value) => {
                    setStartDate(newStart);
                    setEndDate(newEnd);
                    setActiveValue(value);
                    setPage(null);
                }}
            />

            <ReactECharts
                ref={chartRef}
                theme={isDark ? 'dark' : undefined}
                option={buildPrecipOption(precipValues, acumuladoLabel, isDark)}
                style={{ width: '100%', height: `${isMobile ? Math.min(320, Math.max(180, Math.round(window.innerHeight * 0.88) - 260)) : 260}px` }}
                showLoading={isPending}
                key={`${stationId}-${mode}-${isDark}`}
            />

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                <button
                    style={data?.next ? btnStyle : disabledBtnStyle}
                    disabled={!data?.next}
                    onClick={() => setPage((p) => (p === null ? 2 : p + 1))}
                >
                    ← Anterior
                </button>
                <button
                    style={data?.previous && page && page > 1 ? btnStyle : disabledBtnStyle}
                    disabled={!data?.previous || !page || page <= 1}
                    onClick={() => setPage((p) => (p && p > 1 ? p - 1 : null))}
                >
                    Siguiente →
                </button>
            </div>

            <ChartDateRange
                startDate={startDate}
                endDate={endDate}
                maxEndDate={today}
                maxRangeDays={30}
                onDatesChange={(newStart, newEnd) => {
                    setStartDate(newStart);
                    setEndDate(newEnd);
                    setActiveValue(null);
                    setPage(null);
                }}
                downloads={[
                    {
                        label: 'CSV',
                        disabled: !hasData,
                        onClick: () => downloadData('csv'),
                    },
                    {
                        label: 'JSON',
                        disabled: !hasData,
                        onClick: () => downloadData('json'),
                    },
                    {
                        label: 'PNG',
                        disabled: !hasData,
                        onClick: () => {
                            const instance = chartRef.current?.getEchartsInstance();
                            if (instance) {
                                const url = instance.getDataURL({
                                    type: 'png',
                                    pixelRatio: 2,
                                    backgroundColor: '#fff',
                                });
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${stationId}_precipitacion_${startDate}_${endDate}.png`;
                                a.click();
                            }
                        },
                    },
                ]}
            />
        </div>
    );
};
