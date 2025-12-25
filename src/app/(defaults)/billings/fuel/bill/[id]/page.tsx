import FuelBillFormPageClient from './pageClient';

type Params = { id: string | string[] };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  const rawId = Array.isArray(resolved.id) ? resolved.id[0] : resolved.id;
  const id = rawId || 'new';
  const title = id === 'new' ? 'Fuel Bill Form' : `Fuel Bill ${id}`;
  return { title };
}

export default async function FuelBillFormPage({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  const rawId = Array.isArray(resolved.id) ? resolved.id[0] : resolved.id;
  return <FuelBillFormPageClient idParam={rawId ?? 'new'} />;
}
