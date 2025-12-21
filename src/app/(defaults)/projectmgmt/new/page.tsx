'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ProjectDetails from '@/components/projectmgmt/project-details';
import { assignorDirectory, assigneeDirectory, PROJECT_TAGS } from '@/components/projectmgmt/project-dash-constants';

const NewProjectPage = () => {
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
            />
        </div>
    );
};

export default NewProjectPage;

