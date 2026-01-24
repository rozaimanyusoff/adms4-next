import { Metadata } from 'next';
import DocsMediaManager from '@/components/docs/docs-media-manager';

export const metadata: Metadata = {
    title: 'Docs Manager',
    description: 'Upload, preview, and manage documents, images, and video in one place.',
};

export default function DocsManagerPage() {
    return (
        <div className="space-y-8">
            <DocsMediaManager />
        </div>
    );
}
