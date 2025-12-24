import React from 'react';
import type { Metadata } from 'next';
import VehicleMtnFormPage from '@/components/maintenance/vehicle-mtn-form-page';

export const metadata: Metadata = {
  title: 'Vehicle Maintenance Form',
  description: 'Create or update vehicle maintenance requests.',
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  return <VehicleMtnFormPage idParam={resolved?.id} />;
}
