import React from 'react';
import VehicleMaintenanceDetail from '@/components/maintenance/vehicle-mtn-detail';

interface MaintenanceDetailPageProps {
  params: {
    id: string;
  };
}

export default function MaintenanceDetailPage({ params }: MaintenanceDetailPageProps) {
  return <VehicleMaintenanceDetail requestId={params.id} />;
}