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

interface FuelBill {
  stmt_id: number;
  stmt_no: string;
  stmt_date: string;
  stmt_ron95?: string;
  stmt_ron97?: string;
  stmt_diesel?: string;
  bill_payment?: string;
  stmt_count?: number;
  stmt_litre?: string;
  stmt_total_odo?: number;
  stmt_stotal?: string;
  stmt_tax?: string;
  stmt_rounding?: string;
  stmt_disc?: string;
  stmt_total?: string;
  stmt_entry?: string;
  fuel_issuer?: { issuer?: string };
  issuer?: string;
}

const FuelMtn = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
const [pdfDoc, setPdfDoc] = useState<any>(null); // To keep the doc for download
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
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
      })
      .catch(() => setRows([]));
    setLoading(false);
  }, []);

  const handleRowDoubleClick = (row: FuelBill & { rowNumber: number }) => {
    if (row.stmt_id) {
      window.open(`/billings/fuel/form?id=${row.stmt_id}`, '_blank');
    }
  };

  const handleDownloadPdf = async (row: FuelBill & { rowNumber: number }) => {
    try {
      const res = await authenticatedApi.get(`/api/bills/fuel/${row.stmt_id}`);
      console.log('API response:', res);
      const data = (res.data as { data: any }).data;
      if (!data || !Array.isArray(data.summary)) {
        console.error('No summary data found:', data);
        alert('No summary data found for this statement.');
        return;
      }
      const rows = data.summary.map((item: any, idx: number) => ({
        no: idx + 1,
        costCenter: item.name,
        totalAmount: parseFloat(item.total_amount),
      }));
      console.log('PDF input:', {
        date: data.stmt_date ? new Date(data.stmt_date).toLocaleDateString() : '',
        refNo: data.stmt_no,
        rows,
        subTotal: parseFloat(data.stmt_stotal || '0'),
        rounding: parseFloat(data.stmt_rounding || '0'),
        discount: parseFloat(data.stmt_disc || '0'),
        grandTotal: parseFloat(data.stmt_total || '0'),
      });
      let doc;
      try {
        doc = await generateFuelCostCenterReport({
          date: data.stmt_date ? new Date(data.stmt_date).toLocaleDateString() : '',
          refNo: data.stmt_no,
          rows,
          subTotal: parseFloat(data.stmt_stotal || '0'),
          rounding: parseFloat(data.stmt_rounding || '0'),
          discount: parseFloat(data.stmt_disc || '0'),
          grandTotal: parseFloat(data.stmt_total || '0'),
        });
      } catch (pdfErr) {
        console.error('PDF generation error:', pdfErr);
        alert('PDF generation failed.');
        return;
      }
      // Add datetime to filename
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const datetime = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      //doc.save(`Fuel-CostCenter-Report-${data.stmt_no}-${datetime}.pdf`);
      const pdfBlob = doc.output('blob');
const pdfUrl = URL.createObjectURL(pdfBlob);
setPdfPreviewUrl(pdfUrl);
setPdfDoc(doc); // Save the doc for later download
    } catch (err) {
      console.error('Failed to generate report:', err);
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
    { key: 'stmt_ron95', header: 'RON95', },
    { key: 'stmt_ron97', header: 'RON97', },
    { key: 'stmt_diesel', header: 'Diesel', },
    { key: 'stmt_litre', header: 'Litre', colClass: 'text-right' },
    { key: 'stmt_total_odo', header: 'Odometer', },
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
            pdfDoc.save(`Fuel-CostCenter-Report-${data.stmt_no}-${datetime}.pdf`);
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

export default FuelMtn;


/* 

ToDo:
- Add 3 dot menu on No column to download pdf report of total amount by cost center

*/
