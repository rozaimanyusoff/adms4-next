'use client';
import React, { useEffect, useState, useMemo, useContext } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SearchableSelect } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ServiceTypes, { ServiceType } from '@/components/maintenance/service-types';
import { AuthContext } from '@/store/AuthContext';
import { can } from '@/utils/permissions';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Car,
  User,
  Building,
  Wrench,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Loader2,
  Mail,
  Send,
  CreditCard,
  Search,
  Save
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Asset {
  id: number;
  register_number: string;
  model?: string | { id?: number; name?: string };
  make?: string;
  year?: number;
  classification?: string;
  record_status?: string;
  purchase_date?: string | null;
  age_years?: number;
  category?: { id: number; name: string } | null;
  brand?: { id: number; name: string } | null;
  model_detail?: { id: number; name: string } | null; // some payloads use model object
  costcenter?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
  location?: { id: number; name: string } | null;
}

interface Requester {
  ramco_id: string;
  name: string;
  email?: string;
  department?: string;
  contact?: string;
}

interface ApprovalBy {
  ramco_id: string;
  name: string;
  email: string;
}

interface CostCenter {
  id: number;
  name: string;
  code?: string;
}

interface Workshop {
  ws_id: number;
  ws_type: number;
  ws_name: string;
  ws_add: string;
  ws_ctc: string;
  ws_pic: string;
  ws_branch: string;
  ws_rem: string;
  ws_panel: string;
  ws_stat: string;
  agreement_date_from: string;
  agreement_date_to: string;
  sub_no: string;
}

interface Invoice {
  inv_id?: number;
  svc_order?: string;
  inv_no?: string;
  inv_date?: string | null;
  odometer?: number | null;
  inv_total?: string | null;
  inv_stat?: string | null;
  inv_remarks?: string | null;
}

interface ServiceHistoryRecord {
  req_id: number;
  req_date: string;
  svc_type: ServiceType[];
  req_comment?: string | null;
  upload_date?: string | null;
  verification_date?: string | null;
  recommendation_date?: string | null;
  approval_date?: string | null;
  form_upload?: string | null;
  form_upload_date?: string | null;
  emailStat?: number;
  inv_status?: number;
  odo_start?: number;
  odo_end?: number | string;
  mileage?: number;
  vehicle?: { id: number; register_number: string };
  requester?: Requester;
  recommendation_by?: ApprovalBy | null;
  approval_by?: ApprovalBy | null;
  costcenter?: CostCenter | null;
  // history API may return a simplified workshop shape
  workshop?: { id?: number; name?: string; ws_name?: string } | null;
  invoice?: Invoice | null;
  // Optional status string if provided by API (e.g. 'pending verification', 'approved', 'cancelled')
  status?: string;
  application_status?: string | null;
}

interface MaintenanceRequestDetail {
  req_id: number;
  req_date: string;
  svc_type: ServiceType[];
  req_comment: string | null;
  upload_date: string | null;
  verification_date: string | null;
  recommendation_date: string | null;
  approval_date: string | null;
  form_upload: string | null;
  form_upload_date: string | null;
  emailStat: number;
  inv_status: number;
  // Odometer details (may be present for Service requests)
  odo_start?: number | string | null;
  odo_end?: number | string | null;
  mileage?: number | string | null;
  extra_mileage?: number | string | null;
  late_notice?: string | null;
  status: 'pending' | 'verified' | 'recommended' | 'approved' | 'pending recommendation' | 'pending approval' | 'cancelled' | 'rejected';
  asset: Asset;
  requester: Requester;
  recommendation_by: ApprovalBy | null;
  approval_by: ApprovalBy | null;
  costcenter?: CostCenter | null;
  workshop: Workshop | null;
  estimated_cost?: number;
  actual_cost?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  description?: string;
  attachments?: string[];
}

interface VehicleMaintenanceDetailProps {
  requestId: string;
}

const VehicleMaintenanceAdminDetail: React.FC<VehicleMaintenanceDetailProps> = ({ requestId }) => {
  const auth = useContext(AuthContext);
  const authData = auth?.authData;
  const canView = can('view', authData);
  const canUpdate = can('update', authData);
  const canCreate = can('create', authData);
  const [request, setRequest] = useState<MaintenanceRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resendingRecommendation, setResendingRecommendation] = useState(false);
  const [resendingApproval, setResendingApproval] = useState(false);
  const [processingInvoice, setProcessingInvoice] = useState(false);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistoryRecord[]>([]);
  const [serviceHistoryLoading, setServiceHistoryLoading] = useState(false);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [workshopsLoading, setWorkshopsLoading] = useState(false);
  const [workshopSearch, setWorkshopSearch] = useState('');
  const [isWorkshopDropdownOpen, setIsWorkshopDropdownOpen] = useState(false);
  // Admin section form state
  const [adminRemarks, setAdminRemarks] = useState('');
  const [workshopPanel, setWorkshopPanel] = useState('none');
  const [majorServiceOptions, setMajorServiceOptions] = useState<number[]>([]);
  const [majorServiceRemarks, setMajorServiceRemarks] = useState('');
  const [serviceConfirm, setServiceConfirm] = useState<'proceed' | 'reject' | ''>('');
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminSectionSaved, setAdminSectionSaved] = useState(false);
  const [adminFinalized, setAdminFinalized] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const router = useRouter();
  const unauthorizedView = !canView;
  const isApproved = (request?.status || '').toLowerCase() === 'approved' || Boolean(request?.approval_date);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [pendingUnverifiedIds, setPendingUnverifiedIds] = useState<number[]>([]);
  // Cache for invoiced parts by request id
  const [partsByReq, setPartsByReq] = useState<Record<number, { loading: boolean; parts: Array<{ part_name?: string; part_final_amount?: string }> | null; error?: string | null }>>({});

  // Filter workshops based on search and panel type
  const filteredWorkshops = useMemo(() => {
    return workshops
      .filter(workshop => workshop.ws_panel === "1") // Only show panel workshops
      .filter(workshop =>
        workshopSearch === '' ||
        workshop.ws_name.toLowerCase().includes(workshopSearch.toLowerCase()) ||
        workshop.ws_pic.toLowerCase().includes(workshopSearch.toLowerCase()) ||
        workshop.ws_ctc.includes(workshopSearch)
      );
  }, [workshops, workshopSearch]);

  // Helper: check if a record is in 'pending verification' bucket
  const isPendingVerification = (rec?: ServiceHistoryRecord | null): boolean => {
    if (!rec) return false;
    const s = String((rec as any)?.status || '').toLowerCase();
    if (s) {
      if (s.includes('cancel') || s.includes('rejected')) return false;
      if (s.includes('pending verification')) return true;
      // Some payloads may use just 'pending' at verification stage
      if (s.trim() === 'pending') return true;
      return false;
    }
    // Fallback via dates when status is not provided
    // Consider pending verification when it hasn't been verified/recommended/approved yet
    if (rec.verification_date || rec.recommendation_date || rec.approval_date) return false;
    return true;
  };

  // Determine previous and next request ids among pending verification, preferring global pending list
  const { prevReqId, nextReqId } = useMemo(() => {
    if (!request) return { prevReqId: null, nextReqId: null };

    const currentId = request.req_id;
    const computeFromIds = (ids: number[]) => {
      const sorted = [...ids].sort((a, b) => a - b);
      const prev = sorted.filter(id => id < currentId).pop() ?? null;
      const next = sorted.find(id => id > currentId) ?? null;
      return { prevReqId: prev, nextReqId: next };
    };

    if (pendingUnverifiedIds && pendingUnverifiedIds.length > 0) {
      return computeFromIds(pendingUnverifiedIds);
    }

    // Fallback: derive from service history for the asset
    if (!serviceHistory || serviceHistory.length === 0) return { prevReqId: null, nextReqId: null };
    const pendingIds = serviceHistory.filter(isPendingVerification).map(s => s.req_id);
    if (pendingIds.length === 0) return { prevReqId: null, nextReqId: null };
    return computeFromIds(pendingIds);
  }, [pendingUnverifiedIds, serviceHistory, request]);

  // Prefer next pending id; fallback to previous
  const nextUnverifiedId = useMemo(() => {
    return nextReqId ?? prevReqId;
  }, [nextReqId, prevReqId]);

  const navigateToRequest = (id: number | null) => {
    if (!id) return;
    // Prefer global pending-unverified IDs when available
    if (pendingUnverifiedIds && pendingUnverifiedIds.length > 0) {
      if (!pendingUnverifiedIds.includes(id)) {
        toast.info('Only requests pending verification are navigable');
        return;
      }
    } else {
      const target = serviceHistory.find(r => r.req_id === id);
      if (!isPendingVerification(target)) {
        toast.info('Only requests pending verification are navigable');
        return;
      }
    }
    router.push(`/mtn/vehicle/${id}`);
  };

  // Lazy-load invoiced parts for a given request id
  const ensurePartsLoaded = async (reqId: number) => {
    // Avoid duplicate fetches
    const current = partsByReq[reqId];
    if (current?.loading || (current && current.parts)) return;
    setPartsByReq(prev => ({ ...prev, [reqId]: { loading: true, parts: current?.parts ?? null, error: null } }));
    try {
      const res = await authenticatedApi.get(`/api/bills/mtn/request/${reqId}`);
      const raw = (res as any)?.data;
      // API may return { status, message, data: [...] }
      const body = (raw && typeof raw === 'object' && 'data' in raw) ? (raw as any).data : raw;
      let parts: Array<{ part_name?: string; part_final_amount?: string }> = [];
      if (Array.isArray(body)) {
        // Merge parts from all invoice entries for this request (defensive)
        for (const entry of body) {
          if (entry && Array.isArray(entry.parts)) parts = parts.concat(entry.parts);
        }
      } else if (body && typeof body === 'object') {
        const candidate = (body as any).parts ?? [];
        if (Array.isArray(candidate)) parts = candidate;
      }
      setPartsByReq(prev => ({ ...prev, [reqId]: { loading: false, parts, error: null } }));
    } catch (e) {
      setPartsByReq(prev => ({ ...prev, [reqId]: { loading: false, parts: null, error: 'Failed to load parts' } }));
    }
  };

  // Fetch global list of unverified (pending verification) requests for current year
  useEffect(() => {
    const fetchPendingUnverified = async () => {
      try {
        const res = await authenticatedApi.get('/api/mtn/request', {
          params: { pendingstatus: 'verified', year: currentYear },
        });
        const list: any[] = ((res.data as any)?.data || []) as any[];
        const ids = list
          .filter((item: any) => {
            const s = String(item?.status || '').toLowerCase();
            return s !== 'cancelled' && s !== 'rejected';
          })
          .map((item: any) => Number(item?.req_id))
          .filter((n: any) => Number.isFinite(n));
        setPendingUnverifiedIds(Array.from(new Set(ids)));
      } catch (e) {
        // Silently ignore; component will fallback to serviceHistory-based inference
        setPendingUnverifiedIds([]);
      }
    };
    fetchPendingUnverified();
  }, [currentYear]);

  const fetchMaintenanceDetail = async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const response = await authenticatedApi.get(`/api/mtn/request/${requestId}`);
      const result = response.data as { status: string; message: string; data: MaintenanceRequestDetail } & { data: any };
      const data = result.data;
      setRequest(data);

      // Prefill admin section fields from API payload
      try {
        setAdminRemarks(data?.verification_comment || '');
        const wsAny = (data?.workshop as any) || {};
        const wsId = wsAny.ws_id ?? wsAny.id;
        setWorkshopPanel(wsId ? String(wsId) : 'none');
        const vstat = (data as any)?.verification_stat;
        if (vstat === 1) setServiceConfirm('proceed');
        else if (vstat === 2) setServiceConfirm('reject');
        else setServiceConfirm('');
      } catch (_) {
        // non-fatal prefill errors ignored
      }
    } catch (error) {
      console.error('Error fetching maintenance detail:', error);
      toast.error('Failed to fetch maintenance request details');
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    // If this detail view was opened in a new tab/window via window.open,
    // attempt to close it. Fallback to navigating back to Records.
    try {
      if (typeof window !== 'undefined') {
        const openedByScript = !!window.opener;
        const noHistory = window.history.length <= 1;
        if (openedByScript || noHistory) {
          window.close();
          return;
        }
      }
    } catch (_) { /* ignore */ }
    router.push('/mtn/vehicle?tab=records&refresh=1');
  };

  const resendRecommendationRequest = async () => {
    if (!canUpdate) {
      toast.error('You do not have permission to update maintenance requests.');
      return;
    }
    setResendingRecommendation(true);
    try {
      await authenticatedApi.post(`/api/mtn/request/${requestId}/resend/recommend`);
      toast.success('Recommendation request email resent');
    } catch (error) {
      console.error('Error resending recommendation request:', error);
      toast.error('Failed to resend recommendation request');
    } finally {
      setResendingRecommendation(false);
    }
  };

  const resendApprovalRequest = async () => {
    if (!canUpdate) {
      toast.error('You do not have permission to update maintenance requests.');
      return;
    }
    setResendingApproval(true);
    try {
      await authenticatedApi.post(`/api/mtn/request/${requestId}/resend/approval`);
      toast.success('Approval request email resent');
    } catch (error) {
      console.error('Error resending approval request:', error);
      toast.error('Failed to resend approval request');
    } finally {
      setResendingApproval(false);
    }
  };

  const handleProceedForInvoicing = async () => {
    if (!canUpdate) {
      toast.error('You do not have permission to update maintenance requests.');
      return;
    }
    // Optionally handle confirmation via UI dialog if needed; keep native confirm for now
    if (!confirm('Are you sure you want to proceed with invoicing for this maintenance request? This action will initiate the invoicing process.')) {
      return;
    }

    setProcessingInvoice(true);
    try {
      await authenticatedApi.post(`/api/mtn/request/${requestId}/forceinvoice`);
      toast.success('Invoicing process has been initiated successfully');
      // Refresh the request details to show updated status
      fetchMaintenanceDetail();
    } catch (error) {
      console.error('Error processing invoice:', error);
      toast.error('Failed to process invoice');
    } finally {
      setProcessingInvoice(false);
    }
  };

  const handleAdminSave = async () => {
    if (!canUpdate) {
      toast.error('You do not have permission to update maintenance requests.');
      return;
    }
    try {
      setAdminSaving(true);
      setAdminSectionSaved(false);

      // Format current datetime as YYYY-MM-DD HH:mm:ss for API
      const pad2 = (n: number) => n.toString().padStart(2, '0');
      const now = new Date();
      const verificationDate = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;

      // Prepare form payload for service coordinator action (per API contract)
      const payload = {
        req_id: Number(requestId),
        verification_comment: adminRemarks || null,
        ws_id: workshopPanel !== 'none' ? parseInt(workshopPanel) : null,
        verification_stat: serviceConfirm === 'proceed' ? 1 : serviceConfirm === 'reject' ? 2 : null,
        major_opt: majorServiceOptions.length ? majorServiceOptions.join(',') : null,
        major_svc_comment: majorServiceRemarks || null,
        verification_date: verificationDate,
        rejection_comment: serviceConfirm === 'reject' ? (rejectionRemarks || null) : null,
      };

      // Send PUT request to update the maintenance request
      await authenticatedApi.put(`/api/mtn/request/${requestId}/admin`, payload);

      toast.success('Service coordinator actions saved successfully');
      setAdminSectionSaved(true);
      setAdminFinalized(true);
      setShowSuccessDialog(true);

      // Optionally refresh the request data
      await fetchMaintenanceDetail();

    } catch (error) {
      console.error('Error saving admin section:', error);
      toast.error('Failed to save service coordinator actions');
    } finally {
      setAdminSaving(false);
    }
  };

  const fetchWorkshops = async () => {
    try {
      setWorkshopsLoading(true);
      const response = await authenticatedApi.get('/api/bills/workshops');
      const data = response.data as { status: string; data: Workshop[] };
      if (data.status === 'success') {
        setWorkshops(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching workshops:', error);
      toast.error('Failed to fetch workshops');
    } finally {
      setWorkshopsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshops();
  }, []);

  useEffect(() => {
    if (requestId) {
      fetchMaintenanceDetail();
    }
  }, [requestId, canView]);

  if (!canView) {
    return (
      <div className="p-4 rounded-md border border-amber-200 bg-amber-50 text-amber-800">
        You do not have permission to view this vehicle maintenance request.
      </div>
    );
  }

  // Update browser tab title to reflect the current maintenance request
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const baseTitle = 'Vehicle Maintenance Request';
    const idPart = request?.req_id ? ` #${request.req_id}` : '';
    const regPart = request?.asset?.register_number ? ` – ${request.asset.register_number}` : '';
    document.title = `${baseTitle}${idPart}${regPart}`;
  }, [request?.req_id, request?.asset?.register_number]);

  // Fetch service history for the asset when request.asset.id becomes available
  useEffect(() => {
    const assetId = request?.asset?.id;
    if (!assetId) return;

    const fetchHistory = async (id: number) => {
      setServiceHistoryLoading(true);
      try {
        const res = await authenticatedApi.get(`/api/mtn/request/record/${id}`);
        const payload = res.data as { status: string; message: string; assetId?: number; register_number?: string; data?: ServiceHistoryRecord[] };
        setServiceHistory(payload.data || []);
      } catch (error) {
        console.error('Failed to fetch service history for asset', id, error);
        setServiceHistory([]);
      } finally {
        setServiceHistoryLoading(false);
      }
    };

    fetchHistory(assetId);
  }, [request?.asset?.id]);

  const getStatusBadge = (status?: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800 border-yellow-300 text-xs', icon: Clock },
      verified: { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800 border-blue-300 text-xs', icon: CheckCircle },
      recommended: { variant: 'secondary' as const, color: 'bg-purple-100 text-purple-800 border-purple-300 text-xs', icon: AlertCircle },
      approved: { variant: 'secondary' as const, color: 'bg-green-100 text-green-800 border-green-300 text-xs', icon: CheckCircle },
      cancelled: { variant: 'secondary' as const, color: 'bg-red-100 text-red-800 border-red-300 text-xs', icon: AlertCircle },
      rejected: { variant: 'secondary' as const, color: 'bg-rose-100 text-rose-800 border-rose-300 text-xs', icon: AlertCircle },
      'pending recommendation': { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800 border-blue-300 text-xs', icon: AlertCircle },
      'pending approval': { variant: 'secondary' as const, color: 'bg-purple-100 text-purple-800 border-purple-300 text-xs', icon: AlertCircle },
    } as const;

    const normalized = (status || 'pending').toLowerCase() as keyof typeof statusConfig;
    const config = statusConfig[normalized] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className={`${config.color} border text-sm px-3 py-1`}>
        <IconComponent className="w-4 h-4 mr-2" />
        {(status ? String(status) : 'pending').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;

    const priorityConfig = {
      low: { color: 'bg-gray-100 text-gray-800 border-gray-300' },
      medium: { color: 'bg-blue-100 text-blue-800 border-blue-300' },
      high: { color: 'bg-orange-100 text-orange-800 border-orange-300' },
      urgent: { color: 'bg-red-100 text-red-800 border-red-300' },
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.low;

    return (
      <Badge variant="secondary" className={`${config.color} border text-sm px-3 py-1`}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Not set';
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  };

  const formatNumber = (n?: number | string | null) => {
    if (n === null || n === undefined || n === '') return 'N/A';
    const num = typeof n === 'string' ? parseFloat(n) : n;
    if (typeof num !== 'number' || isNaN(num)) return String(n);
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Loader2 className="animate-spin w-8 h-8" />
        <span className="ml-2">Loading maintenance details...</span>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Request not found</h3>
        <p className="text-gray-500">The maintenance request could not be found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={handleBackClick}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Top navbar similar to screenshot */}
      <div className="mb-4">
        <div className="bg-slate-800 text-white rounded-0 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="text-lg font-semibold whitespace-normal sm:whitespace-nowrap">Vehicle Maintenance Request #{request.req_id}</div>

            <div className="flex flex-wrap items-center gap-2">
              {getPriorityBadge(request.priority)}
              {/* Horizontal timeline badges with dates (label + small date) */}
              {request.verification_date && (
                <div className="flex flex-col items-start text-left">
                  <span className="inline-flex gap-2 items-center px-3 py-1 rounded-full border border-amber-700 bg-amber-200 text-black font-medium">
                    <span>Verified: </span>
                    <span className="text-black">{formatDate(request.verification_date)}</span>
                  </span>
                </div>
              )}
              {request.recommendation_date && (
                <div className="flex flex-col items-start text-left">
                  <span className="inline-flex gap-2 items-center px-3 py-1 rounded-full border border-blue-700 bg-blue-50 text-blue-700 font-medium">
                    <span>Recommended: </span>
                    <span className="text-blue-700">{formatDate(request.recommendation_date)}</span>
                  </span>
                </div>
              )}
              {request.approval_date && (
                <div className="flex flex-col items-start text-left">
                  <span className="inline-flex gap-2 items-center px-3 py-1 rounded-full border border-green-700 bg-green-50 text-green-700 font-medium">
                    <span>Approved: </span>
                    <span className="text-green-800">{formatDate(request.approval_date)}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToRequest(prevReqId)}
              disabled={!prevReqId}
              className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToRequest(nextReqId)}
              disabled={!nextReqId}
              className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackClick}
              className="bg-red-600 hover:bg-red-500 text-white hover:text-white px-2 py-1 ml-auto sm:ml-0 order-3 sm:order-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>
        </div>
      </div>

      <div className='p-2 mx-auto space-y-4'>
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left pane: Request Overview (merged Vehicle Info / Requester / Request Details) */}
          <div className="flex flex-col space-y-6">
            <Card className="flex-1">
              <CardContent className="space-y-4 h-full">
                {/* Vehicle Information */}
                <div>
                  <h4 className="text-lg font-bold dark:text-dark-light flex items-center mb-2"><Car className="w-5 h-5 mr-2" />Vehicle Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium dark:text-dark-light">Registration Number</label>
                      <p className="font-semibold dark:text-dark-light">{request.asset.register_number}</p>
                    </div>
                    {request.asset.make && (
                      <div>
                        <label className="font-medium dark:text-dark-light">Make & Model</label>
                        <p>{request.asset.make} {typeof request.asset.model === 'string' ? request.asset.model : request.asset.model?.name}</p>
                      </div>
                    )}
                    {request.asset.year && (
                      <div>
                        <label className="font-medium dark:text-dark-light">Year</label>
                        <p>{request.asset.year}</p>
                      </div>
                    )}
                    {request.asset.category && (
                      <div>
                        <label className="font-medium dark:text-dark-light">Category</label>
                        <p className="dark:text-dark-light">{request.asset.category.name}</p>
                      </div>
                    )}
                    {request.asset.brand && (
                      <div>
                        <label className="font-medium dark:text-dark-light">Brand</label>
                        <p className="dark:text-dark-light">{request.asset.brand.name}</p>
                      </div>
                    )}
                    {request.asset.model_detail && (
                      <div>
                        <label className="font-medium dark:text-dark-light">Model</label>
                        <p className="dark:text-dark-light">{request.asset.model_detail.name}</p>
                      </div>
                    )}
                    {request.asset.purchase_date && (
                      <div>
                        <label className="font-medium dark:text-dark-light">Registration Date</label>
                        {/* change the date format to dd/mm/yyyy */}
                        <p className="dark:text-dark-light">{formatDate(request.asset.purchase_date)}</p>
                      </div>
                    )}
                    {typeof request.asset.age_years !== 'undefined' && (
                      <div>
                        <label className="font-medium dark:text-dark-light">Age</label>
                        <p className="dark:text-dark-light">{request.asset.age_years} years</p>
                      </div>
                    )}
                    {request.asset.costcenter && (
                      <div>
                        <label className="font-medium dark:text-dark-light">Asset Cost Center</label>
                        <p className="dark:text-dark-light">{request.asset.costcenter.name}</p>
                      </div>
                    )}
                    {request.asset.location && (
                      <div>
                        <label className="font-medium dark:text-dark-light">Location</label>
                        <p className="dark:text-dark-light">{request.asset.location.name}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Requester */}
                <div>
                  <h4 className="text-lg font-bold dark:text-dark-light flex items-center mb-2"><User className="w-5 h-5 mr-2" />Requester</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-medium dark:text-dark-light">Name</label>
                      <p className="dark:text-dark-light">{request.requester.name}</p>
                    </div>
                    <div>
                      <label className="font-medium dark:text-dark-light">Ramco ID</label>
                      <p className="dark:text-dark-light">{request.requester.ramco_id}</p>
                    </div>
                    {request.requester.contact && (
                      <div>
                        <label className="font-medium dark:text-dark-light">Contact</label>
                        <p className="dark:text-dark-light">{request.requester.contact}</p>
                      </div>
                    )}
                    <div>
                      <label className="font-medium dark:text-dark-light">Department</label>
                      <p className="dark:text-dark-light">{request.asset?.department?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="font-medium dark:text-dark-light">Cost Center</label>
                      <p className="dark:text-dark-light">{request.costcenter?.name || request.asset?.costcenter?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="font-medium dark:text-dark-light">Location</label>
                      <p className="dark:text-dark-light">{request.asset?.location?.name || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Request Details */}
                <div>
                  <h4 className="text-lg font-bold dark:text-dark-light flex items-center mb-2"><Wrench className="w-5 h-5 mr-2" />Request Details</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <label className="dark:text-dark-light">Request Submitted: </label>
                    <p className="dark:text-dark-light text-blue-500 font-semibold">{formatDate(request.req_date)}</p>
                  </div>
                  {typeof request.odo_start !== 'undefined' && request.odo_start !== null && request.odo_start !== '' && (
                        <div>
                          <label className="font-medium dark:text-dark-light">Current ODO (km): </label>
                          <p className="dark:text-dark-light text-blue-500 font-semibold">{formatNumber(request.odo_start)}</p>
                        </div>
                      )}
                  {typeof request.odo_end !== 'undefined' && request.odo_end !== null && request.odo_end !== '' && (
                        <div>
                          <label className="font-medium dark:text-dark-light">Service Mileage (km): </label>
                          <p className="dark:text-dark-light text-blue-500 font-semibold">{formatNumber(request.odo_end)}</p>
                        </div>
                      )}
                  {typeof request.extra_mileage !== 'undefined' && request.extra_mileage !== null && String(request.extra_mileage) !== '' && Number(request.extra_mileage) > 0 && (
                        <div>
                          <label className="font-medium dark:text-dark-light">Extra Mileage (km): </label>
                          <p className="dark:text-dark-light text-blue-500 font-semibold">{formatNumber(request.extra_mileage)}</p>
                        </div>
                      )}
                  {typeof request.late_notice === 'string' && request.late_notice && (
                    <div className="mt-2">
                      <label className="font-medium dark:text-dark-light">Late Notice</label>
                      <div>
                        <p className='dark:text-dark-light text-blue-500 font-semibold'>{request.late_notice}</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="font-medium dark:text-dark-light">Service Types</label>
                    <ul className="mt-2 list-disc list-inside space-y-2 text-gray-800">
                      {request.svc_type.map((service, idx) => (
                        <li className='dark:text-dark-light text-blue-500 font-semibold' key={(service as any).id ?? (service as any).svcTypeId ?? idx}>
                          {(service as any).name ?? (service as any).svcType ?? 'Service'}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {request.form_upload && request.form_upload_date ? (
                    <div>
                      <label className="font-medium dark:text-dark-light">Form Upload</label>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <a
                          href={request.form_upload}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center"
                        >
                          <Badge variant="default" className="bg-emerald-600 text-white text-xs hover:bg-emerald-700">
                            Form Uploaded
                          </Badge>
                        </a>
                        <span className="text-sm text-gray-600">
                          Uploaded: {formatDate(request.form_upload_date)}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {request.req_comment ? (
                    <div className="mt-2">
                      <label className="font-medium dark:text-dark-light">Request Comment</label>
                      <div>
                          <p className='dark:text-dark-light text-blue-500 font-semibold'>{request.req_comment}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <label className="font-medium dark:text-dark-light">Request Comment</label>
                      <p className="italic">No comment provided</p>
                    </div>
                  )}
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center pane: Admin Section + other request content */}
          <div className="flex flex-col space-y-6">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  Service Coordinator Action


                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium dark:text-dark-light block mb-2">Service coordinator remarks:</label>
                    <Textarea value={adminRemarks} onChange={(e) => setAdminRemarks((e.target as HTMLTextAreaElement).value)} disabled={isApproved} />
                  </div>
                  <Separator />

                  {/* Major Service Section */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Major Service Section</h4>
                    <label className="text-sm font-medium dark:text-dark-light block mb-2">Service option:</label>
                    <ServiceTypes
                      filterByGroup="Major Service"
                      selectedServiceIds={majorServiceOptions}
                      onSelectionChange={isApproved ? undefined : setMajorServiceOptions}
                      displayMode="checkboxes"
                      className={`space-y-2 ${isApproved ? 'opacity-60 pointer-events-none' : ''}`}
                    />

                    <div>
                      <label className="text-sm font-medium dark:text-dark-light block mb-2">Major service remarks:</label>
                      <Textarea value={majorServiceRemarks} onChange={(e) => setMajorServiceRemarks((e.target as HTMLTextAreaElement).value)} disabled={isApproved} />
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div>
                    <label className="text-sm font-medium dark:text-dark-light block mb-2">Workshop panels:</label>
                    <SearchableSelect
                      options={[{ value: 'none', label: 'None' }, ...filteredWorkshops.map(ws => ({ value: ws.ws_id.toString(), label: ws.ws_name }))]}
                      value={workshopPanel}
                      onValueChange={(v) => setWorkshopPanel(v)}
                      placeholder="Select workshop"
                      searchPlaceholder="Search workshops..."
                      className="w-full"
                      disabled={isApproved}
                    />

                    {workshopPanel && workshopPanel !== "none" && workshops.find(w => w.ws_id.toString() === workshopPanel) && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="font-medium">{workshops.find(w => w.ws_id.toString() === workshopPanel)?.ws_name}</div>
                        <div className="dark:text-dark-light mt-1">{workshops.find(w => w.ws_id.toString() === workshopPanel)?.ws_add}</div>
                        <div className="dark:text-dark-light">Contact: {workshops.find(w => w.ws_id.toString() === workshopPanel)?.ws_ctc}</div>
                        <div className="dark:text-dark-light">PIC: {workshops.find(w => w.ws_id.toString() === workshopPanel)?.ws_pic}</div>
                      </div>
                    )}
                  </div>


                  <div>
                    <label className="text-sm font-medium dark:text-dark-light block mb-2">Service coordinator confirmation:</label>
                    <RadioGroup value={serviceConfirm} onValueChange={(v) => setServiceConfirm(v as 'proceed' | 'reject' | '')}>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="proceed" id="rg-proceed" disabled={isApproved} />
                          <label htmlFor="rg-proceed" className="text-sm mt-1">Proceed</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="reject" id="rg-reject" disabled={isApproved} />
                          <label htmlFor="rg-reject" className="text-sm mt-1">Reject</label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {serviceConfirm === 'reject' && (
                    <div>
                      <label className="text-sm font-medium dark:text-dark-light block mb-2">Rejection Remarks:</label>
                      <Textarea value={rejectionRemarks} onChange={(e) => setRejectionRemarks((e.target as HTMLTextAreaElement).value)} disabled={isApproved} />
                    </div>
                  )}

                  {adminSectionSaved && (
                    <p className="text-green-600 text-sm mt-2">
                      Admin section saved successfully!
                    </p>
                  )}
                  <div className="flex justify-between items-center">

                    <Button
                      onClick={handleAdminSave}
                      variant={"default"}
                      disabled={isApproved || adminSaving || adminFinalized || !((serviceConfirm === 'reject' && rejectionRemarks.trim().length > 0) || (serviceConfirm === 'proceed' && adminRemarks.trim().length > 0 && workshopPanel !== 'none'))}
                      className="text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {adminSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Request Recommendation
                        </>
                      )}
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <span className='text-sm font-medium'>Other Actions:</span>
                    <div className="flex flex-wrap gap-2 justify-start w-full sm:w-auto">
                      {(() => {
                        const statusLc = String(request?.status || '').toLowerCase();
                        const canResendRecommendation = ['verified', 'recommended', 'pending recommendation'].includes(statusLc);
                        const canResendApproval = statusLc === 'approved';
                        return (
                          <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={resendRecommendationRequest}
                        disabled={resendingRecommendation || !canResendRecommendation}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {resendingRecommendation ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        {resendingRecommendation ? 'Sending...' : 'Resend Recommendation'}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={resendApprovalRequest}
                        disabled={resendingApproval || !canResendApproval}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {resendingApproval ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        {resendingApproval ? 'Sending...' : 'Resend Approval'}
                      </Button>
                          </>
                        );
                      })()}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleProceedForInvoicing}
                        disabled={processingInvoice}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {processingInvoice ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4 mr-2" />
                        )}
                        {processingInvoice ? 'Processing...' : 'Proceed for Invoicing'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right pane: Service History, Attachments */}
          <div className="flex flex-col space-y-6">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Previous Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                {serviceHistoryLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin w-4 h-4" />
                    <span>Loading history...</span>
                  </div>
                ) : serviceHistory.length === 0 ? (
                  <p className="text-sm text-gray-500">No service records found for this asset.</p>
                ) : (
                  <div className="space-y-2 max-h-[60vh] sm:max-h-187.5 border-0 overflow-y-auto overscroll-contain pr-1">
                    {serviceHistory.map(rec => (
                      <div
                        key={rec.req_id}
                        className={`p-2 border rounded-lg shadow hover:bg-sky-200 transition-colors ${
                          (() => {
                            const status = String(rec.application_status || rec.status || '').toLowerCase();
                            const rejected = new Set(['verification_rejected', 'recommendation_rejected', 'approval_rejected', 'cancelled']);
                            return rejected.has(status) ? 'bg-red-100 border-red-300' : 'bg-sky-100';
                          })()
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">Request #{rec.req_id}</p>
                              {request && rec.req_id === request.req_id && (
                                <Badge variant="default" className="bg-lime-600 text-white text-xs">
                                  Current
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-700">{new Date(rec.req_date).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            {rec.invoice?.inv_no ? (
                              <div>
                                <p className="text-xs dark:text-dark-light font-bold">Inv: {rec.invoice.inv_no}</p>
                                <p className="text-xs dark:text-dark-light font-bold">Amount: RM{rec.invoice.inv_total}</p>
                              </div>
                            ) : (
                              <p className="text-sm text-red-600">No invoice</p>
                            )}
                            {(() => {
                              const status = String(rec.application_status || rec.status || '').toLowerCase();
                              if (!status) return null;
                              const rejectedStatuses = new Set([
                                'verification_rejected',
                                'recommendation_rejected',
                                'approval_rejected',
                                'cancelled'
                              ]);
                              if (rejectedStatuses.has(status)) {
                                return <p className="text-xs font-semibold text-red-600">Verification Status: Rejected</p>;
                              }
                              return null;
                            })()}
                            {(() => {
                              const uploadUrl = rec.form_upload || (request && rec.req_id === request.req_id ? request.form_upload : null);
                              const uploadDate = rec.form_upload_date || (request && rec.req_id === request.req_id ? request.form_upload_date : null);
                              if (!uploadUrl || !uploadDate) return null;
                              return (
                                <a
                                  href={uploadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex flex-col items-end text-right"
                                >
                                  <Badge variant="default" className="bg-emerald-600 text-white text-center text-[10px] hover:bg-emerald-700">
                                    Form Uploaded on {formatDate(uploadDate)}
                                  </Badge>
                                </a>
                              );
                            })()}
                          </div>
                        </div>
                        {rec.svc_type && rec.svc_type.length > 0 && (
                          <ul className="mt-2 mb-2 list-disc list-inside space-y-0.5 text-sm dark:text-dark-light">
                            {rec.svc_type.map((service, index) => (
                              <li key={`svc-${rec.req_id}-${(service as any).id ?? (service as any).svcTypeId ?? index}`}>
                                {(service as any).name ?? (service as any).svcType ?? 'Service'}
                              </li>
                            ))}
                          </ul>
                        )}
                      {/* Service mileage (odometer at service) */}
                      {typeof (rec as any).odo_end !== 'undefined' && (rec as any).odo_end !== null && (
                        <p className="text-sm">Service Mileage: {formatNumber((rec as any).odo_end)}</p>
                      )}

                      {rec.req_comment && (
                        <p className="text-sm truncate">Comment: {rec.req_comment}</p>
                      )}
                      {rec.workshop && (
                        <p className="text-sm">Workshop: {rec.workshop?.name || (rec.workshop as any)?.ws_name || 'N/A'}</p>
                      )}
                        {rec.invoice?.inv_no ? (
                          <div className="mt-2">
                            <Accordion type="single" collapsible>
                              <AccordionItem value={`inv-${rec.req_id}`}>
                                <AccordionTrigger onClick={() => ensurePartsLoaded(rec.req_id)}>
                                  <span className='text-blue-500 dark:text-dark-light font-semibold'>Show invoiced parts</span>
                                </AccordionTrigger>
                                <AccordionContent>
                                  {partsByReq[rec.req_id]?.loading ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <Loader2 className="animate-spin w-4 h-4" /> Loading parts...
                                    </div>
                                  ) : partsByReq[rec.req_id]?.error ? (
                                    <div className="text-sm text-red-600">{partsByReq[rec.req_id]?.error}</div>
                                  ) : (partsByReq[rec.req_id]?.parts && partsByReq[rec.req_id]!.parts!.length > 0) ? (
                                    <ul className="list-disc list-inside text-xs">
                                      {partsByReq[rec.req_id]!.parts!.map((p, idx) => (
                                        <li key={`part-${rec.req_id}-${idx}`} className="flex justify-between">
                                          <span className="pr-2">{p.part_name || 'Part'}</span>
                                          <span className="font-medium">{p.part_final_amount ? `RM ${p.part_final_amount}` : '-'}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="text-sm text-gray-500">No invoiced parts found.</div>
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attachments */}
            {request.attachments && request.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Attachments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {request.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm truncate">{attachment}</span>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recommendation Submitted</DialogTitle>
          </DialogHeader>
          <p className="text-sm dark:text-dark-light">
            The service coordinator action has been saved. You can return to the records list.
          </p>
          <DialogFooter>
            {nextUnverifiedId ? (
              <Button
                onClick={() => {
                  setShowSuccessDialog(false);
                  navigateToRequest(nextUnverifiedId);
                }}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                Show unverified application no: #{nextUnverifiedId}
              </Button>
            ) : null}
            <Button onClick={handleBackClick} className="bg-blue-600 text-white hover:bg-blue-700">
              Back to Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
};

export default VehicleMaintenanceAdminDetail;
