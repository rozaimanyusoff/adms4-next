import React from 'react';
import PurchaseAssetRegistration from '@/components/purchasing/purchase-asset-registration';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Asset Registry',
  description: 'Register a new asset for purchase',
};

export default function PurchaseAssetPage() {
  return <PurchaseAssetRegistration />;
}
