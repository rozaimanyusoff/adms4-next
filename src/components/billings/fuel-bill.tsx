'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Plus, PlusCircle, Printer, Download, Trash2 } from 'lucide-react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { generateFuelCostCenterReport } from './pdfreport-fuel-costcenter';
import FuelBillSummary from './fuel-bill-summary';
import { AuthContext } from '@/store/AuthContext';
import { Switch } from '@/components/ui/switch';

interface FuelBill {
  stmt_id: number;
  stmt_no: string;
  stmt_date: string;
  petrol: string;
  diesel: string;
  stmt_ron95: string;
  stmt_ron97: string;
  stmt_diesel: string;
  bill_payment: string | null;
  stmt_count: number;
  stmt_litre: string;
  stmt_total_odo: number;
  stmt_stotal: string;
  stmt_tax: string;
  stmt_rounding: string;
  stmt_disc: string;
  stmt_total: string;
  stmt_entry: string;
  // new vendor shape from API
  vendor?: {
    id: string | number;
    name: string;
    logo?: string;
  };
  // convenience fields used by grid
  issuer?: string; // vendor name
  vendor_logo?: string;
}

// Add global type for window.reloadFuelBillGrid
declare global {
  interface Window {
    reloadFuelBillGrid?: () => void;
  }
}

const FuelBill = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null); // To keep the doc for download
  const [pdfStmtNo, setPdfStmtNo] = useState<string | null>(null); // To keep the stmt_no for download filename
  const [loading, setLoading] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string | number>>(new Set());
  const router = useRouter();

  // Delete admins (username matching)
  const deleteAdmin = ['000277', '000712', '000396'];
  const auth = React.useContext(AuthContext);
  const username: string = auth?.authData?.user?.username || (() => {
    try { return JSON.parse(localStorage.getItem('authData') || '{}')?.user?.username || ''; } catch { return ''; }
  })();

  // Refetch grid data
  const fetchFuelBills = () => {
    setLoading(true);
    authenticatedApi.get('/api/bills/fuel')
      .then(res => {
        const data = (res.data as { data?: FuelBill[] })?.data || [];
        setRows(data.map((item, idx) => ({
          ...item,
          rowNumber: idx + 1,
          // new vendor shape: vendor: { id, name, logo }
          issuer: item.vendor?.name || (item as any).fuel_issuer?.issuer || '',
          vendor_logo: item.vendor?.logo || undefined,
          stmt_date: item.stmt_date ? new Date(item.stmt_date).toLocaleDateString() : '',
          stmt_entry: item.stmt_entry ? new Date(item.stmt_entry).toLocaleDateString() : '',
        })));
        setLoading(false);
      })
      .catch(() => {
        setRows([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFuelBills();
  }, []);

  useEffect(() => {
    window.reloadFuelBillGrid = () => {
      fetchFuelBills();
    };
    return () => {
      delete window.reloadFuelBillGrid;
    };
  }, []);

  const handleRowDoubleClick = (row: FuelBill & { rowNumber: number }) => {
    if (row.stmt_id) {
      router.push(`/billings/fuel/bill2/${row.stmt_id}`);
    }
  };

  const columns: ColumnDef<FuelBill & { rowNumber: number }>[] = [
    {
      key: 'rowNumber',
      header: 'No',
      render: (row) => (
        <div className="flex items-center justify-between gap-2 min-w-15">
          <span>{row.rowNumber}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="p-1 hover:bg-stone-300 rounded" aria-label="Print Report" onClick={async () => {
                  try {
                    const pdfBlob = await generateFuelCostCenterReport({ stmt_id: row.stmt_id });
                    console.log('PDF Blob:', pdfBlob);
                    const now = new Date();
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    const datetime = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
                    downloadBlob(pdfBlob, `Fuel-CostCenter-Report-${row.stmt_id}-${datetime}.pdf`);
                  } catch (err) {
                    console.error('Error generating PDF:', err);
                    toast('Failed to generate PDF report.');
                  }
                }}>
                  <Download size={16} />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Download billing memo
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
    { key: 'stmt_no', header: 'Statement No', filter: 'input' },
    { key: 'stmt_date', header: 'Date', },
    {
      key: 'vendor_logo',
      header: 'Logo',
      render: (row) => (
        row.vendor_logo ? (
           
          <img src={row.vendor_logo} alt={row.issuer || 'logo'} className="w-8 h-8 object-contain rounded" />
        ) : null
      ),
    },
    { key: 'issuer', header: 'Issuer', filter: 'singleSelect' },
    { key: 'petrol', header: 'Petrol', colClass: 'text-right' },
    { key: 'diesel', header: 'Diesel', colClass: 'text-right' },
    { key: 'stmt_litre', header: 'Litre', colClass: 'text-right' },
    { key: 'stmt_total_odo', header: 'Total KM', colClass: 'text-right' },
    { key: 'stmt_stotal', header: 'Sub Total', colClass: 'text-right' },
    { key: 'stmt_rounding', header: 'Rounding', colClass: 'text-right' },
    { key: 'stmt_disc', header: 'Rebate', colClass: 'text-right' },
    { key: 'stmt_total', header: 'Total', colClass: 'text-right' },
  ];

  return (
    <>
      <FuelBillSummary />
      <div className="flex items-center justify-between my-4">
        <h2 className="text-lg font-bold">Fuel Consumption Bills Summary</h2>
        <div className="flex items-center gap-2">
          {deleteAdmin.includes(username) && (
          <div className="flex items-center gap-2">
            <div className="flex items-center px-3 py-1.5text-sm">
              <Switch
                id="delete-mode-switch"
                checked={deleteMode}
                onCheckedChange={(checked) => {
                  setDeleteMode(Boolean(checked));
                  if (!checked) setSelectedRowKeys(new Set());
                }}
                className="scale-90 mr-2"
              />
              <label htmlFor="delete-mode-switch" className="pt-1.5 cursor-pointer select-none">Enable Delete</label>
            </div>
            <Button
              variant={'destructive' as any}
              disabled={!deleteMode || selectedRowKeys.size === 0}
              onClick={async () => {
                if (!deleteAdmin.includes(username)) {
                  toast.error('You are not authorized to delete bills');
                  return;
                }
                const ids = Array.from(selectedRowKeys) as number[];
                if (ids.length === 0) return;
                const loadingId = toast.loading(`Deleting ${ids.length} bill(s)...`);
                try {
                  await Promise.all(ids.map(id => authenticatedApi.delete(`/api/bills/fuel/${id}`)));
                  toast.success('Selected bills deleted');
                  // Clear selection and exit delete mode
                  setSelectedRowKeys(new Set());
                  setDeleteMode(false);
                  fetchFuelBills();
                } catch (err) {
                  console.error('Failed to delete selected bills', err);
                  toast.error('Failed to delete selected bills');
                } finally {
                  toast.dismiss(loadingId);
                }
              }}
            >
              <Trash2 size={16} className="mr-1" /> Delete
            </Button>
          </div>
          )}
          <Button
            variant={'default'}
            disabled
            title="Old form creation disabled – use New v2"
            className="cursor-not-allowed opacity-60"
          >
            <Plus size={18} />
          </Button>
          <Button
            variant={'outline'}
            onClick={() => router.push('/billings/fuel/bill2/new')}
            className="gap-1"
          >
            <PlusCircle size={18} />
            <span className="hidden sm:inline">New v2</span>
          </Button>
          
        </div>
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
          enabled: deleteMode,
          getRowId: (row: any) => row.stmt_id,
          onSelect: (keys) => setSelectedRowKeys(new Set(keys)),
        }}
        selectedRowKeys={selectedRowKeys}
        setSelectedRowKeys={setSelectedRowKeys}
      />
      {pdfPreviewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-4 max-w-3xl w-full relative">
            <button
              className="absolute top-2 right-2 text-lg"
              onClick={() => setPdfPreviewUrl(null)}
            >✕</button>
            <iframe src={pdfPreviewUrl} width="100%" height="600px" />
            <div className="flex justify-end mt-2">
            <Button onClick={() => { 
              if (pdfDoc) {
                const now = new Date();
                const pad = (n: number) => n.toString().padStart(2, '0');
                const datetime = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
                downloadBlob(pdfDoc, `Fuel-CostCenter-Report-${pdfStmtNo || 'unknown'}-${datetime}.pdf`);
              }
            }}>
              Download PDF
            </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FuelBill;

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
- Add 3 dot menu on No column to download pdf report of total amount by cost center

*/
