import React from 'react';
import VehicleMaintenanceDetail from '@/components/maintenance/vehicle-mtn-detail';

export default async function MaintenanceDetailPage(props: any) {
  // Next.js requires awaiting params for dynamic routes in server components
  const params = (await props?.params) || {};
  const id = params.id || '';
  return <VehicleMaintenanceDetail requestId={id} />;
}