import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import {
    DataGrid,
    useGridApiRef,
    type GridColDef,
    type GridRowParams,
} from '@mui/x-data-grid';
import { useAlarmas } from '@/hooks/useAlarmas';
import { useAlarmasStore } from '@/store/alarmasStore';
import type { AlarmRow } from '@/types/alarmas';

// Columnas del DataGrid de alertas
const columns: GridColDef<AlarmRow>[] = [
    {
        field: 'nivelDeAlerta',
        headerName: 'Alerta',
        width: 70,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    width: '100%',
                }}
            >
                <Box
                    sx={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        backgroundColor: params.row.color,
                        border: '1px solid rgba(0,0,0,0.15)',
                        flexShrink: 0,
                    }}
                />
            </Box>
        ),
    },
    {
        field: 'codigo',
        headerName: 'Código',
        width: 110,
    },
    {
        field: 'nombreEstacion',
        headerName: 'Nombre de Estación',
        flex: 1,
        minWidth: 180,
    },
    {
        field: 'tipoDeAlerta',
        headerName: 'Tipo de Alerta',
        width: 150,
    },
    {
        field: 'started_at',
        headerName: 'Inicio Alerta',
        width: 160,
        valueFormatter: (value: string) => {
            if (!value) return '—';
            return new Date(value).toLocaleString('es-CO', {
                dateStyle: 'short',
                timeStyle: 'short',
            });
        },
    },
    {
        field: 'municipio',
        headerName: 'Municipio',
        width: 130,
    },
    {
        field: 'region',
        headerName: 'Región',
        width: 120,
    },
];

export function AlertsTable() {
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
    // DataGrid usa páginas base-0; la API usa base-1
    const { data, isLoading } = useAlarmas(paginationModel.page + 1);
    const rows = data?.rows ?? [];
    const rowCount = data?.count ?? 0;
    const { alarmaSeleccionada, setAlarmaSeleccionada } = useAlarmasStore();
    const apiRef = useGridApiRef();

    // Id de la última selección procesada por los efectos, para reaccionar
    // solo cuando CAMBIA la selección y no en cada recarga de filas
    const ultimaSeleccionProcesada = useRef<number | null>(null);
    // Indica que hay un scroll pendiente hacia la fila seleccionada
    const scrollPendiente = useRef(false);

    // Si cambia la alerta seleccionada y no está en las filas de la página
    // actual (p. ej. al hacer clic en un toast de notificación), se vuelve a
    // la página 0, donde llegan las alertas más recientes.
    useEffect(() => {
        const idSeleccionada = alarmaSeleccionada?.id ?? null;
        if (idSeleccionada === ultimaSeleccionProcesada.current) return;
        ultimaSeleccionProcesada.current = idSeleccionada;
        if (!alarmaSeleccionada) return;

        scrollPendiente.current = true;
        if (!rows.some((fila) => fila.id === alarmaSeleccionada.id)) {
            setPaginationModel((previa) =>
                previa.page === 0 ? previa : { ...previa, page: 0 }
            );
        }
    }, [alarmaSeleccionada, rows]);

    // En cuanto la fila seleccionada está disponible en la rejilla, se hace
    // scroll hasta ella (cubre el clic en un toast y el clic directo en fila)
    useEffect(() => {
        if (!scrollPendiente.current || !alarmaSeleccionada) return;
        const indice = rows.findIndex((fila) => fila.id === alarmaSeleccionada.id);
        if (indice < 0) return;
        scrollPendiente.current = false;
        apiRef.current?.scrollToIndexes({ rowIndex: indice });
    }, [rows, alarmaSeleccionada, apiRef]);

    const handleRowClick = (params: GridRowParams<AlarmRow>) => {
        // Deselecciona si se hace clic en la misma fila
        if (alarmaSeleccionada?.id === params.row.id) {
            setAlarmaSeleccionada(null);
        } else {
            setAlarmaSeleccionada(params.row);
        }
    };

    return (
        <Box sx={{ height: '100%', width: '100%' }}>
            <DataGrid
                apiRef={apiRef}
                rows={rows}
                columns={columns}
                rowCount={rowCount}
                loading={isLoading}
                paginationMode="server"
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[10, 25, 50, 100]}
                rowSelectionModel={
                    alarmaSeleccionada ? [alarmaSeleccionada.id] : []
                }
                onRowClick={handleRowClick}
                disableMultipleRowSelection
                sx={{ height: '100%', border: 'none' }}
            />
        </Box>
    );
}
