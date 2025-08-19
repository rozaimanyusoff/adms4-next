'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
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
  CreditCard
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
  id: number;
  name: string;
  location?: string;
  contact?: string;
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
  const router = useRouter();

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
      pending: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      verified: { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800 border-blue-300', icon: CheckCircle },
      recommended: { variant: 'secondary' as const, color: 'bg-purple-100 text-purple-800 border-purple-300', icon: AlertCircle },
      approved: { variant: 'secondary' as const, color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
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
    <div className="p-6 mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackClick}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Maintenance Request #{request.req_id}
              </h1>
              <p className="text-gray-500 mt-1">
                Submitted on {formatDate(request.req_date)}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            {getPriorityBadge(request.priority)}
            {getStatusBadge(request.status)}
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
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {processingInvoice ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              {processingInvoice ? 'Processing...' : 'Proceed for Invoicing'}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left pane: Vehicle Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Car className="w-5 h-5 mr-2" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    <label className="text-sm font-medium text-gray-600">Purchase Date</label>
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
            </CardContent>
          </Card>
        </div>

        {/* Center pane: Merged Request Details + Requester + Workshop */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wrench className="w-5 h-5 mr-2" />
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Service Types</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {request.svc_type.map((service) => (
                    <Badge key={service.id} variant="outline" className="text-sm">
                      {service.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {request.req_comment ? (
                <div>
                  <label className="text-sm font-medium text-gray-600">Request Comment</label>
                  <div className="bg-gray-50 p-3 rounded-md mt-2">
                    <p className="text-gray-800">{request.req_comment}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-gray-600">Request Comment</label>
                  <p className="text-gray-500 italic">No comment provided</p>
                </div>
              )}

              {request.description && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <div className="bg-gray-50 p-3 rounded-md mt-2">
                    <p className="text-gray-800">{request.description}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Estimated Cost</label>
                  <p className="text-lg font-semibold">{formatCurrency(request.estimated_cost)}</p>
                </div>
                {request.actual_cost && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Actual Cost</label>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(request.actual_cost)}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="mt-2">
                <h4 className="text-sm font-medium">Requester</h4>
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

              <div className="mt-2">
                <h4 className="text-sm font-medium">Workshop</h4>
                {request.workshop ? (
                  <div className="mt-2">
                    <p className="text-lg font-semibold">{request.workshop.name}</p>
                    {request.workshop.location && <p className="text-gray-600">{request.workshop.location}</p>}
                    {request.workshop.contact && <p className="text-gray-600">{request.workshop.contact}</p>}
                  </div>
                ) : (
                  <p className="text-gray-500 italic mt-2">Not assigned</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right pane: Timeline, Service History, Attachments */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Approval Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Request Submitted</p>
                    <p className="text-sm text-gray-600">{formatDate(request.req_date)}</p>
                  </div>
                </div>

                {request.verification_date && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Verified</p>
                      <p className="text-sm text-gray-600">{formatDate(request.verification_date)}</p>
                    </div>
                  </div>
                )}

                {request.recommendation_date && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Recommended</p>
                      <p className="text-sm text-gray-600">{formatDate(request.recommendation_date)}</p>
                    </div>
                  </div>
                )}

                {request.approval_date && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Approved</p>
                      <p className="text-sm text-gray-600">{formatDate(request.approval_date)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service History */}
          <Card>
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
                <div className="space-y-3">
                  {serviceHistory.map(rec => (
                    <div key={rec.req_id} className="p-2 border rounded">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Request #{rec.req_id}</p>
                          <p className="text-xs text-gray-500">{new Date(rec.req_date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          {rec.invoice?.inv_no ? (
                            <p className="text-sm text-green-600">Inv: {rec.invoice.inv_no}</p>
                          ) : (
                            <p className="text-sm text-gray-500">No invoice</p>
                          )}
                        </div>
                      </div>
                      {rec.svc_type && rec.svc_type.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600">{rec.svc_type.map(s => s.name).join(', ')}</p>
                        </div>
                      )}
                      {rec.req_comment && (
                        <p className="mt-1 text-sm text-gray-800 truncate">{rec.req_comment}</p>
                      )}
                      <div className="mt-2 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/mtn/vehicle/${rec.req_id}`)}>
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
  );
};

export default VehicleMaintenanceDetail;
