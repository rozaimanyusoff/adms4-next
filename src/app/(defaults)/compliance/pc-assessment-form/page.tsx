import PcAssessmentForm from '@/components/compliance/pc-assessment-form';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PC Assessment Form',
  description: 'Annual IT hardware assessment form for laptops, desktops, and tablets.',
};

export default function Page() {
  return (
    <div className="p-2 space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/compliance/pc-assessment"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          ← Back to records
        </Link>
      </div>
      <PcAssessmentForm />
    </div>
  );
}
