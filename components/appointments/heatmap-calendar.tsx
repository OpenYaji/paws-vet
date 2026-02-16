'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HeatmapCalendarProps {
  appointmentCounts: Record<string, number>; // { "2025-01-15": 8, ... }
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getHeatColor(count: number): string {
  if (count >= 13) return 'bg-red-100 text-red-800 hover:bg-red-200';
  if (count >= 6) return 'bg-amber-50 text-amber-800 hover:bg-amber-100';
  if (count > 0) return 'bg-green-100 text-green-800 hover:bg-green-200';
  return 'bg-muted/40 text-muted-foreground hover:bg-muted';
}

function getHeatLabel(count: number): string {
  if (count >= 13) return 'Busy';
  if (count >= 6) return 'Moderate';
  if (count > 0) return 'Available';
  return '';
}

export default function HeatmapCalendar({
  appointmentCounts,
  selectedDate,
  onDateSelect,
}: HeatmapCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = new Date(year, month - 1, d);
      days.push({
        date: prevMonth.toISOString().split('T')[0],
        day: d,
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      days.push({
        date: dateObj.toISOString().split('T')[0],
        day: d,
        isCurrentMonth: true,
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = new Date(year, month + 1, d);
      days.push({
        date: nextMonth.toISOString().split('T')[0],
        day: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonth]);

  const monthLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{monthLabel}</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
              )
            }
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              const now = new Date();
              setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              onDateSelect(today);
            }}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
              )
            }
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(({ date, day, isCurrentMonth }) => {
          const count = appointmentCounts[date] || 0;
          const isSelected = selectedDate === date;
          const isToday = date === today;
          const isPast = isCurrentMonth && date < today;

          return (
            <button
              key={date}
              onClick={() => onDateSelect(date)}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-lg p-1.5 min-h-[52px] transition-all text-sm',
                isCurrentMonth ? getHeatColor(count) : 'bg-transparent text-muted-foreground/40',
                isSelected && 'ring-2 ring-foreground ring-offset-1',
                isToday && !isSelected && 'ring-1 ring-primary',
                !isCurrentMonth && 'cursor-default',
                isPast && !isSelected && 'opacity-40'
              )}
              disabled={!isCurrentMonth}
            >
              <span className={cn('font-medium', isToday && 'text-primary font-bold')}>
                {day}
              </span>
              {isCurrentMonth && count > 0 && (
                <span className="text-[10px] leading-none mt-0.5 font-medium">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">Density:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
          <span className="text-xs text-muted-foreground">0–5</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-50 border border-amber-200" />
          <span className="text-xs text-muted-foreground">6–12</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
          <span className="text-xs text-muted-foreground">13+</span>
        </div>
      </div>
    </div>
  );
}
