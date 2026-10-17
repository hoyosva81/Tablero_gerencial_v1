import { create } from 'zustand';
import type { AlarmRow } from '@/types/alarmas';

interface AlarmasState {
    alarmaSeleccionada: AlarmRow | null;
    setAlarmaSeleccionada: (alarma: AlarmRow | null) => void;
}

export const useAlarmasStore = create<AlarmasState>((set) => ({
    alarmaSeleccionada: null,
    setAlarmaSeleccionada: (alarma) => set({ alarmaSeleccionada: alarma }),
}));
