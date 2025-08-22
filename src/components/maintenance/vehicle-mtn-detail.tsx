'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  ArrowRight,
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
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ServiceType {
  id: number;
  name: string;
}

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
  location?: { id: number; name: string } | null;
}

interface Requester {
  ramco_id: string;
  name: string;
  email: string;
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
  emailStat?: number;
  inv_status?: number;
  vehicle?: { id: number; register_number: string };
  requester?: Requester;
  recommendation_by?: ApprovalBy | null;
  approval_by?: ApprovalBy | null;
  costcenter?: CostCenter | null;
  workshop?: Workshop | null;
  invoice?: Invoice | null;
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
  form_upload_date: string | null;
  emailStat: number;
  inv_status: number;
  status: 'pending' | 'verified' | 'recommended' | 'approved';
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

const VehicleMaintenanceDetail: React.FC<VehicleMaintenanceDetailProps> = ({ requestId }) => {
  const [request, setRequest] = useState<MaintenanceRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resendingLink, setResendingLink] = useState(false);
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
  const [majorServiceOptions, setMajorServiceOptions] = useState<string[]>([]);
  const [majorServiceRemarks, setMajorServiceRemarks] = useState('');
  const [serviceConfirm, setServiceConfirm] = useState<'proceed' | 'reject' | ''>('');
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const router = useRouter();
  const [navSearch, setNavSearch] = useState('');

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

  // Determine previous and next request ids from serviceHistory for quick navigation
  const { prevReqId, nextReqId } = useMemo(() => {
    if (!serviceHistory || serviceHistory.length === 0 || !request) return { prevReqId: null, nextReqId: null };
    const ids = serviceHistory.map(s => s.req_id).sort((a, b) => a - b);
    const currentIndex = ids.indexOf(request.req_id);
    const prev = currentIndex > 0 ? ids[currentIndex - 1] : null;
    const next = currentIndex >= 0 && currentIndex < ids.length - 1 ? ids[currentIndex + 1] : null;
    return { prevReqId: prev, nextReqId: next };
  }, [serviceHistory, request]);

  const navigateToRequest = (id: number | null) => {
    if (!id) return;
    router.push(`/mtn/vehicle/${id}`);
  };

  const fetchMaintenanceDetail = async () => {
    setLoading(true);
    try {
      const response = await authenticatedApi.get(`/api/mtn/request/${requestId}`);
      const result = response.data as { status: string; message: string; data: MaintenanceRequestDetail };
      setRequest(result.data);
    } catch (error) {
      console.error('Error fetching maintenance detail:', error);
      toast.error('Failed to fetch maintenance request details');
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    // Check if we can go back in history
    if (window.history.length > 1) {
      router.back();
    } else {
      // If opened in new tab, close it or navigate to admin page
      if (window.opener) {
        window.close();
      } else {
        router.push('/mtn/vehicle');
      }
    }
  };

  const handleResendServiceLink = async () => {
    setResendingLink(true);
    try {
      await authenticatedApi.post(`/api/mtn/request/${requestId}/resendmail`);
      toast.success('Service link has been resent to the requester');
    } catch (error) {
      console.error('Error resending service link:', error);
      toast.error('Failed to resend service link');
    } finally {
      setResendingLink(false);
    }
  };

  const handleProceedForInvoicing = async () => {
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
  }, [requestId]);

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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800 border-yellow-300 text-xs', icon: Clock },
      verified: { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800 border-blue-300 text-xs', icon: CheckCircle },
      recommended: { variant: 'secondary' as const, color: 'bg-purple-100 text-purple-800 border-purple-300 text-xs', icon: AlertCircle },
      approved: { variant: 'secondary' as const, color: 'bg-green-100 text-green-800 border-green-300 text-xs', icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className={`${config.color} border text-sm px-3 py-1`}>
        <IconComponent className="w-4 h-4 mr-2" />
        {status.toUpperCase()}
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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
        <div className="bg-slate-800 text-white rounded-0 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold">Vehicle Maintenance Request #{request.req_id} {getStatusBadge(request.status)}</div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <Input
                className="w-64 bg-white/10 border-white/20 text-white placeholder:text-white/70"
                placeholder="Search service order..."
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToRequest(prevReqId)}
              disabled={!prevReqId}
              className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1"
              aria-label="Previous"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToRequest(nextReqId)}
              disabled={!nextReqId}
              className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1"
              aria-label="Next"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/mtn/vehicle')}
              className="bg-red-600 hover:bg-red-500 text-white px-2 py-1"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className='p-6 mx-auto space-y-4'>
        {/* Header */}

        <div className="flex items-start justify-center">
            <div className="flex items-start space-x-3">
            {getPriorityBadge(request.priority)}
            
            {/* Horizontal timeline badges with dates (label + small date) */}
            <div className="flex items-center gap-3 ml-2">
              <div className="flex flex-col items-center text-center">
                <span className="inline-flex gap-2 items-center px-3 py-1 rounded-full border-1 border-blue-700 bg-blue-50 text-blue-700 text-xs font-medium">
                  <span>Request Submitted: </span>
                  <span className="text-[10px] text-blue-700">{formatDate(request.req_date)}</span>
                </span>
              </div>
              {request.verification_date && (
                <div className="flex flex-col items-center text-center">
                  <span className="inline-flex gap-2 items-center px-3 py-1 rounded-full border-1 border-green-700 bg-green-50 text-green-700 text-xs font-medium">
                    <span>Verified: </span>
                    <span className="text-[10px] text-green-700">{formatDate(request.verification_date)}</span>
                  </span>
                </div>
              )}
              {request.recommendation_date && (
                <div className="flex flex-col items-center text-center">
                  <span className="inline-flex gap-2 items-center px-3 py-1 rounded-full border-1 border-purple-700 bg-purple-50 text-purple-700 text-xs font-medium">
                    <span>Recommended: </span>
                    <span className="text-[10px] text-purple-700">{formatDate(request.recommendation_date)}</span>
                  </span>
                </div>
              )}
              {request.approval_date && (
                <div className="flex flex-col items-center text-center">
                  <span className="inline-flex gap-2 items-center px-3 py-1 rounded-full border-1 border-green-700 bg-green-50 text-green-700 text-xs font-medium">
                    <span>Approved: </span>
                    <span className="text-[10px] text-green-800">{formatDate(request.approval_date)}</span>
                  </span>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left pane: Request Overview (merged Vehicle Info / Requester / Request Details) */}
        <div className="flex flex-col space-y-6">
          <Card className="flex-1">
            <CardContent className="space-y-4 h-full">
              {/* Vehicle Information */}
              <div>
                <h4 className="text-lg font-bold text-blue-600 flex items-center mb-2"><Car className="w-5 h-5 mr-2" />Vehicle Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Registration Number</label>
                    <p className="text-lg font-semibold text-blue-600">{request.asset.register_number}</p>
                  </div>
                  {request.asset.make && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Make & Model</label>
                      <p className="text-lg">{request.asset.make} {typeof request.asset.model === 'string' ? request.asset.model : request.asset.model?.name}</p>
                    </div>
                  )}
                  {request.asset.year && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Year</label>
                      <p className="text-lg">{request.asset.year}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {request.asset.category && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Category</label>
                      <p className="text-lg">{request.asset.category.name}</p>
                    </div>
                  )}
                  {request.asset.brand && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Brand</label>
                      <p className="text-lg">{request.asset.brand.name}</p>
                    </div>
                  )}
                  {request.asset.model_detail && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Model</label>
                      <p className="text-lg">{request.asset.model_detail.name}</p>
                    </div>
                  )}
                  {request.asset.purchase_date && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Registration Date</label>
                      {/* change the date format to dd/mm/yyyy */}
                      <p className="text-lg">{formatDate(request.asset.purchase_date)}</p>
                    </div>
                  )}
                  {typeof request.asset.age_years !== 'undefined' && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Age</label>
                      <p className="text-lg">{request.asset.age_years} years</p>
                    </div>
                  )}
                  {request.asset.costcenter && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Asset Cost Center</label>
                      <p className="text-lg">{request.asset.costcenter.name}</p>
                    </div>
                  )}
                  {request.asset.location && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Location</label>
                      <p className="text-lg">{request.asset.location.name}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Requester */}
              <div>
                <h4 className="text-lg font-bold text-blue-600 flex items-center mb-2"><User className="w-5 h-5 mr-2" />Requester</h4>
                <div className="mt-2 space-y-2">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Name</label>
                    <p className="font-semibold">{request.requester.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">RAMCO ID</label>
                    <p className="font-mono">{request.requester.ramco_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-blue-600">{request.requester.email}</p>
                  </div>
                  {request.requester.contact && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Contact</label>
                      <p>{request.requester.contact}</p>
                    </div>
                  )}
                  {request.requester.department && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Department</label>
                      <p>{request.requester.department}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Request Details */}
              <div>
                <h4 className="text-lg font-bold text-blue-600 flex items-center mb-2"><Wrench className="w-5 h-5 mr-2" />Request Details</h4>
                <div>
                  <label className="text-sm font-medium text-gray-600">Service Types</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {request.svc_type.map((service) => (
                      <Badge key={service.id} variant="outline" className="text-xs bg-gray-100 border-gray-300">
                        {service.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {request.req_comment ? (
                  <div className="mt-3">
                    <label className="text-sm font-medium text-gray-600">Request Comment</label>
                    <div className="bg-gray-50 p-3 rounded-md mt-2">
                      <p className="text-gray-800">{request.req_comment}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <label className="text-sm font-medium text-gray-600">Request Comment</label>
                    <p className="text-gray-500 italic">No comment provided</p>
                  </div>
                )}

                {request.description && (
                  <div className="mt-3">
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <div className="bg-gray-50 p-3 rounded-md mt-2">
                      <p className="text-gray-800">{request.description}</p>
                    </div>
                  </div>
                )}
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
                  <label className="text-sm font-medium text-gray-600 block mb-2">Remarks for the requested service:</label>
                  <Textarea value={adminRemarks} onChange={(e) => setAdminRemarks((e.target as HTMLTextAreaElement).value)} />
                </div>
                <Separator />
                
                {/* Major Service Section */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Major Service Section</h4>
                  <label className="text-sm font-medium text-gray-600 block mb-2">Service Option:</label>
                  <div className="space-y-2 mb-3">
                    {[
                      'Full Engine Overhaul',
                      'Top Engine Overhaul',
                      'Aircond Full Service',
                      'Gearbox Overhaul',
                      'Axle Shaft Overhaul',
                      'Body Works',
                    ].map((opt) => {
                      const id = `ms-opt-${opt.replace(/\s+/g, '-').toLowerCase()}`;
                      const checked = majorServiceOptions.includes(opt);
                      return (
                        <label key={opt} htmlFor={id} className="flex items-center gap-3">
                          <Checkbox
                            id={id}
                            checked={checked}
                            onCheckedChange={(val) => {
                              const isChecked = Boolean(val);
                              setMajorServiceOptions((prev) => {
                                if (isChecked) return Array.from(new Set([...prev, opt]));
                                return prev.filter((p) => p !== opt);
                              });
                            }}
                          />
                          <span className="text-sm">{opt}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-2">Major Service Remarks:</label>
                    <Textarea value={majorServiceRemarks} onChange={(e) => setMajorServiceRemarks((e.target as HTMLTextAreaElement).value)} />
                  </div>
                </div>

                <Separator className="my-4" />

                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-2">Workshop Panels:</label>
                  <div className="relative">
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search workshops..."
                        value={workshopSearch}
                        onChange={(e) => setWorkshopSearch(e.target.value)}
                        onFocus={() => setIsWorkshopDropdownOpen(true)}
                        className="w-full pr-10"
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    
                    {isWorkshopDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {workshopsLoading ? (
                          <div className="p-3 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Loading workshops...</span>
                          </div>
                        ) : filteredWorkshops.length === 0 ? (
                          <div className="p-3 text-sm text-gray-500">
                            {workshopSearch ? 'No workshops found matching your search' : 'No workshops available'}
                          </div>
                        ) : (
                          <>
                            <div 
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b"
                              onClick={() => {
                                setWorkshopPanel('none');
                                setWorkshopSearch('');
                                setIsWorkshopDropdownOpen(false);
                              }}
                            >
                            </div>
                            {filteredWorkshops.map(workshop => (
                              <div
                                key={workshop.ws_id}
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                onClick={() => {
                                  setWorkshopPanel(workshop.ws_id.toString());
                                  setWorkshopSearch(workshop.ws_name);
                                  setIsWorkshopDropdownOpen(false);
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{workshop.ws_name}</span>
                                  <span className="text-xs text-gray-500">{workshop.ws_pic} - {workshop.ws_ctc}</span>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Click outside to close dropdown */}
                    {isWorkshopDropdownOpen && (
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsWorkshopDropdownOpen(false)}
                      />
                    )}
                  </div>
                  
                  {workshopPanel && workshopPanel !== "none" && workshops.find(w => w.ws_id.toString() === workshopPanel) && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="font-medium">{workshops.find(w => w.ws_id.toString() === workshopPanel)?.ws_name}</div>
                      <div className="text-gray-600 mt-1">{workshops.find(w => w.ws_id.toString() === workshopPanel)?.ws_add}</div>
                      <div className="text-gray-600">Contact: {workshops.find(w => w.ws_id.toString() === workshopPanel)?.ws_ctc}</div>
                      <div className="text-gray-600">PIC: {workshops.find(w => w.ws_id.toString() === workshopPanel)?.ws_pic}</div>
                    </div>
                  )}
                </div>


                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-2">Service Confirmation:</label>
                  <RadioGroup value={serviceConfirm} onValueChange={(v) => setServiceConfirm(v as 'proceed' | 'reject' | '')}>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="proceed" id="rg-proceed" />
                        <label htmlFor="rg-proceed" className="text-sm">Proceed</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="reject" id="rg-reject" />
                        <label htmlFor="rg-reject" className="text-sm">Reject</label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {serviceConfirm === 'reject' && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-2">Rejection Remarks:</label>
                    <Textarea value={rejectionRemarks} onChange={(e) => setRejectionRemarks((e.target as HTMLTextAreaElement).value)} />
                  </div>
                )}

                <div className="flex justify-between items-center">
                  
                  <Button onClick={() => toast.success('Admin section saved (local only)')}>Save</Button>
                </div>
                <Separator />
                <div className="space-y-3">
                  <span className='text-sm font-medium block'>Other Action:</span>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleResendServiceLink}
                      disabled={resendingLink}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {resendingLink ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      {resendingLink ? 'Sending...' : 'Resend Service Link'}
                    </Button>
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
                Service History
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
                <div className="space-y-2 max-h-[700px] border-0 px-2 overflow-y-auto">
                  {serviceHistory.map(rec => (
                    <div key={rec.req_id} className="p-2 border rounded-lg shadow border-indigo-200 bg-indigo-100 hover:bg-indigo-200 transition-colors">
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
                        <div className="text-right">
                          {rec.invoice?.inv_no ? (
                            <div>
                              <p className="text-sm text-indigo-600 font-bold">Inv: {rec.invoice.inv_no}</p>
                              <p className="text-sm text-indigo-600 font-bold">Amount: RM{rec.invoice.inv_total}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-red-600">No invoice</p>
                          )}
                        </div>
                      </div>
                      {rec.svc_type && rec.svc_type.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-0.5 mb-2">
                          {rec.svc_type.map((service, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-indigo-700 text-white">
                              {service.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {rec.req_comment && (
                        <p className="text-sm truncate">Comment: {rec.req_comment}</p>
                      )}
                      {rec.workshop && (
                        <p className="text-sm">Workshop: {rec.workshop?.ws_name}</p>
                      )}
                      <div className="mt-2 flex justify-end">
                        <Button variant="default" size="sm" onClick={() => router.push(`/mtn/vehicle/${rec.req_id}`)}>
                          View
                        </Button>
                      </div>
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
      
    </>
  );
};

export default VehicleMaintenanceDetail;
