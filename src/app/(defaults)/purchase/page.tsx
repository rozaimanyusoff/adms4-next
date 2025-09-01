import { PurchaseRecords } from '@/components/purchasing';
import PurchaseTabs from '@components/purchasing/purchase-tabs';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Purchase Records',
    description: 'Manage purchase requests, orders, and delivery tracking'
};

const Purchases = () => {
    return <PurchaseTabs />;
};

export default Purchases;