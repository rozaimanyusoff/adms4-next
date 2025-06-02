import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CustomDataGrid } from '@/components/ui/DataGrid';

interface StockTracking {
  id: number;
  items: {
    id: number;
    item_code: string;
    item_name: string;
  };
  procurement: {
    id: number;
    po_no: string;
    po_date: string;
    supplier: {
      id: number;
      name: string;
    };
    delivery_date: string;
  };
  serial_no: string;
  store: string;
  status: string;
  issuance: {
    issue_date: string;
    issue_no: string;
    issue_to: {
      id: number;
      name: string;
    };
    installed_location: string;
  };
  registered_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

const CStockTracking = () => {
  const [trackings, setTrackings] = useState<StockTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError(null);
    authenticatedApi.get('/api/stock/tracking')
      .then(res => {
        const data = Array.isArray((res as any).data?.data) ? (res as any).data.data : [];
        setTrackings(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filtered = trackings.filter(t =>
    t.items.item_name.toLowerCase().includes(search.toLowerCase()) ||
    t.items.item_code.toLowerCase().includes(search.toLowerCase()) ||
    t.serial_no.toLowerCase().includes(search.toLowerCase())
  );

  const ITEMS_PER_PAGE = 12;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (loading) return <div className="text-gray-500 text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">{error}</div>;

  // Define columns for the DataGrid (key must be keyof StockTracking or string, but cast as any for nested fields)
  const columns = [
    { key: 'item_name' as any, header: 'Item Name', render: (row: StockTracking) => row.items.item_name },
    { key: 'item_code' as any, header: 'Item Code', render: (row: StockTracking) => row.items.item_code },
    { key: 'serial_no' as keyof StockTracking, header: 'Serial No' },
    { key: 'store' as keyof StockTracking, header: 'Store' },
    { key: 'po_no' as any, header: 'PO No', render: (row: StockTracking) => row.procurement.po_no },
    { key: 'po_date' as any, header: 'PO Date', render: (row: StockTracking) => row.procurement.po_date ? new Date(row.procurement.po_date).toLocaleDateString() : '-' },
    { key: 'supplier' as any, header: 'Supplier', render: (row: StockTracking) => row.procurement.supplier?.name || '-' },
    { key: 'delivery_date' as any, header: 'Delivery', render: (row: StockTracking) => row.procurement.delivery_date ? new Date(row.procurement.delivery_date).toLocaleDateString() : '-' },
    { key: 'status' as keyof StockTracking, header: 'Status', render: (row: StockTracking) => <span className={row.status === 'issued' ? 'text-yellow-600' : 'text-green-600'}>{row.status}</span> },
    { key: 'issue_date' as any, header: 'Issue', render: (row: StockTracking) => row.issuance?.issue_date ? new Date(row.issuance.issue_date).toLocaleDateString() : '-' },
    { key: 'issue_no' as any, header: 'Issue No', render: (row: StockTracking) => row.issuance?.issue_no || '-' },
    { key: 'issue_to' as any, header: 'Issue To', render: (row: StockTracking) => row.issuance?.issue_to?.name || '-' },
    { key: 'installed_location' as any, header: 'Installed', render: (row: StockTracking) => row.issuance?.installed_location || '-' },
    { key: 'registered_by' as keyof StockTracking, header: 'Registered By' },
    { key: 'created_at' as keyof StockTracking, header: 'Created', render: (row: StockTracking) => new Date(row.created_at).toLocaleString() },
    { key: 'updated_at' as keyof StockTracking, header: 'Updated', render: (row: StockTracking) => new Date(row.updated_at).toLocaleString() },
  ];

  return (
    <div className="flex min-h-[80vh] h-full gap-4 mt-4">
      <section className="flex flex-col w-full">
        <CustomDataGrid
          columns={columns}
          data={filtered}
          pageSize={ITEMS_PER_PAGE}
          pagination={true}
        />
      </section>
    </div>
  );
};

export default CStockTracking;
