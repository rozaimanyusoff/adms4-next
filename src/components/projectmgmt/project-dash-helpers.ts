'use client';

import { format, parseISO, eachDayOfInterval, isWeekend } from 'date-fns';
import type { ProjectCategory, ProjectStatus } from './types';

// Store public holidays in memory to reuse across views
let cachedHolidays: string[] = [];
let holidaysLoaded = false;

// Fetch Malaysian public holidays for current year
export const fetchPublicHolidays = async () => {
    if (holidaysLoaded) return cachedHolidays;

    // External holiday API is no longer used; return empty list to keep calculations fast and predictable.
    holidaysLoaded = true;
    cachedHolidays = [];

    return cachedHolidays;
};

// Calculate business days excluding weekends and cached public holidays
export const calculateBusinessDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;

    try {
        const start = parseISO(startDate);
        const end = parseISO(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        if (end < start) return 0;

        const days = eachDayOfInterval({ start, end });

        return days.filter(day => {
            if (isWeekend(day)) return false;
            const dateStr = format(day, 'yyyy-MM-dd');
            if (cachedHolidays.includes(dateStr)) return false;
            return true;
        }).length;
    } catch {
        return 0;
    }
};

export const formatDisplayDate = (value: string) => {
    try {
        const parsed = parseISO(value);
        return format(parsed, 'MMM d, yyyy');
    } catch {
        return value;
    }
};

export const getPriorityMeta = (priority?: string) => {
    const normalized = (priority || 'medium').toLowerCase();
    const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);

    if (normalized === 'high') {
        return { label, className: 'border-red-500 text-red-700 dark:text-red-400' };
    }

    if (normalized === 'low') {
        return { label, className: 'border-slate-400 text-slate-600 dark:text-slate-400' };
    }

    return { label, className: 'border-amber-500 text-amber-700 dark:text-amber-400' };
};

export const STATUS_META: Record<ProjectStatus, { label: string; className: string }> = {
    not_started: { label: 'Not Started', className: 'bg-red-500 text-white text-xs truncate' },
    in_progress: { label: 'In Progress', className: 'bg-amber-400/70 text-primary text-xs truncate' },
    completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 text-xs truncate' },
    at_risk: { label: 'To Review', className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 text-xs truncate' },
};

export const STATUS_PROGRESS_COLORS: Record<ProjectStatus, { indicator: string; track: string }> = {
    not_started: { indicator: 'bg-muted-foreground/30', track: 'bg-muted' },
    in_progress: { indicator: 'bg-amber-500', track: 'bg-amber-100' },
    completed: { indicator: 'bg-emerald-500', track: 'bg-emerald-100' },
    at_risk: { indicator: 'bg-amber-600', track: 'bg-amber-100' },
};

export const CATEGORY_LABEL: Record<ProjectCategory, string> = {
    new: 'New Project',
    enhancement: 'Enhancement',
};

export const ROLE_LABEL: Record<'developer' | 'collaborator' | 'supervisor', string> = {
    developer: 'Developer',
    collaborator: 'Collaborator',
    supervisor: 'Supervisor',
};
