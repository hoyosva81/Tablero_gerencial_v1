import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import dayjs from 'dayjs';

export interface TimeButton {
    /** Display label, e.g. "24h", "7d" */
    label: string;
    /** Chart-specific record count to request from the API (e.g. 1440, 288) */
    value: number;
    /** Real calendar days this button spans — used for date math and disable logic */
    durationDays: number;
}

interface TimePresetButtonsProps {
    buttons: TimeButton[];
    /** Currently active button value, or null when the user has manually set dates */
    activeValue: number | null;
    /** Controlled start date (YYYY-MM-DD) — used only for the disable check */
    startDate: string;
    /** Controlled end date (YYYY-MM-DD) — used only for the disable check */
    endDate: string;
    /**
     * Called when the user clicks a preset button.
     * Provides the computed startDate (today − durationDays), today as endDate, and
     * the button's value so the parent can update its state in one place.
     */
    onSelect: (startDate: string, endDate: string, value: number) => void;
}

const SCROLL_CLASS = 'time-preset-scroll';

const arrowBtnStyle = (disabled: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '22px',
    padding: '4px 0',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-surface)',
    color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-base)',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.35 : 1,
    fontSize: '14px',
    lineHeight: '1',
});

export const TimePresetButtons = ({
    buttons,
    activeValue,
    startDate,
    endDate,
    onSelect,
}: TimePresetButtonsProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateArrows = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 1);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        updateArrows();
        el.addEventListener('scroll', updateArrows, { passive: true });
        const ro = new ResizeObserver(updateArrows);
        ro.observe(el);
        return () => {
            el.removeEventListener('scroll', updateArrows);
            ro.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const scroll = (dir: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const step = el.clientWidth / 4;
        el.scrollBy({ left: dir === 'right' ? step : -step, behavior: 'smooth' });
    };

    const rangeDays = dayjs(endDate).diff(dayjs(startDate), 'day');

    return (
        <div style={{ display: 'flex', alignItems: 'stretch', gap: '4px' }}>
            <style>{`.${SCROLL_CLASS}::-webkit-scrollbar { display: none; }`}</style>

            {/* Left arrow */}
            <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                style={arrowBtnStyle(!canScrollLeft)}
                aria-label="Desplazar izquierda"
            >
                ‹
            </button>

            {/* Scrollable pill — exactly 4 buttons visible at a time */}
            <div
                ref={scrollRef}
                className={SCROLL_CLASS}
                style={{
                    flex: 1,
                    display: 'flex',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    scrollbarWidth: 'none',
                    background: 'var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px',
                    gap: '2px',
                }}
            >
                {buttons.map((btn) => {
                    const isActive = activeValue === btn.value;
                    const isDisabled = activeValue === null && btn.durationDays > rangeDays + 1;

                    return (
                        <button
                            key={btn.value}
                            disabled={isDisabled}
                            onClick={() => {
                                const now = dayjs().format('YYYY-MM-DD');
                                const newStart = dayjs(now)
                                    .subtract(btn.durationDays, 'day')
                                    .format('YYYY-MM-DD');
                                onSelect(newStart, now, btn.value);
                            }}
                            style={{
                                flex: '0 0 calc(25% - 1.5px)',
                                padding: '4px 0',
                                fontSize: 'var(--font-size-xs)',
                                fontFamily: 'var(--font-sans)',
                                fontWeight: isActive ? 600 : 400,
                                border: 'none',
                                borderRadius: 'calc(var(--radius-sm) - 2px)',
                                background: isActive ? 'var(--color-surface)' : 'transparent',
                                color: isDisabled
                                    ? 'var(--color-text-muted)'
                                    : 'var(--color-text-base)',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                opacity: isDisabled ? 0.4 : 1,
                                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                                transition: 'background 0.12s ease, box-shadow 0.12s ease',
                                whiteSpace: 'nowrap',
                                textAlign: 'center',
                            }}
                        >
                            {btn.label}
                        </button>
                    );
                })}
            </div>

            {/* Right arrow */}
            <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                style={arrowBtnStyle(!canScrollRight)}
                aria-label="Desplazar derecha"
            >
                ›
            </button>
        </div>
    );
};
