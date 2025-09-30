import AssessmentPortal from '@/components/compliance/assessment-portal';

export default function Page({ params }: any) {
  return <AssessmentPortal assetId={params?.asset_id} />;
}

