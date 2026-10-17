import { useQuery } from '@tanstack/react-query';
import { fetchUltimoDato } from '@/services/ultimoDatoService';
import type { UltimoDatoRow } from '@/types/ultimoDato';

export function useUltimoDato() {
    return useQuery<UltimoDatoRow[]>({
        queryKey: ['ultimoDato'],
        queryFn: fetchUltimoDato,
        refetchInterval: 60 * 1000, // 1 minuto
        staleTime: 30 * 1000,
    });
}
