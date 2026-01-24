import { Metadata } from 'next';
import DocsMediaCatalog from '@/components/docs/docs-media-catalog';

export const metadata: Metadata = {
    title: 'Docs Catalog',
    description: 'Browse media library in grid or table view with filters and search.',
};

export default function DocsCatalogPage() {
    return (
        <div className="space-y-8">
            <DocsMediaCatalog />
        </div>
    );
}
