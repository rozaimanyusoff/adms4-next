import AssessmentPortal from '@/components/compliance/assessment-portal';

export default async function Page({ params }: { params: Promise<{ asset_id?: string }> }) {
  const resolved = await params;
  const assetId = String(resolved?.asset_id || '');
  return <AssessmentPortal assetId={assetId} />;
}
