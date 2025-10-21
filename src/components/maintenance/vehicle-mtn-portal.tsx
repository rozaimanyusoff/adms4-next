'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Card imports removed; details moved into accordion items
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import {

  Calendar,
  Car,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Loader2,

  X,
  User as UserIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';

interface ServiceType {
  id: number;
  name: string;
}

interface Vehicle {
  id: number;
  register_number: string;
  model?: string;
  make?: string;
  year?: number;
}

interface Requester {
  ramco_id: string;
  name: string;
  email?: string;
  contact?: string;
}

interface MaintenanceRequest {
  req_id: number;
  req_date: string;
  svc_type: ServiceType[];
  req_comment: string | null;
  req_upload?: string | null;
  verification_comment?: string | null;
  verification_date?: string | null;
  status: 'pending' | 'verified' | 'recommended' | 'approved' | 'pending recommendation' | 'pending approval' | 'cancelled' | 'rejected';
  vehicle: Vehicle;
  requester: Requester;
  can_download_form: boolean;
  can_upload_form: boolean;
  can_cancel: boolean;
  form_download_url?: string;
  asset?: {
    purchase_date?: string | null;
    age_years?: number;
    category?: { name?: string } | null;
    brand?: { name?: string } | null;
    costcenter?: { name?: string } | null;
    department?: { name?: string } | null;
    location?: { name?: string } | null;
  } | null;
}

interface VehicleServicePortalProps {
  requestId: string;
}

const VehicleServicePortal: React.FC<VehicleServicePortalProps> = ({ requestId }) => {
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [credentialValidating] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = React.useMemo(() => {
    const spToken = searchParams?.get('_cred');
    if (spToken) return spToken.trim();
    if (typeof window !== 'undefined') {
      const qs = new URLSearchParams(window.location.search);
      return (qs.get('_cred') || '').trim();
    }
    return '';
  }, [searchParams]);
  const action = React.useMemo(() => {
    const spAction = searchParams?.get('action');
    const val = spAction ? spAction.toLowerCase() : (typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('action') || '') : '');
    // Normalize to 'recommend' | 'approve'
    if (val === 'approval') return 'approve';
    return val;
  }, [searchParams]);
  const authorize = React.useMemo(() => {
    const spAuth = searchParams?.get('authorize');
    if (spAuth) return spAuth.trim();
    if (typeof window !== 'undefined') {
      const qs = new URLSearchParams(window.location.search);
      return (qs.get('authorize') || '').trim();
    }
    return '';
  }, [searchParams]);
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);

  const [pendingList, setPendingList] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const fetchRequestDetails = async () => {
    setLoading(true);
    try {
      // Fetch from request endpoint as per new portal access design
      const response = await authenticatedApi.get(`/api/mtn/request/${requestId}`, { headers: authHeaders });
      const raw = (response.data as any)?.data || {};

      const normalized = normalizePortalRequest(raw);

      setRequest(normalized);
      return normalized;
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast.error('Failed to load maintenance request details');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // No credential validation; trust email link token

  // Actions removed in portal view
  const normalizePortalRequest = (raw: any): MaintenanceRequest => {
    const statusRaw = (raw?.status || '').toLowerCase();
    const status: MaintenanceRequest['status'] = (['pending', 'verified', 'recommended', 'approved', 'pending recommendation', 'pending approval', 'cancelled', 'rejected'] as const).includes(statusRaw)
      ? (statusRaw as MaintenanceRequest['status'])
      : raw?.approval_date
        ? 'approved'
        : raw?.recommendation_date
          ? 'recommended'
          : raw?.verification_date
            ? 'verified'
            : 'pending';

    const vehicle: Vehicle = {
      id: raw?.asset?.id || raw?.vehicle?.id || 0,
      register_number: raw?.asset?.register_number || raw?.vehicle?.register_number || 'N/A',
      model: typeof raw?.asset?.model === 'string' ? raw.asset.model : raw?.asset?.model?.name,
      make: raw?.asset?.brand?.name,
      year: raw?.asset?.year
    };

    const requester: Requester = {
      ramco_id: raw?.requester?.ramco_id || '',
      name: raw?.requester?.name || '',
      email: raw?.requester?.email,
      contact: raw?.requester?.contact,
    };

    return {
      req_id: raw?.req_id,
      req_date: raw?.req_date,
      svc_type: Array.isArray(raw?.svc_type) ? raw.svc_type : [],
      req_comment: raw?.req_comment || null,
      req_upload: raw?.req_upload || null,
      verification_comment: raw?.verification_comment || null,
      verification_date: raw?.verification_date || null,
      status,
      vehicle,
      requester,
      can_download_form: !!raw?.form_download_url,
      can_upload_form: true,
      can_cancel: true,
      form_download_url: raw?.form_download_url,
      asset: {
        purchase_date: raw?.asset?.purchase_date || null,
        age_years: raw?.asset?.age_years,
        category: raw?.asset?.category || null,
        brand: raw?.asset?.brand || null,
        costcenter: raw?.asset?.costcenter || null,
        department: raw?.asset?.department || null,
        location: raw?.asset?.location || null,
      },
    };
  };

  // Cache for pending item details when opening accordion
  const [pendingDetails, setPendingDetails] = useState<Record<number, MaintenanceRequest | undefined>>({});

  const fetchPendingDetail = async (id: number) => {
    if (!id) return;
    try {
      const res = await authenticatedApi.get(`/api/mtn/request/${id}`, { headers: authHeaders });
      const raw = (res.data as any)?.data || {};
      const norm = normalizePortalRequest(raw);
      setPendingDetails(prev => ({ ...prev, [id]: norm }));
    } catch (e) {
      console.error('Failed to fetch pending detail', id, e);
      setPendingDetails(prev => ({ ...prev, [id]: undefined }));
    }
  };

  const handleDecision = async (decision: 'approve' | 'reject', targetId?: number) => {
    const id = targetId ?? Number(requestId);
    if (!id || !action) return;
    if (!authorize) { toast.error('Missing authorize identity in link'); return; }
    if (decision === 'reject' && !confirm('Are you sure you want to reject this request?')) return;
    try {
      const isRecommend = action === 'recommend';
      const endpoint = isRecommend
        ? `/api/mtn/request/${id}/recommend`
        : `/api/mtn/request/${id}/approve`;
      const when = nowDateTime();
      const body = isRecommend
        ? {
            req_id: Number(id),
            recommendation: authorize,
            recommendation_stat: decision === 'approve' ? 1 : 2,
            // Include both spellings to be safe
            recomendation_date: when,
            recommendation_date: when,
          }
        : {
            req_id: Number(id),
            approval: authorize,
            approval_stat: decision === 'approve' ? 1 : 2,
            approval_date: when,
          };
      await authenticatedApi.put(endpoint, body, { headers: authHeaders });
      const msg = decision === 'approve' ? (isRecommend ? 'Recommendation submitted successfully' : 'Approval submitted successfully') : 'Rejection submitted successfully';
      setSuccessMessage(msg);
      setSuccessOpen(true);
      if (!targetId) {
        await fetchRequestDetails();
      } else {
        await loadPendingRecommendations();
      }
    } catch (error) {
      console.error('Action failed', error);
      toast.error('Failed to submit your decision');
    }
  };

  const bulkDecision = async (decision: 'approve' | 'reject') => {
    if (!authorize) { toast.error('Missing authorize identity in link'); return; }
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (decision === 'reject' && !confirm(`Reject ${ids.length} selected request(s)?`)) return;
    try {
      const isRecommend = action === 'recommend';
      const when = nowDateTime();
      await Promise.all(ids.map(async (id) => {
        const endpoint = isRecommend ? `/api/mtn/request/${id}/recommend` : `/api/mtn/request/${id}/approve`;
        const body = isRecommend
          ? { req_id: Number(id), recommendation: authorize, recommendation_stat: decision === 'approve' ? 1 : 2, recomendation_date: when, recommendation_date: when }
          : { req_id: Number(id), approval: authorize, approval_stat: decision === 'approve' ? 1 : 2, approval_date: when };
        return authenticatedApi.put(endpoint, body, { headers: authHeaders });
      }));
      const msg = `${decision === 'approve' ? (action === 'recommend' ? 'Recommended' : 'Approved') : 'Rejected'} ${ids.length} request(s) successfully`;
      setSuccessMessage(msg);
      setSuccessOpen(true);
      setSelectedIds(new Set());
      await loadPendingRecommendations();
    } catch (e) {
      console.error('Bulk action failed', e);
      toast.error('Some actions may have failed');
      await loadPendingRecommendations();
    }
  };

  const loadPendingRecommendations = async () => {
    setPendingLoading(true);
    try {
      const pendingStatus = action === 'approve' ? 'approval' : 'recommended';
      const url = `/api/mtn/request?pendingstatus=${encodeURIComponent(pendingStatus)}&year=${currentYear}`;
      const res = await authenticatedApi.get(url, { headers: authHeaders });
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
      setPendingList(list);
    } catch (e) {
      console.error('Failed to load pending recommendations', e);
      setPendingList([]);
    } finally {
      setPendingLoading(false);
    }
  };

  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const nowDateTime = () => {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Calendar },
      verified: { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800 border-blue-300', icon: CheckCircle },
      recommended: { variant: 'secondary' as const, color: 'bg-purple-100 text-purple-800 border-purple-300', icon: AlertTriangle },
      approved: { variant: 'secondary' as const, color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      'pending recommendation': { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800 border-blue-300', icon: AlertTriangle },
      'pending approval': { variant: 'secondary' as const, color: 'bg-purple-100 text-purple-800 border-purple-300', icon: AlertTriangle },
      cancelled: { variant: 'secondary' as const, color: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle },
      rejected: { variant: 'secondary' as const, color: 'bg-rose-100 text-rose-800 border-rose-300', icon: AlertTriangle },
    };

    const config = statusConfig[(status as keyof typeof statusConfig)] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className={`${config.color} border text-sm px-3 py-1`}>
        <IconComponent className="w-4 h-4 mr-2" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not set';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Not set';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing access token.');
      return;
    }
    setShowCredentialModal(false);
    fetchRequestDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, token]);

  useEffect(() => {
    if (!token) return;
    loadPendingRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentYear, action]);

  useEffect(() => {
    // Ensure the accordion item matching current req_id is expanded
    if (requestId) {
      setAccordionValue(`pending-${requestId}`);
      // Preload its detailed content
      fetchPendingDetail(Number(requestId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  // No credential modal; access via signed link only

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 mx-auto mb-4" />
          <span className="text-lg">Loading your maintenance request...</span>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Request Not Found</h3>
          <p className="text-gray-500">The maintenance request could not be found or the link may have expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Vehicle Maintenance Authorization Portal</h1>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                try { window.close(); } catch (e) {}
              }}
              title="Close tab"
            >
              <X className="w-4 h-4 mr-1" />
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Removed top card; details now live in the accordion below */}
      {/* Pending recommendations list */}
      <div className="max-w-4xl mx-auto px-6 pb-8">
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Pending {action === 'approve' ? 'Approvals' : 'Recommendations'} ({currentYear})</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => bulkDecision('approve')} disabled={selectedIds.size === 0}>
                {action === 'approve' ? 'Approve selected' : 'Recommend selected'}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => bulkDecision('reject')} disabled={selectedIds.size === 0}>
                Reject selected
              </Button>
            </div>
          </div>
          {pendingLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="animate-spin w-4 h-4" /> Loading...</div>
          ) : pendingList.length === 0 ? (
            <div className="text-sm text-gray-500">No pending {action === 'approve' ? 'approvals' : 'recommendations'}.</div>
          ) : (
            <Accordion type="single" collapsible className="space-y-2" value={accordionValue} onValueChange={setAccordionValue}>
              {pendingList.map((d: any) => {
                const reg = d?.asset?.register_number || d?.vehicle?.register_number || 'N/A';
                const reqId = d?.req_id ?? d?.id;
                const requesterName = d?.requester?.name || 'N/A';
                const svc = Array.isArray(d?.svc_type) ? d.svc_type.map((s: any) => s?.name).filter(Boolean).join(', ') : 'N/A';
                const dStr = (() => {
                  const raw = d?.req_date;
                  if (!raw) return '-';
                  const dt = new Date(raw);
                  if (isNaN(dt.getTime())) return '-';
                  const dd = String(dt.getDate()).padStart(2, '0');
                  const mm = String(dt.getMonth() + 1).padStart(2, '0');
                  const yy = dt.getFullYear();
                  return `${dd}/${mm}/${yy}`;
                })();
                return (
                  <AccordionItem key={`pending-${reqId}`} value={`pending-${reqId}`} className="border rounded-lg bg-white">
                    <AccordionTrigger className="px-4 py-2" onClick={() => fetchPendingDetail(Number(reqId))}>
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedIds.has(Number(reqId))}
                            onCheckedChange={(v) => {
                              const idn = Number(reqId);
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                if (v) next.add(idn); else next.delete(idn);
                                return next;
                              });
                            }}
                            onClick={(e) => { e.stopPropagation(); }}
                          />
                          <div className="font-medium">#{reqId} • {reg}</div>
                        </div>
                        <div className="text-sm text-gray-600">{requesterName} • {dStr}</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4">
                      {pendingDetails[Number(reqId)] ? (
                        <div className="space-y-6 py-2">
                          {/* Vehicle Information */}
                          <div>
                            <h4 className="text-lg font-bold text-blue-600 flex items-center mb-2"><Car className="w-5 h-5 mr-2" />Vehicle Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <label className="font-medium text-gray-600">Registration Number</label>
                                <span className="text-blue-600 font-semibold">{pendingDetails[Number(reqId)]!.vehicle.register_number}</span>
                              </div>
                              {pendingDetails[Number(reqId)]!.asset?.category?.name && (
                                <div>
                                  <label className="font-medium text-gray-600">Category</label>
                                  <span className="text-blue-600">{pendingDetails[Number(reqId)]!.asset?.category?.name}</span>
                                </div>
                              )}
                              {pendingDetails[Number(reqId)]!.asset?.brand?.name && (
                                <div>
                                  <label className="font-medium text-gray-600">Brand</label>
                                  <span className="text-blue-600">{pendingDetails[Number(reqId)]!.asset?.brand?.name}</span>
                                </div>
                              )}
                              {pendingDetails[Number(reqId)]!.asset?.purchase_date && (
                                <div>
                                  <label className="font-medium text-gray-600">Registration Date</label>
                                  <span className="text-blue-600">{formatDate(pendingDetails[Number(reqId)]!.asset?.purchase_date || null)}</span>
                                </div>
                              )}
                              {typeof pendingDetails[Number(reqId)]!.asset?.age_years !== 'undefined' && (
                                <div>
                                  <label className="font-medium text-gray-600">Age</label>
                                  <span className="text-blue-600">{pendingDetails[Number(reqId)]!.asset?.age_years} years</span>
                                </div>
                              )}
                              {pendingDetails[Number(reqId)]!.asset?.costcenter?.name && (
                                <div>
                                  <label className="font-medium text-gray-600">Asset Cost Center</label>
                                  <span className="text-blue-600">{pendingDetails[Number(reqId)]!.asset?.costcenter?.name}</span>
                                </div>
                              )}
                              {pendingDetails[Number(reqId)]!.asset?.location?.name && (
                                <div>
                                  <label className="font-medium text-gray-600">Location</label>
                                  <span className="text-blue-600">{pendingDetails[Number(reqId)]!.asset?.location?.name}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <Separator />

                          {/* Requester */}
                          <div>
                            <h4 className="text-lg font-bold text-blue-600 flex items-center mb-2"><UserIcon className="w-5 h-5 mr-2" />Requester</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <label className="font-medium text-gray-600">Name</label>
                                <span className="text-blue-600">{pendingDetails[Number(reqId)]!.requester.name}</span>
                              </div>
                              <div>
                                <label className="font-medium text-gray-600">Ramco ID</label>
                                <span className="text-blue-600">{pendingDetails[Number(reqId)]!.requester.ramco_id}</span>
                              </div>
                              {pendingDetails[Number(reqId)]!.requester.contact && (
                                <div>
                                  <label className="font-medium text-gray-600">Contact</label>
                                  <span className="text-blue-600">{pendingDetails[Number(reqId)]!.requester.contact}</span>
                                </div>
                              )}
                              {pendingDetails[Number(reqId)]!.asset?.department?.name && (
                                <div>
                                  <label className="font-medium text-gray-600">Department</label>
                                  <span className="text-blue-600">{pendingDetails[Number(reqId)]!.asset?.department?.name}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <Separator />

                          {/* Request Details */}
                          <div>
                            <div className='flex items-center justify-between'>
                              <h4 className="text-lg font-bold text-blue-600 flex items-center mb-2"><Wrench className="w-5 h-5 mr-2" />Request Details</h4>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300 border text-sm px-3 py-1">#{pendingDetails[Number(reqId)]!.req_id}</Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-sm font-medium text-gray-600">Request Submitted</label>
                                <p className="text-blue-600">{formatDate(pendingDetails[Number(reqId)]!.req_date)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-600">Request Comment</label>
                                {pendingDetails[Number(reqId)]!.req_comment ? (
                                  <span className="text-blue-600">{pendingDetails[Number(reqId)]!.req_comment}</span>
                                ) : (
                                  <span className="text-gray-500 italic">No comment provided</span>
                                )}
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-600">Service Types</label>
                                <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-gray-800">
                                  {pendingDetails[Number(reqId)]!.svc_type.map((s) => (
                                    <li className='text-blue-600' key={s.id}>{s.name}</li>
                                  ))}
                                </ul>
                              </div>
                              {pendingDetails[Number(reqId)]!.req_upload && (
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Uploaded Image</label>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewSrc(pendingDetails[Number(reqId)]!.req_upload || null)}
                                    className="mt-2 border rounded-md overflow-hidden inline-block w-24 h-24 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    aria-label="Preview uploaded image"
                                  >
                                    <img src={pendingDetails[Number(reqId)]!.req_upload as string} alt="Request upload thumbnail" className="w-full h-full object-cover bg-white" />
                                  </button>
                                  <p className="text-xs text-gray-500 mt-1">Click the image to view larger</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <Separator />

                          {/* Service Advisory */}
                          {(pendingDetails[Number(reqId)]!.verification_comment || pendingDetails[Number(reqId)]!.verification_date) && (
                            <div>
                              <div className='flex item-center justify-between'>
                                <h4 className="text-lg font-bold text-blue-600 flex items-center mb-2"><CheckCircle className="w-5 h-5 mr-2 text-green-600" />Service Advisory</h4>
                                <span className="flex items-center gap-2 mb-2">{getStatusBadge('verified')}</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {pendingDetails[Number(reqId)]!.verification_comment && (
                                  <div className="mt-1">
                                    <label className="text-sm font-medium text-gray-600">Verification Comment</label>
                                    <p className="text-gray-800">{pendingDetails[Number(reqId)]!.verification_comment}</p>
                                  </div>
                                )}
                                {pendingDetails[Number(reqId)]!.verification_date && (
                                  <div className="mt-2">
                                    <label className="text-sm font-medium text-gray-600">Verified On</label>
                                    <p className="text-gray-800">{formatDate(pendingDetails[Number(reqId)]!.verification_date)}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Decision actions per item */}
                          {['recommend', 'approve'].includes(action) && (
                            <div className="pt-2">
                              <Separator className="my-3" />
                              <div className="flex items-center justify-center gap-3">
                                <Button onClick={() => handleDecision('approve', Number(reqId))} className="min-w-32">
                                  {action === 'recommend' ? 'Recommend' : 'Approve'}
                                </Button>
                                <Button variant="destructive" onClick={() => handleDecision('reject', Number(reqId))} className="min-w-32">
                                  Reject
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-600 py-2">
                          <Loader2 className="animate-spin w-4 h-4" /> Loading details...
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      <Dialog open={!!previewSrc} onOpenChange={(open) => !open && setPreviewSrc(null)}>
        <DialogContent className="max-w-3xl">
          {previewSrc && (
            <img src={previewSrc} alt="Uploaded preview" className="max-h-[80vh] w-auto object-contain mx-auto rounded-md" />
          )}
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Success</DialogTitle>
            <DialogDescription>{successMessage || 'Your action has been submitted.'}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className='bg-red-500 text-white'
              variant='destructive'
              onClick={() => {
                try { window.close(); } catch (e) {}
              }}
            >
              Close Tab
            </Button>
            <Button variant="outline" onClick={() => setSuccessOpen(false)}>Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehicleServicePortal;
