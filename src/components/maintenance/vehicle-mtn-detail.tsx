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
  email: string;
  department?: string;
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
  vehicle: Vehicle;
  requester: Requester;
  recommendation_by: ApprovalBy | null;
  approval_by: ApprovalBy | null;
  costcenter: CostCenter;
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
  const router = useRouter();

  const fetchMaintenanceDetail = async () => {
    setLoading(true);
    try {
      const response = await authenticatedApi.get(`/api/mtn/vehicle/${requestId}`);
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
      await authenticatedApi.post(`/api/mtn/vehicle/${requestId}/resendmail`);
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
      await authenticatedApi.post(`/api/mtn/vehicle/${requestId}/forceinvoice`);
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
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
          <div className="flex items-center space-x-3">
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
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Information */}
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
                  <p className="text-lg font-semibold text-blue-600">{request.vehicle.register_number}</p>
                </div>
                {request.vehicle.make && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Make & Model</label>
                    <p className="text-lg">{request.vehicle.make} {request.vehicle.model}</p>
                  </div>
                )}
                {request.vehicle.year && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Year</label>
                    <p className="text-lg">{request.vehicle.year}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wrench className="w-5 h-5 mr-2" />
                Service Details
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
            </CardContent>
          </Card>

          {/* Workshop Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Workshop & Cost Center
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-600">Workshop</label>
                  {request.workshop ? (
                    <>
                      <p className="text-lg font-semibold">{request.workshop.name}</p>
                      {request.workshop.location && (
                        <p className="text-gray-600">{request.workshop.location}</p>
                      )}
                      {request.workshop.contact && (
                        <p className="text-gray-600">{request.workshop.contact}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500 italic">Not assigned</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Cost Center</label>
                  <p className="text-lg font-semibold">{request.costcenter.name}</p>
                  {request.costcenter.code && (
                    <p className="text-gray-600">Code: {request.costcenter.code}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Timeline
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

          {/* Requester Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Requester
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
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
                {request.requester.department && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Department</label>
                    <p>{request.requester.department}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Approvals */}
          {(request.recommendation_by || request.approval_by) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Approvals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {request.recommendation_by && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Recommended by</label>
                    <p className="font-semibold">{request.recommendation_by.name}</p>
                    <p className="text-sm text-gray-600">{request.recommendation_by.email}</p>
                  </div>
                )}
                
                {request.recommendation_by && request.approval_by && <Separator />}
                
                {request.approval_by && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Approved by</label>
                    <p className="font-semibold">{request.approval_by.name}</p>
                    <p className="text-sm text-gray-600">{request.approval_by.email}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
