import { redirect } from 'next/navigation';

export default function LegacyCatalogRedirect() {
    redirect('/docs/catalog');
}
