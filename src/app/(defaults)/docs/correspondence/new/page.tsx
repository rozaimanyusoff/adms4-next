import type { Metadata } from 'next';
import CreateCorrespondencePageClient from './pageClient';

export const metadata: Metadata = {
    title: 'Create Mail Registry',
    description: 'Create a new mail registry record and upload the supporting attachment.',
};

export default function CreateCorrespondencePage() {
    return <CreateCorrespondencePageClient />;
}
