import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { fetchMeteorologicalHistory } from '@/services/chartServices';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { MeteorologicalValue } from '@/services/chartServices';
import { computeWindRose, WIND_ROSE_LEGEND, WIND_ROSE_AXIS } from '@/utils/windRose';
import { PrecipitationChart } from '@/components/charts/PrecipitationChart/PrecipitationChart';
import { TimePresetButtons, type TimeButton } from '@/components/ui/TimePresetButtons/TimePresetButtons';
import { ChartDateRange } from '@/components/ui/ChartDateRange/ChartDateRange';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MeteoVariable = 'lluvia' | 'temperatura' | 'humedad' | 'radiacion' | 'viento' | 'rosa';

interface MeteorologicalChartProps {
    stationId: string;
    selectedVariable: MeteoVariable;
    onVariableChange: (variable: MeteoVariable) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const today = dayjs().format('YYYY-MM-DD');

/** Max record count accepted by the meteorologia API endpoint */
const MAX_SIZE = 1500;

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

// ─── Variable metadata ────────────────────────────────────────────────────────

const VARIABLE_OPTIONS: { value: MeteoVariable; label: string }[] = [
    { value: 'lluvia', label: 'Precipitación (mm)' },
    { value: 'temperatura', label: 'Temperatura (°C)' },
    { value: 'humedad', label: 'Humedad relativa (%)' },
    { value: 'radiacion', label: 'Radiación (W/m²)' },
    { value: 'viento', label: 'Velocidad del viento (m/s)' },
    { value: 'rosa', label: 'Rosa de Vientos' },
];

type VariableConfig = {
    field: keyof MeteorologicalValue;
    qualityField: keyof MeteorologicalValue;
    unit: string;
    yName: string;
    excludeSentinel: boolean;
};

const VARIABLE_CONFIG: Record<Exclude<MeteoVariable, 'rosa'>, VariableConfig> = {
    lluvia: {
        field: 'lluvia',
        qualityField: 'calidad_lluvia',
        unit: 'mm',
        yName: 'Precipitación (mm)',
        excludeSentinel: false,
    },
    temperatura: {
        field: 'temperatura',
        qualityField: 'calidad_temperatura',
        unit: '°C',
        yName: 'Temperatura (°C)',
        excludeSentinel: true,
    },
    humedad: {
        field: 'humedad_relativa',
        qualityField: 'calidad_humedad_relativa',
        unit: '%',
        yName: 'Humedad relativa (%)',
        excludeSentinel: true,
    },
    radiacion: {
        field: 'radiacion',
        qualityField: 'calidad_radiacion',
        unit: 'W/m²',
        yName: 'Radiación (W/m²)',
        excludeSentinel: false,
    },
    viento: {
        field: 'velocidad_viento',
        qualityField: 'calidad_velocidad_viento',
        unit: 'm/s',
        yName: 'Velocidad del viento (m/s)',
        excludeSentinel: false,
    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterValues(
    values: MeteorologicalValue[],
    config: VariableConfig,
): { fecha: string; value: number }[] {
    return values
        .filter((v) => {
            const quality = v[config.qualityField];
            if (quality !== 1) return false;
            const raw = v[config.field];
            if (raw === null || raw === undefined) return false;
            const num = parseFloat(String(raw));
            if (isNaN(num)) return false;
            if (config.excludeSentinel && num === -999) return false;
            return true;
        })
        .map((v) => ({
            fecha: v.created_at,
            value: parseFloat(String(v[config.field])),
        }))
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
}

// ─── Sub-chart builders ───────────────────────────────────────────────────────

function buildLineOption(
    sortedValues: { fecha: string; value: number }[],
    config: VariableConfig,
    isDark: boolean
) {
    const textColor = isDark ? '#e2e8f0' : '#002040';
    const mutedColor = isDark ? '#94a3b8' : '#4A5568';
    const primaryColor = isDark ? '#A8D4EA' : '#002040';

    return {
        backgroundColor: 'transparent',
        textStyle: { fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-sm)', color: textColor },
        useUTC: false,
        color: [primaryColor],
        grid: { bottom: 60, right: 40, left: 20, containLabel: true },
        tooltip: {
            trigger: 'axis',
            valueFormatter: (value: unknown) =>
                typeof value === 'number' ? `${value.toFixed(2)} ${config.unit}` : String(value),
            axisPointer: { type: 'cross', animation: false },
        },
        legend: {
            data: [config.yName],
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
                name: config.yName,
                type: 'value',
                nameLocation: 'middle' as const,
                nameGap: 45,
                axisLine: { show: true },
                nameTextStyle: { color: mutedColor },
                axisLabel: { fontSize: 'var(--font-size-sm)', color: mutedColor },
                axisPointer: {
                    label: { formatter: ({ value }: { value: number }) => `${value.toFixed(2)} ${config.unit}` },
                },
                splitLine: { show: true },
                axisTick: { show: true },
            },
        ],
        dataset: {
            source: sortedValues,
            dimensions: ['fecha', 'value'],
        },
        series: [
            {
                name: config.yName,
                type: 'line' as const,
                symbolSize: 0,
                showSymbol: false,
                lineStyle: { width: 2 },
                areaStyle: { opacity: 0.4 },
                emphasis: { focus: 'series' },
                encode: { x: 'fecha', y: 'value' },
            },
        ],
    };
}

function buildWindRoseOption(calm: number, maxLimit: number, isDark: boolean) {
    const textColor = isDark ? '#e2e8f0' : '#002040';
    const mutedColor = isDark ? '#94a3b8' : '#4A5568';
    const dimensions = ['angle', ...WIND_ROSE_LEGEND];
    const series = WIND_ROSE_LEGEND.map(() => ({
        type: 'bar' as const,
        coordinateSystem: 'polar' as const,
        stack: 'wind',
        emphasis: { focus: 'series' as const },
    }));

    return {
        backgroundColor: 'transparent',
        textStyle: { fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-sm)', color: textColor },
        color: ['#b8c8bd', '#fffe00', '#ff0301', '#0000fe', '#007f41', '#81fffb'],
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow', animation: true },
            textStyle: { fontSize: 11 },
            valueFormatter: (value: unknown) => (value ? `${value}%` : '--'),
        },
        angleAxis: {
            type: 'category',
            data: [...WIND_ROSE_AXIS],
            boundaryGap: false,
            axisTick: { show: false },
            splitLine: { show: true },
            axisLabel: { show: true, interval: 1, fontSize: 'var(--font-size-sm)', color: mutedColor },
        },
        radiusAxis: {
            min: 0,
            max: maxLimit > 0 ? maxLimit + 1 : 10,
            axisLabel: {
                show: true,
                fontWeight: 'bold' as const,
                showMaxLabel: true,
                interval: 2,
                fontSize: 'var(--font-size-xs)',
                color: mutedColor,
                formatter: (value: number) => `${value.toFixed(0)}%`,
            },
            axisTick: { show: false },
            axisLine: { show: false },
            z: 10,
        },
        dataset: {
            dimensions,
            source: [] as unknown[],
        },
        series,
        legend: {
            data: [...WIND_ROSE_LEGEND],
            orient: 'vertical' as const,
            show: true,
            top: '25%',
            left: '70%',
            textStyle: { fontSize: 'var(--font-size-sm)', color: mutedColor },
        },
        polar: { center: ['38%', '50%'] },
        graphic: [
            {
                type: 'text',
                left: '68%',
                top: '15%',
                z: 100,
                style: { text: 'Velocidad (m/s)', fill: textColor, fontSize: 12, fontWeight: 'bold' },
            },
            {
                type: 'text',
                left: '70%',
                top: '82%',
                z: 100,
                style: {
                    text: `Calma: ${calm.toFixed(2)}%`,
                    fill: mutedColor,
                    fontSize: 11,
                },
            },
        ],
    };
}

// ─── Main component ───────────────────────────────────────────────────────────

export const MeteorologicalChart = ({ stationId, selectedVariable, onVariableChange }: MeteorologicalChartProps) => {
    const isMobile = useIsMobile();
    const isDark = useDarkMode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chartRef = useRef<any>(null);
    const variable = selectedVariable;
    const [startDate, setStartDate] = useState<string>(
        dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    );
    const [endDate, setEndDate] = useState<string>(today);
    const [activeValue, setActiveValue] = useState<number | null>(DEFAULT_VALUE);
    const [page, setPage] = useState<number | null>(null);

    const timeSize = activeValue ?? MAX_SIZE;

    useEffect(() => {
        setPage(null);
    }, [startDate, endDate, timeSize, variable]);

    const { isPending, isError, error, data } = useQuery({
        queryKey: ['meteorologicalHistory', stationId, activeValue, startDate, endDate, timeSize, variable, page],
        queryFn: () => fetchMeteorologicalHistory(
            stationId, page, timeSize,
            activeValue !== null ? undefined : endDate,
            activeValue !== null ? undefined : startDate,
        ),
        staleTime: 1000 * 60 * 5,
        refetchInterval: 1000 * 60 * 5,
        enabled: variable !== 'lluvia',
    });

    // ── Processed data ────────────────────────────────────────────────────────

    const config = variable !== 'rosa' && variable !== 'lluvia' ? VARIABLE_CONFIG[variable] : null;

    const scalarValues =
        config && data?.values ? filterValues(data.values, config) : [];

    const windRoseResult =
        variable === 'rosa' && data?.values ? computeWindRose(data.values) : null;

    // ── Download ──────────────────────────────────────────────────────────────

    const downloadData = (format: 'json' | 'csv') => {
        let content: string;
        let mime: string;
        let ext: string;

        if (variable === 'rosa') {
            const rows = (data?.values ?? []).filter(
                (v) => v.calidad_velocidad_viento === 1 && v.calidad_direccion_viento === 1,
            );
            if (!rows.length) return;
            if (format === 'json') {
                content = JSON.stringify(rows, null, 2);
                mime = 'application/json';
                ext = 'json';
            } else {
                const header = 'fecha,direccion_viento,velocidad_viento';
                const lines = rows.map((r) => `${r.created_at},${r.direccion_viento},${r.velocidad_viento}`);
                content = [header, ...lines].join('\n');
                mime = 'text/csv';
                ext = 'csv';
            }
        } else {
            if (!scalarValues.length) return;
            const fieldName = config!.field as string;
            if (format === 'json') {
                content = JSON.stringify(scalarValues, null, 2);
                mime = 'application/json';
                ext = 'json';
            } else {
                const header = `fecha,${fieldName}`;
                const lines = scalarValues.map((r) => `${r.fecha},${r.value}`);
                content = [header, ...lines].join('\n');
                mime = 'text/csv';
                ext = 'csv';
            }
        }

        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${stationId}_${variable}_${startDate}_${endDate}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const hasData =
        variable === 'rosa'
            ? Boolean(windRoseResult?.source.length)
            : scalarValues.length > 0;

    // ── Build chart option ────────────────────────────────────────────────────

    const chartOption = (() => {
        if (variable === 'rosa' && windRoseResult) {
            return buildWindRoseOption(windRoseResult.calm, windRoseResult.maxLimit, isDark);
        }
        if (config) {
            return buildLineOption(scalarValues, config, isDark);
        }
        return {};
    })();

    const finalOption =
        variable === 'rosa' && windRoseResult
            ? {
                ...chartOption,
                series: WIND_ROSE_LEGEND.map((band, i) => ({
                    ...(chartOption as ReturnType<typeof buildWindRoseOption>).series[i],
                    data: windRoseResult.source.map((row) => (row[band] as number | undefined) ?? 0),
                })),
            }
            : chartOption;

    // ── Render ────────────────────────────────────────────────────────────────

    if (isError) {
        return (
            <div style={{ padding: '12px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                Error: {(error as Error)?.message ?? 'No se pudo cargar los datos meteorológicos.'}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Variable selector */}
            <select
                style={{
                    padding: '3px 6px',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'var(--font-sans)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-base)',
                }}
                value={variable}
                onChange={(e) => onVariableChange(e.target.value as MeteoVariable)}
            >
                {VARIABLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>

            {/* lluvia delegates to PrecipitationChart */}
            {variable === 'lluvia' ? (
                <PrecipitationChart stationId={stationId} mode="meteorologia" />
            ) : (
                <>
                    {variable !== 'rosa' && (
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
                    )}

                    <ReactECharts
                        ref={chartRef}
                        theme={isDark ? 'dark' : undefined}
                        option={finalOption}
                        style={{ width: '100%', height: `${isMobile ? Math.min(320, Math.max(180, Math.round(window.innerHeight * 0.88) - 260)) : variable === 'rosa' ? 280 : 220}px` }}
                        showLoading={isPending}
                        key={`${stationId}-${variable}-${isDark}`}
                    />

                    {variable !== 'rosa' && (
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
                    )}

                    {variable !== 'rosa' && (
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
                                            a.download = `${stationId}_${variable}_${startDate}_${endDate}.png`;
                                            a.click();
                                        }
                                    },
                                },
                            ]}
                        />
                    )}
                </>
            )}
        </div>
    );
};
