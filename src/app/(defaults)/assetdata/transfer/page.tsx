import TransferApp from '@components/assetmgmt/tabassettransfer';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Asset Transfer',
};

const AssetTransfer = () => {
    return <TransferApp />;
};

export default AssetTransfer;