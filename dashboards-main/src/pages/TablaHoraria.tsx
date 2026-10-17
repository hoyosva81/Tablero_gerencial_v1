import { useState, useCallback, useDeferredValue } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Button,
    Paper,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    CircularProgress,
    Alert,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { ChartDateRange } from '@/components/ui/ChartDateRange/ChartDateRange';
import { useSnapshots } from '@/hooks/useSnapshots';
import type { StationType } from '@/types/snapshots';
import type {
    MeteorologiaSnapshotValue,
    NivelSnapshotValue,
    PluvioSnapshotValue,
} from '@/types/snapshots';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 100;

function fmtDatetime(value: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

function fmtNum(value: string | null): string {
    return value != null ? value : '—';
}

// ─── Column definitions ───────────────────────────────────────────────────────

const BASE_COLS: GridColDef[] = [
    {
        field: 'created_at',
        headerName: 'Fecha / Hora',
        width: 140,
        valueFormatter: (value: string) => fmtDatetime(value),
    },
    {
        field: 'estacion_id',
        headerName: 'Estación',
        width: 100,
    },
    {
        field: 'descripcion',
        headerName: 'Descripción',
        flex: 1,
        minWidth: 160,
    },
];

const METEO_COLS: GridColDef<MeteorologiaSnapshotValue>[] = [
    ...BASE_COLS,
    { field: 'radiacion', headerName: 'Radiación', width: 100, valueFormatter: fmtNum },
    { field: 'calidad_radiacion', headerName: 'Cal. Radiación', width: 120 },
    { field: 'temperatura', headerName: 'Temperatura', width: 110, valueFormatter: fmtNum },
    { field: 'calidad_temperatura', headerName: 'Cal. Temperatura', width: 130 },
    { field: 'lluvia', headerName: 'Lluvia', width: 90, valueFormatter: fmtNum },
    { field: 'calidad_lluvia', headerName: 'Cal. Lluvia', width: 110 },
    { field: 'humedad_relativa', headerName: 'Humedad (%)', width: 110, valueFormatter: fmtNum },
    { field: 'calidad_humedad_relativa', headerName: 'Cal. Humedad', width: 120 },
    { field: 'direccion_viento', headerName: 'Dir. Viento (°)', width: 125, valueFormatter: fmtNum },
    { field: 'calidad_direccion_viento', headerName: 'Cal. Dir. Viento', width: 140 },
    { field: 'velocidad_viento', headerName: 'Vel. Viento', width: 115, valueFormatter: fmtNum },
    { field: 'calidad_velocidad_viento', headerName: 'Cal. Vel. Viento', width: 140 },
];

const NIVEL_COLS: GridColDef<NivelSnapshotValue>[] = [
    ...BASE_COLS,
    { field: 'nivel', headerName: 'Nivel (m)', width: 110, valueFormatter: fmtNum },
    { field: 'calidad', headerName: 'Calidad', width: 90 },
];

const PLUVIO_COLS: GridColDef<PluvioSnapshotValue>[] = [
    ...BASE_COLS,
    { field: 'muestra', headerName: 'Precipitación (mm)', width: 170, valueFormatter: fmtNum },
    { field: 'calidad', headerName: 'Calidad', width: 90 },
];

function columnsFor(type: StationType): GridColDef[] {
    if (type === 'meteorologia') return METEO_COLS as GridColDef[];
    if (type === 'niveles') return NIVEL_COLS as GridColDef[];
    return PLUVIO_COLS as GridColDef[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TablaHoraria() {
    const today = dayjs().format('YYYY-MM-DD');
    const defaultStart = dayjs().subtract(30, 'day').format('YYYY-MM-DD');

    const { type } = useParams<{ type: string }>();
    const navigate = useNavigate();

    const TYPE_TO_STATION: Record<string, StationType> = {
        meteorologicas: 'meteorologia',
        niveles: 'niveles',
        pluviometricos: 'pluviometros',
    };
    const stationType: StationType = TYPE_TO_STATION[type ?? ''] ?? 'meteorologia';

    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(today);
    const [estacionInput, setEstacionInput] = useState('');
    const [page, setPage] = useState(1);

    // Debounce the station filter so we don't fire a request on every keystroke
    const deferredEstacion = useDeferredValue(estacionInput.trim() || undefined);

    const STATION_TO_TYPE: Record<StationType, string> = {
        meteorologia: 'meteorologicas',
        niveles: 'niveles',
        pluviometros: 'pluviometricos',
    };

    const handleTypeChange = useCallback(
        (_: React.MouseEvent<HTMLElement>, value: StationType | null) => {
            if (!value) return; // prevent deselecting all
            navigate(`/tabla-horaria/${STATION_TO_TYPE[value]}`);
            setPage(1);
        },
        [navigate],
    );

    const handleDatesChange = useCallback((start: string, end: string) => {
        setStartDate(start);
        setEndDate(end);
        setPage(1);
    }, []);

    const handlePreset30Days = useCallback(() => {
        setStartDate(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
        setEndDate(today);
        setPage(1);
    }, [today]);

    const { data, isFetching, isError, error } = useSnapshots(stationType, {
        fechaInicio: startDate,
        fechaFin: endDate,
        estacionId: deferredEstacion,
        page,
        size: PAGE_SIZE,
    });

    const rows = (data?.values ?? []).map((row, i) => ({ id: i, ...row }));
    const totalRows = data?.count ?? 0;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, gap: 1.5 }}>
            {/* Page header */}
            <Typography variant="h3" color="text.primary">
                Tabla Horaria
            </Typography>

            {/* Controls */}
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 1.5,
                }}
            >
                {/* Station type selector */}
                <ToggleButtonGroup
                    value={stationType}
                    exclusive
                    onChange={handleTypeChange}
                    size="small"
                    sx={{ flexShrink: 0 }}
                >
                    <ToggleButton value="meteorologia">Meteorológicas</ToggleButton>
                    <ToggleButton value="niveles">Niveles</ToggleButton>
                    <ToggleButton value="pluviometros">Pluviométricos</ToggleButton>
                </ToggleButtonGroup>

                {/* Quick preset */}
                <Button
                    variant="outlined"
                    size="small"
                    onClick={handlePreset30Days}
                    sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                    Últimos 30 días
                </Button>

                {/* Date range pickers */}
                <ChartDateRange
                    startDate={startDate}
                    endDate={endDate}
                    onDatesChange={handleDatesChange}
                />

                {/* Station filter */}
                <TextField
                    label="Filtrar estación"
                    placeholder="ej. sm_001"
                    size="small"
                    value={estacionInput}
                    onChange={(e) => {
                        setEstacionInput(e.target.value);
                        setPage(1);
                    }}
                    sx={{ width: 160, flexShrink: 0 }}
                    slotProps={{ input: { sx: { fontSize: '0.875rem' } } }}
                />

                {/* Loading indicator */}
                {isFetching && <CircularProgress size={20} sx={{ ml: 1 }} />}
            </Box>

            {/* Error */}
            {isError && (
                <Alert severity="error">
                    Error al cargar datos: {(error as Error)?.message ?? 'Error desconocido'}
                </Alert>
            )}

            {/* Table */}
            <Paper
                elevation={0}
                sx={{
                    flexGrow: 1,
                    minHeight: 0,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden',
                }}
            >
                <DataGrid
                    rows={rows}
                    columns={columnsFor(stationType)}
                    rowCount={totalRows}
                    loading={isFetching}
                    paginationMode="server"
                    paginationModel={{ page: page - 1, pageSize: PAGE_SIZE }}
                    onPaginationModelChange={(model) => setPage(model.page + 1)}
                    pageSizeOptions={[PAGE_SIZE]}
                    disableRowSelectionOnClick
                    sx={{ height: '100%', border: 'none' }}
                    localeText={{
                        noRowsLabel: 'Sin datos para el rango seleccionado',
                        footerRowSelected: () => '',
                    }}
                />
            </Paper>
        </Box>
    );
}
