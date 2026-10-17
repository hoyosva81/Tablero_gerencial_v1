// Persistencia en localStorage del estado de notificación de alertas.
// Claves:
//   - sama-alerts:last-connection → timestamp ISO del último procesamiento.
//   - sama-alerts:notified-ids    → ids de alertas ya notificadas.
//   - sama-alerts:sound-preset    → preset de sonido de las notificaciones.
// Todo el acceso es defensivo: si localStorage no está disponible
// (SSR, modo privado, navegador sin soporte) o el JSON está corrupto,
// se devuelven valores neutros sin lanzar excepciones.

const CLAVE_ULTIMA_CONEXION = 'sama-alerts:last-connection';
const CLAVE_IDS_NOTIFICADOS = 'sama-alerts:notified-ids';
// Máximo de ids notificados que se conservan (recorte por la cola más reciente)
const MAX_IDS_NOTIFICADOS = 200;

// Comprueba si localStorage está accesible sin lanzar errores
function localStorageDisponible(): boolean {
    try {
        return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    } catch {
        return false;
    }
}

// Devuelve el timestamp ISO del último procesamiento, o null si no existe
export function getLastConnection(): string | null {
    if (!localStorageDisponible()) return null;
    try {
        return window.localStorage.getItem(CLAVE_ULTIMA_CONEXION);
    } catch {
        return null;
    }
}

// Guarda el timestamp ISO del último procesamiento
export function setLastConnection(iso: string): void {
    if (!localStorageDisponible()) return;
    try {
        window.localStorage.setItem(CLAVE_ULTIMA_CONEXION, iso);
    } catch {
        // Cuota llena o modo privado: se ignora, la deduplicación por ids sigue funcionando
    }
}

// Devuelve los ids de alertas ya notificados (lista vacía si no hay o el JSON es inválido)
export function getNotifiedIds(): number[] {
    if (!localStorageDisponible()) return [];
    try {
        const crudo = window.localStorage.getItem(CLAVE_IDS_NOTIFICADOS);
        if (!crudo) return [];
        const datos: unknown = JSON.parse(crudo);
        if (!Array.isArray(datos)) return [];
        // Filtra cualquier entrada que no sea un número válido
        return datos.filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
    } catch {
        return [];
    }
}

// Marca ids como notificados, deduplicando y recortando a los últimos MAX_IDS_NOTIFICADOS
export function markNotified(ids: number[]): void {
    if (!localStorageDisponible()) return;
    try {
        const previos = getNotifiedIds();
        const fusion = Array.from(new Set([...previos, ...ids]));
        // Conserva solo los ids más recientes para evitar crecimiento ilimitado
        const recorte = fusion.slice(-MAX_IDS_NOTIFICADOS);
        window.localStorage.setItem(CLAVE_IDS_NOTIFICADOS, JSON.stringify(recorte));
    } catch {
        // Cuota llena o modo privado: se ignora silenciosamente
    }
}

// ---------------------------------------------------------------------------
// Preset de sonido de las notificaciones
// ---------------------------------------------------------------------------

const CLAVE_PRESET_SONIDO = 'sama-alerts:sound-preset';

// Identificadores de los sonidos disponibles (ver src/services/alertSound.ts)
export type SoundPresetId = 'ding' | 'doble-beep' | 'campanita' | 'urgente';

export const PRESET_SONIDO_POR_DEFECTO: SoundPresetId = 'campanita';

const PRESETS_VALIDOS: readonly SoundPresetId[] = [
    'ding',
    'doble-beep',
    'campanita',
    'urgente',
];

// Devuelve el preset de sonido configurado (por defecto 'campanita' si no existe,
// el valor guardado es inválido o localStorage no está disponible)
export function getSoundPreset(): SoundPresetId {
    if (!localStorageDisponible()) return PRESET_SONIDO_POR_DEFECTO;
    try {
        const valor = window.localStorage.getItem(CLAVE_PRESET_SONIDO);
        return (PRESETS_VALIDOS as readonly string[]).includes(valor ?? '')
            ? (valor as SoundPresetId)
            : PRESET_SONIDO_POR_DEFECTO;
    } catch {
        return PRESET_SONIDO_POR_DEFECTO;
    }
}

// Guarda el preset de sonido elegido
export function setSoundPreset(preset: SoundPresetId): void {
    if (!localStorageDisponible()) return;
    try {
        window.localStorage.setItem(CLAVE_PRESET_SONIDO, preset);
    } catch {
        // Cuota llena o modo privado: se ignora silenciosamente
    }
}
