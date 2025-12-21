'use client';

import type { ProjectTag, ProjectCategory, ProjectType } from './types';

export const assignorDirectory = ['PMO Lead', 'Service Desk Manager', 'Finance Head', 'Operations Director'];
export const assigneeDirectory = ['Melissa Carter', 'Benjamin Lee', 'April Ramos', 'Liam Patel', 'Natalie Chen', 'Omar Idris'];

// Project Categories
export const PROJECT_CATEGORIES: Array<{ value: ProjectCategory; label: string }> = [
    { value: 'new', label: 'New Project' },
    { value: 'enhancement', label: 'Enhancement' },
];

// Project Types
export const PROJECT_TYPES: Array<{ value: ProjectType; label: string }> = [
    { value: 'claimable', label: 'Claimable' },
    { value: 'internal', label: 'Internal' },
];

export const PROJECT_TAGS: ProjectTag[] = [
    { id: 'tag_ops', name: 'Operational Excellence', slug: 'operational-excellence', colorHex: '#0ea5e9' },
    { id: 'tag_ai', name: 'Automation', slug: 'automation', colorHex: '#6366f1' },
    { id: 'tag_fin', name: 'Finance', slug: 'finance', colorHex: '#f59e0b' },
    { id: 'tag_support', name: 'Support Coverage', slug: 'support-coverage', colorHex: '#10b981' },
    { id: 'tag_risk', name: 'Risk Watch', slug: 'risk-watch', colorHex: '#ef4444' },
];

export const PROJECT_TAG_LOOKUP = PROJECT_TAGS.reduce<Record<string, ProjectTag>>((acc, tag) => {
    acc[tag.slug] = tag;
    return acc;
}, {});
