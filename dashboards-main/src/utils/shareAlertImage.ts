import { toBlob } from 'html-to-image';

export const SHARE_IMAGE_WIDTH = 1080;
export const SHARE_IMAGE_HEIGHT = 1920;

/**
 * Maps hex color values to Spanish alarm level names.
 * Based on backend color scheme from routers:
 * - Verde: #79c454
 * - Amarillo: #ffeb3b
 * - Naranja: #ff9800
 * - Rojo: #f44336
 * - Gris claro: #bfbfbf
 * - Gris oscuro: #757575
 * 
 * @param color - Hex color value (e.g., '#ffeb3b', '#ff9800', '#f44336')
 * @returns Spanish color name (e.g., 'Amarilla', 'Naranja', 'Roja')
 */
export function getColorName(color: string): string {
    const normalizedColor = color.toLowerCase();

    const colorMap: Record<string, string> = {
        // Lowercase variants
        '#79c454': 'Verde',
        '#ffeb3b': 'Amarilla',
        '#ff9800': 'Naranja',
        '#f44336': 'Roja',
        '#bfbfbf': 'Gris',
        '#757575': 'Gris',
        // Uppercase variants
        '#79C454': 'Verde',
        '#FFEB3B': 'Amarilla',
        '#FF9800': 'Naranja',
        '#F44336': 'Roja',
        '#BFBFBF': 'Gris',

    };

    return colorMap[normalizedColor] || colorMap[color] || color;
}

export async function shareAlertImage(node: HTMLElement, fileName: string): Promise<void> {
    const blob = await toBlob(node, {
        width: SHARE_IMAGE_WIDTH,
        height: SHARE_IMAGE_HEIGHT,
        pixelRatio: 1,
        skipFonts: true,
    });

    if (!blob) {
        throw new Error('No se pudo generar la imagen de la alerta');
    }

    const file = new File([blob], fileName, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
}
