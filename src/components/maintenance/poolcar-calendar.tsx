'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

type Booking = {
  // Application ID to keep color consistent across days
  id: number | string;
  date: string; // YYYY-MM-DD
  title?: string;
};

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addMonths(d: Date, months: number) {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PoolcarCalendar: React.FC<{ bookings?: Booking[] }>
  = ({ bookings = [] }) => {
  const [viewDate, setViewDate] = React.useState<Date>(() => new Date());

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const firstDayWeekIndex = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();

  const bookingMap = React.useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const arr = map.get(b.date) || [];
      arr.push(b);
      map.set(b.date, arr);
    }
    return map;
  }, [bookings]);

  // Deterministic color per application id
  const palette = React.useMemo(
    () => [
      'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/30 dark:text-blue-100 dark:border-blue-700',
      'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-100 dark:border-emerald-700',
      'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-700',
      'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300 dark:bg-fuchsia-900/30 dark:text-fuchsia-100 dark:border-fuchsia-700',
      'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-900/30 dark:text-rose-100 dark:border-rose-700',
      'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-100 dark:border-indigo-700',
      'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-100 dark:border-cyan-700',
      'bg-lime-100 text-lime-900 border-lime-300 dark:bg-lime-900/30 dark:text-lime-100 dark:border-lime-700',
    ],
    []
  );
  function hashToIndex(val: string | number) {
    const s = String(val);
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % palette.length;
  }
  function colorFor(id: string | number) {
    return palette[hashToIndex(id)];
  }

  const cells: (Date | null)[] = [];
  // Leading blanks
  for (let i = 0; i < firstDayWeekIndex; i++) cells.push(null);
  // Month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));
  }
  // Trailing blanks to fill the grid to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = formatDate(new Date());

  return (
    <div className="p-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon size={18} />
            <CardTitle>Poolcar Booking Calendar</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewDate(d => addMonths(d, -1))}>
              <ChevronLeft size={16} />
            </Button>
            <div className="min-w-[140px] text-center font-medium">
              {viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </div>
            <Button variant="outline" size="sm" onClick={() => setViewDate(d => addMonths(d, 1))}>
              <ChevronRight size={16} />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setViewDate(new Date())}>Today</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-xs sm:text-sm">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center font-medium py-1 text-muted-foreground">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 mt-1">
            {cells.map((d, idx) => {
              if (!d) return <div key={idx} className="h-24 bg-muted/30 rounded-sm"></div>;
              const dStr = formatDate(d);
              const dayBookings = bookingMap.get(dStr) || [];
              const isToday = dStr === todayStr;
              const todayStart = new Date(); todayStart.setHours(0,0,0,0);
              const isPastDay = d < todayStart;
              return (
                <div key={idx} className={`h-24 rounded-sm border p-1 flex flex-col ${isToday ? 'border-primary' : 'border-border'}`}>
                  <div className="text-right text-xs font-semibold">
                    {d.getDate()}
                  </div>
                  <div className="mt-1 space-y-1 overflow-y-auto">
                    {dayBookings.length === 0 ? (
                      <div className="text-[10px] text-muted-foreground">Available</div>
                    ) : (
                      dayBookings.slice(0, 2).map((b) => {
                        // Check continuity for the same app id across adjacent days
                        const prevDate = new Date(d);
                        prevDate.setDate(prevDate.getDate() - 1);
                        const nextDate = new Date(d);
                        nextDate.setDate(nextDate.getDate() + 1);
                        const prevStr = prevDate.toISOString().slice(0, 10);
                        const nextStr = nextDate.toISOString().slice(0, 10);
                        const hasPrev = (bookingMap.get(prevStr) || []).some(x => String(x.id) === String(b.id));
                        const hasNext = (bookingMap.get(nextStr) || []).some(x => String(x.id) === String(b.id));
                        const rounded = `${hasPrev ? 'rounded-l-none' : 'rounded-l-sm'} ${hasNext ? 'rounded-r-none' : 'rounded-r-sm'}`;
                        const colorCls = isPastDay
                          ? 'bg-muted text-muted-foreground border-border'
                          : colorFor(b.id);
                        return (
                          <div key={`${String(b.id)}-${dStr}`} className={`text-[10px] truncate px-1 py-0.5 border ${rounded} ${colorCls}`}>
                            <span className={`mr-1 ${hasPrev ? 'inline' : 'hidden'} opacity-60`}>←</span>
                            {b.title || 'Booked'}
                            <span className={`ml-1 ${hasNext ? 'inline' : 'hidden'} opacity-60`}>→</span>
                          </div>
                        );
                      })
                    )}
                    {dayBookings.length > 2 && (
                      <div className="text-[10px] text-muted-foreground">+{dayBookings.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded bg-primary" />
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded bg-muted" />
              <span>Available</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PoolcarCalendar;
