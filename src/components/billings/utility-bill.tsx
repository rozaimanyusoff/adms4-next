'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Plus, Download, Loader2 } from 'lucide-react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface UtilityBill {
  util_id: number;
  ubill_no: string;
  ubill_date: string;
  ubill_stotal: string;
  ubill_tax: string;
  ubill_rounding: string;
  ubill_disc: string;
  ubill_gtotal: string;
  ubill_entry: string;
  account: {
    utility_id: string;
    service: string;
    provider?: string;
  };
  costcenter: {
    costcenter_id: string;
    name: string;
  };
  service: string; // Added for DataGrid column compatibility
  costcenter_name: string; // Added for DataGrid column compatibility
  provider: string; // Added for DataGrid column compatibility
}

// Add global type for window.reloadUtilityBillGrid
declare global {
  interface Window {
    reloadUtilityBillGrid?: () => void;
  }
}

const UtilityBill = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const router = useRouter();

  // Refetch grid data
  const fetchUtilityBills = () => {
    setLoading(true);
    authenticatedApi.get('/api/bills/util')
      .then(res => {
        const data = (res.data as { data?: UtilityBill[] })?.data || [];
        setRows(data.map((item, idx) => ({
          ...item,
          rowNumber: idx + 1,
          service: item.account?.service || '',
          provider: item.account?.provider || '',
          costcenter_name: item.costcenter?.name || '',
          ubill_date: item.ubill_date ? new Date(item.ubill_date).toLocaleDateString() : '',
          ubill_entry: item.ubill_entry ? new Date(item.ubill_entry).toLocaleDateString() : '',
        })));
        setLoading(false);
      })
      .catch(() => {
        setRows([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUtilityBills();
  }, []);

  useEffect(() => {
    window.reloadUtilityBillGrid = () => {
      fetchUtilityBills();
    };
    return () => {
      delete window.reloadUtilityBillGrid;
    };
  }, []);

  const handleRowDoubleClick = (row: UtilityBill & { rowNumber: number }) => {
    if (row.util_id) {
      window.open(`/billings/utility/form?id=${row.util_id}`, '_blank');
    }
  };

  const columns: ColumnDef<UtilityBill & { rowNumber: number }>[] = [
    {
      key: 'rowNumber',
      header: 'No',
      render: (row) => (
        <div className="flex items-center min-w-[60px]">
          <span>{row.rowNumber}</span>
        </div>
      ),
    },
    { key: 'ubill_no', header: 'Bill No', filter: 'input' },
    { key: 'ubill_date', header: 'Date' },
    { key: 'service', header: 'Service', filter: 'singleSelect' },
    { key: 'provider', header: 'Provider', filter: 'singleSelect' },
    { key: 'costcenter_name', header: 'Cost Center', filter: 'singleSelect' },
    { key: 'ubill_stotal', header: 'Sub Total', colClass: 'text-right' },
    { key: 'ubill_tax', header: 'Tax', colClass: 'text-right' },
    { key: 'ubill_rounding', header: 'Rounding', colClass: 'text-right' },
    { key: 'ubill_disc', header: 'Discount', colClass: 'text-right' },
    { key: 'ubill_gtotal', header: 'Grand Total', colClass: 'text-right' },
  ];

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Utility Bills Summary</h2>
          {selectedRowIds.length > 0 && (
            <Button
              variant="secondary"
              className="ml-2 bg-amber-500 hover:bg-amber-600 text-white shadow-lg"
              onClick={() => {
                // TODO: Implement batch PDF export for selected utility bills
                toast.info(`Export functionality for ${selectedRowIds.length} selected bills will be implemented`);
              }}
            >
              <Download size={16} className="mr-1" /> Export PDF
            </Button>
          )}
        </div>
        <Button
          variant={'default'}
          onClick={() => window.open(`/billings/utility/form`, '_blank')}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
        </Button>
      </div>
      <CustomDataGrid
        columns={columns as ColumnDef<unknown>[]}
        data={rows}
        pagination={false}
        inputFilter={false}
        theme="sm"
        dataExport={true}
        onRowDoubleClick={handleRowDoubleClick}
        rowSelection={{
          enabled: true,
          getRowId: (row: any) => row.util_id,
          onSelect: (selectedKeys: (string | number)[], selectedRows: any[]) => {
            setSelectedRowIds(selectedKeys.map(Number));
          },
        }}
      />
    </div>
  );
};

export default UtilityBill;

// Helper to download a Blob as a file
function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* 

ToDo:
- Add utility bill form page at /billings/utility/form
- Implement utility PDF report generation similar to fuel reports
- Add proper error handling and loading states

*/
