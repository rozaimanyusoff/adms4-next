import { Metadata } from 'next';
import DocsMediaManager from '@/components/docs/docs-media-manager';

export const metadata: Metadata = {
    title: 'Documents & Media',
    description: 'Upload, preview, and manage documents, images, and video in one place.',
};

export default function DocsPage() {
    return (
        <div className="space-y-8">
            <DocsMediaManager />
        </div>
    );
}
