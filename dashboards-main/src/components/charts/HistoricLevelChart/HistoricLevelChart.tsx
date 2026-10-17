import { useEffect, useRef, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { fetchLevelHistory, fetchLevelSection } from '@/services/chartServices';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useIsMobile } from '@/hooks/useIsMobile';
import { TimePresetButtons, type TimeButton } from '@/components/ui/TimePresetButtons/TimePresetButtons';
import { ChartDateRange } from '@/components/ui/ChartDateRange/ChartDateRange';

interface HistoricLevelChartProps {
    stationId: string;
}

const today = dayjs().format('YYYY-MM-DD');

/** Max record count accepted by the niveles API endpoint */
const MAX_SIZE = 3000;

const BUTTONS: TimeButton[] = [
    { label: '3h', value: 180, durationDays: 1 },
    { label: '6h', value: 360, durationDays: 1 },
    { label: '24h', value: 1440, durationDays: 1 },
    { label: '72h', value: 3000, durationDays: 3 },
];

const DEFAULT_VALUE = 1440; // 24h

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

export const HistoricLevelChart = ({ stationId }: HistoricLevelChartProps) => {
    const isMobile = useIsMobile();
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

    const downloadData = (format: 'json' | 'csv') => {
        if (!sortedValues?.length) return;
        let content: string;
        let mime: string;
        let ext: string;
        if (format === 'json') {
            content = JSON.stringify(sortedValues, null, 2);
            mime = 'application/json';
            ext = 'json';
        } else {
            const header = 'fecha,nivel';
            const rows = sortedValues.map((r) => `${r.fecha},${r.nivel}`);
            content = [header, ...rows].join('\n');
            mime = 'text/csv';
            ext = 'csv';
        }
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${stationId}_niveles_${startDate}_${endDate}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const [historyQuery, sectionQuery] = useQueries({
        queries: [
            {
                queryKey: ['levelHistory', stationId, activeValue, startDate, endDate, timeSize, page],
                queryFn: () => fetchLevelHistory(
                    stationId, page, timeSize,
                    activeValue !== null ? undefined : endDate,
                    activeValue !== null ? undefined : startDate,
                ),
                staleTime: 1000 * 60 * 5,
                refetchInterval: 1000 * 60 * 5,
            },
            {
                queryKey: ['levelSection', stationId],
                queryFn: () => fetchLevelSection(stationId),
                staleTime: 1000 * 60 * 15,
            },
        ],
    });

    const isDark = useDarkMode();
    const textColor = isDark ? '#e2e8f0' : '#002040';
    const mutedColor = isDark ? '#94a3b8' : '#4A5568';
    const primaryColor = isDark ? '#A8D4EA' : '#002040';

    const historyData = historyQuery.data;
    const sectionData = sectionQuery.data;
    const isPending = historyQuery.isPending || sectionQuery.isPending;
    const isError = historyQuery.isError || sectionQuery.isError;
    const error = historyQuery.error || sectionQuery.error;

    const sortedValues = historyData?.values
        ?.map((item) => ({
            fecha: item.created_at,
            nivel: parseFloat(item.nivel) || 0,
        }))
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const umbralSerie = (name: string, color: string, value: number) => ({
        name,
        type: 'line' as const,
        color,
        symbolSize: 0,
        showSymbol: false,
        lineStyle: { type: 'dashed' as const, width: 1.5 },
        data: sortedValues?.length
            ? [
                [sortedValues[0].fecha, value],
                [sortedValues[sortedValues.length - 1].fecha, value],
            ]
            : [],
    });

    const option = {
        backgroundColor: 'transparent',
        textStyle: { fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-sm)', color: textColor },
        useUTC: false,
        color: [primaryColor],
        grid: { bottom: 60, right: 40, left: 20, containLabel: true },
        tooltip: {
            trigger: 'axis',
            valueFormatter: (value: unknown) =>
                typeof value === 'number' ? `${value.toFixed(2)} cm` : String(value),
            axisPointer: { type: 'cross', animation: false },
        },
        legend: {
            data: ['Nivel (cm)', 'Alerta Amarilla', 'Alerta Naranja', 'Alerta Roja'],
            orient: 'horizontal' as const,
            top: 'top',
            textStyle: { fontSize: 'var(--font-size-sm)', color: mutedColor },
        },
        dataZoom: [
            {
                type: 'slider',
                show: true,
                realtime: true,
                start: 0,
                end: 100,
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
                name: 'Nivel (cm)',
                type: 'value',
                nameLocation: 'middle' as const,
                nameGap: 40,
                min: 0,
                axisLine: { show: true },
                nameTextStyle: { color: mutedColor },
                axisLabel: { fontSize: 'var(--font-size-sm)', color: mutedColor },
                axisPointer: {
                    label: { formatter: ({ value }: { value: number }) => `${value.toFixed(2)} cm` },
                },
                splitLine: { show: true },
                axisTick: { show: true },
            },
        ],
        dataset: {
            source: sortedValues ?? [],
            dimensions: ['fecha', 'nivel'],
        },
        series: [
            {
                name: 'Nivel (cm)',
                type: 'line' as const,
                symbolSize: 0,
                showSymbol: false,
                lineStyle: { width: 2 },
                areaStyle: { opacity: 0.4 },
                emphasis: { focus: 'series' },
                encode: { x: 'fecha', y: 'nivel' },
            },
            ...(sectionData
                ? [
                    umbralSerie('Alerta Roja', 'red', sectionData.umbral_rojo),
                    umbralSerie('Alerta Naranja', 'orange', sectionData.umbral_naranja),
                    umbralSerie('Alerta Amarilla', '#f5c400', sectionData.umbral_amarillo),
                ]
                : []),
        ],
    };

    if (isError) {
        return (
            <div style={{ padding: '12px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                Error: {(error as Error)?.message ?? 'No se pudo cargar el historial de niveles.'}
            </div>
        );
    }

    const hasData = Boolean(sortedValues?.length);

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
                option={option}
                style={{ width: '100%', height: `${isMobile ? Math.min(320, Math.max(180, Math.round(window.innerHeight * 0.88) - 260)) : 220}px` }}
                showLoading={isPending}
                key={`${stationId}-${isDark}`}
            />

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                <button
                    style={historyData?.next ? btnStyle : disabledBtnStyle}
                    disabled={!historyData?.next}
                    onClick={() => setPage((p) => (p === null ? 2 : p + 1))}
                >
                    ← Anterior
                </button>
                <button
                    style={historyData?.previous && page && page > 1 ? btnStyle : disabledBtnStyle}
                    disabled={!historyData?.previous || !page || page <= 1}
                    onClick={() => setPage((p) => (p && p > 1 ? p - 1 : null))}
                >
                    Siguiente →
                </button>
            </div>

            <ChartDateRange
                startDate={startDate}
                endDate={endDate}
                maxEndDate={today}
                maxRangeDays={3}
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
                                a.download = `${stationId}_niveles_${startDate}_${endDate}.png`;
                                a.click();
                            }
                        },
                    },
                ]}
            />
        </div>
    );
};
