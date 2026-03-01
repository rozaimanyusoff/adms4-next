import type { Metadata } from 'next';
import CreateCorrespondencePageClient from './pageClient';

export const metadata: Metadata = {
    title: 'Create Correspondence Registry',
    description: 'Create a new correspondence registry record and upload the supporting attachment.',
};

export default function CreateCorrespondencePage() {
    return <CreateCorrespondencePageClient />;
}
