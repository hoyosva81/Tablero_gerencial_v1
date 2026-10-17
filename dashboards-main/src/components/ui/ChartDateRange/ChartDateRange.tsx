import dayjs from 'dayjs';

export interface DownloadOption {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

interface ChartDateRangeProps {
    /** Controlled start date (YYYY-MM-DD) */
    startDate: string;
    /** Controlled end date (YYYY-MM-DD) */
    endDate: string;
    /** Upper bound for the hasta input. Defaults to today. */
    maxEndDate?: string;
    /**
     * Maximum allowed span between startDate and endDate in calendar days (inclusive).
     * E.g. maxRangeDays={30} means at most a 30-day window.
     */
    maxRangeDays?: number;
    /**
     * Called when either date input changes.
     */
    onDatesChange: (startDate: string, endDate: string) => void;
    /** Optional download buttons rendered to the right of the date inputs. */
    downloads?: DownloadOption[];
}

const inputStyle: React.CSSProperties = {
    padding: '3px 6px',
    fontSize: 'var(--font-size-sm)',
    fontFamily: 'var(--font-sans)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text-base)',
};

const labelStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap',
};

const dlBtnStyle: React.CSSProperties = {
    padding: '3px 8px',
    fontSize: 'var(--font-size-xs)',
    fontFamily: 'var(--font-sans)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text-base)',
    cursor: 'pointer',
};

const dlBtnDisabledStyle: React.CSSProperties = {
    ...dlBtnStyle,
    opacity: 0.35,
    cursor: 'not-allowed',
};

export const ChartDateRange = ({
    startDate,
    endDate,
    maxEndDate,
    maxRangeDays,
    onDatesChange,
    downloads,
}: ChartDateRangeProps) => {
    const today = dayjs().format('YYYY-MM-DD');
    const max = maxEndDate ?? today;

    const endMax = maxRangeDays
        ? [dayjs(startDate).add(maxRangeDays - 1, 'day').format('YYYY-MM-DD'), max].sort()[0]
        : max;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexWrap: 'wrap',
            }}
        >
            <span style={labelStyle}>Desde:</span>
            <input
                type="date"
                style={inputStyle}
                max={max}
                value={startDate}
                onChange={(e) => {
                    const newStart = e.target.value;
                    if (!newStart) return;
                    let newEnd = endDate;
                    if (maxRangeDays) {
                        const cap = [
                            dayjs(newStart).add(maxRangeDays - 1, 'day').format('YYYY-MM-DD'),
                            max,
                        ].sort()[0];
                        if (newEnd > cap) newEnd = cap;
                    }
                    if (newEnd < newStart) newEnd = newStart;
                    onDatesChange(newStart, newEnd);
                }}
            />
            <span style={labelStyle}>Hasta:</span>
            <input
                type="date"
                style={inputStyle}
                min={startDate}
                max={endMax}
                value={endDate}
                onChange={(e) => {
                    const newEnd = e.target.value;
                    if (!newEnd) return;
                    if (newEnd >= startDate) {
                        onDatesChange(startDate, newEnd);
                    }
                }}
            />
            {downloads && downloads.length > 0 && (
                <>
                    <span style={{ ...labelStyle, marginLeft: 'auto' }}>Descargar:</span>
                    {downloads.map((dl) => (
                        <button
                            key={dl.label}
                            style={dl.disabled ? dlBtnDisabledStyle : dlBtnStyle}
                            disabled={dl.disabled}
                            onClick={dl.onClick}
                            title={`Descargar ${dl.label}`}
                        >
                            {dl.label}
                        </button>
                    ))}
                </>
            )}
        </div>
    );
};
