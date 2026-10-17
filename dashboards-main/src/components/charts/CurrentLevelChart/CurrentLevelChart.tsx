import { useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { fetchLevelHistory, fetchLevelSection } from '@/services/chartServices';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useIsMobile } from '@/hooks/useIsMobile';

interface CurrentLevelChartProps {
    stationId: string;
}

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

export const CurrentLevelChart = ({ stationId }: CurrentLevelChartProps) => {
    const isMobile = useIsMobile();
    const isDark = useDarkMode();
    const textColor = isDark ? '#e2e8f0' : '#002040';
    const mutedColor = isDark ? '#94a3b8' : '#4A5568';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chartRef = useRef<any>(null);
    const [sectionQuery, currentQuery] = useQueries({
        queries: [
            {
                queryKey: ['levelSection', stationId],
                queryFn: () => fetchLevelSection(stationId),
                staleTime: 1000 * 60 * 15,
            },
            {
                queryKey: ['currentLevel', stationId],
                queryFn: () => fetchLevelHistory(stationId, null, 1),
                staleTime: 1000 * 60 * 5,
                refetchInterval: 1000 * 60 * 5,
            },
        ],
    });

    const sectionData = sectionQuery.data;
    const currentData = currentQuery.data;
    const isPending = sectionQuery.isPending || currentQuery.isPending;
    const isError = sectionQuery.isError || currentQuery.isError;
    const error = sectionQuery.error || currentQuery.error;

    if (isError) {
        return (
            <div style={{ padding: '12px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                Error: {(error as Error)?.message ?? 'No se pudo cargar la sección transversal.'}
            </div>
        );
    }

    // ── Data processing ──────────────────────────────────────────────────────
    const latestValue = currentData?.values?.[0];
    const currentLevel = latestValue ? parseFloat(latestValue.nivel) : null;
    const timestampLabel = latestValue
        ? dayjs(latestValue.created_at).format('DD/MM/YYYY HH:mm')
        : '';

    const profileData = sectionData?.x.map((xVal: number, i: number) => ({
        x: parseFloat(String(xVal)),
        y: parseFloat(String(sectionData.y[i])) * 100,
        level: currentLevel ?? 0,
    }));

    const xMax = sectionData ? parseFloat(String(sectionData.x[sectionData.x.length - 1])) : 10;
    const offsetVal = sectionData?.offset ?? 0;
    const yInterval = offsetVal / 5;

    const amarillo = sectionData?.umbral_amarillo ?? 0;
    const naranja = sectionData?.umbral_naranja ?? 0;
    const rojo = sectionData?.umbral_rojo ?? 0;

    const option = sectionData
        ? {
            backgroundColor: 'transparent',
            textStyle: { fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-sm)', color: textColor },
            title: {
                text: `${stationId}  ${currentLevel != null ? `${currentLevel} cm` : ''}  ${timestampLabel}`,
                textStyle: { fontSize: 11, fontFamily: 'var(--font-sans)', fontWeight: 600, color: textColor },
            },
            legend: {
                data: ['Nivel actual', 'Nivel seguro', 'Alerta Amarilla', 'Alerta Naranja', 'Alerta Roja'],
                orient: 'horizontal' as const,
                bottom: 0,
                textStyle: { fontSize: 'var(--font-size-sm)', color: mutedColor },
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    label: {
                        backgroundColor: '#6a7985',
                        formatter: (params: { axisDimension: string; value: unknown }) => {
                            const v = typeof params.value === 'number' ? params.value : parseFloat(String(params.value));
                            if (isNaN(v)) return String(params.value);
                            return `${v.toFixed(0)} ${params.axisDimension === 'y' ? 'cm' : 'm'}`;
                        },
                    },
                },
            },
            grid: [
                { left: '10%', right: '14%', top: '18%', bottom: '22%', containLabel: false },
                { left: '87%', right: '5%', top: '18%', bottom: '22%', containLabel: false },
            ],
            xAxis: [
                {
                    gridIndex: 0,
                    type: 'value',
                    name: 'Ancho de la corriente (m)',
                    boundaryGap: false,
                    nameLocation: 'middle' as const,
                    nameGap: 25,
                    nameTextStyle: { color: mutedColor },
                    splitLine: { show: true },
                    axisLabel: { formatter: '{value}', fontSize: 'var(--font-size-sm)', color: mutedColor },
                    max: xMax,
                },
                {
                    gridIndex: 1,
                    type: 'category',
                    data: ['Umbrales'],
                    splitLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: { show: false },
                },
            ],
            yAxis: [
                {
                    gridIndex: 0,
                    type: 'value',
                    name: 'Nivel (cm)',
                    min: 0,
                    max: offsetVal,
                    interval: yInterval,
                    nameLocation: 'middle' as const,
                    nameGap: 38,
                    nameTextStyle: { color: mutedColor },
                    position: 'left' as const,
                    axisLine: { lineStyle: { color: '#6a7985' } },
                    axisLabel: { formatter: (v: number) => String(Math.round(v)), fontSize: 'var(--font-size-sm)', color: mutedColor },
                },
                {
                    gridIndex: 1,
                    type: 'value',
                    min: 0,
                    max: offsetVal,
                    interval: yInterval,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: { show: false },
                    splitLine: { show: false },
                },
            ],
            dataset: { source: profileData, dimensions: ['x', 'y', 'level'] },
            series: [
                {
                    name: 'Nivel actual',
                    type: 'line',
                    smooth: false,
                    yAxisIndex: 0,
                    z: 1,
                    encode: { x: 'x', y: 'level' },
                    showSymbol: false,
                    lineStyle: { color: 'transparent' },
                    areaStyle: { color: isDark ? '#A8D4EA' : '#005EB8', opacity: 0.8 },
                    emphasis: { disabled: true },
                },
                {
                    name: 'Línea de nivel',
                    type: 'line',
                    smooth: false,
                    yAxisIndex: 0,
                    z: 3,
                    encode: { x: 'x', y: 'level' },
                    showSymbol: false,
                    lineStyle: { color: '#005EB8', type: 'dashed', width: 1 },
                    areaStyle: { color: 'transparent' },
                    tooltip: { show: false },
                    emphasis: { disabled: true },
                    markLine: {
                        silent: true,
                        symbol: 'none',
                        label: {
                            show: true,
                            position: 'insideEndTop',
                            formatter: currentLevel != null ? `${currentLevel} cm` : '',
                            color: '#005EB8',
                            fontWeight: 'bold',
                            fontSize: 13,
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            padding: [2, 4],
                            borderRadius: 2,
                        },
                        data: [{ yAxis: currentLevel ?? 0, lineStyle: { color: 'transparent' } }],
                    },
                },
                {
                    name: 'Sección',
                    type: 'line',
                    smooth: false,
                    yAxisIndex: 0,
                    z: 2,
                    encode: { x: 'x', y: 'y' },
                    showSymbol: false,
                    lineStyle: { color: '#e9c39e' },
                    areaStyle: { color: '#e9c39e', opacity: 1 },
                    tooltip: { show: false },
                    emphasis: { disabled: true },
                },
                {
                    name: 'Nivel seguro',
                    type: 'bar',
                    stack: 'thresholds',
                    xAxisIndex: 1,
                    yAxisIndex: 1,
                    data: [amarillo],
                    itemStyle: { color: 'green' },
                    tooltip: { show: false },
                },
                {
                    name: 'Alerta Amarilla',
                    type: 'bar',
                    stack: 'thresholds',
                    xAxisIndex: 1,
                    yAxisIndex: 1,
                    data: [naranja - amarillo],
                    itemStyle: { color: '#f5c400' },
                    tooltip: { show: false },
                },
                {
                    name: 'Alerta Naranja',
                    type: 'bar',
                    stack: 'thresholds',
                    xAxisIndex: 1,
                    yAxisIndex: 1,
                    data: [rojo - naranja],
                    itemStyle: { color: 'orange' },
                    tooltip: { show: false },
                },
                {
                    name: 'Alerta Roja',
                    type: 'bar',
                    stack: 'thresholds',
                    xAxisIndex: 1,
                    yAxisIndex: 1,
                    data: [offsetVal - rojo],
                    itemStyle: { color: 'red' },
                    tooltip: { show: false },
                },
            ],
        }
        : {};

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <ReactECharts
                ref={chartRef}
                theme={isDark ? 'dark' : undefined}
                option={option}
                style={{ width: '100%', height: `${isMobile ? Math.min(320, Math.max(180, Math.round(window.innerHeight * 0.88) - 260)) : 260}px` }}
                showLoading={isPending || !sectionData}
                key={`${stationId}-${isDark}`}
            />
            {sectionData && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        Descargar:
                    </span>
                    <button
                        style={currentLevel != null ? btnStyle : disabledBtnStyle}
                        disabled={currentLevel == null}
                        onClick={() => {
                            const instance = chartRef.current?.getEchartsInstance();
                            if (instance) {
                                const url = instance.getDataURL({
                                    type: 'png',
                                    pixelRatio: 2,
                                    backgroundColor: '#fff',
                                });
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${stationId}_seccion_${dayjs().format('YYYY-MM-DD')}.png`;
                                a.click();
                            }
                        }}
                        title="Guardar sección transversal como PNG"
                    >
                        PNG
                    </button>
                </div>
            )}
        </div>
    );
};
