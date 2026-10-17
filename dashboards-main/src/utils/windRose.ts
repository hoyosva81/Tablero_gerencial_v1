import type { MeteorologicalValue } from '@/services/chartServices';

// Speed band labels for legend and dataset dimensions
export const WIND_ROSE_LEGEND = [
    '0.30-1.59',
    '1.60-3.09',
    '3.10-5.39',
    '5.40-7.89',
    '7.90-10.49',
    '>10.50',
] as const;

// Upper bounds for each speed band (last value is a large sentinel)
const SPEED_ARRAY = [0.3, 1.6, 3.1, 5.4, 7.9, 10.5, Infinity];

// Lower bounds of direction sectors (0 = N, proceeding clockwise)
const DIRECTION_ARRAY = [
    0, 11.25, 33.75, 56.25, 78.75, 101.25, 123.75, 146.25,
    168.75, 191.25, 213.75, 236.25, 258.75, 281.25, 303.75, 326.25, 348.75,
];

export const WIND_ROSE_AXIS = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
] as const;

export type WindRoseRow = {
    angle: string;
    [speedBand: string]: string | number;
};

export interface WindRoseResult {
    source: WindRoseRow[];
    calm: number;   // percentage
    maxLimit: number;
}

/** Binary search: find the label index whose lower bound is <= value < upper bound */
function binarySearch(value: number, bounds: number[], labels: readonly string[]): string {
    for (let i = 0; i < bounds.length - 1; i++) {
        if (value >= bounds[i] && value < bounds[i + 1]) {
            return labels[i];
        }
    }
    return labels[labels.length - 1];
}

/**
 * Aggregate raw meteorological records into Wind Rose frequency data.
 * Excludes records where either wind quality field is not 1.
 * Records with velocidad_viento < 0.3 m/s are counted as calm.
 */
export function computeWindRose(values: MeteorologicalValue[]): WindRoseResult {
    type DirectionBin = { angle: string; subtotal: number; [key: string]: string | number };

    const bins: Record<string, DirectionBin> = {};
    for (const dir of WIND_ROSE_AXIS) {
        bins[dir] = { angle: dir, subtotal: 0 };
    }

    let total = 0;
    let calm = 0;

    for (const v of values) {
        if (v.calidad_velocidad_viento !== 1 || v.calidad_direccion_viento !== 1) continue;
        if (v.velocidad_viento === null || v.direccion_viento === null) continue;

        const speed = parseFloat(v.velocidad_viento);
        const direction = parseFloat(v.direccion_viento);
        if (isNaN(speed) || isNaN(direction)) continue;

        total += 1;

        if (speed < 0.3) {
            calm += 1;
            continue;
        }

        const dirLabel = binarySearch(direction, DIRECTION_ARRAY, WIND_ROSE_AXIS);
        const speedLabel = binarySearch(speed, SPEED_ARRAY, WIND_ROSE_LEGEND);

        const bin = bins[dirLabel];
        bin.subtotal += 1;
        bin[speedLabel] = ((bin[speedLabel] as number | undefined) ?? 0) + 1;
    }

    if (total === 0) {
        return { source: WIND_ROSE_AXIS.map((a) => ({ angle: a })), calm: 0, maxLimit: 10 };
    }

    let maxLimit = 0;
    const source: WindRoseRow[] = [];

    for (const dir of WIND_ROSE_AXIS) {
        const bin = bins[dir];
        const row: WindRoseRow = { angle: bin.angle };
        for (const band of WIND_ROSE_LEGEND) {
            const count = (bin[band] as number | undefined) ?? 0;
            if (count > 0) {
                row[band] = parseFloat(((count / total) * 100).toFixed(2));
            }
        }
        const subtotalPct = (bin.subtotal / total) * 100;
        if (subtotalPct > maxLimit) maxLimit = subtotalPct;
        source.push(row);
    }

    return {
        source,
        calm: parseFloat(((calm / total) * 100).toFixed(2)),
        maxLimit,
    };
}
