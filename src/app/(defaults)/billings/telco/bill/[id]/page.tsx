import TelcoBillFormPageClient from './pageClient';

type Params = { id: string | string[] };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  const rawId = Array.isArray(resolved.id) ? resolved.id[0] : resolved.id;
  const id = rawId || 'new';
  const title = id === 'new' ? 'Telco Bill Form' : `Telco Bill ${id}`;
  return { title };
}

export default async function TelcoBillFormPage({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  const rawId = Array.isArray(resolved.id) ? resolved.id[0] : resolved.id;
  return <TelcoBillFormPageClient idParam={rawId ?? 'new'} />;
}
