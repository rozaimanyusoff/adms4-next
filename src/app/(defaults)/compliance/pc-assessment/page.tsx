import React from 'react';
import PcAssessmentRecord from '@/components/compliance/pc-assessment-record';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PC Assessment Record',
  description: 'Annual IT hardware assessment records with quick access to the form.',
};

export default function Page() {
  return (
    <div className="p-2">
      <h1 className="text-3xl font-bold mb-4">Compliance — IT Assessment</h1>
      <PcAssessmentRecord />
    </div>
  );
}
