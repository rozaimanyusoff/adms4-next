// Adapted from fuel-bill.tsx for Telco Bills
'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical, Download } from 'lucide-react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { exportTelcoBillSummaryPDF } from './pdfreport-telco-costcenter';

interface TelcoBill {
  id: number;
  bfcy_id: number;
  account: {
    id: number;
    account_no: string;
    provider: string;
    old_id: number;
  };
  bill_date: string;
  bill_no: string;
  grand_total: string;
  status: string;
  provider?: string;
  account_no?: string; // Add this line to fix the error
}

declare global {
  interface Window {
    reloadTelcoBillGrid?: () => void;
  }
}

const TelcoBill = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const router = useRouter();

  const fetchTelcoBills = () => {
    setLoading(true);
    authenticatedApi.get('/api/telco/bills')
      .then(res => {
        const data = (res.data as { data?: TelcoBill[] })?.data || [];
        setRows(data.map((item, idx) => ({
          ...item,
          rowNumber: idx + 1,
          provider: item.account?.provider || '',
          account_no: item.account?.account_no || '',
          ubill_date_fmt: item.bill_date ? new Date(item.bill_date).toLocaleDateString() : '',
        })));
        setLoading(false);
      })
      .catch(() => {
        setRows([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTelcoBills();
  }, []);

  useEffect(() => {
    window.reloadTelcoBillGrid = () => {
      fetchTelcoBills();
    };
    return () => {
      delete window.reloadTelcoBillGrid;
    };
  }, []);

  const handleRowDoubleClick = (row: TelcoBill & { rowNumber: number }) => {
    if (row.id) {
      window.open(`/billings/telco/form?id=${row.id}`, '_blank');
    }
  };

  const columns: ColumnDef<TelcoBill & { rowNumber: number }>[] = [
    {
      key: 'rowNumber',
      header: 'No',
      render: (row) => (
        <div className="flex items-center min-w-[60px]">
          <span>{row.rowNumber}</span>
        </div>
      ),
    },
    { key: 'bill_no', header: 'Bill No', filter: 'input' },
    {
      key: 'bill_date',
      header: 'Date',
      render: (row) => row.bill_date ? new Date(row.bill_date).toLocaleDateString() : '',
    },
    { key: 'provider', header: 'Provider', filter: 'singleSelect' },
    { key: 'account_no', header: 'Account No' },
    { key: 'grand_total', header: 'Total', colClass: 'text-right' },
    { key: 'status', header: 'Status' },
  ];

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Telco Bills Summary</h2>
          {selectedRowIds.length > 0 && (
            <Button
              variant="secondary"
              className="ml-2 bg-amber-500 hover:bg-amber-600 text-white shadow-lg"
              onClick={async () => {
                if (selectedRowIds.length > 0) {
                  // Directly call the batch export function
                  const { exportTelcoBillSummaryPDFs } = await import('./pdfreport-telco-costcenter');
                  exportTelcoBillSummaryPDFs(selectedRowIds);
                }
              }}
            >
              <Download size={16} className="mr-1" /> Export PDF
            </Button>
          )}
        </div>
        <Button
          variant={'default'}
          onClick={() => window.open(`/billings/telco/form`, '_blank')}
        >
          <Plus size={18} />
        </Button>
      </div>
      <CustomDataGrid
        columns={columns as ColumnDef<unknown>[]}
        data={rows}
        pagination={false}
        inputFilter={false}
        theme="sm"
        dataExport={false}
        onRowDoubleClick={handleRowDoubleClick}
        rowSelection={{
          enabled: true,
          getRowId: (row: any) => row.id,
          onSelect: (selectedKeys: (string | number)[], selectedRows: any[]) => {
            setSelectedRowIds(selectedKeys.map(Number));
          },
        }}
      />
    </div>
  );
};

export default TelcoBill;
