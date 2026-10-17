// Gráfica de barras de la serie 3 h asociada a una alerta de precipitación.
// A diferencia de PrecipitationChart (anclado a fechas relativas a hoy y con
// fetch propio), este componente es puramente presentacional: recibe
// `serie_3h` ya cargada por el hook del detalle de la alerta.
//
// También se usa en la imagen compartible (AlertShareImage): allí debe ir sin
// animación (html-to-image rasteriza el canvas de ECharts y una animación en
// curso dejaría el PNG vacío), sin tooltip ni interacción, con esquema claro
// fijo (el póster tiene fondo blanco) y altura/etiquetas escaladas al lienzo.

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import type { SerieTresHorasBucket } from '@/types/alertaDetalle';

interface AlertaPrecipitacionChartProps {
    serie: SerieTresHorasBucket[];
    /** Altura del gráfico en px; por defecto 180 (vista en pantalla). */
    height?: number;
    /** Tamaño de las etiquetas de los ejes; por defecto 10 (pantalla). */
    fontSize?: number;
    /** Desactiva la animación inicial; obligatorio para la captura compartible. */
    animation?: boolean;
    /** Versión estática (imagen compartible): sin tooltip ni interacción. */
    static?: boolean;
}

/** Suma acumulada de precipitación por bucket (réplica de addCumsum en
 * PrecipitationChart, adaptada a SerieTresHorasBucket). Redondeo a 3 decimales
 * para evitar el arrastre de coma flotante. */
function addCumsum(
    serie: SerieTresHorasBucket[],
): (SerieTresHorasBucket & { acumulado: number })[] {
    let running = 0;
    return serie.map((bucket) => {
        running = Math.round((running + bucket.precip_sum) * 1000) / 1000;
        return { ...bucket, acumulado: running };
    });
}

export function AlertaPrecipitacionChart({
    serie,
    height = 180,
    fontSize = 10,
    animation = true,
    static: estatica = false,
}: AlertaPrecipitacionChartProps) {
    const isDarkSistema = useDarkMode();
    // En el share forzamos claro porque el póster usa fondo blanco fijo.
    const isDark = estatica ? false : isDarkSistema;

    const option = useMemo(() => {
        const textColor = isDark ? '#e2e8f0' : '#002040';
        const mutedColor = isDark ? '#94a3b8' : '#4A5568';
        // Mismo ámbar que la línea de acumulado en PrecipitationChart: legible
        // sobre fondo claro (póster) y oscuro por igual.
        const acumuladoColor = '#FFD152';

        const serieConAcumulado = addCumsum(serie);

        // Tamaño del nombre de los ejes Y: en modo estático (póster, ancho
        // fijo ~920 px útiles) se reduce un poco para no apretar la gráfica.
        const nombreEjeFontSize = estatica ? Math.max(fontSize - 4, 10) : fontSize;
        // Distancia del nombre al eje proporcional al tamaño de etiqueta (las
        // etiquetas numéricas crecen con fontSize en el póster).
        const nombreEjeGap = Math.round(fontSize * 2.8);

        return {
            backgroundColor: 'transparent',
            textStyle: { fontFamily: 'var(--font-sans)', color: textColor },
            // Sin animación el canvas queda pintado al primer frame (necesario
            // para que html-to-image capture la gráfica correctamente).
            animation,
            // En modo estático se ignora cualquier evento de puntero.
            silent: estatica,
            // Se reserva más margen inferior porque la leyenda ahora va al
            // fondo del chart y no debe solaparse con el eje X. Los márgenes
            // laterales dejan espacio a los nombres verticales de los ejes Y,
            // que containLabel no siempre contempla y podrían recortarse.
            grid: {
                top: 16,
                right: nombreEjeFontSize + 4,
                bottom: 44,
                left: nombreEjeFontSize + 4,
                containLabel: true,
            },
            ...(estatica
                ? {}
                : {
                      tooltip: {
                          trigger: 'axis',
                          valueFormatter: (value: unknown) =>
                              typeof value === 'number' ? `${value.toFixed(2)} mm` : String(value),
                      },
                      legend: {
                          data: ['Precipitación (mm)', 'Acumulado (mm)'],
                          textStyle: { fontSize, color: mutedColor },
                          // Leyenda al fondo del chart.
                          bottom: 0,
                      },
                  }),
            xAxis: {
                type: 'time',
                axisLine: { lineStyle: { color: mutedColor } },
                axisLabel: {
                    fontSize,
                    color: mutedColor,
                    formatter: { day: '{d} {MMM}', hour: '{HH}:{mm}' },
                },
            },
            yAxis: [
                {
                    type: 'value',
                    // Nombre del eje centrado en vertical (mismo patrón que
                    // PrecipitationChart).
                    name: 'Precipitación (mm)',
                    nameLocation: 'middle' as const,
                    nameGap: nombreEjeGap,
                    nameTextStyle: { color: mutedColor, fontSize: nombreEjeFontSize },
                    axisLabel: { fontSize, color: mutedColor },
                    splitLine: { lineStyle: { opacity: 0.3 } },
                    position: 'left' as const,
                },
                {
                    type: 'value',
                    name: 'Acumulado (mm)',
                    alignTicks: true,
                    position: 'right' as const,
                    nameLocation: 'middle' as const,
                    nameGap: nombreEjeGap,
                    nameTextStyle: { color: mutedColor, fontSize: nombreEjeFontSize },
                    axisLabel: { fontSize, color: mutedColor },
                    splitLine: { show: false },
                },
            ],
            series: [
                {
                    name: 'Precipitación (mm)',
                    type: 'bar' as const,
                    barCategoryGap: '20%',
                    itemStyle: { borderRadius: [2, 2, 0, 0] },
                    // Puntos [timestamp_ms, mm]; buckets sin lluvia se muestran como 0.
                    data: serie.map((b) => [new Date(b.bucket).getTime(), b.precip_sum]),
                },
                {
                    name: 'Acumulado (mm)',
                    type: 'line' as const,
                    yAxisIndex: 1,
                    smooth: true,
                    showSymbol: false,
                    lineStyle: { color: acumuladoColor, width: 1.5, opacity: 0.9 },
                    itemStyle: { color: acumuladoColor },
                    // Puntos [timestamp_ms, mm acumulados]; el valor final
                    // coincide con precipitacion_acumulada_3h (misma suma).
                    data: serieConAcumulado.map((b) => [
                        new Date(b.bucket).getTime(),
                        b.acumulado,
                    ]),
                },
            ],
        };
    }, [serie, isDark, animation, estatica, fontSize]);

    if (!serie.length) return null;

    return (
        <ReactECharts
            option={option}
            theme={isDark ? 'dark' : undefined}
            style={{ width: '100%', height }}
        />
    );
}
