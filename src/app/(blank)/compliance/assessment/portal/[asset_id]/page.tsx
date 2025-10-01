import AssessmentPortal from '@/components/compliance/assessment-portal';

export default function Page({ params }: any) {
  const assetId = String(params?.asset_id || '');
  return <AssessmentPortal assetId={assetId} />;
}
