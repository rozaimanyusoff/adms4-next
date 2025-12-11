import React from 'react';
import TabAssessment from '@components/compliance/tab-assessment';
import TabSummon from '@components/compliance/tab-summon';

const Page: React.FC = () => {
  return (
    <div className="p-2">
      <main>
        <h1 className="text-3xl font-bold mb-4">Compliance — Vehicle Assessment</h1>
        <TabAssessment />
      </main>
    </div>
  );
};

export default Page;
