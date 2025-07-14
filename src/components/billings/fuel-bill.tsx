
'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical } from 'lucide-react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { generateFuelCostCenterReport } from './report-fuel-costcenter';
import { generateFuelCostCenterReportPuppeteer } from './report-fuel-costcenter-puppeteer';
import { toast } from 'sonner';

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
  fuel_issuer: {
    fuel_id: string;
    issuer: string;
  };
  issuer: string; // Added to fix DataGrid column type error
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
  const router = useRouter();

  // Refetch grid data
  const fetchFuelBills = () => {
    setLoading(true);
    authenticatedApi.get('/api/bills/fuel')
      .then(res => {
        const data = (res.data as { data?: FuelBill[] })?.data || [];
        setRows(data.map((item, idx) => ({
          ...item,
          rowNumber: idx + 1,
          issuer: item.fuel_issuer?.issuer || '',
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
      window.open(`/billings/fuel/form?id=${row.stmt_id}`, '_blank');
    }
  };

  const handleDownloadPdf = async (row: FuelBill & { rowNumber: number }) => {
    try {
      const res = await authenticatedApi.get(`/api/bills/fuel/${row.stmt_id}`);
      const data = (res.data as { data: any }).data;
      let summaryRows: any[] = [];
      if (data && Array.isArray(data.summary)) {
        summaryRows = data.summary.map((item: any, idx: number) => ({
          no: idx + 1,
          costCenter: item.name,
          totalAmount: parseFloat(item.total_amount),
        }));
      } else if (data && Array.isArray(data.details)) {
        // Generate summary from details
        const costCenterTotals: Record<string, { name: string; totalAmount: number }> = {};
        data.details.forEach((item: any) => {
          const name = item.asset?.costcenter?.name || 'Unknown';
          const amount = parseFloat(item.amount || '0');
          if (!costCenterTotals[name]) {
            costCenterTotals[name] = { name, totalAmount: 0 };
          }
          costCenterTotals[name].totalAmount += amount;
        });
        summaryRows = Object.values(costCenterTotals).map((cc, idx) => ({
          no: idx + 1,
          costCenter: cc.name,
          totalAmount: cc.totalAmount,
        }));
      }
      if (!summaryRows.length) {
        toast('No summary data found for this statement.');
        return;
      }
      // Prepare props for Puppeteer PDF
      const pdfProps = {
        date: data.stmt_date ? new Date(data.stmt_date).toLocaleDateString() : '',
        refNo: data.stmt_no,
        rows: summaryRows,
        subTotal: parseFloat(data.stmt_stotal || '0'),
        rounding: parseFloat(data.stmt_rounding || '0'),
        discount: parseFloat(data.stmt_disc || '0'),
        grandTotal: parseFloat(data.stmt_total || '0'),
      };
      // Call Puppeteer PDF generator (must be server-side)
      const apiRes = await fetch('/api/report-fuel-costcenter-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfProps),
      });
      if (!apiRes.ok) {
        alert('PDF generation failed.');
        return;
      }
      const pdfBlob = await apiRes.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setPdfPreviewUrl(pdfUrl);
      setPdfDoc(pdfBlob); // Save blob for download
      setPdfStmtNo(data.stmt_no || null);
    } catch (err) {
      alert('Failed to generate report.');
    }
  };

  const columns: ColumnDef<FuelBill & { rowNumber: number }>[] = [
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
                    <DropdownMenuItem onClick={() => handleDownloadPdf(row)} className='bg-stone-200 hover:bg-stone-300 shadow-lg'>
                      Download Cost Center Report
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
    { key: 'stmt_no', header: 'Statement No', filter: 'input' },
    { key: 'stmt_date', header: 'Date', },
    { key: 'issuer', header: 'Issuer', filter: 'singleSelect' },
    { key: 'petrol', header: 'Petrol', colClass: 'text-right' },
    { key: 'diesel', header: 'Diesel', colClass: 'text-right' },
    { key: 'stmt_litre', header: 'Litre', colClass: 'text-right' },
    { key: 'stmt_total_odo', header: 'Total KM', colClass: 'text-right' },
    { key: 'stmt_disc', header: 'Adjustment', colClass: 'text-right' },
    { key: 'stmt_total', header: 'Total', colClass: 'text-right' },
  ];

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Fuel Consumption Bills Summary</h2>
        <Button
          variant={'default'}
          onClick={() => window.open(`/billings/fuel/form`, '_blank')}
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
    </div>
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
