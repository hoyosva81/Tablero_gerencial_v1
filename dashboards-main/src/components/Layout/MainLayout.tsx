import { useState } from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

const DRAWER_WIDTH_OPEN = 240;
const DRAWER_WIDTH_CLOSED = 64;

export function MainLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <Sidebar
                open={sidebarOpen}
                onToggle={() => setSidebarOpen((prev) => !prev)}
            />

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    overflow: 'hidden',
                    height: '100%',
                    width: `calc(100% - ${sidebarOpen ? DRAWER_WIDTH_OPEN : DRAWER_WIDTH_CLOSED}px)`,
                    transition: (theme) =>
                        theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: sidebarOpen
                                ? theme.transitions.duration.enteringScreen
                                : theme.transitions.duration.leavingScreen,
                        }),
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
}
