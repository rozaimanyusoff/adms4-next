'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import TelcoBillForm from '@/components/billings/telco-bill-form';

export default function TelcoBillFormPageClient({ idParam }: { idParam?: string }) {
  const router = useRouter();
  const isNew = (idParam ?? 'new') === 'new';
  const leaveHandlerRef = React.useRef<(() => void) | null>(null);

  const handleBack = React.useCallback(() => {
    if (leaveHandlerRef.current) {
      leaveHandlerRef.current();
    } else {
      router.push('/billings/telco');
    }
  }, [router]);

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Telco Bill {isNew ? 'Creation' : `#${idParam}`}</h2>
        <Button
          type="button"
          variant="outline"
          className="gap-1 ring-1 ring-red-500"
          size="sm"
          onClick={handleBack}
        >
          ← Back
        </Button>
      </div>

      <TelcoBillForm
        utilId={isNew ? 0 : Number(idParam)}
        onClose={handleBack}
        onLeaveHandlerReady={(fn) => { leaveHandlerRef.current = fn; }}
      />
    </div>
  );
}
