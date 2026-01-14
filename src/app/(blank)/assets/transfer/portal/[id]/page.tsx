import React from 'react';
import type { Metadata } from 'next';
import AssetTransferPortal from '@components/assetmgmt/asset-transfer-authorize-portal';

export const metadata: Metadata = {
  title: 'Asset Transfer Authorization Portal',
  description: 'Review and approve or reject asset transfer requests.',
};

export default async function Page(props: { params: Promise<{ id?: string }> }) {
  const { id = '' } = await props.params;
  return <AssetTransferPortal transferId={id} />;
}
