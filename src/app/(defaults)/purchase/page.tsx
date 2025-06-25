import PurchaseRequest from '@components/assetmgmt/purchase-request';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Purchase Requests',
};

const Purchases = () => {
    return <PurchaseRequest />;
};

export default Purchases;