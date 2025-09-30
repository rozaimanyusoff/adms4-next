import AssessmentPortal from '@/components/compliance/assessment-portal';

// Next.js newer versions may provide `params` as a Promise in the app router.
// Await it before accessing properties to avoid runtime errors.
export default async function Page({ params }: any) {
  const p = await params;
  return <AssessmentPortal assetId={String(p?.asset_id || '')} />;
}
