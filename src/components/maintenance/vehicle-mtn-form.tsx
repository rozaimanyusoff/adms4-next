'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SingleSelect, type ComboboxOption } from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { AuthContext } from '@/store/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Camera, Download, Loader2, X } from 'lucide-react';
import { can } from '@/utils/permissions';

// Users in this list will not be filtered by ?ramco
const exclusionUser: string[] = ['000277', 'username2'];

interface VehicleMtnFormProps {
  id?: number | string | null;
  onClose?: () => void;
  onSubmitted?: () => void;
}

interface ServiceOption {
  svcTypeId: number;
  svcType: string;
  svcOpt: number;
  group_desc?: string;
  orders?: number;
  appearance?: string;
}

interface ServiceHistoryRecord {
  req_id: number;
  req_date: string;
  svc_type?: Array<{ svcTypeId?: number; svcType?: string; id?: number; name?: string }>;
  req_comment?: string | null;
  odo_start?: number | null;
  odo_end?: number | null;
  mileage?: number | null;
  invoice?: { inv_date?: string | null; inv_total?: string | number | null } | null;
  status?: string | null;
  application_status?: string | null;
  form_upload?: string | null;
  form_upload_date?: string | null;
}

interface AssessmentSummary {
  assess_id: number;
  a_ncr: number;
  a_date: string;
}

interface AssessmentDetail {
  adt_id: number;
  qset_desc?: string;
  qset_type?: string;
  adt_ncr?: number;
  adt_image?: string | null;
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatDMY(value: string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatDMYHM(value: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  const hh = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function formatRelativeYM(value: string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1; // approximate partial month
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years > 0) return `${years}y${rem ? ` ${rem}m` : ''} ago`;
  return `${months}m ago`;
}

function extractServiceTypeId(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    const record = value as { svcTypeId?: unknown; id?: unknown };
    if (typeof record.svcTypeId === 'number') return record.svcTypeId;
    if (typeof record.id === 'number') return record.id;
  }
  return null;
}

const VehicleMtnForm: React.FC<VehicleMtnFormProps> = ({ id, onClose, onSubmitted }) => {
  const auth = React.useContext(AuthContext);
  const user = auth?.authData?.user;
  const authData = auth?.authData;

  const [loading, setLoading] = React.useState<boolean>(false);
  const [existing, setExisting] = React.useState<any>(null);

  // Requestor (adapted from poolcar-application-form)
  const [requestor, setRequestor] = React.useState<any>({
    application_date: new Date().toISOString(),
    name: user?.name || '',
    ramco_id: user?.username || '',
    contact: user?.contact || '',
    department: null as any,
    location: null as any,
  });

  // Vehicle selection
  const [vehicleOptions, setVehicleOptions] = React.useState<ComboboxOption[]>([]);
  const [vehicleById, setVehicleById] = React.useState<Record<string, any>>({});
  const [assetId, setAssetId] = React.useState<string>('');

  // Type of Request: 1 Car Wash, 2 Service, 3 NCR Compliance
  const [svcType, setSvcType] = React.useState<string>('');
  const [serviceOptions, setServiceOptions] = React.useState<ServiceOption[]>([]);
  const [serviceOptionsLoading, setServiceOptionsLoading] = React.useState<boolean>(false);
  const [selectedServiceTypeIds, setSelectedServiceTypeIds] = React.useState<number[]>([]);
  const [remarks, setRemarks] = React.useState<string>('');
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const [formUpload, setFormUpload] = React.useState<File | null>(null);
  const [formUploadDate, setFormUploadDate] = React.useState<string | null>(null);
  const [formUploadSaving, setFormUploadSaving] = React.useState<boolean>(false);
  const [odoStart, setOdoStart] = React.useState<string>('');
  const [odoEnd, setOdoEnd] = React.useState<string>('');
  const [lateNotice, setLateNotice] = React.useState<string>('');
  const [agree, setAgree] = React.useState<boolean>(false);
  const [showSuccess, setShowSuccess] = React.useState<boolean>(false);
  const [successTitle, setSuccessTitle] = React.useState<string>('Form submitted');
  const [successDescription, setSuccessDescription] = React.useState<string>('Your maintenance request has been successfully submitted.');
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  // Terms alert on open
  const [termsOpen, setTermsOpen] = React.useState<boolean>(false);
  const [serviceOptionsError, setServiceOptionsError] = React.useState<string | null>(null);
  const [serviceHistory, setServiceHistory] = React.useState<ServiceHistoryRecord[]>([]);
  const [serviceHistoryLoading, setServiceHistoryLoading] = React.useState<boolean>(false);
  const [serviceHistoryError, setServiceHistoryError] = React.useState<string | null>(null);
  const [assessmentSummaries, setAssessmentSummaries] = React.useState<AssessmentSummary[]>([]);
  const [assessmentDetails, setAssessmentDetails] = React.useState<AssessmentDetail[]>([]);
  const [assessmentLoading, setAssessmentLoading] = React.useState<boolean>(false);
  const [assessmentError, setAssessmentError] = React.useState<string | null>(null);
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);
  const isReadOnly = Boolean(id);
  const canCreate = can('create', authData);
  const canUpdate = can('update', authData);
  const canView = can('view', authData);
  const isCreateMode = !id;
  const [ncrDialogOpen, setNcrDialogOpen] = React.useState(false);
  const [ncrAgreedForAsset, setNcrAgreedForAsset] = React.useState<string | null>(null);
  const [ncrPromptedAsset, setNcrPromptedAsset] = React.useState<string | null>(null);
  const hasActiveNcr = Boolean(assetId && assessmentDetails.length > 0);
  const isNcrLocked = hasActiveNcr && ncrAgreedForAsset === assetId;
  // Identify latest assessment with NCR findings
  const latestNcrAssessment = React.useMemo(() => {
    const candidates = (assessmentSummaries || []).filter((s) => Number(s?.a_ncr) > 0);
    if (!candidates.length) return null;
    const sorted = [...candidates].sort((a, b) => {
      const da = new Date(a.a_date || 0).getTime();
      const db = new Date(b.a_date || 0).getTime();
      if (!Number.isNaN(db - da) && db !== da) return db - da;
      return Number(b.assess_id || 0) - Number(a.assess_id || 0);
    });
    return sorted[0];
  }, [assessmentSummaries]);

  const latestNcrDetails = React.useMemo(() => {
    if (!latestNcrAssessment) return [];
    const targetId = Number((latestNcrAssessment as any)?.assess_id);
    if (!Number.isFinite(targetId)) return [];
    return assessmentDetails.filter((detail) => Number((detail as any)?.assess_id) === targetId && Number((detail as any).adt_ncr) > 0);
  }, [assessmentDetails, latestNcrAssessment]);

  const ncrIssuesList = React.useMemo(
    () => assessmentDetails.map((detail) => detail.qset_desc || 'NCR Issue'),
    [assessmentDetails],
  );

  const ncrRemarksText = React.useMemo(() => {
    if (!latestNcrAssessment || latestNcrDetails.length === 0) return '';
    const lines = latestNcrDetails.map((detail) => `• ${detail.qset_desc || 'NCR finding'}`);
    const assessLabel = latestNcrAssessment.assess_id ? `Assess #${latestNcrAssessment.assess_id}` : 'Latest Assessment';
    return `Vehicle Assessment NCR Findings (${currentYear}) — ${assessLabel}:\n${lines.join('\n')}`;
  }, [currentYear, latestNcrAssessment, latestNcrDetails]);
  const handleSvcTypeChange = React.useCallback(
    (value: string) => {
      if (isNcrLocked) return;
      setSvcType(value);
    },
    [isNcrLocked],
  );
  // Cancellation state (edit mode)
  const [cancelChecked, setCancelChecked] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  // Validation state
  const [showErrors, setShowErrors] = React.useState(false);
  const [errors, setErrors] = React.useState<{ asset?: boolean; svcType?: boolean; odoStart?: boolean; odoEnd?: boolean; lateNotice?: boolean; serviceOptions?: boolean; agree?: boolean; formUpload?: boolean; }>({});
  // Back confirmation
  const [showBackConfirm, setShowBackConfirm] = React.useState(false);
  // Draft persistence (create mode)
  const draftKey = React.useMemo(() => 'vehicle-mtn-form-draft', []);
  // Vehicle change warning
  const [pendingAssetId, setPendingAssetId] = React.useState<string | null>(null);
  const [showVehicleChangeConfirm, setShowVehicleChangeConfirm] = React.useState(false);
  // Refs for focusing first error
  const vehicleRef = React.useRef<HTMLDivElement | null>(null);
  const svcTypeRef = React.useRef<HTMLDivElement | null>(null);
  const odoStartRef = React.useRef<HTMLInputElement | null>(null);
  const odoEndRef = React.useRef<HTMLInputElement | null>(null);
  const lateNoticeRef = React.useRef<HTMLTextAreaElement | null>(null);
  const svcContainerRef = React.useRef<HTMLDivElement | null>(null);
  const formUploadRef = React.useRef<HTMLDivElement | null>(null);
  const formUploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const formCameraUploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const cameraUploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const prevAssetId = React.useRef<string>('');

  // Selected vehicle details for payload convenience
  const selectedVehicle = React.useMemo(() => (assetId ? vehicleById[assetId] : null), [vehicleById, assetId]);

  // Open terms dialog when form mounts
  React.useEffect(() => {
    if ((isCreateMode && !canCreate) || (!isCreateMode && !canView && !canUpdate)) {
      return;
    }
    setTermsOpen(true);
  }, [canCreate, canUpdate, canView, isCreateMode]);

  const handleTermsDecline = React.useCallback(() => {
    setTermsOpen(false);
    if (onClose) {
      onClose();
      return;
    }
    if (typeof window !== 'undefined' && window.history && window.history.length > 0) {
      window.history.back();
    }
  }, [onClose]);

  const handleTermsAgree = React.useCallback(() => {
    setAgree(true);
    setTermsOpen(false);
  }, []);

  const focusFirstError = React.useCallback((e: typeof errors) => {
    if (e.asset && vehicleRef.current) { vehicleRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (e.svcType && svcTypeRef.current) { svcTypeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (e.odoStart && odoStartRef.current) { odoStartRef.current.focus(); return; }
    if (e.odoEnd && odoEndRef.current) { odoEndRef.current.focus(); return; }
    if (e.lateNotice && lateNoticeRef.current) { lateNoticeRef.current.focus(); return; }
    if (e.serviceOptions && svcContainerRef.current) { svcContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (e.formUpload && formUploadRef.current) { formUploadRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  }, []);

  // Compress an image on the client to reduce upload size (max 1600px, ~72% quality)
  const compressImage = React.useCallback(async (file: File): Promise<File> => {
    if (typeof document === 'undefined' || !file.type.startsWith('image/')) return file;
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load image'));
      image.src = dataUrl;
    });
    const maxDim = 1600;
    const maxSide = Math.max(img.width, img.height);
    const scale = maxSide > maxDim ? maxDim / maxSide : 1;
    const targetW = Math.max(1, Math.round(img.width * scale));
    const targetH = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.72));
    if (!blob) return file;
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'attachment';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  }, []);

  // Filter attachment files to only allow images and PDFs
  const filterAttachmentFiles = React.useCallback((files: File[]) => {
    const allowed = files.filter((file) => file.type.startsWith('image/') || file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
    if (files.length > 0 && allowed.length === 0) {
      toast.error('Only PDF or image files are supported');
      return [];
    }
    if (allowed.length !== files.length) {
      toast.error('Some files were skipped. Only PDF or image files are supported.');
    }
    return allowed;
  }, []);

  // Filter + compress attachments before storing them
  const normalizeAttachments = React.useCallback(async (files: File[]) => {
    const allowed = filterAttachmentFiles(files);
    if (!allowed.length) return;
    const compressed = await Promise.all(
      allowed.map(async (file) => {
        if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return file;
        try {
          return await compressImage(file);
        } catch {
          return file;
        }
      }),
    );
    setAttachments(compressed);
  }, [compressImage, filterAttachmentFiles]);

  const attemptSubmit = React.useCallback(async () => {
    if (isCreateMode && !canCreate) {
      toast.error('You do not have permission to create maintenance requests.');
      return;
    }
    if (!isCreateMode && !canUpdate) {
      toast.error('You do not have permission to update maintenance requests.');
      return;
    }
    if (submitting) return;
    setShowErrors(true);
    const newErrors: typeof errors = {};
    const isServiceRequest = svcType === '2';
    const parsedOdoStartLocal = (odoStart.trim() === '' ? NaN : Number(odoStart));
    const parsedOdoEndLocal = (odoEnd.trim() === '' ? NaN : Number(odoEnd));
    if (!assetId) newErrors.asset = true;
    if (!svcType && selectedServiceTypeIds.length === 0) newErrors.svcType = true;
    if (hasActiveNcr && !isNcrLocked) newErrors.svcType = true;
    if (selectedServiceTypeIds.length === 0) newErrors.serviceOptions = true;
    if (isServiceRequest) {
      if (odoStart.trim() === '' || Number.isNaN(parsedOdoStartLocal)) newErrors.odoStart = true;
      if (odoEnd.trim() === '' || Number.isNaN(parsedOdoEndLocal)) newErrors.odoEnd = true;
      const diff = Math.floor((Number.isNaN(parsedOdoStartLocal) || Number.isNaN(parsedOdoEndLocal)) ? 0 : (parsedOdoStartLocal - parsedOdoEndLocal));
      if (diff > 500 && lateNotice.trim().length === 0) newErrors.lateNotice = true;
    }
    if (!agree) newErrors.agree = true;
    const existingStatusValue = typeof existing?.status === 'string' ? existing.status.toLowerCase() : '';
    const requireFormUpload = Boolean(id && (existingStatusValue === 'approved' || ((existing as any)?.approval_date)));
    const hasStoredFormUpload = Boolean((existing as any)?.form_upload || (existing as any)?.formUpload);
    if (requireFormUpload && !formUpload && !hasStoredFormUpload) newErrors.formUpload = true;
    setErrors(newErrors);
    const messages: string[] = [];
    if (newErrors.asset) messages.push('Please select a vehicle');
    if (newErrors.svcType) {
      if (hasActiveNcr && !isNcrLocked) {
        messages.push('Resolve the outstanding NCR findings before submitting.');
      } else {
        messages.push('Please select type or a service option');
      }
    }
    if (newErrors.serviceOptions) messages.push('Select at least one service option');
    if (newErrors.odoStart) messages.push('Enter Current ODO (Service)');
    if (newErrors.odoEnd) messages.push('Enter Service Mileage (Service)');
    if (newErrors.lateNotice) messages.push('Provide Late Notice (exceeds 500 km)');
    if (newErrors.agree) messages.push('Confirm the information is accurate');
    if (newErrors.formUpload) messages.push('Upload the maintenance form provided by the workshop');
    if (messages.length > 0) {
      toast.error(messages.join('\n'));
      focusFirstError(newErrors);
      return;
    }

    // build and submit
    const form = new FormData();
    form.append('req_date', new Date().toISOString().slice(0, 19).replace('T', ' '));
    form.append('ramco_id', requestor?.ramco_id ?? '');
    // costcenter_id should come from the selected asset's costcenter
    const assetCostcenterId = (selectedVehicle as any)?.costcenter?.id || (existing as any)?.asset?.costcenter?.id;
    if (assetCostcenterId) form.append('costcenter_id', String(assetCostcenterId));
    if (requestor?.location?.id) form.append('location_id', String(requestor.location.id));
    form.append('ctc_m', requestor?.contact ?? '');
    if (assetId) form.append('asset_id', String(assetId));
    form.append('register_number', selectedVehicle?.register_number || existing?.asset?.register_number || '');
    form.append('entry_code', selectedVehicle?.entry_code || (existing as any)?.asset?.entry_code || '');
    if (svcType === '2' && odoStart !== '') form.append('odo_start', String(odoStart));
    if (svcType === '2' && odoEnd !== '') form.append('odo_end', String(odoEnd));
    form.append('req_comment', remarks ?? '');
    const svcOptCsv = selectedServiceTypeIds.join(',');
    form.append('svc_opt', svcOptCsv);
    // recompute extra mileage like before
    if (svcType === '2') {
      const pStart = (odoStart.trim() === '' ? NaN : Number(odoStart));
      const pEnd = (odoEnd.trim() === '' ? NaN : Number(odoEnd));
      const diff2 = (Number.isNaN(pStart) || Number.isNaN(pEnd)) ? 0 : Math.floor(pStart - pEnd);
      if (diff2 > 0) form.append('extra_mileage', String(diff2));
      if (diff2 > 500) {
        form.append('late_notice', lateNotice);
        const reqDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        form.append('late_notice_date', reqDate);
      }
    }
    if (attachments[0]) form.append('req_upload', attachments[0]);
    if (formUpload) form.append('form_upload', formUpload);
    if (formUpload) {
      const uploadDate = formUploadDate || new Date().toISOString().slice(0, 19).replace('T', ' ');
      form.append('form_upload_date', uploadDate);
    }
    setSubmitting(true);
    try {
      await authenticatedApi.post('/api/mtn/request', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccessTitle('Form submitted');
      setSuccessDescription('Your maintenance request has been successfully submitted.');
      setShowSuccess(true);
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      }
      onSubmitted?.();
    } catch (e) {
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  }, [assetId, svcType, selectedServiceTypeIds, odoStart, odoEnd, lateNotice, agree, requestor, remarks, selectedVehicle, existing, attachments, focusFirstError, onSubmitted, formUpload, formUploadDate, hasActiveNcr, isNcrLocked, submitting]);

  // Load existing record (edit mode)
  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res: any = await authenticatedApi.get(`/api/mtn/request/${id}`);
        const data = res?.data?.data ?? res?.data ?? null;
        if (cancelled) return;
        setExisting(data);

        // Prefill requestor if available
        const reqEmp = data?.requester || {};
        // Prefer explicit department/location from payload; fallback to asset.*; then requester.*; then null.
        const deptSrc = (data as any)?.department || (data as any)?.asset?.department || reqEmp?.department || null;
        const locSrc = (data as any)?.location || (data as any)?.asset?.location || reqEmp?.location || null;
        const deptNorm = deptSrc ? { ...deptSrc, name: (deptSrc as any).name || (deptSrc as any).code } : null;
        const locNorm = locSrc ? { ...locSrc, code: (locSrc as any).code || (locSrc as any).name } : null;
        setRequestor((s: any) => ({
          ...s,
          application_date: data?.req_date || s.application_date,
          name: reqEmp?.name || s.name,
          ramco_id: reqEmp?.ramco_id || s.ramco_id,
          contact: reqEmp?.contact || s.contact,
          department: deptNorm,
          location: locNorm,
        }));

        // Prefill vehicle selection
        const asset = data?.asset || data?.vehicle || null;
        if (asset?.id) {
          const idStr = String(asset.id);
          setAssetId(idStr);
          // Ensure the selected asset exists in our local maps/options for later payload fields
          setVehicleById((prev) => ({ ...prev, [idStr]: { ...prev[idStr], ...asset } }));
          setVehicleOptions((prev) => {
            if (prev.some((o) => o.value === idStr)) return prev;
            const label = asset.register_number || (asset as any).asset_no || `Asset #${asset.id}`;
            return [{ value: idStr, label }, ...prev];
          });
        }

        // Prefill service options if available
        if (data?.svc_type) {
          if (Array.isArray(data.svc_type)) {
            const svcSelections: number[] = [];
            data.svc_type.forEach((item: unknown) => {
              const svcId = extractServiceTypeId(item);
              if (typeof svcId === 'number') svcSelections.push(svcId);
            });
            // Set checked options from backend
            setSelectedServiceTypeIds(svcSelections);
            // Default type to '2' (Service) so ODO fields remain visible when applicable
            setSvcType('2');
          }
        }

        // Prefill remarks if available
        const existingRemarks = data?.req_comment || data?.description || '';
        if (existingRemarks) setRemarks(existingRemarks);

        // Prefill odo if available
        if (typeof (data as any)?.odo_start !== 'undefined') setOdoStart(String((data as any).odo_start ?? ''));
        if (typeof (data as any)?.odo_end !== 'undefined') setOdoEnd(String((data as any).odo_end ?? ''));
        if (typeof (data as any)?.form_upload_date === 'string' && (data as any).form_upload_date) {
          setFormUploadDate((data as any).form_upload_date);
        }
        const cancelledStatus = typeof data?.status === 'string' && data.status.toLowerCase() === 'cancelled';
        const cancelledAcceptance = Number((data as any)?.acceptance_status) === 2;
        if (cancelledStatus || cancelledAcceptance) {
          setCancelChecked(true);
          setCancelReason((data as any)?.cancellation_comment || '');
        }
      } catch (e) {
        if (!cancelled) toast.error('Failed to load request details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Fetch requestor details (department, location, etc.) when creating
  React.useEffect(() => {
    if (id) return; // don't override in edit mode
    const username = user?.username;
    if (!username) return;
    authenticatedApi
      .get(`/api/assets/employees/lookup/${username}`)
      .then((res: any) => {
        const data = res?.data?.data;
        if (!data) return;
        setRequestor((s: any) => ({
          ...s,
          name: data.full_name || s.name,
          ramco_id: data.ramco_id || s.ramco_id,
          contact: data.contact || s.contact,
          department: data.department || null,
          location: data.location || null,
        }));
      })
      .catch(() => { /* silent */ });
  }, [id, user?.username]);

  // Fetch vehicle list for the user (respect exclusionUser)
  React.useEffect(() => {
    const username = user?.username ? String(user.username) : '';
    if (!username) { setVehicleOptions([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const url = exclusionUser.includes(username)
          ? '/api/assets?manager=2&status=active&purpose=project,pool'
          : `/api/assets?manager=2&status=active&purpose=project,pool&owner=${encodeURIComponent(username)}`;
        const res: any = await authenticatedApi.get(url);
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
        if (!cancelled) {
          const map: Record<string, any> = {};
          const opts = list.map((a: any) => {
            const idVal = String(a.id ?? a.asset_id ?? a.assetId);
            map[idVal] = a;
            return { value: idVal, label: a.register_number || a.asset_no || `Asset #${a.id}` } as ComboboxOption;
          });
          setVehicleById(map);
          setVehicleOptions(opts);
        }
      } catch {
        if (!cancelled) setVehicleOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.username]);


  // Fetch service options
  React.useEffect(() => {
    let cancelled = false;

    const fetchServiceOptions = async () => {
      setServiceOptionsLoading(true);
      setServiceOptionsError(null);
      try {
        const res: any = await authenticatedApi.get('/api/mtn/types');
        if (cancelled) return;
        const payload = res?.data?.data ?? res?.data ?? [];
        if (Array.isArray(payload)) {
          // keep all data but filter out appearance: 'admin' for rendering later
          const normalized = (payload as any[]).map((o) => ({
            ...o,
            orders: typeof (o as any)?.orders === 'number' ? (o as any).orders : undefined,
            appearance: (o as any)?.appearance,
          })) as ServiceOption[];
          setServiceOptions(normalized);
        } else {
          setServiceOptions([]);
        }
      } catch {
        if (!cancelled) {
          setServiceOptions([]);
          setServiceOptionsError('Unable to load service options');
        }
      } finally {
        if (!cancelled) setServiceOptionsLoading(false);
      }
    };

    fetchServiceOptions();

    return () => { cancelled = true; };
  }, []);

  // Fetch service history for selected asset
  React.useEffect(() => {
    if (!assetId) {
      setServiceHistory([]);
      setServiceHistoryError(null);
      setServiceHistoryLoading(false);
      setAssessmentSummaries([]);
      setAssessmentDetails([]);
      setAssessmentError(null);
      setAssessmentLoading(false);
      return;
    }

    const numericAssetId = Number(assetId);
    if (Number.isNaN(numericAssetId)) {
      setServiceHistory([]);
      setServiceHistoryError(null);
      setServiceHistoryLoading(false);
      setAssessmentSummaries([]);
      setAssessmentDetails([]);
      setAssessmentError(null);
      setAssessmentLoading(false);
      return;
    }

    let cancelled = false;

    const fetchServiceHistory = async () => {
      setServiceHistoryLoading(true);
      setServiceHistoryError(null);
      try {
        const res: any = await authenticatedApi.get(`/api/mtn/request/record/${numericAssetId}`);
        if (cancelled) return;
        const payload = res?.data?.data ?? res?.data ?? [];
        if (Array.isArray(payload)) {
          setServiceHistory(payload as ServiceHistoryRecord[]);
        } else if (!cancelled) {
          setServiceHistory([]);
        }
      } catch {
        if (!cancelled) {
          setServiceHistory([]);
          setServiceHistoryError('Unable to load service history');
        }
      } finally {
        if (!cancelled) setServiceHistoryLoading(false);
      }
    };

    const fetchAssessments = async () => {
      setAssessmentLoading(true);
      setAssessmentError(null);
      setAssessmentSummaries([]);
      setAssessmentDetails([]);
      try {
        const res: any = await authenticatedApi.get(`/api/compliance/assessments/details/ncr?asset=${numericAssetId}&year=${currentYear}`);
        if (cancelled) return;
        const payload = res?.data?.data ?? res?.data ?? [];
        if (Array.isArray(payload)) {
          setAssessmentSummaries(payload as AssessmentSummary[]);
          const detailResults: AssessmentDetail[] = [];
          for (const assessment of payload) {
            if (cancelled) return;
            const details = Array.isArray(assessment?.details) ? assessment.details : [];
            details.forEach((detail: any) => {
              if (!detail || typeof detail !== 'object') return;
              const type = (detail as any).qset_type;
              const ncrValue = Number((detail as any).adt_ncr);
              if ((type === 'NCR' || type === 'ncr') && ncrValue > 0) {
                detailResults.push(detail as AssessmentDetail);
              }
            });
          }
          if (!cancelled) {
            setAssessmentDetails(detailResults);
          }
        } else if (!cancelled) {
          setAssessmentSummaries([]);
          setAssessmentDetails([]);
        }
      } catch {
        if (!cancelled) {
          setAssessmentSummaries([]);
          setAssessmentDetails([]);
          setAssessmentError('Unable to load assessment data');
        }
      } finally {
        if (!cancelled) setAssessmentLoading(false);
      }
    };

    fetchServiceHistory();
    fetchAssessments();

    return () => { cancelled = true; };
  }, [assetId, currentYear]);

  // Load draft (create mode only)
  React.useEffect(() => {
    if (id) return; // do not override edit mode
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || typeof draft !== 'object') return;
      if (draft.requestor) setRequestor((s: any) => ({ ...s, ...draft.requestor }));
      if (draft.assetId) setAssetId(String(draft.assetId));
      if (draft.svcType) setSvcType(String(draft.svcType));
      if (Array.isArray(draft.selectedServiceTypeIds)) setSelectedServiceTypeIds(draft.selectedServiceTypeIds);
      if (typeof draft.remarks === 'string') setRemarks(draft.remarks);
      if (typeof draft.odoStart === 'string') setOdoStart(draft.odoStart);
      if (typeof draft.odoEnd === 'string') setOdoEnd(draft.odoEnd);
      if (typeof draft.lateNotice === 'string') setLateNotice(draft.lateNotice);
    } catch {
      // ignore malformed draft
    }
  }, [id, draftKey]);

  // Persist draft (create mode only, exclude files)
  React.useEffect(() => {
    if (id) return;
    if (typeof window === 'undefined') return;
    const payload = {
      requestor,
      assetId,
      svcType,
      selectedServiceTypeIds,
      remarks,
      odoStart,
      odoEnd,
      lateNotice,
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [id, draftKey, requestor, assetId, svcType, selectedServiceTypeIds, remarks, odoStart, odoEnd, lateNotice]);

  React.useEffect(() => {
    if (!assetId || assessmentDetails.length === 0) {
      setNcrDialogOpen(false);
      setNcrPromptedAsset(null);
      return;
    }
    if (ncrAgreedForAsset === assetId) {
      setNcrDialogOpen(false);
      return;
    }
    if (ncrPromptedAsset !== assetId) {
      setNcrDialogOpen(true);
      setNcrPromptedAsset(assetId);
    }
  }, [assetId, assessmentDetails.length, ncrAgreedForAsset, ncrPromptedAsset]);

  const groupedServiceOptions = React.useMemo(() => {
    if (!serviceOptions.length) return [];
    // exclude options marked for admin appearance
    const visible = serviceOptions.filter((o) => (o.appearance ?? 'user') !== 'admin');
    const groups = new Map<number, { label: string; items: ServiceOption[]; order: number }>();
    visible.forEach((option) => {
      const group = groups.get(option.svcOpt);
      if (group) {
        group.items.push(option);
        // keep the smallest orders as the group order
        const ord = typeof option.orders === 'number' ? option.orders : Number.POSITIVE_INFINITY;
        if (ord < group.order) group.order = ord;
      } else {
        groups.set(option.svcOpt, {
          label: option.group_desc || '',
          items: [option],
          order: typeof option.orders === 'number' ? option.orders : Number.POSITIVE_INFINITY,
        });
      }
    });
    return Array.from(groups.entries())
      .sort((a, b) => {
        const ao = a[1].order;
        const bo = b[1].order;
        if (ao !== bo) return (ao - bo);
        return a[0] - b[0];
      })
      .map(([key, value]) => ({
        key, ...value, items: value.items.sort((i1, i2) => {
          const o1 = typeof i1.orders === 'number' ? i1.orders : Number.POSITIVE_INFINITY;
          const o2 = typeof i2.orders === 'number' ? i2.orders : Number.POSITIVE_INFINITY;
          if (o1 !== o2) return o1 - o2;
          return i1.svcTypeId - i2.svcTypeId;
        })
      }));
  }, [serviceOptions]);

  // Identify Car Wash and NCR groups/options
  const carWashGroupKeys = React.useMemo(() => {
    const visible = serviceOptions.filter((o) => (o.appearance ?? 'user') !== 'admin');
    const keys = new Set<number>();
    visible.forEach((o) => {
      if ((o.group_desc || '').toLowerCase() === 'car wash') keys.add(o.svcOpt);
    });
    if (keys.size === 0) keys.add(2); // fallback to svcOpt 2
    return keys;
  }, [serviceOptions]);


  const handleServiceOptionToggle = React.useCallback((svcTypeId: number, checked: boolean, groupKey?: number) => {
    if (isNcrLocked) return;
    setSelectedServiceTypeIds((prev) => {
      if (checked) {
        if (prev.includes(svcTypeId)) return prev;
        if (!svcType) {
          if (typeof groupKey === 'number') {
            if (carWashGroupKeys.has(groupKey)) setSvcType('1');
            else if (groupKey === 32) setSvcType('3');
            else setSvcType('2');
          } else {
            setSvcType('2');
          }
        }
        return [...prev, svcTypeId];
      }
      return prev.filter((idVal) => idVal !== svcTypeId);
    });
  }, [svcType, carWashGroupKeys, isNcrLocked]);

  const handleAttachmentChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (event.target.value) event.target.value = '';
    if (!files.length) return;
    normalizeAttachments(files);
  }, [normalizeAttachments]);

  const clearAttachments = React.useCallback(() => {
    setAttachments([]);
  }, []);

  const handleFormUploadChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file && !(file.type.startsWith('image/') || file.type === 'application/pdf' || /\.pdf$/i.test(file.name))) {
      toast.error('Only PDF or image files are supported');
      event.target.value = '';
      return;
    }
    setFormUpload(file);
    if (file) {
      const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      setFormUploadDate(timestamp);
    } else {
      setFormUploadDate(null);
    }
    if (event.target.value) event.target.value = '';
  }, []);

  const clearFormUpload = React.useCallback(() => {
    setFormUpload(null);
    setFormUploadDate(null);
    if (formUploadInputRef.current) {
      formUploadInputRef.current.value = '';
    }
  }, []);

  const openFormUploadPicker = React.useCallback(() => {
    formUploadInputRef.current?.click();
  }, []);

  const openFormCameraPicker = React.useCallback(() => {
    formCameraUploadInputRef.current?.click();
  }, []);

  const onFormUploadDrop = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files || [])[0];
    if (!file) return;
    if (!(file.type.startsWith('image/') || file.type === 'application/pdf' || /\.pdf$/i.test(file.name))) {
      toast.error('Only PDF or image files are supported');
      return;
    }
    setFormUpload(file);
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    setFormUploadDate(timestamp);
  }, []);

  const onFormUploadDragOver = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const openCameraPicker = React.useCallback(() => {
    cameraUploadInputRef.current?.click();
  }, []);

  const refetchById = React.useCallback(async () => {
    if (!id) return;
    try {
      const res: any = await authenticatedApi.get(`/api/mtn/request/${id}`);
      const data = res?.data?.data ?? res?.data ?? null;
      setExisting(data);
    } catch {
      // silent fail on refetch
    }
  }, [id]);

  const handleFormUploadSubmit = React.useCallback(async () => {
    if (!id || !formUpload) return;
    setFormUploadSaving(true);
    const uploadDate = formUploadDate || new Date().toISOString().slice(0, 19).replace('T', ' ');
    const formData = new FormData();
    formData.append('form_upload', formUpload);
    formData.append('form_upload_date', uploadDate);
    try {
      const res: any = await authenticatedApi.put(`/api/mtn/request/${id}/form-upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const payload = res?.data?.data ?? res?.data ?? {};
      const uploadedUrl = typeof payload?.form_upload === 'string' ? payload.form_upload : (typeof payload?.url === 'string' ? payload.url : null);
      const uploadedDate = typeof payload?.form_upload_date === 'string' ? payload.form_upload_date : uploadDate;
      setExisting((prev: any) => {
        const base = prev && typeof prev === 'object' ? prev : {};
        return {
          ...base,
          form_upload: uploadedUrl ?? base.form_upload,
          form_upload_date: uploadedDate,
        };
      });
      setFormUpload(null);
      setFormUploadPreview(null);
      setFormUploadDate(uploadedDate);
      if (formUploadInputRef.current) formUploadInputRef.current.value = '';
      toast.success('Maintenance form uploaded successfully');
      // Refetch record to ensure latest status/fields
      await refetchById();
      onSubmitted?.();
    } catch (error) {
      toast.error('Failed to upload maintenance form');
    } finally {
      setFormUploadSaving(false);
    }
  }, [id, formUpload, formUploadDate, refetchById, onSubmitted]);

  const carWashIds = React.useMemo(() => {
    const visible = serviceOptions.filter((o) => (o.appearance ?? 'user') !== 'admin');
    return visible.filter((o) => carWashGroupKeys.has(o.svcOpt)).map((o) => o.svcTypeId);
  }, [serviceOptions, carWashGroupKeys]);

  const ncrIds = React.useMemo(() => {
    const visible = serviceOptions.filter((o) => (o.appearance ?? 'user') !== 'admin');
    return visible.filter((o) => o.svcOpt === 32 || /ncr/i.test(o.group_desc || '')).map((o) => o.svcTypeId);
  }, [serviceOptions]);

  const handleNcrDialogAgree = React.useCallback(() => {
    if (!assetId) return;
    setSvcType('3');
    setSelectedServiceTypeIds(ncrIds);
    if (ncrRemarksText) {
      setRemarks((prev) => {
        if (prev?.includes(ncrRemarksText)) return prev;
        if (!prev) return ncrRemarksText;
        return `${ncrRemarksText}\n\n${prev}`;
      });
    }
    setNcrAgreedForAsset(assetId);
    setNcrDialogOpen(false);
  }, [assetId, ncrIds, ncrRemarksText]);

  // Auto-select logic based on Type of Request
  const prevSvcType = React.useRef<string>('');
  React.useEffect(() => {
    // In edit mode, if we already prefilled selections from backend, don't override
    if (id && selectedServiceTypeIds.length > 0) {
      prevSvcType.current = svcType;
      return;
    }
    // Reset selections only when svcType actually changes (create mode)
    if (svcType === '1') {
      setSelectedServiceTypeIds(carWashIds);
    } else if (svcType === '3') {
      setSelectedServiceTypeIds(ncrIds);
    } else if (svcType === '2') {
      // Clear only on transition into Service from a different type; keep user's manual selections otherwise
      if (prevSvcType.current && prevSvcType.current !== '2') {
        setSelectedServiceTypeIds([]);
      }
      // Auto-check Routine Service on Service selection in create mode, if nothing selected yet
      if (!id && selectedServiceTypeIds.length === 0 && serviceOptions.length > 0) {
        const routine = serviceOptions.find((o) => /servis\s*rutin|routine/i.test(o.svcType || ''));
        if (routine && typeof routine.svcTypeId === 'number') {
          setSelectedServiceTypeIds([routine.svcTypeId]);
        }
      }
    }
    prevSvcType.current = svcType;
  }, [id, svcType, carWashIds, ncrIds, selectedServiceTypeIds.length, serviceOptions]);

  // Reset form when switching vehicle (create mode)
  React.useEffect(() => {
    if (id) {
      prevAssetId.current = assetId;
      return;
    }
    if (!assetId) {
      prevAssetId.current = '';
      return;
    }
    if (prevAssetId.current && prevAssetId.current !== assetId) {
      setSvcType('');
      setSelectedServiceTypeIds([]);
      setRemarks('');
      setOdoStart('');
      setOdoEnd('');
      setLateNotice('');
      setAgree(false);
      setAttachments([]);
      setFormUpload(null);
      setFormUploadDate(null);
      setErrors({});
      setShowErrors(false);
    }
    prevAssetId.current = assetId;
  }, [assetId, id]);

  // Handle vehicle change confirmation
  React.useEffect(() => {
    if (!showVehicleChangeConfirm && pendingAssetId === null) return;
    // cleanup pending if dialog is closed without action
    if (!showVehicleChangeConfirm) {
      setPendingAssetId(null);
    }
  }, [showVehicleChangeConfirm, pendingAssetId]);

  // Previews for attachments
  const [formUploadPreview, setFormUploadPreview] = React.useState<string | null>(null);
  const [previews, setPreviews] = React.useState<string[]>([]);
  const [primaryAttachmentPreview, setPrimaryAttachmentPreview] = React.useState<string | null>(null);
  const [primaryAttachmentIsPdf, setPrimaryAttachmentIsPdf] = React.useState<boolean>(false);
  React.useEffect(() => {
    if (!formUpload) {
      setFormUploadPreview(null);
      return;
    }
    const url = URL.createObjectURL(formUpload);
    setFormUploadPreview(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [formUpload]);
  React.useEffect(() => {
    const urls = attachments
      .filter((f) => f && f.type && f.type.startsWith('image/'))
      .map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [attachments]);
  React.useEffect(() => {
    const primary = attachments[0];
    if (!primary) {
      setPrimaryAttachmentPreview(null);
      setPrimaryAttachmentIsPdf(false);
      return;
    }
    const url = URL.createObjectURL(primary);
    setPrimaryAttachmentPreview(url);
    setPrimaryAttachmentIsPdf(primary.type === 'application/pdf' || /\.pdf$/i.test(primary.name));
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [attachments]);

  // Dropzone events
  const onDropFiles = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    normalizeAttachments(files);
  }, [normalizeAttachments]);

  const onDragOver = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const openAttachmentPreview = React.useCallback((index: number = 0) => {
    if (primaryAttachmentIsPdf && primaryAttachmentPreview) {
      window.open(primaryAttachmentPreview, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!previews || previews.length === 0) return;
    const url = previews[index];
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }, [previews, primaryAttachmentIsPdf, primaryAttachmentPreview]);

  // Derived values for service mileage logic
  const isServiceRequest = svcType === '2';
  const parsedOdoStart = React.useMemo(() => (odoStart.trim() === '' ? NaN : Number(odoStart)), [odoStart]);
  const parsedOdoEnd = React.useMemo(() => (odoEnd.trim() === '' ? NaN : Number(odoEnd)), [odoEnd]);
  const extraMileage = React.useMemo(() => {
    if (!isServiceRequest) return 0;
    if (Number.isNaN(parsedOdoStart) || Number.isNaN(parsedOdoEnd)) return 0;
    // Extra mileage is Current ODO - Service Mileage
    const diff = Math.floor(parsedOdoStart - parsedOdoEnd);
    return diff > 0 ? diff : 0;
  }, [isServiceRequest, parsedOdoStart, parsedOdoEnd]);
  const needsLateNotice = isServiceRequest && extraMileage > 500;
  const reasonRequiredMissing = isServiceRequest && extraMileage > 500 && lateNotice.trim().length === 0;
  const existingReqUploadUrl = React.useMemo(() => {
    const candidate = (existing as any)?.req_upload ?? null;
    return typeof candidate === 'string' && candidate.length > 0 ? candidate : null;
  }, [existing]);
  const existingReqUploadIsPdf = React.useMemo(
    () => (existingReqUploadUrl ? /\.pdf(?:$|\?|#)/i.test(existingReqUploadUrl) : false),
    [existingReqUploadUrl],
  );
  const existingReqUploadIsImage = React.useMemo(
    () => (existingReqUploadUrl ? /\.(png|jpe?g|gif|bmp|webp)(?:$|\?|#)/i.test(existingReqUploadUrl) : false),
    [existingReqUploadUrl],
  );
  const existingFormUploadUrl = React.useMemo(() => {
    if (!existing || typeof existing !== 'object') return null;
    const candidate = (existing as any).form_upload ?? (existing as any).formUpload ?? null;
    return typeof candidate === 'string' && candidate.length > 0 ? candidate : null;
  }, [existing]);
  const existingFormUploadIsPdf = React.useMemo(() => (
    existingFormUploadUrl ? /\.pdf(?:$|\?|#)/i.test(existingFormUploadUrl) : false
  ), [existingFormUploadUrl]);
  const existingFormUploadIsImage = React.useMemo(() => (
    existingFormUploadUrl ? /\.(png|jpe?g|gif|bmp|webp)(?:$|\?|#)/i.test(existingFormUploadUrl) : false
  ), [existingFormUploadUrl]);
  const isApprovedStatus = React.useMemo(() => {
    const statusValue = typeof existing?.status === 'string' ? existing.status.toLowerCase() : '';
    if (statusValue === 'approved') return true;
    const approvalDate = (existing as any)?.approval_date;
    if (typeof approvalDate === 'string' && approvalDate) return true;
    return false;
  }, [existing]);
  const showFormUploadSection = Boolean(id && isApprovedStatus);
  const isCancelledApplication = React.useMemo(() => {
    const statusValue = typeof existing?.status === 'string' ? existing.status.toLowerCase() : '';
    const acceptanceStatus = Number((existing as any)?.acceptance_status);
    return statusValue === 'cancelled' || acceptanceStatus === 2;
  }, [existing]);
  React.useEffect(() => {
    if (!showFormUploadSection) {
      setFormUpload(null);
      if (!existingFormUploadUrl) setFormUploadDate(null);
    }
  }, [showFormUploadSection, existingFormUploadUrl]);
  const formUploadContent = React.useMemo(() => {
    const instructions = (
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="text-sm text-foreground">Drag &amp; drop image or PDF here</div>
        <div className="text-sm">or</div>
        <div className="flex w-full max-w-lg items-center gap-2">
          <Input
            type="file"
            accept="application/pdf,image/*"
            onChange={handleFormUploadChange}
            className="w-full"
          />
          <Button
            type="button"
            variant="default"
            onClick={openFormCameraPicker}
            className="shrink-0"
            aria-label="Capture maintenance form via camera"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="text-xs max-w-xs text-muted-foreground">
          Supports PDF or images (gallery or camera).
        </div>
      </div>
    );

    const renderExistingPreview = () => {
      if (!existingFormUploadUrl) return null;
      if (existingFormUploadIsPdf) {
        return (
          <div className="relative w-full text-foreground">
            <object data={existingFormUploadUrl} type="application/pdf" className="w-full h-60 rounded-md border bg-background">
              <p className="p-3 text-sm">
                Unable to preview PDF.
                {' '}
                <a
                  href={existingFormUploadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline"
                  aria-label="Download maintenance form"
                >
                  <Download className="h-4 w-4" />
                </a>
                .
              </p>
            </object>
            <div className="absolute left-3 top-3">
              <a
                href={existingFormUploadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs underline"
                aria-label="Download maintenance form"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          </div>
        );
      }
      if (existingFormUploadIsImage) {
        return (
          <div className="relative w-full text-foreground">
            <img src={existingFormUploadUrl} alt="Maintenance form" className="w-full max-h-60 object-contain rounded-md border bg-background" />
            <div className="absolute left-3 top-3">
              <a
                href={existingFormUploadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs underline"
                aria-label="Download maintenance form"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm">Preview unavailable for this file type.</div>
          <a
            href={existingFormUploadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm underline"
            aria-label="Download maintenance form"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      );
    };

    if (formUpload && formUploadPreview) {
      const isPdf = formUpload.type === 'application/pdf';
      return (
        <div className="w-full space-y-4 text-foreground">
          {instructions}
          <div className="relative w-full">
            <Button
              type="button"
              onClick={clearFormUpload}
              className="absolute right-1.5 top-1.5 rounded-full bg-red-500 p-1 text-white transition hover:bg-red-500"
              aria-label="Remove selected file"
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="space-y-2">
              <div className="text-sm font-medium wrap-break-words">{formUpload.name}</div>
              {isPdf ? (
                <object data={formUploadPreview} type="application/pdf" className="w-full h-60 rounded-md border bg-background">
                  <p className="p-3 text-sm">
                    Unable to preview PDF.
                    {' '}
                    <a
                      href={formUploadPreview}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 underline"
                      aria-label="Download maintenance form"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    .
                  </p>
                </object>
              ) : (
                <img src={formUploadPreview} alt="Maintenance form preview" className="w-full max-h-60 object-contain rounded-md border bg-background" />
              )}
            </div>
          </div>
        </div>
      );
    }

    if (existingFormUploadUrl) {
      return (
        <div className="w-full space-y-4">
          {instructions}
          {renderExistingPreview()}
        </div>
      );
    }

    return (
      <div className="w-full space-y-3 text-muted-foreground">
        {instructions}
      </div>
    );
  }, [clearFormUpload, existingFormUploadIsImage, existingFormUploadIsPdf, existingFormUploadUrl, formUpload, formUploadPreview, handleFormUploadChange, openFormCameraPicker]);

  // Reset odo fields when not service request
  React.useEffect(() => {
    if (!isServiceRequest) {
      setOdoStart('');
      setOdoEnd('');
      setLateNotice('');
      setFormUpload(null);
      setFormUploadDate(null);
    }
  }, [isServiceRequest]);

  if (isCreateMode && !canCreate) {
    return (
      <div className="p-4 rounded-md border border-amber-200 bg-amber-50 text-amber-800">
        You do not have permission to create vehicle maintenance requests.
      </div>
    );
  }

  if (!isCreateMode && !canView && !canUpdate) {
    return (
      <div className="p-4 rounded-md border border-amber-200 bg-amber-50 text-amber-800">
        You do not have permission to view this vehicle maintenance request.
      </div>
    );
  }

  return (
    <div className="relative">
      {submitting && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-slate-800 shadow-lg dark:bg-slate-800 dark:text-slate-100">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div className="text-sm font-medium">Uploading attachments... please wait</div>
          </div>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle className='text-lg'>
              {id ? `Vehicle Maintenance Request #${id}` : 'Vehicle Maintenance Request Form'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            {/* Requestor Section */}
            <div>
              <div className="font-semibold mb-2">Requestor</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <Label>Application Date</Label>
                  <Input readOnly value={formatDMY(requestor.application_date)} />
                </div>
                <div>
                  <Label>Department</Label>
                  <Input readOnly value={requestor?.department?.name || requestor?.department?.code || ''} />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input readOnly value={requestor.name} />
                </div>
                <div>
                  <Label>Ramco ID</Label>
                  <Input readOnly value={requestor.ramco_id} />
                </div>
                <div>
                  <Label>Contact No</Label>
                  <Input readOnly value={requestor.contact} />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input readOnly value={requestor?.location?.code || requestor?.location?.name || ''} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Vehicle + Type of Request */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div ref={vehicleRef}>
                  <Label>Select Vehicle</Label>
                  <SingleSelect
                    options={vehicleOptions}
                    value={assetId}
                    onValueChange={(val) => {
                      if (id) { setAssetId(val); return; }
                      if (prevAssetId.current && prevAssetId.current !== val) {
                        setPendingAssetId(val);
                        setShowVehicleChangeConfirm(true);
                        return;
                      }
                      setAssetId(val);
                    }}
                    placeholder="Select vehicle"
                    className={showErrors && errors.asset ? 'ring-1 ring-red-500' : ''}
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <Label>Type of Request</Label>
                  <RadioGroup
                    ref={svcTypeRef as any}
                    value={svcType}
                    onValueChange={handleSvcTypeChange}
                    className={[
                      'mt-2 grid grid-cols-3 gap-2',
                      showErrors && errors.svcType ? 'ring-1 ring-red-500 rounded-md p-1' : '',
                      isReadOnly || isNcrLocked ? 'pointer-events-none opacity-70' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="svc1" value="1" disabled={isReadOnly || isNcrLocked} />
                      <Label htmlFor="svc1">Car Wash</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="svc2" value="2" disabled={isReadOnly || isNcrLocked} />
                      <Label htmlFor="svc2">Service</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="svc3" value="3" disabled={isReadOnly || isNcrLocked} />
                      <Label htmlFor="svc3">NCR Compliance</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
                <div>
                  <Label htmlFor="vehicle-mtn-odo-start">Current ODO {isServiceRequest && <span className="text-red-500">*</span>}</Label>
                  <Input
                    id="vehicle-mtn-odo-start"
                    type="number"
                    inputMode="numeric"
                    value={odoStart}
                    onChange={(e) => setOdoStart(e.target.value)}
                    placeholder="e.g. 15000"
                    disabled={!isServiceRequest || isReadOnly}
                    className={showErrors && errors.odoStart ? 'ring-1 ring-red-500' : ''}
                    ref={odoStartRef}
                  />
                </div>
                <div>
                  <Label htmlFor="vehicle-mtn-odo-end">Service Mileage {isServiceRequest && <span className="text-red-500">*</span>}</Label>
                  <Input
                    id="vehicle-mtn-odo-end"
                    type="number"
                    inputMode="numeric"
                    value={odoEnd}
                    onChange={(e) => setOdoEnd(e.target.value)}
                    placeholder="e.g. 15250"
                    disabled={!isServiceRequest || isReadOnly}
                    className={showErrors && errors.odoEnd ? 'ring-1 ring-red-500' : ''}
                    ref={odoEndRef}
                  />
                </div>
              </div>
              {isServiceRequest && (
                <div className="text-xs text-muted-foreground">
                  {extraMileage > 0 ? (
                    <>
                      Extra mileage: <span className="font-medium text-foreground">{extraMileage} km</span>
                      {needsLateNotice && (
                        <span className="ml-2 text-red-600 font-medium">Warning: exceeds 500 km</span>
                      )}
                    </>
                  ) : (
                    'Enter Current ODO and Service Mileage to calculate extra mileage.'
                  )}
                </div>
              )}
              {needsLateNotice && (
                <div className="space-y-2">
                  <Label htmlFor="vehicle-mtn-late-notice">Late Notice <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="vehicle-mtn-late-notice"
                    placeholder="Provide reason for exceeding 500 km interval"
                    value={lateNotice}
                    onChange={(e) => setLateNotice(e.target.value)}
                    className={showErrors && errors.lateNotice ? 'ring-1 ring-red-500' : ''}
                    ref={lateNoticeRef}
                  />
                </div>
              )}
            </div>

            {/* Service Options */}
            <div className="space-y-3" ref={svcContainerRef}>
              <div className="font-semibold">Service Options</div>
              {serviceOptionsLoading ? (
                <div className="text-sm text-muted-foreground">Loading service options...</div>
              ) : serviceOptionsError ? (
                <div className="text-sm text-red-600">{serviceOptionsError}</div>
              ) : groupedServiceOptions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No service options available.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {groupedServiceOptions.map(({ key, label, items }) => {
                    const anyChecked = items.some((opt) => selectedServiceTypeIds.includes(opt.svcTypeId));
                    const disabledCard =
                      (isReadOnly || isNcrLocked || !assetId || !svcType)
                        ? true // guide user: select vehicle and type first
                        : svcType === '1'
                          ? !carWashGroupKeys.has(key)
                          : svcType === '3'
                            ? key !== 32
                            : // svcType === '2' (Service)
                            (reasonRequiredMissing ? true : key === 32);
                    return (
                      <div
                        key={key}
                        className={[
                          'space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm transition ring-offset-background',
                          anyChecked ? 'ring-2 ring-red-500' : '',
                          disabledCard ? 'opacity-50 pointer-events-none' : '',
                          showErrors && errors.serviceOptions ? 'ring-2 ring-red-500' : '',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                          <span>{label || 'Service Level'}</span>
                        </div>
                        <div className="space-y-1">
                          {items.map((option) => (
                            <label
                              key={option.svcTypeId}
                              htmlFor={`svc-option-${option.svcTypeId}`}
                              className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/40 transition-colors"
                            >
                              <Checkbox
                                id={`svc-option-${option.svcTypeId}`}
                                checked={selectedServiceTypeIds.includes(option.svcTypeId)}
                                disabled={disabledCard}
                                onCheckedChange={(checked) => handleServiceOptionToggle(option.svcTypeId, Boolean(checked), key)}
                              />
                              <span className="text-sm">{option.svcType}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Remarks & Attachments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="vehicle-mtn-remarks">Remarks</Label>
                <Textarea
                  id="vehicle-mtn-remarks"
                  placeholder="Add any remarks for this request"
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  disabled={isReadOnly}
                  className="h-40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle-mtn-attachments">Attachments</Label>
                {isReadOnly && existingReqUploadUrl ? (
                  <div className="rounded-md border bg-muted/20 p-2">
                    {existingReqUploadIsPdf ? (
                      <object data={existingReqUploadUrl} type="application/pdf" className="h-72 w-full rounded-md border bg-background">
                        <p className="text-sm">
                          Unable to preview PDF.
                          {' '}
                          <a href={existingReqUploadUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline" aria-label="Download attachment">
                            <Download className="h-4 w-4" />
                          </a>
                          .
                        </p>
                      </object>
                    ) : existingReqUploadIsImage ? (
                      <a href={existingReqUploadUrl} target="_blank" rel="noreferrer">
                        <img src={existingReqUploadUrl} alt="Attachment" className="w-full max-h-72 object-contain rounded-md" />
                      </a>
                    ) : (
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        <span>Attachment available.</span>
                        <a
                          href={existingReqUploadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 underline"
                          aria-label="Download attachment"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                <div
                  onDrop={onDropFiles}
                  onDragOver={onDragOver}
                  className={`${attachments.length > 0 ? 'relative h-72 rounded-md border border-muted-foreground/40 bg-muted/20 overflow-hidden' : 'h-40 rounded-md border border-dashed border-muted-foreground/40 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground p-3 bg-muted/20'}`}
                >
                  {attachments.length === 0 ? (
                    <>
                      <div className="text-sm">Drag & drop images or PDF here</div>
                      <div className="text-sm">or</div>
                      <div className="flex gap-2">
                        <Input
                          id="vehicle-mtn-attachments"
                          type="file"
                          multiple
                          accept="image/*,application/pdf"
                          onChange={handleAttachmentChange}
                        />
                        <Input
                          ref={cameraUploadInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleAttachmentChange}
                        />
                        <div className="flex gap-2">
                          <Button onClick={openCameraPicker} className="w-full flex items-center justify-center gap-2">
                            <Camera className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        onClick={clearAttachments}
                        className="absolute right-1.5 top-1.5 z-10 rounded-full bg-red-500 p-1 text-white transition hover:bg-red-500"
                        aria-label="Remove selected attachments"
                        size="icon"
                      >
                    <X className="h-5 w-5" />
                  </Button>
                      {primaryAttachmentIsPdf && primaryAttachmentPreview ? (
                        <>
                          <object
                            data={primaryAttachmentPreview}
                            type="application/pdf"
                            className="absolute inset-0 h-full w-full rounded-md bg-background"
                          >
                            <p className="p-4 text-sm text-muted-foreground">
                              Unable to preview PDF.
                              {' '}
                              <button type="button" className="underline" onClick={() => openAttachmentPreview()}>
                                Open PDF
                              </button>
                              .
                            </p>
                          </object>
                          <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
                            {attachments.length} file{attachments.length === 1 ? '' : 's'} selected
                          </div>
                        </>
                      ) : previews.length > 0 ? (
                        <>
                          <img
                            src={previews[0]}
                            alt="attachment-preview"
                            className="absolute inset-0 w-full h-full object-contain cursor-zoom-in"
                            onClick={() => openAttachmentPreview(0)}
                          />
                          {attachments.length > 1 && (
                            <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
                              {attachments.length} images selected
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">No preview available</div>
                      )}
                    </>
                  )}
                </div>)}
              </div>
            </div>

            

            {/* Create vs Readonly Actions */}
            {isReadOnly ? (
              <div className="space-y-3 mt-4">
                <Separator />
                <div className="space-y-2">
                  <div className="font-semibold text-red-500">Cancel Application</div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox id="vehicle-mtn-cancel" checked={cancelChecked} onCheckedChange={(v)=>setCancelChecked(Boolean(v))} />
                    <span className='text-red-500'>Request cancellation (driver)</span>
                  </label>
                  <Textarea
                    placeholder="Provide justification for cancellation"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className={["h-24", cancelChecked && !cancelReason.trim() ? 'ring-1 ring-red-500' : ''].join(' ')}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowBackConfirm(true)}>Back</Button>
                    <Button
                      onClick={async () => {
                        if (!cancelChecked) { toast.error('Tick to confirm cancellation'); return; }
                        if (!cancelReason.trim()) { toast.error('Provide cancellation justification'); return; }
                        try {
                          await authenticatedApi.put(`/api/mtn/request/${id}/cancel`, {
                            req_id: Number(id),
                            drv_stat: 2,
                            drv_cancel_comment: cancelReason,
                            drv_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
                          });
                          setSuccessTitle('Application Cancelled');
                          setSuccessDescription('Your cancellation request has been submitted.');
                          setShowSuccess(true);
                          if (typeof window !== 'undefined') {
                            try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
                          }
                          onSubmitted?.();
                        } catch (e) {
                          toast.error('Failed to cancel application');
                        }
                      }}
                      disabled={!cancelChecked || !cancelReason.trim() || isCancelledApplication}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Cancel Application
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox id="vehicle-mtn-agree" checked={agree} onCheckedChange={(v) => setAgree(Boolean(v))} />
                  <span>I confirm the information provided is accurate.</span>
                </label>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowBackConfirm(true)}>Back</Button>
                  <Button
                    onClick={attemptSubmit}
                    disabled={
                      !assetId ||
                      (!svcType && selectedServiceTypeIds.length === 0) ||
                      !agree ||
                      (selectedServiceTypeIds.length === 0) ||
                      (isServiceRequest && (odoStart === '' || odoEnd === '' || Number.isNaN(parsedOdoStart) || Number.isNaN(parsedOdoEnd) || (extraMileage > 500 && lateNotice.trim().length === 0))) ||
                      (hasActiveNcr && !isNcrLocked) ||
                      submitting
                    }
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Done'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {showFormUploadSection && (
              <>
                <Separator />

                {/* Maintenance Form Upload */}
                <div ref={formUploadRef} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold">
                      Maintenance Form Upload
                    </div>
                    {formUploadDate && (
                      <Badge variant="outline">
                        Selected {formatDMYHM(formUploadDate)}
                      </Badge>
                    )}
                  </div>
                  <Input
                    ref={formUploadInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={handleFormUploadChange}
                  />
                  <Input
                    ref={formCameraUploadInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFormUploadChange}
                  />
                  <div
                    className={[
                      'rounded-md border-2 border-dashed border-yellow-400 bg-yellow-100/20 p-4 min-h-40 flex items-center justify-center w-full',
                      showErrors && errors.formUpload ? 'border-red-500 ring-1 ring-red-500/50' : 'border-muted-foreground/40',
                      !formUpload && !existingFormUploadUrl ? 'border-dashed' : '',
                    ].filter(Boolean).join(' ')}
                    onDrop={onFormUploadDrop}
                    onDragOver={onFormUploadDragOver}
                  >
                    {formUploadContent}
                  </div>
                  {showErrors && errors.formUpload && (
                    <div className="text-xs text-red-500">
                      Workshop maintenance form is required once the request is approved.
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (onClose) onClose();
                        else if (typeof window !== 'undefined') window.history.back();
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={handleFormUploadSubmit}
                      disabled={!formUpload || formUploadSaving}
                    >
                      {formUploadSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Upload Form
                    </Button>
                  </div>
                </div>
              </>
            )}

          </CardContent>
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>Application Status & History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {/* Status section on top */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Verification</span>
                {existing?.verification_date ? (
                  <Badge className="bg-green-100 text-green-700">Verified</Badge>
                ) : (
                  <Badge variant="secondary">Pending</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Recommendation</span>
                {existing?.recommendation_date ? (
                  <Badge className="bg-green-100 text-green-700">Recommended</Badge>
                ) : (
                  <Badge variant="secondary">Pending</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Approval</span>
                {existing?.approval_date ? (
                  <Badge className="bg-green-100 text-green-700">Approved</Badge>
                ) : (
                  <Badge variant="secondary">Pending</Badge>
                )}
              </div>
            </div>
            <Separator />
            {/* Previous services section */}
            <div className="space-y-3">
              {!assetId ? (
                <p className="text-sm text-muted-foreground">Select a vehicle to view previous services.</p>
              ) : serviceHistoryLoading ? (
                <p className="text-sm text-muted-foreground">Loading service history...</p>
              ) : serviceHistoryError ? (
                <p className="text-sm text-red-600">{serviceHistoryError}</p>
              ) : serviceHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No service records found for this vehicle.</p>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">
                    Total previous services:{' '}
                    <span className="font-semibold text-foreground">{serviceHistory.length}</span>
                  </div>
                  <div className="space-y-3 max-h-130 overflow-y-auto pr-1 hide-scrollbar">
                    {serviceHistory.map((record) => (
                      <div
                        key={record.req_id}
                        className={`rounded-md border border-border p-3 ${
                          (() => {
                            const status = String(record.application_status || record.status || '').toLowerCase();
                            const rejected = new Set(['verification_rejected', 'recommendation_rejected', 'approval_rejected', 'cancelled']);
                            return rejected.has(status) ? 'bg-red-100 border-red-300' : 'bg-sky-100 dark:bg-gray-800';
                          })()
                        }`}
                      >
                        <div className="flex items-center justify-between text-sm font-semibold">
                          <span className="flex items-center gap-2">
                            Request #{record.req_id}
                            {String(id ?? '') === String(record.req_id ?? '') && (
                              <Badge className="bg-amber-100 text-amber-700">Current</Badge>
                            )}
                          </span>
                          <span className="text-xs font-normal">
                            {formatDMY(record.req_date)} · {formatRelativeYM(record.req_date)}
                          </span>
                        </div>
                        {record.svc_type && record.svc_type.length > 0 && (
                          <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
                            {record.svc_type.map((svc, idx) => (
                              <li key={`${record.req_id}-${svc?.id ?? svc?.svcTypeId ?? idx}`}>
                                {svc?.name || svc?.svcType || ''}
                              </li>
                            ))}
                          </ul>
                        )}
                        {(record.odo_start || record.odo_end || record.mileage) && (
                          <div className="mt-2 text-xs">
                            Odo: {record.odo_start ?? '-'} → {record.odo_end ?? '-'} · Mileage: {record.mileage ?? '-'} km
                          </div>
                        )}
                        {record.invoice && (record.invoice.inv_date || record.invoice.inv_total) && (
                          <div className="mt-1 text-xs">
                            Invoice: {record.invoice.inv_date ? formatDMY(String(record.invoice.inv_date)) : '-'}
                          </div>
                        )}
                        {(() => {
                          const uploadUrl = record.form_upload;
                          const uploadDate = record.form_upload_date;
                          if (!uploadDate) return null;
                          const badge = (
                            <Badge variant="default" className="bg-emerald-600 text-white text-[10px] hover:bg-emerald-700">
                              Form Uploaded on {formatDMY(uploadDate)}
                            </Badge>
                          );
                          return (
                            <div className="mt-1">
                              {uploadUrl ? (
                                <a href={uploadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                                  {badge}
                                </a>
                              ) : (
                                <span className="inline-flex">{badge}</span>
                              )}
                            </div>
                          );
                        })()}
                        {(() => {
                          const status = String(record.application_status || record.status || '').toLowerCase();
                          const rejected = new Set(['verification_rejected', 'recommendation_rejected', 'approval_rejected', 'cancelled']);
                          if (rejected.has(status)) {
                            return <p className="mt-1 text-xs font-semibold text-red-700">Verification Status: Rejected</p>;
                          }
                          return null;
                        })()}
                        {record.req_comment && (
                          <p className="mt-2 text-xs">Comment: {record.req_comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground">Vehicle Assessment NCR Findings ({currentYear})</div>
              {!assetId ? (
                <p className="text-sm text-muted-foreground">Select a vehicle to check NCR compliance.</p>
              ) : assessmentLoading ? (
                <p className="text-sm text-muted-foreground">Checking compliance assessments...</p>
              ) : assessmentError ? (
                <p className="text-sm text-red-600">{assessmentError}</p>
              ) : assessmentDetails.length > 0 ? (
                <ul className="list-disc list-inside space-y-3 text-sm text-muted-foreground">
                  {assessmentDetails.map((detail, index) => (
                    <li key={`ncr-detail-${detail.adt_id ?? index}`}>
                      <div className="space-y-1">
                        <span>{detail.qset_desc || 'NCR Issue'}</span>
                        {detail.adt_image && (
                          <a href={detail.adt_image} target="_blank" rel="noreferrer">
                            <img
                              src={detail.adt_image}
                              alt={detail.qset_desc || 'NCR attachment'}
                              className="max-h-32 max-w-55 rounded border border-border object-cover"
                            />
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : assessmentSummaries.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Assessments found for {currentYear}, no NCR issues reported.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No compliance assessments found for {currentYear}.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar { width: 0; height: 0; }
        .hide-scrollbar:hover::-webkit-scrollbar { width: 6px; height: 6px; }
        .hide-scrollbar { scrollbar-width: none; }
        .hide-scrollbar:hover { scrollbar-width: thin; }
      `}</style>

      {/* Vehicle change confirmation */}
      <AlertDialog open={showVehicleChangeConfirm} onOpenChange={(o) => { if (!o) { setShowVehicleChangeConfirm(false); setPendingAssetId(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing vehicle will clear the current form selections and inputs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowVehicleChangeConfirm(false); setPendingAssetId(null); }}>Stay</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (pendingAssetId !== null) {
                  setAssetId(pendingAssetId);
                }
                setShowVehicleChangeConfirm(false);
                setPendingAssetId(null);
              }}
            >
              Change Vehicle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Back confirmation dialog */}
      <AlertDialog open={showBackConfirm} onOpenChange={setShowBackConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this form?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be lost if you leave without submitting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowBackConfirm(false)}>Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowBackConfirm(false);
                onClose?.();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terms & Conditions Alert shown on open */}
      <AlertDialog open={termsOpen} onOpenChange={setTermsOpen}>
        <AlertDialogContent className="sm:max-w-2xl max-w-[calc(100%-2rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Terma & Syarat</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="max-h-[70vh] overflow-y-auto text-base sm:text-lg leading-relaxed space-y-4">
                <p>Mohon baca dan fahami terma berikut sebelum meneruskan.</p>
                <ol className="list-decimal pl-6 space-y-3">
                  <li>
                    Setelah servis kenderaan selesai, pemohon DIWAJIBKAN memuat naik borang yang telah diisi oleh
                    bengkel serta-merta, melalui aplikasi ADMS4 yang sama digunakan semasa memohon.
                  </li>
                  <li>
                    Kegagalan pemohon memuatnaik borang akan mengakibatkan pemohon mengalami kesulitan bagi
                    permohonan servis seterusnya.
                  </li>
                </ol>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleTermsDecline}>Tidak Setuju</AlertDialogCancel>
            <AlertDialogAction onClick={handleTermsAgree}>Setuju</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
      </AlertDialog>

      <Dialog open={ncrDialogOpen} onOpenChange={(open) => setNcrDialogOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Outstanding NCR Findings</DialogTitle>
            <DialogDescription>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Company policy requires all non-compliance findings to be resolved before a new maintenance request can proceed.
                  Please confirm that you will address the following NCR findings before submitting the request.
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {ncrIssuesList.map((issue, index) => (
                    <li key={`ncr-dialog-${index}`}>{issue}</li>
                  ))}
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNcrDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleNcrDialogAgree}>Agree</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{successTitle}</DialogTitle>
            <DialogDescription>
              {successDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => { setShowSuccess(false); onClose?.(); }}>Back to parent</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehicleMtnForm;
