'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Download, Calendar, RefreshCw } from 'lucide-react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AuthContext } from '@/store/AuthContext';
import { can } from '@/utils/permissions';
import MaintenanceRequestExcelButton from './excel-maintenancerequest-report';

interface ServiceType {
  id: number;
  name: string;
}

interface Vehicle {
  id: number;
  register_number: string;
}

// Some backends return `asset` instead of `vehicle`
interface AssetRef {
  id: number;
  register_number?: string;
}

interface Requester {
  ramco_id: string;
  name: string;
  email: string;
}

interface ApprovalBy {
  ramco_id: string;
  name: string;
  email: string;
}

interface CostCenter {
  id: number;
  name: string;
}

interface Workshop {
  id: number;
  name: string;
}

interface MaintenanceRequest {
  req_id: number;
  req_date: string;
  svc_type: ServiceType[];
  req_comment: string;
  upload_date: string | null;
  verification_date: string | null;
  recommendation_date: string | null;
  approval_date: string | null;
  form_upload_date: string | null;
  emailStat: number;
  inv_status: number;
  status: 'pending' | 'verified' | 'recommended' | 'approved' | 'cancelled';
  vehicle?: Vehicle; // legacy shape
  asset?: AssetRef;  // current backend shape
  requester: Requester;
  recommendation_by: ApprovalBy | null;
  approval_by: ApprovalBy | null;
  costcenter: CostCenter;
  workshop: Workshop;
  // Additional fields for display
  rowNumber?: number;
  service_types?: string;
  requester_name?: string;
  register_number?: string;
  costcenter_name?: string;
  workshop_name?: string;
}

// Cards/filters in UI
type SummaryCardKey = 'total' | 'pendingVerification' | 'pendingRecommendation' | 'pendingApproval' | 'rejected' | 'cancelled';
// API query mapping for each card after backend revision
// - Pending cards use `pendingstatus`
// - Non-pending cards use `status`
const cardQuery: Record<Exclude<SummaryCardKey, 'total'>, { type: 'pendingstatus' | 'status'; value: 'verified' | 'recommended' | 'approved' | 'cancelled' | 'rejected'; }> = {
  pendingVerification: { type: 'pendingstatus', value: 'verified' },
  pendingRecommendation: { type: 'pendingstatus', value: 'recommended' },
  pendingApproval: { type: 'pendingstatus', value: 'approved' },
  rejected: { type: 'status', value: 'rejected' },
  cancelled: { type: 'status', value: 'cancelled' },
};

const VehicleMaintenanceAdmin = () => {
  const auth = React.useContext(AuthContext);
  const authData = auth?.authData;
  const canView = can('view', authData);
  const canUpdate = can('update', authData);
  const canCreate = can('create', authData);
  const [rows, setRows] = useState<MaintenanceRequest[]>([]);
  const [rowsByCard, setRowsByCard] = useState<Record<SummaryCardKey, MaintenanceRequest[]>>({
    total: [],
    pendingVerification: [],
    pendingRecommendation: [],
    pendingApproval: [],
    rejected: [],
    cancelled: [],
  });
  // Summary counts by card
  const [counts, setCounts] = useState<Record<SummaryCardKey, number>>({
    total: 0,
    pendingVerification: 0,
    pendingRecommendation: 0,
    pendingApproval: 0,
    rejected: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  // Default to Pending Verification card
  const [activeCard, setActiveCard] = useState<SummaryCardKey>('pendingVerification');
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [yearTotals, setYearTotals] = useState<Record<number, number>>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const processRows = (data: MaintenanceRequest[], key: SummaryCardKey): MaintenanceRequest[] => {
    const filtered = (
      key === 'pendingVerification' || key === 'pendingRecommendation' || key === 'pendingApproval'
    )
      ? data.filter(item => (item.status || '').toLowerCase() !== 'cancelled')
      : data;

    return filtered.map((item, idx) => {
      const workshopName = (() => {
        const w: any = (item as any).workshop;
        if (!w) return (item as any).workshop_name || 'N/A';
        if (typeof w === 'string') return w || 'N/A';
        return w.name || (item as any).workshop_name || 'N/A';
      })();
      return ({
        ...item,
        rowNumber: idx + 1,
        service_types: item.svc_type?.map(type => type.name).join(', ') || 'N/A',
        requester_name: item.requester?.name || 'N/A',
        register_number: item.asset?.register_number || item.vehicle?.register_number || 'N/A',
        costcenter_name: item.costcenter?.name || 'N/A',
        workshop_name: workshopName,
        req_date: item.req_date ? new Date(item.req_date).toLocaleDateString() : 'N/A',
        approval_date: item.approval_date ? new Date(item.approval_date).toLocaleDateString() : 'N/A',
        verification_date: item.verification_date ? new Date(item.verification_date).toLocaleDateString() : 'N/A',
        recommendation_date: item.recommendation_date ? new Date(item.recommendation_date).toLocaleDateString() : 'N/A',
      });
    });
  };

  // Fetch all card datasets once per year, then switch cards from memory only.
  const fetchYearData = async (year?: number, cardToShow?: SummaryCardKey) => {
    setLoading(true);
    try {
      const base = year ? { year } : {};
      const [totalRes, verRes, recRes, apprRes, rejRes, cancelRes] = await Promise.all([
        authenticatedApi.get('/api/mtn/request', { params: { ...base, status: 'approved' } }),
        authenticatedApi.get('/api/mtn/request', { params: { ...base, [cardQuery.pendingVerification.type]: cardQuery.pendingVerification.value } }),
        authenticatedApi.get('/api/mtn/request', { params: { ...base, [cardQuery.pendingRecommendation.type]: cardQuery.pendingRecommendation.value } }),
        authenticatedApi.get('/api/mtn/request', { params: { ...base, [cardQuery.pendingApproval.type]: cardQuery.pendingApproval.value } }),
        authenticatedApi.get('/api/mtn/request', { params: { ...base, [cardQuery.rejected.type]: cardQuery.rejected.value } }),
        authenticatedApi.get('/api/mtn/request', { params: { ...base, [cardQuery.cancelled.type]: cardQuery.cancelled.value } }),
      ]);

      const raw: Record<SummaryCardKey, MaintenanceRequest[]> = {
        total: ((totalRes.data as { data?: MaintenanceRequest[] })?.data || []),
        pendingVerification: ((verRes.data as { data?: MaintenanceRequest[] })?.data || []),
        pendingRecommendation: ((recRes.data as { data?: MaintenanceRequest[] })?.data || []),
        pendingApproval: ((apprRes.data as { data?: MaintenanceRequest[] })?.data || []),
        rejected: ((rejRes.data as { data?: MaintenanceRequest[] })?.data || []),
        cancelled: ((cancelRes.data as { data?: MaintenanceRequest[] })?.data || []),
      };

      const processed: Record<SummaryCardKey, MaintenanceRequest[]> = {
        total: processRows(raw.total, 'total'),
        pendingVerification: processRows(raw.pendingVerification, 'pendingVerification'),
        pendingRecommendation: processRows(raw.pendingRecommendation, 'pendingRecommendation'),
        pendingApproval: processRows(raw.pendingApproval, 'pendingApproval'),
        rejected: processRows(raw.rejected, 'rejected'),
        cancelled: processRows(raw.cancelled, 'cancelled'),
      };

      setRowsByCard(processed);
      setCounts({
        total: processed.total.length,
        pendingVerification: processed.pendingVerification.length,
        pendingRecommendation: processed.pendingRecommendation.length,
        pendingApproval: processed.pendingApproval.length,
        rejected: processed.rejected.length,
        cancelled: processed.cancelled.length,
      });

      const active = cardToShow ?? activeCard;
      setRows(processed[active] || []);
      setLastUpdatedAt(new Date());
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      toast.error('Failed to fetch maintenance requests');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (key: SummaryCardKey) => {
    const next = activeCard === key ? 'total' : key;
    setActiveCard(next);
  };

  const handleYearFilterChange = (year: number) => {
    setYearFilter(year);
  };

  const handleRowDoubleClick = (request: MaintenanceRequest) => {
    // Navigate within the same tab to the detail view
    if (!canUpdate) {
      toast.error('You do not have permission to update maintenance requests.');
      return;
    }
    const url = `/mtn/vehicle/${request.req_id}`;
    router.push(url);
  };

  const getDisplayStatus = (row: MaintenanceRequest): { label: string; color: string } => {
    // Map raw status to display categories the UI requires
    const s = (row.status || '').toLowerCase().trim();
    const normalized = s.replace(/\s+/g, ' ');
    const hasApprovalDate = !!row.approval_date;
    const hasFormUpload = !!row.form_upload_date;

    if (normalized.includes('cancel')) return { label: 'CANCELLED', color: 'bg-red-100 text-red-800' };
    if (normalized.includes('reject')) return { label: 'REJECTED', color: 'bg-rose-100 text-rose-800' };
    // Show "Form Uploaded" state when upload is present, regardless of status string
    if (hasFormUpload || normalized.includes('form upload')) {
      return { label: 'FORM UPLOADED', color: 'bg-blue-100 text-blue-600 text-[10px]' };
    }
    // If an approval date exists or status is approved, treat as approved
    if (normalized.includes('approved') || (hasApprovalDate && !normalized.includes('pending'))) {
      return { label: 'APPROVED', color: 'bg-green-100 text-green-800' };
    }
    if (normalized === 'pending verification' || normalized === 'pending') {
      return { label: 'PENDING VERIFICATION', color: 'bg-yellow-100 text-yellow-800 truncate' };
    }
    if (normalized === 'pending recommendation' || normalized === 'verified') {
      return { label: 'PENDING RECOMMENDATION', color: 'bg-blue-100 text-blue-800 truncate' };
    }
    if (normalized === 'pending approval' || normalized === 'recommended') {
      return { label: 'PENDING APPROVAL', color: 'bg-purple-100 text-purple-800 truncate' };
    }
    return { label: normalized.toUpperCase(), color: 'bg-gray-100 text-gray-800 text-center' };
  };

  const getStatusCount = (key: SummaryCardKey) => counts[key] || 0;

  useEffect(() => {
    if (!canView) return;
    // On mount, discover available years from backend.
    // Initial dataset loading is handled by the year-based effect.
    const init = async () => {
      try {
        const res = await authenticatedApi.get('/api/mtn/request');
        const data = (res.data as { data?: MaintenanceRequest[] })?.data || [];
        // Discover years present
        const totalsByYear = data.reduce<Record<number, number>>((acc, item) => {
          const year = item.req_date ? new Date(item.req_date).getFullYear() : new Date().getFullYear();
          acc[year] = (acc[year] || 0) + 1;
          return acc;
        }, {});
        setYearTotals(totalsByYear);

        const years = [...new Set(data.map(item => {
          if (item.req_date) return new Date(item.req_date).getFullYear();
          return new Date().getFullYear();
        }))].sort((a, b) => b - a);
        if (years.length) {
          setAvailableYears(years);
          if (!years.includes(yearFilter)) {
            setYearFilter(years[0]);
          }
        }
      } catch (e) {
        // ignore
      }
    };
    init();
     
  }, [canView]);

  // Refetch only when year changes; card switching uses in-memory rows.
  useEffect(() => {
    if (!canView) return;
    fetchYearData(yearFilter, activeCard);
     
  }, [yearFilter, canView]);

  // Update visible rows immediately from cached card data.
  useEffect(() => {
    setRows(rowsByCard[activeCard] || []);
  }, [activeCard, rowsByCard]);

  // If returning from detail with ?refresh=1, reload data once and clean the URL
  useEffect(() => {
    if (!canView) return;
    const shouldRefresh = searchParams?.get('refresh') === '1';
    if (shouldRefresh) {
      fetchYearData(yearFilter, activeCard);
      // Remove the refresh flag from URL to avoid repeated reloads
      try {
        const params = new URLSearchParams(searchParams?.toString());
        params.delete('refresh');
        const qs = params.toString();
        const base = pathname ?? '/mtn/vehicle';
        router.replace(qs ? `${base}?${qs}` : base);
      } catch (_) { /* no-op */ }
    }
     
  }, [searchParams, canView]);

  const columns: ColumnDef<MaintenanceRequest>[] = [
    {
      key: 'rowNumber',
      header: 'No',
      render: (row) => (
        <div className="flex items-center min-w-15">
          <span>{row.rowNumber}</span>
        </div>
      ),
    },
    {
      key: 'req_id',
      header: 'Request ID',
      filter: 'input',
      render: (row) => (
        <div className="font-mono text-sm font-semibold text-blue-600">
          #{row.req_id}
        </div>
      ),
    },
    { 
      key: 'req_date', 
      header: 'Request Date',
      render: (row) => (
        <div className="text-sm">
          {row.req_date || 'N/A'}
        </div>
      ),
    },
    { 
      key: 'register_number', 
      header: 'Register number', 
      filter: 'input',
    },
    { 
      key: 'service_types', 
      header: 'Service Type', 
      filter: 'singleSelect',
      render: (row) => (
        <div className="text-sm max-w-xs truncate" title={row.service_types || 'N/A'}>
          {row.service_types || 'N/A'}
        </div>
      ),
    },
    { 
      key: 'requester_name', 
      header: 'Requester', 
      filter: 'input',
      render: (row) => (
        <div className="text-sm">
          <div className="font-medium">{row.requester_name || 'N/A'}</div>
          {row.requester?.email && (
            <div className="text-xs text-gray-500 truncate">
              {row.requester.email}
            </div>
          )}
        </div>
      ),
    },
    { 
      key: 'costcenter_name', 
      header: 'Cost Center', 
      filter: 'singleSelect',
      render: (row) => (
        <div className="text-sm">
          {row.costcenter_name || 'N/A'}
        </div>
      ),
    },
    { 
      key: 'workshop_name', 
      header: 'Workshop', 
      filter: 'singleSelect',
      render: (row) => (
        <div className="text-sm max-w-xs truncate" title={row.workshop_name || 'N/A'}>
          {row.workshop_name || 'N/A'}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      filter: 'singleSelect',
      colClass: 'text-center',
      render: (row) => {
        const ds = getDisplayStatus(row);
        return (
          <Badge variant="secondary" className={ds.color}>
            {ds.label}
          </Badge>
        );
      },
    },
    { 
      key: 'approval_date', 
      header: 'Approval Date',
      render: (row) => (
        <div className="text-sm">
          {row.approval_date || 'Pending'}
        </div>
      ),
    },
    {
      key: 'req_comment',
      header: 'Comment',
      render: (row) => (
        <div className="max-w-xs truncate" title={row.req_comment || 'No comment'}>
          {row.req_comment || 'No comment'}
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Header + Filters */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-bold truncate">Vehicle Maintenance Admin</h2>
            {selectedRowIds.length > 0 && (
              <Button
                variant="secondary"
                className="ml-2 bg-amber-500 hover:bg-amber-600 text-white shadow-lg"
                onClick={() => {
                  toast.info(`Export functionality for ${selectedRowIds.length} selected requests will be implemented`);
                }}
              >
                <Download size={16} className="mr-1" /> Export
              </Button>
            )}
          </div>
        </div>
        {/* Filters row: stack on mobile, allow horizontal scroll if tight */}
        <div className="mt-2 -mx-1 px-1 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 overflow-x-auto whitespace-nowrap">
          <Select 
            value={yearFilter.toString()} 
            onValueChange={(value) => handleYearFilterChange(parseInt(value, 10))}
          >
            <SelectTrigger className="w-full sm:w-44">
              <Calendar size={16} className="mr-2" />
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year} ({yearTotals[year] || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MaintenanceRequestExcelButton />
          <div className="sm:ml-auto flex items-center gap-2">
            <div className="text-xs text-blue-600 self-center">
              Last updated: {lastUpdatedAt ? lastUpdatedAt.toLocaleString() : 'Not loaded'}
            </div>
            <Button
              variant="outline"
              onClick={() => { fetchYearData(yearFilter, activeCard); }}
              disabled={loading}
              className="shrink-0 text-blue-500 border-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-6">
        <Card
          className={`bg-stone-100 border shadow-sm cursor-pointer transition hover:shadow-md flex flex-col min-h-32 ${
            activeCard === 'pendingVerification' ? 'ring-2 ring-yellow-500' : ''
          }`}
          onClick={() => handleCardClick('pendingVerification')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Pending Verification</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 mt-auto">
            <p className="text-2xl font-bold text-yellow-800">{getStatusCount('pendingVerification')}</p>
          </CardContent>
        </Card>

        <Card
          className={`bg-stone-100 border shadow-sm cursor-pointer transition hover:shadow-md flex flex-col min-h-32 ${
            activeCard === 'pendingRecommendation' ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => handleCardClick('pendingRecommendation')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Pending Recommendation</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 mt-auto">
            <p className="text-2xl font-bold text-blue-700">{getStatusCount('pendingRecommendation')}</p>
          </CardContent>
        </Card>

        <Card
          className={`bg-stone-100 border shadow-sm cursor-pointer transition hover:shadow-md flex flex-col min-h-32 ${
            activeCard === 'pendingApproval' ? 'ring-2 ring-purple-500' : ''
          }`}
          onClick={() => handleCardClick('pendingApproval')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 mt-auto">
            <p className="text-2xl font-bold text-purple-700">{getStatusCount('pendingApproval')}</p>
          </CardContent>
        </Card>

        <Card
          className={`bg-stone-100 border shadow-sm cursor-pointer transition hover:shadow-md flex flex-col min-h-32 ${
            activeCard === 'rejected' ? 'ring-2 ring-rose-500' : ''
          }`}
          onClick={() => handleCardClick('rejected')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-700">Rejected</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 mt-auto">
            <p className="text-2xl font-bold text-rose-700">{getStatusCount('rejected')}</p>
          </CardContent>
        </Card>

        <Card
          className={`bg-stone-100 border shadow-sm cursor-pointer transition hover:shadow-md flex flex-col min-h-32 ${
            activeCard === 'cancelled' ? 'ring-2 ring-red-500' : ''
          }`}
          onClick={() => handleCardClick('cancelled')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Cancelled</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 mt-auto">
            <p className="text-2xl font-bold text-red-700">{getStatusCount('cancelled')}</p>
          </CardContent>
        </Card>

        <Card
          className={`bg-stone-100 border shadow-sm cursor-pointer transition hover:shadow-md flex flex-col min-h-32 ${
            activeCard === 'total' ? 'ring-2 ring-gray-500' : ''
          }`}
          onClick={() => handleCardClick('total')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Approved</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 mt-auto">
            <p className="text-2xl font-bold">{getStatusCount('total')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Data grid within scrollable card to avoid page overspan */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border shadow-sm overflow-x-auto">
        <div className="min-w-full">
          <CustomDataGrid
            columns={columns as ColumnDef<unknown>[]}
            data={rows}
            pagination={false}
            inputFilter={false}
            theme="sm"
            dataExport={false}
            onRowDoubleClick={handleRowDoubleClick}
          />
        </div>
      </div>
    </>
  );
};

export default VehicleMaintenanceAdmin;
