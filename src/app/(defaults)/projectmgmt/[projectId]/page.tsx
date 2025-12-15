import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import ProjectDetails from '@/components/projectmgmt/project-details';
import { assignorDirectory, assigneeDirectory, PROJECT_TAGS } from '@/components/projectmgmt/project-dash-constants';

type ProjectDetailsPageProps = {
    params: { projectId?: string };
};

const ProjectDetailsPage = ({ params }: ProjectDetailsPageProps) => {
    const projectIdRaw = params?.projectId;
    const projectId = projectIdRaw ? decodeURIComponent(projectIdRaw) : '';

    if (!projectId || projectId === 'undefined') {
        redirect('/projectmgmt');
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
