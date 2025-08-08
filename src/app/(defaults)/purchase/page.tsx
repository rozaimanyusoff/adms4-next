import { PurchaseRecords } from '@/components/purchasing';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Purchase Records',
    description: 'Manage purchase requests, orders, and delivery tracking'
};

const Purchases = () => {
    return <PurchaseRecords />;
};

export default Purchases;