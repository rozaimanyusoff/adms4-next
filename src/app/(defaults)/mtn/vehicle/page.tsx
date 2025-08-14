import React from 'react';
import { Metadata } from 'next';
import TabMaintenance from '@components/maintenance/tab-mtn';

export const metadata: Metadata = {
  title: 'Vehicle Maintenance Management',
  description: 'Comprehensive vehicle maintenance request management system with dashboard analytics and detailed records',
};

const MaintenancePage = () => {
  return <TabMaintenance />;
};

export default MaintenancePage;
