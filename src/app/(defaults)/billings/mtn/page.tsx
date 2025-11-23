import React from 'react';
import TabMaintenanceBill from '@/components/billings/tab-mtn-bill';
import { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Maintenance Billing',
};

export default function MaintenancePage() {
	return <TabMaintenanceBill />;
}
