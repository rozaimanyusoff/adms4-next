import React from 'react';
import VehicleServicePortal from '@/components/maintenance/vehicle-service-portal';

interface MaintenancePortalPageProps {
  params: {
    id: string;
  };
}

export default function MaintenancePortalPage({ params }: MaintenancePortalPageProps) {
  return <VehicleServicePortal requestId={params.id} />;
}