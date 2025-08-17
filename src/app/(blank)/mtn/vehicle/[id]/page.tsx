import React from 'react';
import VehicleMaintenanceDetail from '@/components/maintenance/vehicle-mtn-detail';

export default function MaintenanceDetailPage(props: any) {
  const params = props?.params || {};
  const id = params.id || '';
  return <VehicleMaintenanceDetail requestId={id} />;
}