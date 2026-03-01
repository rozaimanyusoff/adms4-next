import type { Metadata } from 'next';
import EditCorrespondencePageClient from './pageClient';

export const metadata: Metadata = {
    title: 'Edit Correspondence Registry',
    description: 'Update a correspondence registry record and maintain its registry and QA workflow details.',
};

export default function EditCorrespondencePage() {
    return <EditCorrespondencePageClient />;
}
