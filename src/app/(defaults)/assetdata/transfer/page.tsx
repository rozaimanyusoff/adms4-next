import TransferApp from '@components/assetmgmt/tabassettransfer';
import AssetTransfer from '@components/assetmgmt/asset-transfer';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Asset Transfer Request',
};

const AssetTransferPage = () => {
    return <AssetTransfer />;
};

export default AssetTransferPage;
