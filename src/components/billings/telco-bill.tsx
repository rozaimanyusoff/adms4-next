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
import { exportTelcoBillSummaryPDF } from './report-telco-bill';

interface TelcoBill {
  util_id: number;
  bfcy_id: number;
  account: {
    id: number;
    account_no: string;
    provider: string;
    old_id: number;
  };
  ubill_date: string;
  ubill_no: string;
  ubill_gtotal: string;
  ubill_paystat: string;
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
          ubill_date_fmt: item.ubill_date ? new Date(item.ubill_date).toLocaleDateString() : '',
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
    if (row.util_id) {
      window.open(`/billings/telco/form?id=${row.util_id}`, '_blank');
    }
  };

  const columns: ColumnDef<TelcoBill & { rowNumber: number }>[] = [
    {
      key: 'rowNumber',
      header: 'No',
      render: (row) => (
        <div className="flex items-center justify-between gap-2 min-w-[60px]">
          <span>{row.rowNumber}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span className="p-1 hover:bg-stone-300 rounded" aria-label="More options">
                      <MoreVertical size={16} />
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className='bg-stone-200'>
                    <DropdownMenuItem
                      onClick={async () => {
                        await exportTelcoBillSummaryPDF(row.util_id);
                      }}
                      className='bg-stone-200 hover:bg-stone-300 shadow-lg flex items-center gap-2'
                    >
                      <Download size={14} /> Generate Memo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent>
                Click to see more options
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
    { key: 'ubill_no', header: 'Bill No', filter: 'input' },
    {
      key: 'ubill_date',
      header: 'Date',
      render: (row) => row.ubill_date ? new Date(row.ubill_date).toLocaleDateString() : '',
    },
    { key: 'provider', header: 'Provider', filter: 'singleSelect' },
    { key: 'account_no', header: 'Account No' },
    { key: 'ubill_gtotal', header: 'Total', colClass: 'text-right' },
    { key: 'ubill_paystat', header: 'Status' },
  ];

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Telco Bills Summary</h2>
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
        dataExport={true}
        onRowDoubleClick={handleRowDoubleClick}
      />
    </div>
  );
};

export default TelcoBill;
