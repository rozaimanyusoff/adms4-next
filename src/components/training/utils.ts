'use client';

export type ApiTrainingRecord = {
    training_id?: number;
    course_title?: string;
    course_id?: number | null;
    series?: string | null;
    sdate?: string | null;
    edate?: string | null;
    hrs?: string | number | null;
    days?: string | number | null;
    venue?: string | null;
    training_count?: number | null;
    attendance?: string | null;
    session?: string | null;
    seat?: number | null;
    contents?: string | null;
    event_cost?: string | number | null;
    cost_trainer?: string | number | null;
    cost_venue?: string | number | null;
    cost_lodging?: string | number | null;
    cost_other?: string | number | null;
    cost_total?: string | number | null;
    attendance_upload?: string | null;
};

export type TrainingRecord = {
    training_id: number;
    course_title: string;
    course_id?: number | null;
    series?: string | null;
    sdate?: string | null;
    edate?: string | null;
    hrs?: string | number | null;
    days?: string | number | null;
    venue?: string | null;
    training_count?: number | null;
    attendance?: string | null;
    session?: string | null;
    seat?: number | null;
    contents?: string | null;
    event_cost?: string | number | null;
    cost_trainer?: string | number | null;
    cost_venue?: string | number | null;
    cost_lodging?: string | number | null;
    cost_other?: string | number | null;
    cost_total?: string | number | null;
    attendance_upload?: string | null;
    hrs_num: number;
    days_num: number;
};

export const parseNumber = (value: unknown, precision = 2): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const parsed = Number(value.replace(/[^\d.-]/g, ''));
        return Number.isFinite(parsed) ? parseFloat(parsed.toFixed(precision)) : 0;
    }
    return 0;
};

export const parseDateTime = (value?: string | null) => {
    if (!value) return null;
    const parts = value.split(' ');
    if (parts.length === 0) return null;
    const datePart = parts[0];
    const suffix = parts.slice(2).join(' ');
    const [dayStr, monthStr, yearStr] = datePart.split('/');
    const day = Number(dayStr);
    const month = Number(monthStr);
    const year = Number(yearStr);
    if (!day || !month || !year) return null;
    let hours = 0;
    let minutes = 0;
    if (parts[1]) {
        const [hhStr, mmStr] = parts[1].split(':');
        const hh = Number(hhStr);
        const mm = Number(mmStr);
        if (Number.isFinite(hh)) hours = hh;
        if (Number.isFinite(mm)) minutes = mm;
    }
    const ampm = suffix || parts[2] || '';
    if (ampm) {
        const normalized = ampm.toUpperCase();
        if (normalized.includes('PM') && hours < 12) hours += 12;
        if (normalized.includes('AM') && hours === 12) hours = 0;
    }
    const normalizedDate = new Date(year, month - 1, day, hours, minutes);
    return Number.isNaN(normalizedDate.getTime()) ? null : normalizedDate;
};

export const formatDateTime = (value?: string | null) => {
    const date = parseDateTime(value);
    if (!date) return '-';
    return date.toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const formatCurrency = (value?: string | number | null) => {
    const amount = parseNumber(value ?? 0);
    if (!amount) return '-';
    return `RM ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const normalizeTrainingRecord = (raw: ApiTrainingRecord | any): TrainingRecord => ({
    training_id: Number(raw?.training_id ?? raw?.id ?? 0),
    course_title: String(raw?.course_title ?? raw?.title ?? 'Untitled Training'),
    course_id: raw?.course_id ?? null,
    series: raw?.series ?? null,
    sdate: raw?.sdate ?? raw?.startDate ?? null,
    edate: raw?.edate ?? raw?.endDate ?? null,
    hrs: raw?.hrs ?? raw?.hours ?? null,
    days: raw?.days ?? raw?.day ?? null,
    venue: raw?.venue ?? raw?.location ?? null,
    training_count: raw?.training_count ?? raw?.count ?? null,
    attendance: raw?.attendance ?? null,
    session: raw?.session ?? raw?.type ?? null,
    seat: raw?.seat ?? raw?.seats ?? null,
    contents: raw?.contents ?? null,
    event_cost: raw?.event_cost ?? null,
    cost_trainer: raw?.cost_trainer ?? null,
    cost_venue: raw?.cost_venue ?? null,
    cost_lodging: raw?.cost_lodging ?? null,
    cost_other: raw?.cost_other ?? null,
    cost_total: raw?.cost_total ?? null,
    attendance_upload: raw?.attendance_upload ?? null,
    hrs_num: parseNumber(raw?.hrs ?? raw?.hours ?? 0, 2),
    days_num: parseNumber(raw?.days ?? raw?.day ?? 0, 1),
});
