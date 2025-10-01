import AssessmentPortal from '@/components/compliance/assessment-portal';
import type { Metadata } from 'next';

// Next.js newer versions may provide `params` as a Promise in the app router.
// Await it before accessing properties to avoid runtime errors.
export default async function Page({ params }: any) {
  const p = await params;
  return <AssessmentPortal assetId={String(p?.asset_id || '')} />;
}

export async function generateMetadata(
  { params }: { params: { asset_id?: string } }
): Promise<Metadata> {
  const p = await params;
  const assetId = String(p?.asset_id || '');
  const title = assetId ? `Assessment Portal – Asset ${assetId}` : 'Assessment Portal';
  const description = 'Secure vehicle assessment portal for compliance assessments';
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
    },
    twitter: {
      title,
      description,
    },
  };
}
