import AssetTransferForm from '@components/assetmgmt/AssetTransferForm';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Asset Transfer',
};

const AssetCore = () => {
    return <AssetTransferForm />;
};

export default AssetCore;