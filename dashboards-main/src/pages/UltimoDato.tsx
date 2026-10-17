import { Box, Paper, Typography } from '@mui/material';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, useDefaultLayout } from 'react-resizable-panels';
import { UltimoDatoTable } from '@/components/UltimoDatoTable/UltimoDatoTable';
import { UltimoDatoDetail } from '@/components/UltimoDatoDetail/UltimoDatoDetail';
import { UltimoDatoMap } from '@/components/UltimoDatoMap/UltimoDatoMap';

// ─── Handles de redimensionado (mismo estilo que RegistroAlertas) ─────────────

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

// ─── Página ───────────────────────────────────────────────────────────────────

export function UltimoDato() {
    const { defaultLayout: horizontalLayout, onLayoutChange: onHorizontalLayoutChange } = useDefaultLayout({
        groupId: 'ultimo-dato-horizontal',
        storage: localStorage,
    });

    const { defaultLayout: verticalLayout, onLayoutChange: onVerticalLayoutChange } = useDefaultLayout({
        groupId: 'ultimo-dato-vertical',
        storage: localStorage,
    });

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, gap: 1.5 }}>
            <Typography variant="h3" color="text.primary">
                Último Dato
            </Typography>

            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                <PanelGroup
                    orientation="horizontal"
                    defaultLayout={horizontalLayout}
                    onLayoutChange={onHorizontalLayoutChange}
                    style={{ height: '100%', gap: 0 }}
                >
                    {/* Panel izquierdo: tabla */}
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
                            <UltimoDatoTable />
                        </Paper>
                    </Panel>

                    <HorizontalHandle />

                    {/* Panel derecho: detalle + mapa en vertical */}
                    <Panel id="detalle-mapa" defaultSize={50} minSize={20}>
                        <PanelGroup
                            orientation="vertical"
                            defaultLayout={verticalLayout}
                            onLayoutChange={onVerticalLayoutChange}
                            style={{ height: '100%' }}
                        >
                            {/* Panel superior: detalle */}
                            <Panel id="detalle" defaultSize={60} minSize={20}>
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
                                    <UltimoDatoDetail />
                                </Paper>
                            </Panel>

                            <VerticalHandle />

                            {/* Panel inferior: mapa */}
                            <Panel id="mapa" defaultSize={40} minSize={20}>
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
                                    <UltimoDatoMap />
                                </Paper>
                            </Panel>
                        </PanelGroup>
                    </Panel>
                </PanelGroup>
            </Box>
        </Box>
    );
}
