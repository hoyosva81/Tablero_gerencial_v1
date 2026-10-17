import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useUltimoDatoStore } from '@/store/ultimoDatoStore';
import { createMarkerIcon } from '@/components/AlertMap/MarkerFactory';
import { MapButtons } from '@/components/ui/MapButtons/MapButtons';

// Vista inicial centrada en Antioquia, Colombia
const COLOMBIA_CENTER: [number, number] = [6.5, -75.5];
const DEFAULT_ZOOM = 7;
const SELECTED_ZOOM = 13;

// ─── Derivar el topic del marcador según el prefijo del código ────────────────

function topicFromCodigo(codigo: string): string {
    if (codigo.startsWith('sp_')) return 'precipitation';
    if (codigo.startsWith('sm_')) return 'meteorologia';
    if (codigo.startsWith('sn_')) return 'nivel';
    return 'alarma';
}

// ─── Actualizador del mapa ────────────────────────────────────────────────────

function MapUpdater() {
    const { estacionSeleccionada } = useUltimoDatoStore();
    const map = useMap();
    const prevIdRef = useRef<string | null>(null);

    // Recalcular tamaño al montar y al redimensionar el contenedor
    useEffect(() => {
        const container = map.getContainer();
        map.invalidateSize();

        const observer = new ResizeObserver(() => {
            map.invalidateSize();
        });
        observer.observe(container);

        return () => observer.disconnect();
    }, [map]);

    useEffect(() => {
        if (!estacionSeleccionada) {
            if (prevIdRef.current !== null) {
                map.flyTo(COLOMBIA_CENTER, DEFAULT_ZOOM, { duration: 1 });
            }
            prevIdRef.current = null;
            return;
        }

        const { latitud, longitud } = estacionSeleccionada;
        map.flyTo([latitud, longitud], SELECTED_ZOOM, { duration: 1 });
        prevIdRef.current = estacionSeleccionada.id;
    }, [estacionSeleccionada, map]);

    return null;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function UltimoDatoMap() {
    const { estacionSeleccionada } = useUltimoDatoStore();

    return (
        <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
            {!estacionSeleccionada && (
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 16,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1000,
                        backgroundColor: 'rgba(255,255,255,0.85)',
                        px: 2,
                        py: 0.5,
                        borderRadius: 2,
                        pointerEvents: 'none',
                        display: 'flex',
                        justifyContent: 'center',
                        textAlign: 'center',
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        Seleccione una estación para ver su ubicación
                    </Typography>
                </Box>
            )}

            <MapContainer
                center={COLOMBIA_CENTER}
                zoom={DEFAULT_ZOOM}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {estacionSeleccionada && (
                    <Marker
                        position={[estacionSeleccionada.latitud, estacionSeleccionada.longitud]}
                        icon={createMarkerIcon(
                            topicFromCodigo(estacionSeleccionada.codigo),
                            estacionSeleccionada.color,
                        )}
                    >
                        <Popup>
                            <strong>{estacionSeleccionada.nombreEstacion}</strong>
                            <br />
                            {estacionSeleccionada.municipio}, {estacionSeleccionada.region}
                        </Popup>
                    </Marker>
                )}

                <MapUpdater />
                <MapButtons />
            </MapContainer>
        </Box>
    );
}
