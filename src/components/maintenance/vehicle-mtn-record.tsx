'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { CustomDataGrid } from '@/components/ui/DataGrid';
import type { ColumnDef } from '@/components/ui/DataGrid';
import { AuthContext } from '@/store/AuthContext';
import { authenticatedApi } from '@/config/api';
import { Plus, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import VehicleMtnForm from './vehicle-mtn-form';
import { Badge } from '@/components/ui/badge';
import { downloadServiceFormPdf } from './pdf/service-form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import VehicleMtnSummary from './vehicle-mtn-summary';

// Exclusion list: users in this list will retrieve all data (no ?ramco= filter)
const exclusionUser: string[] = ['username1', 'username2'];

type MtnRecordRow = {
  id: number | string;
  request_date: string;
  vehicle: string;
  service_types: string;
  requester: string;
  costcenter: string;
  workshop: string;
  status: string;
  date?: string;
  __raw?: any;
  actions?: string; // placeholder for actions column key
};

function formatDMY(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  let cls = 'bg-gray-100 text-gray-800';
  if (s.includes('approved')) cls = 'bg-green-100 text-green-800';
  else if (s.includes('invoiced') || s.includes('invoice')) cls = 'bg-indigo-100 text-indigo-800';
  else if (s.includes('rejected') || s.includes('cancel')) cls = 'bg-red-100 text-red-800';
  else if (s.includes('pending')) cls = 'bg-amber-100 text-amber-800';
  return <Badge variant="secondary" className={cls}>{String(status || 'PENDING').toUpperCase()}</Badge>;
}

// columns are created inside component to use handlers

const VehicleMtnRecord: React.FC = () => {
  const auth = React.useContext(AuthContext);
  const username = auth?.authData?.user?.username || '';

  const [rows, setRows] = React.useState<MtnRecordRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [editId, setEditId] = React.useState<number | string | undefined>(undefined);

  const loadData = async () => {
    if (!username) return;
    setLoading(true);
    try {
      const url = exclusionUser.includes(String(username))
        ? '/api/mtn/request'
        : `/api/mtn/request?ramco=${encodeURIComponent(username)}`;
      const res = await authenticatedApi.get(url);
      const payload = res?.data as any;
      const list: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.result)
              ? payload.result
              : [];

      const mapped: MtnRecordRow[] = list.map((d: any) => {
        const workshopName = (() => {
          const w: any = d?.workshop;
          if (!w) return (d as any).workshop_name || 'N/A';
          if (typeof w === 'string') return w || 'N/A';
          return w.name || (d as any).workshop_name || 'N/A';
        })();

        const vehicleReg = d?.asset?.register_number || d?.vehicle?.register_number || 'N/A';
        const services = Array.isArray(d?.svc_type) ? d.svc_type.map((s: any) => s?.name).filter(Boolean).join(', ') : 'N/A';
        const invoiced = !!d?.invoice;
        const statusLc = invoiced ? 'invoiced' : String(d?.status || '').toLowerCase();
        // Date logic per requirements
        let dateStr = '-';
        if (statusLc.includes('invoiced')) {
          dateStr = d?.invoice?.inv_date ? formatDMY(d.invoice.inv_date) : '-';
        } else if (statusLc.includes('approved')) {
          dateStr = d?.approval_date ? formatDMY(d.approval_date) : '-';
        } else if (statusLc.includes('pending verification')) {
          dateStr = d?.verification_date ? formatDMY(d.verification_date) : '-';
        } else if (statusLc.includes('pending recommendation')) {
          dateStr = d?.recommendation_date ? formatDMY(d.recommendation_date) : '-';
        } else if (statusLc.includes('pending approval')) {
          dateStr = d?.approval_date ? formatDMY(d.approval_date) : '-';
        } else if (statusLc.includes('rejected') || statusLc.includes('cancel')) {
          dateStr = d?.approval_date
            ? formatDMY(d.approval_date)
            : (d?.recommendation_date ? formatDMY(d.recommendation_date) : (d?.verification_date ? formatDMY(d.verification_date) : '-'));
        }

        return {
          id: d.req_id,
          request_date: formatDMY(d.req_date),
          vehicle: vehicleReg,
          service_types: services,
          requester: d?.requester?.name || 'N/A',
          costcenter: d?.costcenter?.name || 'N/A',
          workshop: workshopName,
          status: invoiced ? 'Invoiced' : (d?.status || 'pending'),
          date: dateStr,
          __raw: d,
        } as MtnRecordRow;
      });
      setRows(mapped);
    } catch (e) {
      toast.error('Failed to load maintenance requests');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleDownload = async (row: MtnRecordRow) => {
    const status = String(row.status || '').toLowerCase();
    if (!(['approved','invoiced'].includes(status))) {
      toast.info('PDF available after approval or invoicing');
      return;
    }
    try {
      await downloadServiceFormPdf(row.id);
    } catch (e) {
      toast.error('Failed to generate PDF');
    }
  };

  const columns: ColumnDef<MtnRecordRow>[] = React.useMemo(() => [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'request_date', header: 'Request Date', sortable: true },
    { key: 'vehicle', header: 'Vehicle', sortable: true, filter: 'input' },
    { key: 'service_types', header: 'Service Type(s)', sortable: true, filter: 'singleSelect' },
    { key: 'requester', header: 'Requester', sortable: true, filter: 'input' },
    { key: 'costcenter', header: 'Cost Center', sortable: true, filter: 'singleSelect' },
    { key: 'workshop', header: 'Workshop', sortable: true, filter: 'singleSelect' },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filter: 'singleSelect',
      colClass: 'text-center',
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: 'date', header: 'Date', sortable: true },
    {
      key: 'actions',
      header: 'Service Form',
      sortable: false,
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDownload(row)}
          disabled={!(['approved','invoiced'].includes(String(row.status || '').toLowerCase()))}
          title={!(['approved','invoiced'].includes(String(row.status || '').toLowerCase())) ? 'Available after approval' : 'Download PDF'}
        >
          <Download size={16} className="mr-1" /> PDF
        </Button>
      ),
    },
  ], [/* no deps */]);

  const handleRowDoubleClick = (row: any) => {
    if (!row) return;
    const id = row.id;
    if (id !== undefined) {
      setEditId(id);
      setShowForm(true);
    }
  };

  if (showForm) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Vehicle Maintenance Form</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setShowForm(false); setEditId(undefined); }}
          >
            Back to Records
          </Button>
        </div>
        <VehicleMtnForm id={editId} onClose={() => { setShowForm(false); setEditId(undefined); }} onSubmitted={loadData} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Accordion type="single" collapsible defaultValue={undefined}>
        <AccordionItem value="summary">
          <AccordionTrigger>
            <span className="text-base font-medium">Summary by Year/Month</span>
          </AccordionTrigger>
          <AccordionContent>
            <VehicleMtnSummary onOpen={(id:number)=>{ setEditId(id); setShowForm(true); }} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-lg font-semibold">My Vehicle Maintenance Requests</div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setEditId(undefined); setShowForm(true); }}>
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={24} />}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-2 text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="min-w-full">
          <CustomDataGrid<MtnRecordRow>
            data={rows}
            columns={columns}
            inputFilter={false}
            pagination={false}
            dataExport={false}
            theme="sm"
            onRowDoubleClick={handleRowDoubleClick}
          />
        </div>
      )}
    </div>
  );
};

export default VehicleMtnRecord;
