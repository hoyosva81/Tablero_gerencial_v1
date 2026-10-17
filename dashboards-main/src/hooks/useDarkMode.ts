import { useMediaQuery } from '@mui/material';

/** Devuelve `true` cuando el sistema operativo usa modo oscuro. */
export const useDarkMode = (): boolean => {
    return useMediaQuery('(prefers-color-scheme: dark)');
};
