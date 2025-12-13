import PcAssessmentForm from '@/components/compliance/pc-assessment-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PC Assessment Form',
  description: 'Annual IT hardware assessment form for laptops, desktops, and tablets.',
};

export default function Page() {
  return (
    <div className="p-2">
      <PcAssessmentForm />
    </div>
  );
}
