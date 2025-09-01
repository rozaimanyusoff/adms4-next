import React from 'react';
import ComplianceSummonList from '@/components/compliance/compliance-summon';

const Page: React.FC = () => {
  return (
    <div className="p-4">
      <main>
        <h1 className="text-3xl font-bold mb-4">Compliance — Traffic Summons</h1>
        <ComplianceSummonList />
      </main>
    </div>
  );
};

export default Page;
