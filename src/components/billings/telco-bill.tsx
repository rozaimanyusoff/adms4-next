// Adapted from fuel-bill.tsx for Telco Bills
'use client';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Plus, Download, Loader2, Trash2 } from 'lucide-react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import TelcoBillSummary from './telco-bill-summary';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { exportTelcoBillSummaryPDF } from './pdfreport-telco-costcenter';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AuthContext } from '@/store/AuthContext';

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
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const auth = useContext(AuthContext);
  const currentUserRamco = auth?.authData?.user?.username;
  const deleteAdmin = useMemo(() => ['000475', '000277'], []);
  const canDelete = useMemo(() => !!currentUserRamco && deleteAdmin.includes(String(currentUserRamco)), [currentUserRamco, deleteAdmin]);

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
      router.push(`/billings/telco/bill/${row.id}`);
    }
  };

  const columns: ColumnDef<TelcoBill & { rowNumber: number }>[] = [
    {
      key: 'rowNumber',
      header: 'No',
      render: (row) => (
        <div className="flex items-center min-w-15">
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
    { key: 'account_no', header: 'Account No', filter: 'input' },
    { key: 'grand_total', header: 'Total', colClass: 'text-right' },
    { key: 'status', header: 'Status' },
  ];

  return (
    <>
      <TelcoBillSummary />
      <div className="flex items-center justify-between my-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Telco Bills Summary</h2>
          {selectedRowIds.length > 0 && (
            <Button
              variant="secondary"
              className="ml-2 bg-amber-500 hover:bg-amber-600 text-white shadow-lg"
              onClick={async () => {
                if (selectedRowIds.length > 0) {
                  const { exportTelcoBillSummaryPDFs } = await import('./pdfreport-telco-costcenter');
                  exportTelcoBillSummaryPDFs(selectedRowIds);
                }
              }}
            >
              <Download size={16} className="mr-1" /> Export PDF
            </Button>
          )}
          {canDelete && selectedRowIds.length > 0 && (
            <Button
              variant="destructive"
              className="ml-2"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 size={16} className="mr-1" /> Delete
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={'default'}
            onClick={() => router.push('/billings/telco/bill/new')}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus size={18} />
            )}
          </Button>
        </div>
      </div>
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        <CustomDataGrid
          columns={columns as ColumnDef<unknown>[]}
          data={rows}
          pagination={false}
          inputFilter={false}
          theme="sm"
          dataExport={false}
          onRowDoubleClick={handleRowDoubleClick}
          rowClass={(row: any) => (highlightId && row?.id === highlightId) ? 'bg-yellow-100 animate-pulse' : ''}
          rowSelection={{
            enabled: true,
            getRowId: (row: any) => row.id,
            onSelect: (selectedKeys: (string | number)[], selectedRows: any[]) => {
              setSelectedRowIds(selectedKeys.map(Number));
            },
          }}
        />
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected bills?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. {selectedRowIds.length} record(s) will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  setDeleting(true);
                  const ids = [...selectedRowIds];
                  const results = await Promise.allSettled(ids.map(id => authenticatedApi.delete(`/api/telco/bills/${id}`)));
                  const failed = results.filter(r => r.status === 'rejected').length;
                  const succeeded = ids.length - failed;
                  if (succeeded > 0) toast.success(`${succeeded} bill(s) deleted.`);
                  if (failed > 0) toast.error(`${failed} bill(s) failed to delete.`);
                  setShowDeleteDialog(false);
                  setSelectedRowIds([]);
                  fetchTelcoBills();
                } finally {
                  setDeleting(false);
                }
              }}
              disabled={deleting}
            >
              {deleting ? (<span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</span>) : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TelcoBill;
