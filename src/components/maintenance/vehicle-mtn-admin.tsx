'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Search, Filter, Calendar } from 'lucide-react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

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
  const [rows, setRows] = useState<MaintenanceRequest[]>([]);
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
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  // Default to Pending Verification card
  const [activeCard, setActiveCard] = useState<SummaryCardKey>('pendingVerification');
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const router = useRouter();
  
  // Fetch rows for grid from backend using year + activeCard
  const fetchGridRows = async (year?: number, card?: SummaryCardKey) => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (year) params.year = year;
      const key = card ?? activeCard;
      if (key && key !== 'total') {
        const q = cardQuery[key];
        if (q) params[q.type] = q.value;
      }
      const response = await authenticatedApi.get('/api/mtn/request', { params });
      let data = (response.data as { data?: MaintenanceRequest[] })?.data || [];
      // Exclude cancelled items only for pending cards; include them for Total
      if (key === 'pendingVerification' || key === 'pendingRecommendation' || key === 'pendingApproval') {
        data = data.filter(item => (item.status || '').toLowerCase() !== 'cancelled');
      }
      // Process data for display
      const processed = data.map((item, idx) => {
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
      setRows(processed);
    } catch (error) {
      console.error('Error fetching grid rows:', error);
      toast.error('Failed to fetch maintenance requests');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary counts for each card from backend
  const fetchSummaryCounts = async (year?: number) => {
    try {
      const base = year ? { year } : {};
      const [totalRes, verRes, recRes, apprRes, rejRes, cancelRes] = await Promise.all([
        authenticatedApi.get('/api/mtn/request', { params: base }),
        authenticatedApi.get('/api/mtn/request', { params: { ...base, [cardQuery.pendingVerification.type]: cardQuery.pendingVerification.value } }),
        authenticatedApi.get('/api/mtn/request', { params: { ...base, [cardQuery.pendingRecommendation.type]: cardQuery.pendingRecommendation.value } }),
        authenticatedApi.get('/api/mtn/request', { params: { ...base, [cardQuery.pendingApproval.type]: cardQuery.pendingApproval.value } }),
        authenticatedApi.get('/api/mtn/request', { params: { ...base, [cardQuery.rejected.type]: cardQuery.rejected.value } }),
        authenticatedApi.get('/api/mtn/request', { params: { ...base, [cardQuery.cancelled.type]: cardQuery.cancelled.value } }),
      ]);
      const getLen = (res: any, key: SummaryCardKey) => {
        const arr: any[] = ((res?.data as { data?: any[] })?.data || []);
        if (key === 'pendingVerification' || key === 'pendingRecommendation' || key === 'pendingApproval') {
          return arr.filter(item => (item?.status || '').toLowerCase() !== 'cancelled').length;
        }
        return arr.length;
      };
      setCounts({
        total: getLen(totalRes, 'total'),
        pendingVerification: getLen(verRes, 'pendingVerification'),
        pendingRecommendation: getLen(recRes, 'pendingRecommendation'),
        pendingApproval: getLen(apprRes, 'pendingApproval'),
        rejected: getLen(rejRes, 'rejected'),
        cancelled: getLen(cancelRes, 'cancelled'),
      });
    } catch (error) {
      console.error('Error fetching summary counts:', error);
      // Keep existing counts; no toast to avoid noise
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
    // Open detailed admin view in a new tab to keep the grid context
    const url = `/mtn/vehicle/${request.req_id}`;
    try {
      if (typeof window !== 'undefined') {
        window.open(url, '_blank');
        return;
      }
    } catch (_) {}
    // Fallback to in-app navigation if window is unavailable
    router.push(url);
  };

  const getDisplayStatus = (row: MaintenanceRequest): { label: string; color: string } => {
    // Map raw status to display categories the UI requires
    const s = (row.status || '').toLowerCase();
    if (s === 'cancelled') return { label: 'CANCELLED', color: 'bg-red-100 text-red-800' };
    if (s === 'rejected') return { label: 'REJECTED', color: 'bg-rose-100 text-rose-800' };
    if (s === 'pending') return { label: 'PENDING VERIFICATION', color: 'bg-yellow-100 text-yellow-800' };
    if (s === 'verified') return { label: 'PENDING RECOMMENDATION', color: 'bg-blue-100 text-blue-800' };
    if (s === 'recommended' || s === 'approved') return { label: 'PENDING APPROVAL', color: 'bg-purple-100 text-purple-800' };
    return { label: s.toUpperCase(), color: 'bg-gray-100 text-gray-800 text-center' };
  };

  const getStatusCount = (key: SummaryCardKey) => counts[key] || 0;

  useEffect(() => {
    // On mount, try to discover available years from backend using total fetch without year
    // Also set initial rows and summary counts
    const init = async () => {
      try {
        const res = await authenticatedApi.get('/api/mtn/request');
        const data = (res.data as { data?: MaintenanceRequest[] })?.data || [];
        // Discover years present
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
      await fetchSummaryCounts(yearFilter);
      await fetchGridRows(yearFilter, activeCard);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh grid rows and counts when year or card changes
  useEffect(() => {
    fetchSummaryCounts(yearFilter);
    fetchGridRows(yearFilter, activeCard);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearFilter, activeCard]);

  const columns: ColumnDef<MaintenanceRequest>[] = [
    {
      key: 'rowNumber',
      header: 'No',
      render: (row) => (
        <div className="flex items-center min-w-[60px]">
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
    <div>
      {/* Header + Filters */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-bold truncate">Vehicle Maintenance Requests</h2>
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
            onValueChange={(value) => handleYearFilterChange(parseInt(value))}
          >
            <SelectTrigger className="w-full sm:w-36">
              <Calendar size={16} className="mr-2" />
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={activeCard} onValueChange={(v) => setActiveCard(v as SummaryCardKey)}>
            <SelectTrigger className="w-full sm:w-56">
              <Filter size={16} className="mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total">Total ({getStatusCount('total')})</SelectItem>
              <SelectItem value="pendingVerification">Pending Verification ({getStatusCount('pendingVerification')})</SelectItem>
              <SelectItem value="pendingRecommendation">Pending Recommendation ({getStatusCount('pendingRecommendation')})</SelectItem>
              <SelectItem value="pendingApproval">Pending Approval ({getStatusCount('pendingApproval')})</SelectItem>
              <SelectItem value="rejected">Rejected ({getStatusCount('rejected')})</SelectItem>
              <SelectItem value="cancelled">Cancelled ({getStatusCount('cancelled')})</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => { fetchSummaryCounts(yearFilter); fetchGridRows(yearFilter, activeCard); }}
            disabled={loading}
            className="shrink-0"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div 
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-all ${
            activeCard === 'total' ? 'ring-2 ring-gray-500 bg-gray-50 dark:bg-gray-700' : ''
          }`}
          onClick={() => handleCardClick('total')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total</p>
              <p className="text-2xl font-bold">{getStatusCount('total')}</p>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <Search className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        </div>
        
        <div 
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-all ${
            activeCard === 'pendingVerification' ? 'ring-2 ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : ''
          }`}
          onClick={() => handleCardClick('pendingVerification')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pending Verification</p>
              <p className="text-2xl font-bold text-yellow-700">{getStatusCount('pendingVerification')}</p>
            </div>
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-all ${
            activeCard === 'pendingRecommendation' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
          onClick={() => handleCardClick('pendingRecommendation')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Pending Recommendation</p>
              <p className="text-2xl font-bold text-blue-700">{getStatusCount('pendingRecommendation')}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-all ${
            activeCard === 'pendingApproval' ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20' : ''
          }`}
          onClick={() => handleCardClick('pendingApproval')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Pending Approval</p>
              <p className="text-2xl font-bold text-purple-700">{getStatusCount('pendingApproval')}</p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-all ${
            activeCard === 'rejected' ? 'ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-900/20' : ''
          }`}
          onClick={() => handleCardClick('rejected')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-rose-600">Rejected</p>
              <p className="text-2xl font-bold text-rose-700">{getStatusCount('rejected')}</p>
            </div>
            <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-all ${
            activeCard === 'cancelled' ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : ''
          }`}
          onClick={() => handleCardClick('cancelled')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Cancelled</p>
              <p className="text-2xl font-bold text-red-700">{getStatusCount('cancelled')}</p>
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            </div>
          </div>
        </div>
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
    </div>
  );
};

export default VehicleMaintenanceAdmin;
