'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import FuelMtnDetail from '@/components/billings/fuel-bill-form2';

export default function FuelBillFormPageClient({ idParam }: { idParam?: string }) {
  const router = useRouter();
  const isNew = (idParam ?? 'new') === 'new';
  const leaveHandlerRef = React.useRef<(() => void) | null>(null);

  const handleBack = React.useCallback(() => {
    if (leaveHandlerRef.current) {
      leaveHandlerRef.current();
    } else {
      router.push('/billings/fuel');
    }
  }, [router]);

  return (
    <div className="py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Fuel Bill v2 (Copy+Paste Entry) {isNew ? 'Form' : `#${idParam}`}<p className="text-sm text-muted-foreground">Use this form to enter fuel bill details by copying and pasting data.</p></h2>
        {/* Description */}
        
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
      <FuelMtnDetail
        stmtId={isNew ? 0 : Number(idParam)}
        onLeaveHandlerReady={(fn) => { leaveHandlerRef.current = fn; }}
      />
    </div>
  );
}
