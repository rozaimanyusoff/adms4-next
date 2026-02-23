import { Metadata } from 'next';
import DocsCorrespondenceTabs from '@/components/docs/docs-correspondence-tabs';

export const metadata: Metadata = {
    title: 'Correspondence Tracking',
    description: 'Track incoming and outgoing mail register with dashboard and records view.',
};

export default function DocsCorrespondenceTrackingPage() {
    return (
        <div className="space-y-8">
            <DocsCorrespondenceTabs />
        </div>
    );
}
