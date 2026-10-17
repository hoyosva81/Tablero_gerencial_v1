// Sonido de las notificaciones de alertas, sintetizado con Web Audio API
// (sin archivos de audio). El AudioContext es un singleton creado de forma
// perezosa: los navegadores lo inician en estado 'suspended' hasta que hay
// una interacción del usuario, por lo que se instala un listener único de
// pointerdown/keydown que lo reanuda. Si al intentar sonar el contexto sigue
// suspendido, el toast queda en silencio sin errores ni logs.

import {
    getSoundPreset,
    setSoundPreset,
    type SoundPresetId,
} from '@/services/alertNotificationsStorage';

// Se reexportan para que los consumidores usen una única API desde aquí
export { getSoundPreset, setSoundPreset };
export type { SoundPresetId };

// Volumen general de los sonidos (moderado)
const VOLUMEN = 0.25;

// ---------------------------------------------------------------------------
// Frecuencia de repetición del aviso sonoro (VALOR AJUSTABLE)
// ---------------------------------------------------------------------------
// Mientras haya al menos un toast visible sin atender, el sonido se repite
// cada estos milisegundos hasta que el usuario interactúe (clic o X en
// todos los toasts). Valor actual pedido por Sergio: 5 segundos.
// Para cambiar la frecuencia basta con editar esta constante: es el ÚNICO
// lugar donde se ajusta (AlertNotifications la importa desde aquí).
export const REPETIR_SONIDO_CADA_MS = 5000;

// Catálogo de presets disponibles para la UI (panel DEV, etc.)
export const PRESETS_DISPONIBLES: readonly { id: SoundPresetId; etiqueta: string }[] = [
    { id: 'ding', etiqueta: 'Ding' },
    { id: 'doble-beep', etiqueta: 'Doble beep' },
    { id: 'campanita', etiqueta: 'Campanita' },
    { id: 'urgente', etiqueta: 'Urgente' },
];

let contexto: AudioContext | null = null;
let desbloqueoInstalado = false;

// Reanuda el contexto si está suspendido (solo tiene efecto tras una
// interacción del usuario; los rechazos se ignoran sin ruido)
function reanudar(): void {
    if (!contexto || contexto.state !== 'suspended') return;
    contexto.resume().catch(() => {
        // Sin interacción reciente el navegador rechaza el resume:
        // se volverá a intentar con el próximo gesto del usuario
    });
}

// Listener único de desbloqueo por política de autoplay: el primer gesto
// (clic o tecla) reanuda el contexto y retira ambos listeners
function instalarDesbloqueo(): void {
    if (desbloqueoInstalado || typeof window === 'undefined') return;
    desbloqueoInstalado = true;
    const desbloquear = () => {
        window.removeEventListener('pointerdown', desbloquear);
        window.removeEventListener('keydown', desbloquear);
        reanudar();
    };
    window.addEventListener('pointerdown', desbloquear);
    window.addEventListener('keydown', desbloquear);
}

// Crea el AudioContext singleton la primera vez que se necesita.
// Devuelve null si el navegador no soporta Web Audio API.
function obtenerContexto(): AudioContext | null {
    if (contexto) return contexto;
    try {
        const Constructor =
            window.AudioContext ??
            (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Constructor) return null;
        contexto = new Constructor();
        instalarDesbloqueo();
    } catch {
        contexto = null;
    }
    return contexto;
}

// Programa una única nota con envolvente de ataque corto y caída exponencial
function programarNota(
    ctx: AudioContext,
    inicio: number,
    duracion: number,
    frecuencia: number,
    tipoOnda: OscillatorType,
    volumen: number
): void {
    const oscilador = ctx.createOscillator();
    const ganancia = ctx.createGain();
    oscilador.type = tipoOnda;
    oscilador.frequency.value = frecuencia;
    // Envolvente: subida rápida (10 ms) y caída exponencial hasta silencio
    ganancia.gain.setValueAtTime(0.0001, inicio);
    ganancia.gain.linearRampToValueAtTime(volumen, inicio + 0.01);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
    oscilador.connect(ganancia).connect(ctx.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + duracion + 0.05);
}

// Definición de los 4 presets de sonido
const PRESETS: Record<SoundPresetId, (ctx: AudioContext) => void> = {
    // Seno de 880 Hz (A5) con caída corta
    ding: (ctx) => {
        programarNota(ctx, ctx.currentTime, 0.5, 880, 'sine', VOLUMEN);
    },
    // Dos pulsos cortos de 660 Hz (E5)
    'doble-beep': (ctx) => {
        const t = ctx.currentTime;
        programarNota(ctx, t, 0.12, 660, 'sine', VOLUMEN);
        programarNota(ctx, t + 0.22, 0.12, 660, 'sine', VOLUMEN);
    },
    // Dos notas descendentes (A5 → E5) con onda triangular
    campanita: (ctx) => {
        const t = ctx.currentTime;
        programarNota(ctx, t, 0.35, 880, 'triangle', VOLUMEN);
        programarNota(ctx, t + 0.32, 0.5, 659.25, 'triangle', VOLUMEN);
    },
    // Triple pulso rápido de 520 Hz (algo más agresivo, volumen contenido)
    urgente: (ctx) => {
        const t = ctx.currentTime;
        for (const desfase of [0, 0.16, 0.32]) {
            programarNota(ctx, t + desfase, 0.09, 520, 'square', VOLUMEN * 0.8);
        }
    },
};

// Reproduce el preset configurado. Si el contexto está suspendido (sin
// interacción previa del usuario) el sonido se omite en silencio.
export function playAlertSound(): void {
    const ctx = obtenerContexto();
    if (!ctx || ctx.state !== 'running') return;
    try {
        PRESETS[getSoundPreset()](ctx);
    } catch {
        // Cualquier fallo de síntesis se ignora: notificar nunca debe romper la UI
    }
}

// Intenta reanudar el contexto de audio (útil desde un clic del usuario,
// que cuenta como gesto válido para la política de autoplay)
export function resumeAudioContext(): void {
    obtenerContexto();
    reanudar();
}
