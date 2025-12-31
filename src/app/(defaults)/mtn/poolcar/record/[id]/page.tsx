'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import PoolcarApplicationForm from '@components/maintenance/poolcar-form';

export default function PoolcarRecordApplicationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const isNew = params.id === 'new';

  const handleBack = React.useCallback(() => {
    router.push('/mtn/poolcar/record');
  }, [router]);

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Poolcar Application Form</h2>
        <Button
          type="button"
          variant="outline"
          className="ring-1 ring-red-500"
          size="sm"
          onClick={handleBack}
        >
          Back to Pool Car Records
        </Button>
      </div>

      <PoolcarApplicationForm
        id={isNew ? undefined : params.id}
        onClose={handleBack}
        onSubmitted={handleBack}
      />
    </div>
  );
}
