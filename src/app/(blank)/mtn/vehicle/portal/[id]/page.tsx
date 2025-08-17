import React from 'react';
import VehicleServicePortal from '@/components/maintenance/vehicle-service-portal';

export default function MaintenancePortalPage(props: any) {
  const params = props?.params || {};
  const id = params.id || '';
  return <VehicleServicePortal requestId={id} />;
}