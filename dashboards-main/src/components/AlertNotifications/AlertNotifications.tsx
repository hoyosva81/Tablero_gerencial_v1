import { useEffect, useReducer, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Collapse, IconButton, Paper, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useAlertasBackground } from '@/hooks/useAlertasBackground';
import { useAlarmasStore } from '@/store/alarmasStore';
import { playAlertSound, REPETIR_SONIDO_CADA_MS } from '@/services/alertSound';
import {
    getLastConnection,
    getNotifiedIds,
    markNotified,
    setLastConnection,
} from '@/services/alertNotificationsStorage';
import type { AlarmRow } from '@/types/alarmas';

// Máximo de toasts visibles a la vez; el resto espera en la cola (FIFO)
const MAX_VISIBLES = 3;
// Ventana de debounce del sonido: varias promociones seguidas suenan una vez
const DEBOUNCE_SONIDO_MS = 500;

// Formatea la fecha de inicio de una alerta (mismo estilo que la tabla)
function formatearFecha(iso: string): string {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

// Un toast visible: la fila de la alerta y si está abierto (en cierre,
// el toast sigue montado mientras dura la animación de salida de Collapse)
type ToastVisible = { fila: AlarmRow; abierto: boolean };

type EstadoToasts = {
    visibles: ToastVisible[]; // el primero es el de arriba de la pila
    enCola: AlarmRow[]; // FIFO, esperando un hueco en la pila
};

type Accion =
    | { tipo: 'LLEGAN'; filas: AlarmRow[] }
    | { tipo: 'CERRAR'; id: number }
    | { tipo: 'RETIRAR'; id: number };

function reductor(estado: EstadoToasts, accion: Accion): EstadoToasts {
    switch (accion.tipo) {
        case 'LLEGAN': {
            const visibles = [...estado.visibles];
            const enCola = [...estado.enCola];
            for (const fila of accion.filas) {
                // Deduplicación extra por si la misma alerta llega dos veces
                const repetida =
                    visibles.some((t) => t.fila.id === fila.id) ||
                    enCola.some((f) => f.id === fila.id);
                if (repetida) continue;

                // Las nuevas entran al final (abajo) de la pila si hay hueco;
                // si ya hay MAX_VISIBLES abiertos, van a la cola
                const abiertos = visibles.filter((t) => t.abierto).length;
                if (abiertos < MAX_VISIBLES) {
                    visibles.push({ fila, abierto: true });
                } else {
                    enCola.push(fila);
                }
            }
            return { visibles, enCola };
        }
        case 'CERRAR':
            // Inicia la animación de salida; el toast se retira en onExited
            return {
                ...estado,
                visibles: estado.visibles.map((t) =>
                    t.fila.id === accion.id ? { ...t, abierto: false } : t
                ),
            };
        case 'RETIRAR': {
            // Fin de la animación de salida: se retira el toast y, si queda
            // hueco, se promociona el primero de la cola (FIFO)
            const restantes = estado.visibles.filter((t) => t.fila.id !== accion.id);
            let enCola = estado.enCola;
            const abiertos = restantes.filter((t) => t.abierto).length;
            if (abiertos < MAX_VISIBLES && enCola.length > 0) {
                const [siguiente, ...resto] = enCola;
                enCola = resto;
                restantes.push({ fila: siguiente, abierto: true });
            }
            return { visibles: restantes, enCola };
        }
    }
}

// Sistema de notificaciones de alertas nuevas.
// Hace polling de la página 1 de alertas (compartiendo caché con la tabla)
// y muestra un toast por cada alerta llegada desde la última conexión.
// Cada alerta se notifica exactamente una vez, incluso entre recargas,
// gracias al timestamp y a la lista de ids persistidos en localStorage.
//
// Los toasts se apilan arriba a la derecha (máximo 3 visibles) con cola
// FIFO. NO expiran por tiempo: solo salen de pantalla por interacción del
// usuario (clic sobre el toast = seleccionar + navegar, X = descartar).
// Mientras haya al menos uno visible, el aviso sonoro se repite cada
// REPETIR_SONIDO_CADA_MS (constante ajustable en src/services/alertSound.ts).
export function AlertNotifications() {
    const navigate = useNavigate();
    const setAlarmaSeleccionada = useAlarmasStore((s) => s.setAlarmaSeleccionada);
    const { data } = useAlertasBackground();

    const [estado, dispatch] = useReducer(reductor, { visibles: [], enCola: [] });
    const { visibles } = estado;

    // ------------------------------------------------------------------
    // Detección de alertas nuevas en cada refresco del polling
    // ------------------------------------------------------------------
    useEffect(() => {
        if (!data) return;
        const { rows, count } = data;

        // Sin resultados (registro vacío o error de fetch, que el servicio
        // resuelve como { rows: [], count: 0 }): ni toasts ni actualización
        // del timestamp.
        if (count === 0 && rows.length === 0) return;

        const ultimaConexion = getLastConnection();
        if (!ultimaConexion) {
            // Primera visita: se guarda el timestamp sin avisar de las
            // alertas preexistentes.
            setLastConnection(new Date().toISOString());
            return;
        }

        const umbral = new Date(ultimaConexion).getTime();
        const notificados = new Set(getNotifiedIds());

        // Alertas nuevas: posteriores a la última conexión y aún no notificadas,
        // ordenadas de más reciente a más antigua.
        const nuevas = rows
            .filter((fila) => {
                const inicio = new Date(fila.started_at).getTime();
                return Number.isFinite(inicio) && inicio > umbral && !notificados.has(fila.id);
            })
            .sort(
                (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
            );

        if (nuevas.length === 0) return;

        // Encola los toasts y acto seguido persiste el estado: así cada
        // alerta se notifica una única vez aunque el efecto se repita.
        dispatch({ tipo: 'LLEGAN', filas: nuevas });
        markNotified(nuevas.map((fila) => fila.id));
        setLastConnection(new Date().toISOString());
    }, [data]);

    // ------------------------------------------------------------------
    // Sonido inicial: suena cada vez que un toast pasa a ser visible
    // (nuevo o promocionado desde la cola), con debounce leading-edge de
    // 500 ms para que una ráfaga produzca un único sonido.
    // ------------------------------------------------------------------
    const idsVisiblesPrevios = useRef(new Set<number>());
    const ultimoSonido = useRef(0);

    useEffect(() => {
        const actuales = new Set(
            visibles.filter((t) => t.abierto).map((t) => t.fila.id)
        );
        let hayNuevo = false;
        for (const id of actuales) {
            if (!idsVisiblesPrevios.current.has(id)) hayNuevo = true;
        }
        idsVisiblesPrevios.current = actuales;

        if (!hayNuevo) return;
        const ahora = Date.now();
        if (ahora - ultimoSonido.current >= DEBOUNCE_SONIDO_MS) {
            ultimoSonido.current = ahora;
            playAlertSound();
        }
    }, [visibles]);

    // ------------------------------------------------------------------
    // Sonido repetitivo: mientras haya al menos un toast visible sin
    // atender, el aviso se repite cada REPETIR_SONIDO_CADA_MS hasta que
    // el usuario interactúe con todos (clic o X). La dependencia del
    // efecto es el booleano «hay visibles», no la lista: así el intervalo
    // solo arranca al pasar de 0 a ≥1 visibles y se detiene al quedar la
    // pila vacía, sin reiniciarse con cada cambio de la pila.
    // El cleanup (clearInterval) es imprescindible con StrictMode, que
    // monta y desmonta los efectos dos veces en desarrollo.
    // ------------------------------------------------------------------
    const hayVisibles = visibles.some((t) => t.abierto);

    useEffect(() => {
        if (!hayVisibles) return;
        const intervalo = setInterval(() => {
            // También actualiza ultimoSonido para que el debounce del
            // sonido inicial tenga en cuenta estas repeticiones
            ultimoSonido.current = Date.now();
            playAlertSound();
        }, REPETIR_SONIDO_CADA_MS);
        return () => clearInterval(intervalo);
    }, [hayVisibles]);

    // ------------------------------------------------------------------
    // Acciones sobre los toasts
    // ------------------------------------------------------------------

    // Clic en un toast: selecciona la alerta en el store, navega al
    // Registro de Alertas y descarta el toast
    const irALaAlerta = (fila: AlarmRow) => {
        setAlarmaSeleccionada(fila);
        navigate('/');
        dispatch({ tipo: 'CERRAR', id: fila.id });
    };

    return (
        // Contenedor fijo arriba a la derecha; sin eventos de puntero para
        // no bloquear clics debajo (cada toast los reactiva para sí)
        <Box
            sx={{
                position: 'fixed',
                top: 16,
                right: 16,
                zIndex: 1400,
                display: 'flex',
                flexDirection: 'column',
                pointerEvents: 'none',
            }}
        >
            {visibles.map(({ fila, abierto }) => (
                <Collapse
                    key={fila.id}
                    in={abierto}
                    // La promoción desde la cola ocurre al terminar la salida
                    onExited={() => dispatch({ tipo: 'RETIRAR', id: fila.id })}
                    sx={{ pointerEvents: 'auto' }}
                >
                    {/* El espaciado entre toasts va dentro del Collapse para
                    que se anime con la altura y la subida sea fluida */}
                    <Box sx={{ pb: 1 }}>
                    <Paper
                        elevation={8}
                        onClick={() => irALaAlerta(fila)}
                        sx={{
                            width: 380,
                            maxWidth: 'calc(100vw - 32px)',
                            cursor: 'pointer',
                            borderRadius: 1.5,
                            // Borde izquierdo grueso con el color de la alerta
                            borderLeft: 6,
                            borderColor: fila.color,
                            bgcolor: 'background.paper',
                            px: 1.75,
                            py: 1.25,
                            transition: 'box-shadow 150ms ease',
                            '&:hover': { boxShadow: 12 },
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            {/* Icono de advertencia tintado con el color de la alerta */}
                            <WarningAmberIcon
                                sx={{ color: fila.color, mt: 0.25, flexShrink: 0 }}
                            />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                {/* Etiqueta de jerarquía: deja claro que es una alerta */}
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: fila.color,
                                        fontWeight: 700,
                                        letterSpacing: 1,
                                        lineHeight: 1.5,
                                        display: 'block',
                                    }}
                                >
                                    ALERTA
                                </Typography>
                                <Typography
                                    variant="subtitle2"
                                    component="div"
                                    sx={{ fontWeight: 700, lineHeight: 1.35 }}
                                >
                                    {fila.tipoDeAlerta} · {fila.nombreEstacion}
                                </Typography>
                                {/* Punto de color asociado al tipo de alerta + detalle */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.75,
                                        mt: 0.25,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            backgroundColor: fila.color,
                                            flexShrink: 0,
                                        }}
                                    />
                                    <Typography
                                        variant="body2"
                                        component="div"
                                        color="text.secondary"
                                        noWrap
                                    >
                                        {fila.municipio} — {formatearFecha(fila.started_at)}
                                    </Typography>
                                </Box>
                            </Box>
                            {/* La X descarta sin navegar */}
                            <IconButton
                                size="small"
                                aria-label="Cerrar notificación"
                                onClick={(evento) => {
                                    // Evita que el clic burbujee hasta el onClick del Paper
                                    evento.stopPropagation();
                                    dispatch({ tipo: 'CERRAR', id: fila.id });
                                }}
                                sx={{ mt: -0.5, mr: -0.5, color: 'text.secondary' }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Paper>
                    </Box>
                </Collapse>
            ))}
        </Box>
    );
}
