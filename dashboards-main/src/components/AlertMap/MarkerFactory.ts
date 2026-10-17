import L from 'leaflet';

const iconMap: Record<string, string> = {
    precipitation: 'cloud',
    nivel: 'water',
    alarma: 'siren',
    meteorologia: 'air',
    massMovement: 'landslide',
};

/**
 * Maps the API's `tipoDeAlerta` free-string to a geoportal topic key.
 * Falls back to 'alarma' (purple siren) for unknown types.
 */
export function tipoDeAlertaToTopic(tipoDeAlerta: string): string {
    const normalized = tipoDeAlerta.trim().toLowerCase();

    if (normalized.includes('precipitacion') || normalized.includes('precipitación') || normalized.includes('lluvia')) {
        return 'precipitation';
    }
    if (normalized.includes('nivel')) {
        return 'nivel';
    }
    if (normalized.includes('movimiento') || normalized.includes('masa') || normalized.includes('deslizamiento')) {
        return 'massMovement';
    }
    if (normalized.includes('meteorolog')) {
        return 'meteorologia';
    }

    return 'alarma';
}

export const createMarkerIcon = (topic: string, color: string, plain = false, size = 30, iconSize = 18) => {
    const iconName = iconMap[topic] || 'place';

    // Alarms (fallback) are fixed purple, matching geoportal behaviour
    const markerColor = topic === 'alarma' ? '#8e44ad' : color;

    const iconHtml = plain
        ? `<span class="material-symbols-outlined" style="
                color: ${markerColor};
                font-size: ${size}px;
                filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
                display: block;
            ">${iconName}</span>`
        : `<div style="
                background-color: ${markerColor};
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <span class="material-symbols-outlined" style="
                    color: white;
                    font-size: ${iconSize}px;
                ">${iconName}</span>
            </div>`;

    return L.divIcon({
        className: `custom-marker custom-marker-${topic}`,
        html: iconHtml,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
};
