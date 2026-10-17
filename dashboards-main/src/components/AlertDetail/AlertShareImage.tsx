import type { Ref } from 'react';
import type { AlarmRow } from '@/types/alarmas';
import type { SerieTresHorasBucket, SnapshotMM } from '@/types/alertaDetalle';
import { tipoDeAlertaToTopic } from '@/components/AlertMap/MarkerFactory';
import { AlertaPrecipitacionChart } from '@/components/charts/AlertaPrecipitacionChart';
import { getColorName } from '@/utils/shareAlertImage';

export type ShareVariant = 'card' | 'poster';

const FONT_STACK = "'Roboto', 'Helvetica', 'Arial', sans-serif";
const TEXT_BASE = '#002040';
const TEXT_MUTED = '#4A5568';
const BORDER = '#e2e8f0';
const SURFACE = '#ffffff';

interface Umbrales {
    amarillo: string;
    naranja: string;
    rojo: string;
}

interface ShareLayoutProps {
    alarma: AlarmRow;
    fechaFormateada: string;
    nodeRef?: Ref<HTMLDivElement>;
    /** Nivel hídrico al momento de inicio de la alerta (con un decimal) o null si no hay dato. */
    nivelInicio?: string | null;
    /** Umbrales de la estación (Strapi) con un decimal; solo para alertas de nivel. */
    umbrales?: Umbrales | null;
    /** Precipitación acumulada 3 h (mm); solo se define para alertas de precipitación. */
    precipitacionAcumulada?: number | null;
    /** Serie 3 h en buckets de 5 min; solo se pasa para alertas de precipitación. */
    serieTresHoras?: SerieTresHorasBucket[] | null;
    /** Snapshot de movimiento de masa; solo se pasa para alertas de movimiento de masa. */
    snapshotMM?: SnapshotMM | null;
}

export function AlertShareImage({
    alarma,
    fechaFormateada,
    variant,
    nodeRef,
    nivelInicio,
    umbrales,
    precipitacionAcumulada,
    serieTresHoras,
    snapshotMM,
}: ShareLayoutProps & { variant: ShareVariant }) {
    if (variant === 'poster') {
        return (
            <PosterLayout
                alarma={alarma}
                fechaFormateada={fechaFormateada}
                nodeRef={nodeRef}
                nivelInicio={nivelInicio}
                umbrales={umbrales}
                precipitacionAcumulada={precipitacionAcumulada}
                serieTresHoras={serieTresHoras}
                snapshotMM={snapshotMM}
            />
        );
    }

    return (
        <CardLayout
            alarma={alarma}
            fechaFormateada={fechaFormateada}
            nodeRef={nodeRef}
            nivelInicio={nivelInicio}
            umbrales={umbrales}
            precipitacionAcumulada={precipitacionAcumulada}
            serieTresHoras={serieTresHoras}
            snapshotMM={snapshotMM}
        />
    );
}

function CardLayout({ alarma, fechaFormateada, nodeRef, nivelInicio, umbrales, precipitacionAcumulada, serieTresHoras, snapshotMM }: ShareLayoutProps) {
    // La compactación (grid a 2 columnas) solo entra cuando hay riesgo de solape,
    // es decir, cuando además de las filas se añade la gráfica de la serie 3 h.
    // Sin gráfica el layout queda exactamente igual que antes.
    const compacto = !!serieTresHoras?.length;

    return (
        <div
            ref={nodeRef}
            style={{
                width: 1080,
                height: 1920,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                padding: 80,
                fontFamily: FONT_STACK,
                backgroundColor: alarma.color + '33',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 28 }}>
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        backgroundColor: alarma.color,
                        border: '2px solid rgba(0,0,0,0.15)',
                        flexShrink: 0,
                    }}
                />
                <div style={{ fontSize: 56, fontWeight: 600, color: TEXT_BASE }}>
                    {alarma.nombreEstacion}
                </div>
            </div>

            <div style={{ marginBottom: 44 }}>
                <span
                    style={{
                        display: 'inline-block',
                        padding: '10px 30px',
                        borderRadius: 32,
                        backgroundColor: alarma.color + '33',
                        border: `2px solid ${alarma.color}`,
                        color: TEXT_BASE,
                        fontSize: 30,
                        fontWeight: 600,
                    }}
                >
                    {alarma.tipoDeAlerta}
                </span>
            </div>

            <div style={{ height: 3, backgroundColor: BORDER, marginBottom: 52 }} />

            {/* Bloque intermedio: absorbe el espacio sobrante; si el contenido
                excede, se recorta aquí y el pie de logos queda siempre visible. */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <CommonRows alarma={alarma} fechaFormateada={fechaFormateada} compacto={compacto} nivelInicio={nivelInicio} umbrales={umbrales} precipitacionAcumulada={precipitacionAcumulada} snapshotMM={snapshotMM} />
                <ShareTypeRows alarma={alarma} />
                <SerieTresHorasBlock serie={serieTresHoras} alturaGrafica={420} tamanoFuente={16} margenInferior={24} />
            </div>

            <LogoFooter />
        </div>
    );
}

function PosterLayout({ alarma, fechaFormateada, nodeRef, nivelInicio, umbrales, precipitacionAcumulada, serieTresHoras, snapshotMM }: ShareLayoutProps) {
    return (
        <div
            ref={nodeRef}
            style={{
                width: 1080,
                height: 1920,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: FONT_STACK,
                backgroundColor: SURFACE,
            }}
        >
            <div style={{ backgroundColor: alarma.color, padding: '80px 80px 60px', color: '#ffffff' }}>
                <div style={{ fontSize: 28, letterSpacing: 8, fontWeight: 700, marginBottom: 24, }}>
                    ALERTA {getColorName(alarma.color).toUpperCase()} POR {alarma.tipoDeAlerta.toUpperCase()}
                </div>
                <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.15, marginBottom: 32 }}>
                    {alarma.municipio}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
                    <span
                        style={{
                            padding: '10px 30px',
                            borderRadius: 32,
                            backgroundColor: 'rgba(255,255,255,0.22)',
                            fontSize: 36,
                            fontWeight: 600,
                        }}
                    >
                        {fechaFormateada && `${fechaFormateada}`}
                    </span>

                </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, padding: '48px 80px 48px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Bloque intermedio: absorbe el espacio sobrante; si el contenido
                    excede, se recorta aquí y el pie de logos queda siempre visible. */}
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <CommonRows alarma={alarma} fechaFormateada={fechaFormateada} omitFecha compacto nivelInicio={nivelInicio} umbrales={umbrales} precipitacionAcumulada={precipitacionAcumulada} snapshotMM={snapshotMM} />
                    <ShareTypeRows alarma={alarma} />
                    <SerieTresHorasBlock serie={serieTresHoras} alturaGrafica={440} tamanoFuente={18} margenInferior={32} />
                </div>

                <LogoFooter />
            </div>
        </div>
    );
}

function CommonRows({ alarma, fechaFormateada, omitFecha = false, compacto = false, nivelInicio, umbrales, precipitacionAcumulada, snapshotMM }: ShareLayoutProps & { omitFecha?: boolean; compacto?: boolean }) {
    const filas = (
        <>
            <ShareDetailRow label="Nombre estación" value={alarma.nombreEstacion} compacto={compacto} anchoCompleto={compacto} />
            <ShareDetailRow label="Código" value={alarma.codigo} compacto={compacto} />
            <ShareDetailRow label="Municipio" value={alarma.municipio} compacto={compacto} />
            <ShareDetailRow label="Región" value={alarma.region} compacto={compacto} />
            {!omitFecha && <ShareDetailRow label="Inicio alerta" value={fechaFormateada} compacto={compacto} />}
            <NivelRows compacto={compacto} nivelInicio={nivelInicio} umbrales={umbrales} />
            <PrecipitacionRow compacto={compacto} precipitacionAcumulada={precipitacionAcumulada} />
            <MovimientoMasaRows compacto={compacto} snapshotMM={snapshotMM} />
        </>
    );

    if (!compacto) return filas;

    // Modo compacto: grid a 2 columnas para reducir la altura total.
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 40 }}>
            {filas}
        </div>
    );
}

function NivelRows({ compacto = false, nivelInicio, umbrales }: Pick<ShareLayoutProps, 'nivelInicio' | 'umbrales'> & { compacto?: boolean }) {
    // Solo alertas de nivel aportan estos datos; otros tipos no renderizan nada.
    if (!nivelInicio && !umbrales) return null;

    return (
        <>
            <ShareDetailRow label="Nivel al inicio de alerta" value={nivelInicio ?? 'N/D'} compacto={compacto} />
            <ShareDetailRow label="Umbral amarillo" value={umbrales?.amarillo ?? 'N/D'} compacto={compacto} />
            <ShareDetailRow label="Umbral naranja" value={umbrales?.naranja ?? 'N/D'} compacto={compacto} />
            <ShareDetailRow label="Umbral rojo" value={umbrales?.rojo ?? 'N/D'} compacto={compacto} />
        </>
    );
}

function PrecipitacionRow({ compacto = false, precipitacionAcumulada }: Pick<ShareLayoutProps, 'precipitacionAcumulada'> & { compacto?: boolean }) {
    // Solo las alertas de precipitación aportan este dato (se pasa undefined para otros tipos).
    if (precipitacionAcumulada === undefined) return null;

    const valor =
        precipitacionAcumulada != null
            ? `${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(precipitacionAcumulada)} mm`
            : 'N/D';

    return <ShareDetailRow label="Precipitación acumulada 3 h" value={valor} compacto={compacto} anchoCompleto={compacto} />;
}

/** Formatea un valor en mm con separador es-CO y un decimal. */
function formatearMmCompartido(valor: number): string {
    return `${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(valor)} mm`;
}

function MovimientoMasaRows({ compacto = false, snapshotMM }: Pick<ShareLayoutProps, 'snapshotMM'> & { compacto?: boolean }) {
    // Solo las alertas de movimiento de masa aportan estos datos (se pasa undefined para otros tipos).
    if (snapshotMM === undefined) return null;

    return (
        <>
            <ShareDetailRow label="Zona hidrográfica" value={snapshotMM?.zh_nombre ?? 'N/D'} compacto={compacto} anchoCompleto={compacto} />
            <ShareDetailRow label="Lluvia 24 h" value={snapshotMM?.rainfall_24h != null ? formatearMmCompartido(snapshotMM.rainfall_24h) : 'N/D'} compacto={compacto} />
            <ShareDetailRow label="Lluvia 90 días previos" value={snapshotMM?.rainfall_prev_90d != null ? formatearMmCompartido(snapshotMM.rainfall_prev_90d) : 'N/D'} compacto={compacto} />
            <ShareDetailRow label="Umbral bajo/moderado (LM)" value={snapshotMM?.thr_lm != null ? formatearMmCompartido(snapshotMM.thr_lm) : 'N/D'} compacto={compacto} />
            <ShareDetailRow label="Umbral moderado/alto (MH)" value={snapshotMM?.thr_mh != null ? formatearMmCompartido(snapshotMM.thr_mh) : 'N/D'} compacto={compacto} />
        </>
    );
}

// Gráfica de barras de la serie 3 h previa a la alerta; solo para precipitación.
// Si no hay serie (otros tipos de alerta o sin datos), no se renderiza nada.
function SerieTresHorasBlock({
    serie,
    alturaGrafica,
    tamanoFuente,
    margenInferior,
}: {
    serie?: SerieTresHorasBucket[] | null;
    alturaGrafica: number;
    tamanoFuente: number;
    margenInferior: number;
}) {
    if (!serie?.length) return null;

    return (
        <div style={{ marginBottom: margenInferior, flexShrink: 0 }}>
            <div style={{ fontSize: 26, color: TEXT_MUTED, marginBottom: 12 }}>
                Lluvia 3 h previas a la alerta (cada 5 min)
            </div>
            <AlertaPrecipitacionChart
                serie={serie}
                height={alturaGrafica}
                fontSize={tamanoFuente}
                animation={false}
                static
            />
        </div>
    );
}

function ShareTypeRows({ alarma }: { alarma: AlarmRow }) {
    const topic = tipoDeAlertaToTopic(alarma.tipoDeAlerta);

    if (topic === 'nivel') {
        return <ShareDetailRow label="Tipo Alerta" value={"nivel"} />;
    }

    if (topic === 'precipitation') {
        return <ShareDetailRow label="Tipo Alerta" value={"precipitación"} />;
    }

    if (topic === 'massMovement') {
        return <ShareDetailRow label="Tipo Alerta" value={"movimiento de masa"} />;
    }

    return null;
}

function ShareDetailRow({ label, value, compacto = false, anchoCompleto = false }: { label: string; value: string; compacto?: boolean; anchoCompleto?: boolean }) {
    return (
        <div
            style={{
                marginBottom: compacto ? 20 : 40,
                ...(anchoCompleto ? { gridColumn: '1 / -1' } : {}),
            }}
        >
            <div style={{ fontSize: 26, color: TEXT_MUTED, marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 40, fontWeight: 500, color: TEXT_BASE, overflowWrap: 'break-word' }}>
                {value}
            </div>
        </div>
    );
}

function LogoFooter() {
    return (
        <div
            style={{
                marginTop: 'auto',
                paddingTop: 44,
                borderTop: `3px solid ${BORDER}`,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 72,
            }}
        >
            <img src={`${import.meta.env.BASE_URL}img/logo.svg`} alt="SAMA" style={{ height: 110, width: 'auto' }} />
            <img src={`${import.meta.env.BASE_URL}logo-dagran-1.png`} alt="DAGRAN" style={{ height: 190, width: 'auto' }} />
        </div>
    );
}
