import { createTheme, ThemeOptions } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';

/**
 * Tema Material UI alineado con los design tokens SAMA
 * Soporta modo claro y oscuro mediante CSS custom properties
 */
const themeOptions: ThemeOptions = {
    palette: {
        mode: 'light',
        primary: {
            main: '#002040', // sama-blue
            light: '#A8D4EA', // sama-light-blue
            dark: '#001528',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#757575', // sama-grey
            light: '#bfbfbf', // sama-grey-light
            dark: '#4a4a4a',
            contrastText: '#ffffff',
        },
        background: {
            default: '#eef1f4',
            paper: '#ffffff',
        },
        text: {
            primary: '#002040',
            secondary: '#4A5568',
        },
        success: {
            main: '#52be80', // sama-green
            light: '#82d996',
            dark: '#2d7a4a',
        },
        warning: {
            main: '#DD6B20', // orange-alert
            light: '#f5a254',
            dark: '#8a3e10',
        },
        error: {
            main: '#E53E3E', // red-alert
            light: '#fc8181',
            dark: '#822222',
        },
        info: {
            main: '#A8D4EA', // sama-light-blue
            light: '#c5e3f5',
            dark: '#5a8caa',
        },
        divider: '#e2e8f0',
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: 13,
        h1: { fontSize: '38px', fontWeight: 700 },
        h2: { fontSize: '24px', fontWeight: 700 },
        h3: { fontSize: '18px', fontWeight: 700 },
        h4: { fontSize: '16px', fontWeight: 600 },
        h5: { fontSize: '15px', fontWeight: 600 },
        h6: { fontSize: '14px', fontWeight: 600 },
        body1: { fontSize: '13px', lineHeight: 1.5 },
        body2: { fontSize: '11px', lineHeight: 1.43 },
        caption: { fontSize: '9px', lineHeight: 1.33 },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '12px',
                    transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                },
                contained: {
                    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
                    },
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    fontSize: '13px',
                    borderBottomColor: '#e2e8f0',
                },
                head: {
                    backgroundColor: '#eef1f4',
                    fontWeight: 600,
                    color: '#002040',
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    '&:hover': {
                        backgroundColor: 'rgba(168, 212, 234, 0.05)',
                    },
                },
            },
        },
        MuiDataGrid: {
            styleOverrides: {
                root: {
                    borderColor: '#e2e8f0',
                    fontSize: '13px',
                },
                columnHeader: {
                    backgroundColor: '#eef1f4',
                    color: '#002040',
                    fontWeight: 600,
                },
                row: {
                    '&:hover': {
                        backgroundColor: 'rgba(168, 212, 234, 0.05)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                    },
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: '12px',
                },
            },
        },
    },
};

export const theme = createTheme(themeOptions);
