import type { Metadata } from 'next';
import React from 'react';
import ModuleEditorClient from './ModuleEditorClient';

export const metadata: Metadata = {
    title: 'Module Editor',
    description: 'Add or edit a project module using the focused module editor.',
};

type PageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ModuleEditorPage = async ({ searchParams }: PageProps) => {
    const params = await searchParams;
    const projectIdParam = params.projectId;
    const moduleIdParam = params.moduleId;
    const projectId = Array.isArray(projectIdParam) ? projectIdParam[0] : projectIdParam || '';
    const moduleId = Array.isArray(moduleIdParam) ? moduleIdParam[0] : moduleIdParam || undefined;

    if (!projectId) {
        return <div className="p-6 text-sm text-destructive">Missing projectId query parameter.</div>;
    }

    return <ModuleEditorClient projectId={projectId} moduleId={moduleId} />;
};

export default ModuleEditorPage;
