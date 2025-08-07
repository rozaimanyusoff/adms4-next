import { Metadata } from 'next';
import BillingDashboard from '@/components/billings/billing-dash';

export const metadata: Metadata = {
  title: 'Billing Dashboard | Reports',
  description: 'Comprehensive billing analytics dashboard with fuel, telco, and utility reports',
};

const BillingReportPage = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <BillingDashboard />
    </div>
  );
};

export default BillingReportPage;
