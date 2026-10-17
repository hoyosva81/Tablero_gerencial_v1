import { useState, useEffect } from 'react';

/** Devuelve `true` cuando el viewport es menor a 768 px. */
export const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    return isMobile;
};
