import { Box, CircularProgress, Alert } from '@mui/material';
import { DataGrid, type GridColDef, type GridRowParams } from '@mui/x-data-grid';
import { useUltimoDato } from '@/hooks/useUltimoDato';
import { useUltimoDatoStore } from '@/store/ultimoDatoStore';
import type { UltimoDatoRow, UltimoDatoTipo } from '@/types/ultimoDato';

// ─── Estilos del DataGrid (coloreado por tiempo sin row-risk-*) ───────────────

const DataGridStyles = {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: '4px',
    '& ::-webkit-scrollbar': {
        width: '8px',
        backgroundColor: '#f5f5f5',
    },
    '& ::-webkit-scrollbar-thumb': {
        backgroundColor: '#bdbdbd',
        borderRadius: '4px',
    },
    '& ::-webkit-scrollbar-thumb:hover': {
        backgroundColor: '#888',
    },
    scrollbarColor: '#bdbdbd #f5f5f5',
    scrollbarWidth: 'thin',
    '& .MuiDataGrid-cell': {
        fontSize: '0.9rem',
    },
    '& .MuiDataGrid-row.row-red': {
        backgroundColor: '#ffebee !important',
        '&:hover': { backgroundColor: '#ffcdd2 !important' },
        '&.Mui-selected': { backgroundColor: '#ffcdd2 !important' },
    },
    '& .MuiDataGrid-row.row-yellow': {
        backgroundColor: '#fff8e1 !important',
        '&:hover': { backgroundColor: '#fff3c4 !important' },
        '&.Mui-selected': { backgroundColor: '#fff3c4 !important' },
    },
    '& .MuiDataGrid-row:hover': {
        backgroundColor: '#e3f2fd !important',
    },
    '& .MuiDataGrid-row.Mui-selected': {
        backgroundColor: '#e3f2fd !important',
    },
};

// ─── Labels de tipo ───────────────────────────────────────────────────────────

const TIPO_LABEL: Record<UltimoDatoTipo, string> = {
    pluviometro: 'Pluviométrico',
    meteorologia: 'Meteorológica',
    nivel: 'Nivel',
};

// ─── Columnas ─────────────────────────────────────────────────────────────────

const columns: GridColDef<UltimoDatoRow>[] = [
    {
        field: 'alerta',
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
        width: 120,
    },
    {
        field: 'nombreEstacion',
        headerName: 'Nombre Estación',
        flex: 1,
        minWidth: 180,
    },
    {
        field: 'tipo',
        headerName: 'Tipo',
        width: 130,
        valueFormatter: (value: UltimoDatoTipo) => TIPO_LABEL[value] ?? value,
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
    {
        field: 'updated_at',
        headerName: 'Último dato',
        width: 160,
        valueFormatter: (value: string) => {
            if (!value) return '—';
            return new Date(value).toLocaleString('es-CO', {
                dateStyle: 'short',
                timeStyle: 'short',
            });
        },
    },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export function UltimoDatoTable() {
    const { data, isLoading, isError, error } = useUltimoDato();
    const { estacionSeleccionada, setEstacionSeleccionada } = useUltimoDatoStore();

    if (isError) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                Error al cargar datos: {(error as Error)?.message ?? 'Error desconocido'}
            </Alert>
        );
    }

    const rows = data ?? [];

    const handleRowClick = (params: GridRowParams<UltimoDatoRow>) => {
        if (estacionSeleccionada?.id === params.row.id) {
            setEstacionSeleccionada(null);
        } else {
            setEstacionSeleccionada(params.row);
        }
    };

    return (
        <Box sx={{ height: '100%', width: '100%' }}>
            <DataGrid
                rows={rows}
                columns={columns}
                loading={isLoading}
                initialState={{
                    pagination: { paginationModel: { pageSize: 25, page: 0 } },
                    sorting: {
                        sortModel: [{ field: 'updated_at', sort: 'asc' }],
                    },
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                getRowClassName={(params) => {
                    const updatedAt = new Date(params.row.updated_at).getTime();
                    const diffMs = Date.now() - updatedAt;
                    const diffHours = diffMs / (1000 * 60 * 60);
                    if (diffHours >= 24) return 'row-red';
                    if (diffHours > 1) return 'row-yellow';
                    return '';
                }}
                rowSelectionModel={estacionSeleccionada ? [estacionSeleccionada.id] : []}
                onRowClick={handleRowClick}
                disableMultipleRowSelection
                slots={{
                    loadingOverlay: () => (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <CircularProgress size={32} />
                        </Box>
                    ),
                }}
                sx={{ border: 'none', ...DataGridStyles }}
                localeText={{
                    noRowsLabel: 'Sin datos',
                    footerRowSelected: () => '',
                }}
            />
        </Box>
    );
}
