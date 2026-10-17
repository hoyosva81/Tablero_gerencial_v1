import { Box, Paper, Typography } from '@mui/material';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, useDefaultLayout } from 'react-resizable-panels';
import { AlertsTable } from '@/components/AlertsTable/AlertsTable';
import { AlertDetail } from '@/components/AlertDetail/AlertDetail';
import { AlertMap } from '@/components/AlertMap/AlertMap';

// Estilo compartido para el handle de redimensionado
const resizeHandleStyle: React.CSSProperties = {
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

function HorizontalHandle() {
    return (
        <PanelResizeHandle style={{ width: 8, ...resizeHandleStyle }}>
            <Box
                sx={{
                    width: 4,
                    height: 48,
                    borderRadius: 2,
                    backgroundColor: 'divider',
                    transition: 'background-color 0.2s',
                    '&:hover': { backgroundColor: 'primary.light' },
                }}
            />
        </PanelResizeHandle>
    );
}

function VerticalHandle() {
    return (
        <PanelResizeHandle style={{ height: 8, ...resizeHandleStyle }}>
            <Box
                sx={{
                    height: 4,
                    width: 48,
                    borderRadius: 2,
                    backgroundColor: 'divider',
                    transition: 'background-color 0.2s',
                    '&:hover': { backgroundColor: 'primary.light' },
                }}
            />
        </PanelResizeHandle>
    );
}

export function RegistroAlertas() {
    // Persistencia del layout horizontal (tabla | detalle+mapa) en localStorage
    const { defaultLayout: horizontalLayout, onLayoutChange: onHorizontalLayoutChange } = useDefaultLayout({
        groupId: 'registro-alertas-horizontal',
        storage: localStorage,
    });

    // Persistencia del layout vertical (detalle | mapa) en localStorage
    const { defaultLayout: verticalLayout, onLayoutChange: onVerticalLayoutChange } = useDefaultLayout({
        groupId: 'registro-alertas-vertical',
        storage: localStorage,
    });

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, gap: 1.5 }}>
            {/* Encabezado de página */}
            <Typography variant="h3" color="text.primary">
                Registro de Alertas
            </Typography>



            {/* Layout principal con paneles redimensionables */}
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                <PanelGroup
                    orientation="horizontal"
                    defaultLayout={horizontalLayout}
                    onLayoutChange={onHorizontalLayoutChange}
                    style={{ height: '100%', gap: 0 }}
                >
                    {/* Panel izquierdo: tabla (~66%) */}
                    <Panel id="tabla" defaultSize={50} minSize={30}>
                        <Paper
                            elevation={0}
                            sx={{
                                height: '100%',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <AlertsTable />
                        </Paper>
                    </Panel>

                    <HorizontalHandle />

                    {/* Panel derecho (~34%): detalle + mapa en vertical */}
                    <Panel id="detalle-mapa" defaultSize={34} minSize={20}>
                        <PanelGroup
                            orientation="vertical"
                            defaultLayout={verticalLayout}
                            onLayoutChange={onVerticalLayoutChange}
                            style={{ height: '100%' }}
                        >
                            {/* Panel superior: detalle / chart */}
                            <Panel id="detalle" defaultSize={90} minSize={20}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        height: '100%',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                    }}
                                >
                                    <AlertDetail />
                                </Paper>
                            </Panel>

                            <VerticalHandle />

                            {/* Panel inferior: mapa */}
                            <Panel id="mapa" defaultSize={50} minSize={20}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        height: '100%',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                    }}
                                >
                                    <AlertMap />
                                </Paper>
                            </Panel>
                        </PanelGroup>
                    </Panel>
                </PanelGroup>
            </Box>
        </Box>
    );
}
