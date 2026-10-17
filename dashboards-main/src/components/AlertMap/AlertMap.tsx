import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useAlarmasStore } from '@/store/alarmasStore';
import { createMarkerIcon, tipoDeAlertaToTopic } from './MarkerFactory';
import { MapButtons } from '@/components/ui/MapButtons/MapButtons';

// Vista inicial centrada en Antioquia, Colombia
const COLOMBIA_CENTER: [number, number] = [6.5, -75.5];
const DEFAULT_ZOOM = 7;
const SELECTED_ZOOM = 13;

// Componente interno que reacciona al cambio de alarma y mueve el mapa
function MapUpdater() {
    const { alarmaSeleccionada } = useAlarmasStore();
    const map = useMap();
    const prevIdRef = useRef<number | null>(null);

    // Forzar re-cálculo del tamaño al montar y al redimensionar el contenedor
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
        if (!alarmaSeleccionada) {
            if (prevIdRef.current !== null) {
                map.flyTo(COLOMBIA_CENTER, DEFAULT_ZOOM, { duration: 1 });
            }
            prevIdRef.current = null;
            return;
        }

        const { latitud, longitud } = alarmaSeleccionada;
        map.flyTo([latitud, longitud], SELECTED_ZOOM, { duration: 1 });
        prevIdRef.current = alarmaSeleccionada.id;
    }, [alarmaSeleccionada, map]);

    return null;
}

export function AlertMap() {
    const { alarmaSeleccionada } = useAlarmasStore();

    return (
        <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
            {!alarmaSeleccionada && (
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
                        Seleccione una alerta para ver su ubicación
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

                {alarmaSeleccionada && (
                    <Marker
                        position={[alarmaSeleccionada.latitud, alarmaSeleccionada.longitud]}
                        icon={createMarkerIcon(
                            tipoDeAlertaToTopic(alarmaSeleccionada.tipoDeAlerta),
                            alarmaSeleccionada.color
                        )}
                    >
                        <Popup>
                            <strong>{alarmaSeleccionada.nombreEstacion}</strong>
                            <br />
                            {alarmaSeleccionada.tipoDeAlerta}
                            <br />
                            {alarmaSeleccionada.municipio}, {alarmaSeleccionada.region}
                        </Popup>
                    </Marker>
                )}

                <MapUpdater />
                <MapButtons />
            </MapContainer>
        </Box>
    );
}
