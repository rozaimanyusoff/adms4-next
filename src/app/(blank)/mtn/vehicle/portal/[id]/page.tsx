import React from 'react';
import VehicleServicePortal from '@components/maintenance/vehicle-mtn-portal';

export default async function MaintenancePortalPage(
  props: { params: Promise<{ id?: string }> }
) {
  const { id = '' } = await props.params;
  return <VehicleServicePortal requestId={id} />;
}
