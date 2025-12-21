'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { use } from 'react';
import ProjectDetails from '@/components/projectmgmt/project-details';
import { assignorDirectory, assigneeDirectory, PROJECT_TAGS } from '@/components/projectmgmt/project-dash-constants';

type ProjectDetailsPageProps = {
    params: Promise<{ projectId?: string }>;
};

const ProjectDetailsPage = ({ params }: ProjectDetailsPageProps) => {
    const router = useRouter();
    const [projectId, setProjectId] = useState<string>('');
    const resolvedParams = use(params);
    
    useEffect(() => {
        const projectIdRaw = resolvedParams?.projectId;
        const id = projectIdRaw ? decodeURIComponent(projectIdRaw) : '';
        
        if (!id || id === 'undefined') {
            router.push('/projectmgmt');
            return;
        }
        
        setProjectId(id);
    }, [resolvedParams?.projectId, router]);

    if (!projectId) {
        return <div className="text-center py-8">Loading project...</div>;
    }

    return (
        <div className="space-y-6">
            <Link href="/projectmgmt" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to projects
            </Link>
            <ProjectDetails
                onSubmit={() => { /* form posts internally */ }}
                assignorOptions={assignorDirectory}
                assigneeOptions={assigneeDirectory}
                availableTags={PROJECT_TAGS}
                editProjectId={projectId}
            />
        </div>
    );
};

export default ProjectDetailsPage;
