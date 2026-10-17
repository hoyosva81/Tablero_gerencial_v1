import {
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Box,
    Typography,
    Divider,
    IconButton,
    Tooltip,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import QueryBuilderIcon from '@mui/icons-material/QueryBuilder';
import UpdateIcon from '@mui/icons-material/Update';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import { NavLink, useLocation } from 'react-router-dom';

const DRAWER_WIDTH_OPEN = 240;
const DRAWER_WIDTH_CLOSED = 64;

interface SidebarProps {
    open: boolean;
    onToggle: () => void;
}

const navItems = [
    {
        label: 'Registro de Alertas',
        icon: <NotificationsIcon />,
        path: '/',
    },
    {
        label: 'Tabla Horaria',
        icon: <QueryBuilderIcon />,
        path: '/tabla-horaria',
    },
    {
        label: 'Último Dato',
        icon: <UpdateIcon />,
        path: '/ultimo-dato',
    },
];

export function Sidebar({ open, onToggle }: SidebarProps) {
    const location = useLocation();

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: open ? DRAWER_WIDTH_OPEN : DRAWER_WIDTH_CLOSED,
                flexShrink: 0,
                whiteSpace: 'nowrap',
                transition: (theme) =>
                    theme.transitions.create('width', {
                        easing: theme.transitions.easing.sharp,
                        duration: open
                            ? theme.transitions.duration.enteringScreen
                            : theme.transitions.duration.leavingScreen,
                    }),
                '& .MuiDrawer-paper': {
                    width: open ? DRAWER_WIDTH_OPEN : DRAWER_WIDTH_CLOSED,
                    overflowX: 'hidden',
                    transition: (theme) =>
                        theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: open
                                ? theme.transitions.duration.enteringScreen
                                : theme.transitions.duration.leavingScreen,
                        }),
                    boxSizing: 'border-box',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                },
            }}
        >
            <Toolbar
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: open ? 'space-between' : 'center',
                    px: open ? 2 : 1,
                    minHeight: 56,
                }}
            >
                {open && (
                    // <Typography
                    //     variant="h6"
                    //     color="primary"
                    //     noWrap
                    //     sx={{ fontWeight: 700, fontSize: '14px' }}
                    // >
                    //     SAMA
                    // </Typography>
                    <img src={`${import.meta.env.BASE_URL}img/logo.svg`} alt="Logo" style={{ width: 60, height: 60 }} />
                )}
                <IconButton onClick={onToggle} size="small">
                    {open ? <MenuOpenIcon /> : <MenuIcon />}
                </IconButton>
            </Toolbar>

            <Divider />

            <List dense sx={{ pt: 1 }}>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Tooltip
                            key={item.path}
                            title={open ? '' : item.label}
                            placement="right"
                        >
                            <ListItemButton
                                component={NavLink}
                                to={item.path}
                                selected={isActive}
                                sx={{
                                    mx: 1,
                                    mb: 0.5,
                                    borderRadius: 2,
                                    minHeight: 44,
                                    justifyContent: open ? 'initial' : 'center',
                                    px: open ? 1.5 : 1,
                                    '&.Mui-selected': {
                                        backgroundColor: 'primary.main',
                                        color: 'primary.contrastText',
                                        '& .MuiListItemIcon-root': {
                                            color: 'primary.contrastText',
                                        },
                                        '&:hover': {
                                            backgroundColor: 'primary.dark',
                                        },
                                    },
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: open ? 36 : 'unset',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                {open && (
                                    <ListItemText
                                        primary={item.label}
                                        slotProps={{ primary: { variant: 'body1' } }}
                                    />
                                )}
                            </ListItemButton>
                        </Tooltip>
                    );
                })}
            </List>

            {/* Logo o versión al fondo */}
            <Box sx={{ flexGrow: 1 }} />
            {open && (
                <Box sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                        v0.1.0
                    </Typography>
                </Box>
            )}
        </Drawer>
    );
}
