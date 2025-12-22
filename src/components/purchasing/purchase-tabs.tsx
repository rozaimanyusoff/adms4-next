'use client';
import React, { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PurchaseRecords from './purchase-records';
import PurchaseSummary from './purchase-summary';
import PurchaseSuppliers from './purchase-suppliers';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';

const PurchaseTabs: React.FC = () => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [filters, setFilters] = useState<{ type?: string; request_type?: string }>({});
  const [loading, setLoading] = useState(false);

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
    <div className="space-y-6">
      <PurchaseSummary
        purchases={purchases}
        onFilter={(f: { type?: string; request_type?: string }) => setFilters(prev => ({ ...prev, ...f }))}
      />

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Purchase Records</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-6">
          <PurchaseRecords filters={filters} />
        </TabsContent>

        <TabsContent value="suppliers" className="mt-6">
          <PurchaseSuppliers />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PurchaseTabs;
