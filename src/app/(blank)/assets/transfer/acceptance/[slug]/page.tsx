import React from 'react';
import type { Metadata } from 'next';
import AssetTransferAcceptancePortal from '@/components/assetmgmt/asset-transfer-acceptance-portal';

export const metadata: Metadata = {
  title: 'Asset Transfer Acceptance Portal',
  description: 'Review and acknowledge asset transfer items.',
};

export default async function Page(props: { params: Promise<{ slug?: string }> }) {
  const { slug = '' } = await props.params;
  return <AssetTransferAcceptancePortal transferId={slug} />;
}
