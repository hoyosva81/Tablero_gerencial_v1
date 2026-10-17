// DEV ONLY — Mini-panel flotante de simulación para el desarrollo.
// Todo el código de simulación vive en src/dev/ y su único punto de contacto
// con el código de producción es 1 import + 1 render en src/App.tsx, ambos
// marcados con "DEV ONLY". Puede borrarse la carpeta completa sin efectos.
//
// Ofrece tres controles:
//  1. «Simular alerta»: PREPENDE una alerta falsa en la misma entrada de
//     caché de React Query que usa el polling real (['alarmas', 1]), de modo
//     que la detección real (AlertNotifications) dispara el toast de punta a
//     punta.
//  2. Selector de preset de sonido de las notificaciones (persistido en
//     localStorage, igual que en producción).
//  3. «Probar sonido»: reproduce el preset elegido sin necesidad de toast.
//     El clic cuenta como interacción válida, así que además intenta
//     reanudar el AudioContext si está suspendido por la política de autoplay.
import { useState } from 'react';
import {
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Typography,
} from '@mui/material';
import AddAlertIcon from '@mui/icons-material/AddAlert';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { useQueryClient } from '@tanstack/react-query';
import {
    getSoundPreset,
    playAlertSound,
    PRESETS_DISPONIBLES,
    resumeAudioContext,
    setSoundPreset,
    type SoundPresetId,
} from '@/services/alertSound';
import type { AlarmRow } from '@/types/alarmas';

// Tipos de alerta de respaldo si la caché aún está vacía
const TIPOS_DE_RESPALDO: { tipoDeAlerta: string; color: string }[] = [
    { tipoDeAlerta: 'Lluvia intensa', color: '#1976d2' },
    { tipoDeAlerta: 'Nivel alto', color: '#ed6c02' },
    { tipoDeAlerta: 'Caudal alto', color: '#d32f2f' },
];

// Nombre de estación simulada
const NOMBRE_ESTACION = 'Estación Simulada';

type RespuestaAlarmas = { rows: AlarmRow[]; count: number };

export function FakeAlertButton() {
    const queryClient = useQueryClient();
    // Preset elegido en el selector (sincronizado con localStorage)
    const [preset, setPreset] = useState<SoundPresetId>(() => getSoundPreset());

    // Fuera de desarrollo este componente es completamente inerte
    if (!import.meta.env.DEV) return null;

    const simularAlerta = () => {
        queryClient.setQueryData<RespuestaAlarmas>(['alarmas', 1], (previa) => {
            const base: RespuestaAlarmas = previa ?? { rows: [], count: 0 };

            // Elige un tipo al azar de entre los existentes en la caché;
            // si no hay filas, usa los de respaldo. El color se toma de una
            // fila real del mismo tipo para mantener la coherencia visual.
            const tipos = Array.from(
                new Map(
                    base.rows.map((fila) => [fila.tipoDeAlerta, fila.color])
                ).entries()
            );
            const catalogo = tipos.length > 0
                ? tipos.map(([tipoDeAlerta, color]) => ({ tipoDeAlerta, color }))
                : TIPOS_DE_RESPALDO;
            const elegido = catalogo[Math.floor(Math.random() * catalogo.length)];

            const falsa: AlarmRow = {
                // Id único basado en el reloj; queda por fuera de cualquier
                // rango de ids reales existentes
                id: Date.now(),
                color: elegido.color,
                codigo: `SIM-${String(Date.now()).slice(-6)}`,
                tipoDeAlerta: elegido.tipoDeAlerta,
                nombreEstacion: NOMBRE_ESTACION,
                municipio: 'Simulación',
                region: '—',
                started_at: new Date().toISOString(),
                ended_at: null,
                // Coordenadas aproximadas de Bucaramanga (Santander)
                longitud: -73.1198,
                latitud: 7.1254,
            };

            return { rows: [falsa, ...base.rows], count: base.count + 1 };
        });
    };

    const cambiarPreset = (nuevo: SoundPresetId) => {
        setPreset(nuevo);
        setSoundPreset(nuevo);
    };

    // El clic cuenta como gesto del usuario: se aprovecha para reanudar el
    // AudioContext si sigue suspendido por la política de autoplay
    const probarSonido = () => {
        resumeAudioContext();
        playAlertSound();
    };

    return (
        <Paper
            elevation={4}
            sx={{
                position: 'fixed',
                bottom: 16,
                left: 16,
                // Por encima de los toasts (1400) para que ni ellos ni el
                // menú del selector queden tapados; el menú usa 1600
                zIndex: 1500,
                p: 1.5,
                width: 216,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
            }}
        >
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700, letterSpacing: 0.5 }}
            >
                DEV ONLY — Simulación
            </Typography>
            <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={<AddAlertIcon />}
                onClick={simularAlerta}
            >
                Simular alerta
            </Button>
            <FormControl size="small" fullWidth>
                <InputLabel id="dev-preset-sonido">Sonido</InputLabel>
                <Select
                    labelId="dev-preset-sonido"
                    value={preset}
                    label="Sonido"
                    onChange={(evento) => cambiarPreset(evento.target.value as SoundPresetId)}
                    // El menú se renderiza en un portal con z-index de capa
                    // Modal (1300), por debajo de los toasts (1400): hay que
                    // subirlo para poder hacer clic en las opciones
                    MenuProps={{ sx: { zIndex: 1600 } }}
                >
                    {PRESETS_DISPONIBLES.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                            {p.etiqueta}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <Button
                size="small"
                variant="outlined"
                startIcon={<VolumeUpIcon />}
                onClick={probarSonido}
            >
                Probar sonido
            </Button>
        </Paper>
    );
}
