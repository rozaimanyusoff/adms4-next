'use client';

import type { ProjectTag } from './types';

export const assignorDirectory = ['PMO Lead', 'Service Desk Manager', 'Finance Head', 'Operations Director'];
export const assigneeDirectory = ['Melissa Carter', 'Benjamin Lee', 'April Ramos', 'Liam Patel', 'Natalie Chen', 'Omar Idris'];

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
