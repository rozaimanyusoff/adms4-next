'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  Upload, 
  X, 
  FileText, 
  Calendar, 
  Car, 
  Wrench,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ExternalLink,
  Lock,
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
  email: string;
  contact: string;
}

interface MaintenanceRequest {
  req_id: number;
  req_date: string;
  svc_type: ServiceType[];
  req_comment: string | null;
  status: 'pending' | 'verified' | 'recommended' | 'approved';
  vehicle: Vehicle;
  requester: Requester;
  can_download_form: boolean;
  can_upload_form: boolean;
  can_cancel: boolean;
  form_download_url?: string;
}

interface VehicleServicePortalProps {
  requestId: string;
}

const VehicleServicePortal: React.FC<VehicleServicePortalProps> = ({ requestId }) => {
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCredentialModal, setShowCredentialModal] = useState(true);
  const [credentialValidating, setCredentialValidating] = useState(false);
  const [ramcoId, setRamcoId] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchRequestDetails = async () => {
    setLoading(true);
    try {
      const response = await authenticatedApi.get(`/api/mtn/vehicle/${requestId}`);
      const result = response.data as { status: string; message: string; data: MaintenanceRequest };
      setRequest(result.data);
      return result.data;
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast.error('Failed to load maintenance request details');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const validateCredentials = async () => {
    if (!ramcoId.trim() || !contactInfo.trim()) {
      toast.error('Please enter both RAMCO ID and contact information');
      return;
    }

    setCredentialValidating(true);
    try {
      // Fetch the actual request data to get the requester information
      const requestData = await fetchRequestDetails();
      
      if (!requestData || !requestData.requester) {
        toast.error('Unable to validate credentials. Request data not found.');
        setCredentialValidating(false);
        return;
      }

      // Compare entered credentials with actual requester data
      const enteredRamcoId = ramcoId.trim().toLowerCase();
      const enteredContact = contactInfo.trim().toLowerCase();
      const actualRamcoId = requestData.requester.ramco_id?.toLowerCase() || '';
      const actualContact = requestData.requester.contact?.toLowerCase() || '';
      const actualEmail = requestData.requester.email?.toLowerCase() || '';

      // Allow matching against either contact number or email
      const contactMatches = enteredContact === actualContact || enteredContact === actualEmail;

      if (enteredRamcoId === actualRamcoId && contactMatches) {
        setShowCredentialModal(false);
        toast.success('Credentials validated successfully');
        // Data is already loaded from validation, so no need to fetch again
      } else {
        toast.error('Invalid credentials. Please check your RAMCO ID and contact information.');
        // Clear the request data since validation failed
        setRequest(null);
      }
    } catch (error) {
      console.error('Error validating credentials:', error);
      toast.error('Failed to validate credentials. Please try again.');
      setRequest(null);
    } finally {
      setCredentialValidating(false);
    }
  };

  const handleDownloadForm = async () => {
    if (!request?.form_download_url) {
      toast.error('Form download not available');
      return;
    }

    try {
      const response = await authenticatedApi.get(`/api/mtn/vehicle/${requestId}/download-form`, {
        responseType: 'blob'
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `maintenance-form-${request.req_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Form downloaded successfully');
    } catch (error) {
      console.error('Error downloading form:', error);
      toast.error('Failed to download form');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type (optional)
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a PDF or image file');
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUploadForm = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('form', selectedFile);

      await authenticatedApi.post(`/api/mtn/vehicle/${requestId}/upload-form`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Form uploaded successfully');
      setSelectedFile(null);
      // Refresh request details to get updated status
      fetchRequestDetails();
    } catch (error) {
      console.error('Error uploading form:', error);
      toast.error('Failed to upload form');
    } finally {
      setUploading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!confirm('Are you sure you want to cancel this maintenance request? This action cannot be undone.')) {
      return;
    }

    setCanceling(true);
    try {
      await authenticatedApi.post(`/api/mtn/vehicle/${requestId}/cancel`);
      toast.success('Maintenance request has been cancelled');
      // Refresh to show updated status
      fetchRequestDetails();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('Failed to cancel request');
    } finally {
      setCanceling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Calendar },
      verified: { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800 border-blue-300', icon: CheckCircle },
      recommended: { variant: 'secondary' as const, color: 'bg-purple-100 text-purple-800 border-purple-300', icon: AlertTriangle },
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  useEffect(() => {
    // Only initialize the component, don't fetch data until credentials are validated
    // The fetchRequestDetails will be called from validateCredentials after successful validation
  }, [requestId]);

  if (showCredentialModal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <Lock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Identity</h2>
            <p className="text-gray-600">
              Please enter your credentials to access the maintenance request portal
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="ramco-id" className="text-sm font-medium text-gray-700">
                RAMCO ID
              </Label>
              <Input
                id="ramco-id"
                type="text"
                value={ramcoId}
                onChange={(e) => setRamcoId(e.target.value)}
                placeholder="Enter your RAMCO ID"
                className="mt-1"
                disabled={credentialValidating}
              />
            </div>

            <div>
              <Label htmlFor="contact" className="text-sm font-medium text-gray-700">
                Contact Information
              </Label>
              <Input
                id="contact"
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="Enter your email or phone number"
                className="mt-1"
                disabled={credentialValidating}
              />
            </div>

            <Button
              onClick={validateCredentials}
              disabled={credentialValidating || !ramcoId.trim() || !contactInfo.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {credentialValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <UserIcon className="w-4 h-4 mr-2" />
                  Verify Identity
                </>
              )}
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              This portal requires verification to protect sensitive maintenance information.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Vehicle Maintenance Service Portal
              </h1>
              <p className="text-gray-600 mt-1">
                Request #{request.req_id} - {formatDate(request.req_date)}
              </p>
            </div>
            {getStatusBadge(request.status)}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Request Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Vehicle</label>
                    <div className="flex items-center mt-1">
                      <Car className="w-4 h-4 mr-2 text-gray-500" />
                      <p className="text-lg font-semibold text-blue-600">{request.vehicle.register_number}</p>
                    </div>
                    {request.vehicle.make && (
                      <p className="text-sm text-gray-600 ml-6">
                        {request.vehicle.make} {request.vehicle.model} {request.vehicle.year && `(${request.vehicle.year})`}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Request Date</label>
                    <div className="flex items-center mt-1">
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      <p className="text-lg">{formatDate(request.req_date)}</p>
                    </div>
                  </div>
                </div>
                
                {/* Requester Information */}
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-600 mb-3 block">Requester Information</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Name</label>
                      <div className="flex items-center mt-1">
                        <UserIcon className="w-4 h-4 mr-2 text-gray-500" />
                        <p className="text-sm">{request.requester.name}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">RAMCO ID</label>
                      <p className="text-sm mt-1 ml-6">{request.requester.ramco_id}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Email</label>
                      <p className="text-sm mt-1 ml-6">{request.requester.email}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Contact</label>
                      <p className="text-sm mt-1 ml-6">{request.requester.contact}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Service Types</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {request.svc_type.map((service) => (
                      <Badge key={service.id} variant="outline" className="text-sm">
                        <Wrench className="w-3 h-3 mr-1" />
                        {service.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {request.req_comment && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Comments</label>
                    <div className="bg-gray-50 p-3 rounded-md mt-2">
                      <p className="text-gray-800">{request.req_comment}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* File Upload Section */}
            {request.can_upload_form && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Service Form
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <div className="flex items-start">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
                      <p className="text-sm text-yellow-800">
                        Please upload the completed service form. Accepted file types: PDF, JPEG, PNG. Maximum file size: 10MB.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select File
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileSelect}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    
                    {selectedFile && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="text-sm text-gray-700">{selectedFile.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFile(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    <Button
                      onClick={handleUploadForm}
                      disabled={!selectedFile || uploading}
                      className="w-full"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Form
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleDownloadForm}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Service Form
                </Button>
                
                <Button
                  onClick={() => {
                    document.querySelector('input[type="file"]')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  variant="default"
                  className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Completed Form
                </Button>
                
                <Button
                  onClick={handleCancelRequest}
                  variant="destructive"
                  className="w-full justify-start"
                  disabled={canceling}
                >
                  {canceling ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <X className="w-4 h-4 mr-2" />
                  )}
                  {canceling ? 'Cancelling...' : 'Cancel Request'}
                </Button>
              </CardContent>
            </Card>

            {/* Status Information */}
            <Card>
              <CardHeader>
                <CardTitle>Status Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Current Status</label>
                    <div className="mt-1">
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {request.status === 'pending' && (
                      <p>Your request is being processed. You will be notified of any updates.</p>
                    )}
                    {request.status === 'verified' && (
                      <p>Your request has been verified and is awaiting recommendation.</p>
                    )}
                    {request.status === 'recommended' && (
                      <p>Your request has been recommended and is awaiting final approval.</p>
                    )}
                    {request.status === 'approved' && (
                      <p>Your request has been approved. Service arrangements will follow shortly.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Help */}
            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  If you have any questions about your maintenance request, please contact support.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleServicePortal;
