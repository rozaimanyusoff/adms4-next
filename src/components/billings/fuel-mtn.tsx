'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { useRouter } from 'next/navigation';

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

const columns: ColumnDef<FuelBill & { rowNumber: number }>[] = [
  { key: 'rowNumber', header: 'No', render: (row) => row.rowNumber },
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

const FuelMtn = () => {
  const [rows, setRows] = useState<any[]>([]);
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
    </div>
  );
};

export default FuelMtn;


/* 

ToDo:
- Add 3 dot menu on No column to download pdf report of total amount by cost center

*/
