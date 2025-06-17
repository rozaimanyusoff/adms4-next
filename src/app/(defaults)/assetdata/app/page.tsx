import AssetTransferForm from '@components/assetmgmt/asset-transfer-form';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Asset Transfer',
};

const AssetCore = () => {
    return <AssetTransferForm />;
};

export default AssetCore;