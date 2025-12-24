import React from 'react';
import type { Metadata } from 'next';
import ComplianceSummonList from '@components/compliance/summon-record';
import TabSummon from '@components/compliance/tab-summon';

export const metadata: Metadata = {
  title: 'Traffic Summon',
  description: 'Traffic summon records and management.',
};

const Page: React.FC = () => {
  return (
    <div className="p-4">
      <main>
        <h1 className="text-3xl font-bold mb-4">Compliance — Traffic Summons</h1>
        <TabSummon />
      </main>
    </div>
  );
};

export default Page;
