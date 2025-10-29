import { ProjectMgmtMain } from '@/components/projectmgmt';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Project Management',
    description: 'Register projects, balance task vs support work, and surface delivery insights.',
};

const ProjectManagementPage = () => {
    return <ProjectMgmtMain />;
};

export default ProjectManagementPage;

