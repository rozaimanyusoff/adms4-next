import React from 'react';
import AssessmentForm from '@/components/compliance/assessment-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vehicle Assessment Form',
  description: 'Assessment form for vehicle compliance purposes',
};

export default function Page() {
  return (
    <div className="p-6">
      <AssessmentForm />
    </div>
  );
}
