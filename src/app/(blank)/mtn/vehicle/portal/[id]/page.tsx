import React from 'react';
import type { Metadata } from 'next';
import VehicleServicePortal from '@components/maintenance/vehicle-mtn-portal';

export async function generateMetadata(
  props: { params: Promise<{ id?: string }>; searchParams?: { action?: string; authorize?: string } }
): Promise<Metadata> {
  const { id = '' } = await props.params;
  const action = props.searchParams?.action;
  const authorize = props.searchParams?.authorize;

  const prettyAction = action === 'approve' ? 'Approval' : action === 'recommend' ? 'Recommendation' : 'Authorization';
  const prettyAuthorize = authorize ? ` • ${authorize}` : '';

  return {
    title: `Vehicle Maintenance ${prettyAction}${id ? ` • #${id}` : ''}${prettyAuthorize}`,
    description: 'Secure vehicle maintenance authorization portal for recommendations and approvals.',
    robots: { index: false, follow: false },
    viewport: 'width=device-width, initial-scale=1',
    openGraph: {
      title: `Vehicle Maintenance ${prettyAction}${id ? ` • #${id}` : ''}`,
      description: 'Secure portal to review and act on maintenance requests.',
    },
  };
}

export default async function MaintenancePortalPage(
  props: { params: Promise<{ id?: string }> }
) {
  const { id = '' } = await props.params;
  return <VehicleServicePortal requestId={id} />;
}
