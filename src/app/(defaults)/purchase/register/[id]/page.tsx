import PurchaseRecords from '@/components/purchasing/purchase-records';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Purchase Register',
  description: 'Create or edit purchase records'
};

export default async function PurchaseRegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mode = id === 'new' ? 'create' : 'edit';

  return (
    <PurchaseRecords
      inlineFormOnly
      initialFormMode={mode as 'create' | 'edit'}
      initialPurchaseId={mode === 'edit' ? id : undefined}
    />
  );
}
