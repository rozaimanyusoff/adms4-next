"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import VehicleMtnForm from './vehicle-mtn-form';

interface VehicleMtnFormPageProps {
  idParam?: string;
}

const VehicleMtnFormPage: React.FC<VehicleMtnFormPageProps> = ({ idParam }) => {
  const router = useRouter();
  const formId = idParam && idParam !== 'new' ? idParam : undefined;

  const goBack = React.useCallback(() => {
    router.push('/mtn/vehicle/record');
  }, [router]);

  return (
    <div className="p-4">
      <VehicleMtnForm id={formId} onClose={goBack} onSubmitted={goBack} />
    </div>
  );
};

export default VehicleMtnFormPage;
