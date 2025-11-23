import type { Metadata } from 'next';
import React from 'react';
import ScopeEditorClient from './ScopeEditorClient';

export const metadata: Metadata = {
    title: 'Scope Editor',
    description: 'Add or edit a project scope using the focused scope editor.',
};

type PageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ScopeEditorPage = async ({ searchParams }: PageProps) => {
    const params = await searchParams;
    const projectIdParam = params.projectId;
    const scopeIdParam = params.scopeId;
    const projectId = Array.isArray(projectIdParam) ? projectIdParam[0] : projectIdParam || '';
    const scopeId = Array.isArray(scopeIdParam) ? scopeIdParam[0] : scopeIdParam || undefined;

    if (!projectId) {
        return <div className="p-6 text-sm text-destructive">Missing projectId query parameter.</div>;
    }

    return <ScopeEditorClient projectId={projectId} scopeId={scopeId} />;
};

export default ScopeEditorPage;
