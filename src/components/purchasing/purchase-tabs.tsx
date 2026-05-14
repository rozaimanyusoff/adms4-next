'use client';
import React, { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PurchaseRecords from './purchase-records';
import PurchaseDashboard from './purchase-dashboard';
import PurchaseSuppliers from './purchase-suppliers';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';

const getInitialTab = (): 'dashboard' | 'records' | 'suppliers' => {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('purchaseTabs.active');
    if (stored === 'dashboard' || stored === 'records' || stored === 'suppliers') return stored;
  }
  return 'dashboard';
};

const PurchaseTabs: React.FC = () => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [filters, setFilters] = useState<{ type?: string; request_type?: string }>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'suppliers'>(getInitialTab);

  // Persist tab state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('purchaseTabs.active', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const fetchPurchases = async () => {
      setLoading(true);
      try {
        const res = await authenticatedApi.get('/api/purchases');
        const data = (res as any).data?.data || (res as any).data || [];
        setPurchases(data);
      } catch (err) {
        console.error('Failed to load purchases for summary', err);
        toast.error('Failed to load purchase summary');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, []);

  return (
    <>
    <div className="mb-2 overflow-hidden rounded-md border border-amber-200 bg-amber-50/80">
          <div className="purchase-marquee-track whitespace-nowrap py-1.5 text-sm font-medium text-amber-900">
            <span className="purchase-marquee-item">
              This section is under Procurement action for recording purchased items.
            </span>
            <span className="purchase-marquee-item" aria-hidden="true">
              This section is under Procurement action for recording purchased items.
            </span>
          </div>
        </div>
      <div>
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchasing</h1>
        <p className="text-sm text-muted-foreground">Asset Management Module</p>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="records">Purchase Records</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        

        <TabsContent value="dashboard" className="mt-6">
          <PurchaseDashboard
            purchases={purchases}
            onFilter={(f: { type?: string; request_type?: string }) => setFilters(prev => ({ ...prev, ...f }))}
          />
        </TabsContent>

        <TabsContent value="records" className="mt-6">
          <PurchaseRecords filters={filters} />
        </TabsContent>

        <TabsContent value="suppliers" className="mt-6">
          <PurchaseSuppliers />
        </TabsContent>
      </Tabs>
      <style jsx global>{`
        @keyframes purchaseMarqueeRtl {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .purchase-marquee-track {
          display: inline-flex;
          width: max-content;
          animation: purchaseMarqueeRtl 45s linear infinite;
          will-change: transform;
        }
        .purchase-marquee-item {
          display: inline-block;
          padding-right: 3rem;
        }
      `}</style>
    </div>
    </>
    
  );
};

export default PurchaseTabs;
