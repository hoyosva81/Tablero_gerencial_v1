import { create } from 'zustand';
import type { UltimoDatoRow } from '@/types/ultimoDato';

interface UltimoDatoState {
    estacionSeleccionada: UltimoDatoRow | null;
    setEstacionSeleccionada: (estacion: UltimoDatoRow | null) => void;
}

export const useUltimoDatoStore = create<UltimoDatoState>((set) => ({
    estacionSeleccionada: null,
    setEstacionSeleccionada: (estacion) => set({ estacionSeleccionada: estacion }),
}));
