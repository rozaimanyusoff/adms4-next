'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Plus, Download, Loader2, Search, Filter, Calendar } from 'lucide-react';
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
  status: 'pending' | 'verified' | 'recommended' | 'approved';
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

type MaintenanceStatus = 'all' | 'pending' | 'verified' | 'recommended' | 'approved';

const VehicleMaintenanceAdmin = () => {
  const [rows, setRows] = useState<MaintenanceRequest[]>([]);
  const [allRows, setAllRows] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus>('pending');
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const router = useRouter();

  const fetchMaintenanceRequests = async () => {
    setLoading(true);
    try {
      const response = await authenticatedApi.get('/api/mtn/request');
      const data = (response.data as { data?: MaintenanceRequest[] })?.data || [];
      
      // Store all data
      setAllRows(data);
      
      // Extract available years from all data
      const years = [...new Set(data.map(item => {
        if (item.req_date) {
          return new Date(item.req_date).getFullYear();
        }
        return new Date().getFullYear();
      }))].sort((a, b) => b - a); // Sort descending (latest first)
      setAvailableYears(years);
      
      // Set the latest year as default if not already set or if current year not in data
      if (years.length > 0 && (!years.includes(yearFilter) || yearFilter === new Date().getFullYear())) {
        setYearFilter(years[0]); // Set to latest year in data
      }
      
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      toast.error('Failed to fetch maintenance requests');
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Data filtered by year only (for summary counters)
  const yearFilteredRows = React.useMemo(() => {
    return allRows.filter(item => {
      if (!item.req_date) return false;
      return new Date(item.req_date).getFullYear() === yearFilter;
    });
  }, [allRows, yearFilter]);

  // Filter data based on current filters (year + status) for the grid
  const getFilteredData = () => {
    let filtered = yearFilteredRows;

    // Filter by status for the grid only
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Process data for display
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
        // Prefer `asset.register_number`; fallback to legacy `vehicle.register_number`
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

  // Update rows whenever filters change
  React.useEffect(() => {
    if (allRows.length > 0) {
      const filteredData = getFilteredData();
      setRows(filteredData);
    }
  }, [allRows, statusFilter, yearFilter]);

  const handleStatusFilterChange = (status: MaintenanceStatus) => {
    setStatusFilter(status);
  };

  const handleStatusCardClick = (status: MaintenanceStatus) => {
    // If clicking the same status, reset to 'all', otherwise set the new status
    const newStatus = statusFilter === status ? 'all' : status;
    setStatusFilter(newStatus);
  };

  const handleYearFilterChange = (year: number) => {
    setYearFilter(year);
  };

  const handleRowDoubleClick = (request: MaintenanceRequest) => {
    // Open in new tab
    const url = `/mtn/vehicle/${request.req_id}`;
    window.open(url, '_blank');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' },
      verified: { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800' },
      recommended: { variant: 'secondary' as const, color: 'bg-purple-100 text-purple-800' },
      approved: { variant: 'secondary' as const, color: 'bg-green-100 text-green-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getStatusCount = (targetStatus: MaintenanceStatus) => {
    if (targetStatus === 'all') return yearFilteredRows.length;
    return yearFilteredRows.filter(row => row.status === targetStatus).length;
  };

  useEffect(() => {
    // Fetch all data on component mount
    fetchMaintenanceRequests();
  }, []);

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
      render: (row) => getStatusBadge(row.status),
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
    <div className="p-4">
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
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter size={16} className="mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status ({getStatusCount('all')})</SelectItem>
              <SelectItem value="pending">Pending ({getStatusCount('pending')})</SelectItem>
              <SelectItem value="verified">Verified ({getStatusCount('verified')})</SelectItem>
              <SelectItem value="recommended">Recommended ({getStatusCount('recommended')})</SelectItem>
              <SelectItem value="approved">Approved ({getStatusCount('approved')})</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => fetchMaintenanceRequests()}
            disabled={loading}
            className="shrink-0"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div 
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-all ${
            statusFilter === 'all' ? 'ring-2 ring-gray-500 bg-gray-50 dark:bg-gray-700' : ''
          }`}
          onClick={() => handleStatusCardClick('all')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total</p>
              <p className="text-2xl font-bold">{getStatusCount('all')}</p>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <Search className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        </div>
        
        <div 
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-all ${
            statusFilter === 'pending' ? 'ring-2 ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : ''
          }`}
          onClick={() => handleStatusCardClick('pending')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-700">{getStatusCount('pending')}</p>
            </div>
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-all ${
            statusFilter === 'verified' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
          onClick={() => handleStatusCardClick('verified')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Verified</p>
              <p className="text-2xl font-bold text-blue-700">{getStatusCount('verified')}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-all ${
            statusFilter === 'recommended' ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20' : ''
          }`}
          onClick={() => handleStatusCardClick('recommended')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Recommended</p>
              <p className="text-2xl font-bold text-purple-700">{getStatusCount('recommended')}</p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-all ${
            statusFilter === 'approved' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' : ''
          }`}
          onClick={() => handleStatusCardClick('approved')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Approved</p>
              <p className="text-2xl font-bold text-green-700">{getStatusCount('approved')}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
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
