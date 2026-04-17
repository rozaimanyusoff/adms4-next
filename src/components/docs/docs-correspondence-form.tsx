'use client';

import { ChangeEvent, useContext, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { authenticatedApi } from '@/config/api';
import { FileText, UploadCloud, X } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { toast } from 'sonner';
import type { Direction, Priority } from './correspondence-tracking-data';
import { AuthContext } from '@/store/AuthContext';

export type CorrespondenceRegistryFormValues = {
    reference_no: string;
    date_received: string;
    letter_date: string;
    sender: string;
    sender_ref: string;
    document_cover_page: boolean;
    document_full_letters: boolean;
    document_claim_attachment: boolean;
    document_others: boolean;
    document_others_specify: string;
    subject: string;
    direction: Direction;
    registered_at: string;
    registered_by: string;
};

type CorrespondenceWorkflowValues = {
    qa_review_date: string;
    qa_reviewed_by: string;
    qa_status: string;
    letter_type: string;
    category: string;
    priority: Priority;
    remarks: string;
    endorsed_by: string;
    endorsed_at: string;
    endorsed_remarks: string;
    endorsed_status: string;
};

export type CorrespondenceFormValues = CorrespondenceRegistryFormValues & CorrespondenceWorkflowValues;

type QaRecipient = { ramco_id: string; department_id: number | null; department_name: string };
type EmployeeOption = { value: string; label: string; departmentId: number | null; departmentName: string };

type AttachmentItem = {
    id: string;
    file?: File;
    fileName: string;
    fileSize: number;
    fileType: string;
    previewUrl?: string;
    pdfPageCount?: number;
    fromObjectUrl?: boolean;
};

type CorrespondenceRegistryPayload = {
    id?: string | number;
    reference_no: string | null;
    date_received: string | null;
    letter_date: string | null;
    sender: string;
    sender_ref: string | null;
    document_cover_page: number;
    document_full_letters: number;
    document_claim_attachment: number;
    document_others: number;
    document_others_specify: string | null;
    subject: string;
    direction: Direction;
    registered_at: string | null;
    registered_by: string | null;
    attachment_filename: string | null;
    attachment_mime_type: string | null;
    attachment_size: number | null;
    attachment_pdf_page_count: number | null;
    attachment_file_path: string | null;
};

type CorrespondenceInitialAttachment = {
    filePath: string;
    fileName?: string | null;
    mimeType?: string | null;
    fileSize?: number | null;
    pdfPageCount?: number | null;
};

type CorrespondenceFormProps = {
    mode?: 'create' | 'edit';
    workflowAction?: 'registry' | 'qa' | 'endorsement';
    recordId?: string | number;
    recordSlug?: string;
    showCardHeader?: boolean;
    initialValues?: CorrespondenceFormValues;
    initialAttachment?: CorrespondenceInitialAttachment | null;
    initialRecipients?: Array<{ ramco_id: string; department_id: number | null }>;
    onCancel: () => void;
    onSubmit?: () => void | Promise<void>;
    onValuesChange?: (values: CorrespondenceFormValues) => void;
};

const emptyRegistryFormValues: CorrespondenceRegistryFormValues = {
    reference_no: '',
    date_received: '',
    letter_date: '',
    sender: '',
    sender_ref: '',
    document_cover_page: false,
    document_full_letters: false,
    document_claim_attachment: false,
    document_others: false,
    document_others_specify: '',
    subject: '',
    direction: 'incoming',
    registered_at: '',
    registered_by: '',
};

const emptyWorkflowFormValues: CorrespondenceWorkflowValues = {
    qa_review_date: '',
    qa_reviewed_by: '',
    qa_status: '',
    letter_type: '',
    category: '',
    priority: 'normal',
    remarks: '',
    endorsed_by: '',
    endorsed_at: '',
    endorsed_remarks: '',
    endorsed_status: '',
};

const emptyFormValues: CorrespondenceFormValues = {
    ...emptyRegistryFormValues,
    ...emptyWorkflowFormValues,
};

const stripQaValues = (formValues: CorrespondenceFormValues): CorrespondenceFormValues => ({
    ...formValues,
    qa_review_date: '',
    qa_reviewed_by: '',
    qa_status: '',
    letter_type: '',
    category: '',
    priority: 'normal',
    remarks: '',
    endorsed_by: '',
    endorsed_at: '',
    endorsed_remarks: '',
    endorsed_status: '',
});


const CREATE_DRAFT_STORAGE_KEY = 'docs.correspondence.create-draft.v1';

const toSqlDatetime = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    const seconds = String(value.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const normalizeSqlDatetime = (value?: string | null) => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
        return value;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return toSqlDatetime(parsed);
};

export const CorrespondenceForm = ({
    mode = 'create',
    workflowAction = 'registry',
    recordId,
    recordSlug,
    showCardHeader = true,
    initialValues,
    initialAttachment,
    initialRecipients,
    onCancel,
    onSubmit,
    onValuesChange,
}: CorrespondenceFormProps) => {
    const attachmentInputRef = useRef<HTMLInputElement | null>(null);
    const localUpdateRef = useRef(false);
    const draftHydratedRef = useRef(false);
    const auth = useContext(AuthContext);
    const currentUsername = auth?.authData?.user?.username || null;
    const [values, setValues] = useState<CorrespondenceFormValues>({
        ...emptyFormValues,
        ...(initialValues ?? {}),
    });
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
    const [qaRecipients, setQaRecipients] = useState<QaRecipient[]>([{ ramco_id: '', department_id: null, department_name: '' }]);
    const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
    const employeeOptionsRef = useRef<EmployeeOption[]>([]);
    const [endorsementPriorityOverride, setEndorsementPriorityOverride] = useState<Priority | null>(null);
    const [endorsementRemarks, setEndorsementRemarks] = useState('');
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [successDialogOpen, setSuccessDialogOpen] = useState(false);
    const [isRegistryEditing, setIsRegistryEditing] = useState(mode === 'create');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const registryEditable = mode === 'create' || isRegistryEditing;

    useEffect(() => {
        if (localUpdateRef.current) {
            localUpdateRef.current = false;
            return;
        }
        let nextValues = {
            ...emptyFormValues,
            ...(initialValues ?? {}),
        };
        if (mode === 'create' && !draftHydratedRef.current) {
            draftHydratedRef.current = true;
            try {
                const raw = localStorage.getItem(CREATE_DRAFT_STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw) as Partial<CorrespondenceFormValues>;
                    nextValues = { ...nextValues, ...parsed };
                }
            } catch {
                localStorage.removeItem(CREATE_DRAFT_STORAGE_KEY);
            }
        }
        if (mode === 'create') {
            nextValues = stripQaValues(nextValues);
        }
        setValues(nextValues);
    }, [initialValues, mode]);

    useEffect(() => {
        if (mode !== 'create') return;
        localStorage.setItem(CREATE_DRAFT_STORAGE_KEY, JSON.stringify(values));
    }, [mode, values]);

    useEffect(() => {
        return () => {
            attachments.forEach((item) => {
                if (item.previewUrl && item.fromObjectUrl) URL.revokeObjectURL(item.previewUrl);
            });
        };
    }, [attachments]);

    useEffect(() => {
        if (workflowAction !== 'qa') return;
        authenticatedApi.get('/api/assets/employees?status=active').then((res: any) => {
            const raw = res?.data;
            const list: any[] = Array.isArray(raw?.data)
                ? raw.data
                : Array.isArray(raw?.items)
                    ? raw.items
                    : Array.isArray(raw?.data?.items)
                        ? raw.data.items
                        : Array.isArray(raw)
                            ? raw
                            : [];
            const seen = new Set<string>();
            const opts: EmployeeOption[] = [];
            list.forEach((item: any) => {
                const val = String(item?.ramco_id ?? item?.id ?? '').trim();
                if (!val || seen.has(val)) return;
                seen.add(val);
                const deptId = item?.department?.id ?? item?.department_id ?? null;
                opts.push({
                    value: val,
                    label: String(item?.full_name ?? item?.name ?? val),
                    departmentId: deptId != null ? Number(deptId) : null,
                    departmentName: String(item?.department?.name ?? item?.department_name ?? ''),
                });
            });
            employeeOptionsRef.current = opts;
            setEmployeeOptions(opts);
        }).catch(() => { employeeOptionsRef.current = []; setEmployeeOptions([]); });
    }, [workflowAction]);

    useEffect(() => {
        if (!initialRecipients || initialRecipients.length === 0) return;
        setQaRecipients(
            initialRecipients.map((r) => ({
                ramco_id: String(r.ramco_id ?? ''),
                department_id: r.department_id ?? null,
                department_name: employeeOptionsRef.current.find((o) => o.value === String(r.ramco_id ?? ''))?.departmentName ?? '',
            }))
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialRecipients]);

    useEffect(() => {
        let cancelled = false;

        const loadInitialAttachment = async () => {
            if (mode !== 'edit' || !initialAttachment?.filePath) return;

            const fallbackItem: AttachmentItem = {
                id: `existing-${initialAttachment.filePath}`,
                fileName: initialAttachment.fileName || initialAttachment.filePath.split('/').pop() || 'attachment.pdf',
                fileSize: initialAttachment.fileSize ?? 0,
                fileType: initialAttachment.mimeType || 'application/pdf',
                previewUrl: initialAttachment.filePath,
                pdfPageCount: initialAttachment.pdfPageCount ?? undefined,
                fromObjectUrl: false,
            };

            try {
                const response = await authenticatedApi.get(initialAttachment.filePath, { responseType: 'blob' });
                if (cancelled) return;
                const blob = response.data as Blob;
                const fileName = fallbackItem.fileName;
                const fileType = blob.type || fallbackItem.fileType;
                const file = new File([blob], fileName, { type: fileType });
                const previewUrl = URL.createObjectURL(blob);
                setAttachments((prev) => {
                    prev.forEach((entry) => {
                        if (entry.previewUrl && entry.fromObjectUrl) URL.revokeObjectURL(entry.previewUrl);
                    });
                    return [
                        {
                            id: fallbackItem.id,
                            file,
                            fileName,
                            fileSize: blob.size || fallbackItem.fileSize,
                            fileType,
                            previewUrl,
                            pdfPageCount: initialAttachment.pdfPageCount ?? undefined,
                            fromObjectUrl: true,
                        },
                    ];
                });
            } catch {
                if (cancelled) return;
                setAttachments((prev) => {
                    prev.forEach((entry) => {
                        if (entry.previewUrl && entry.fromObjectUrl) URL.revokeObjectURL(entry.previewUrl);
                    });
                    return [fallbackItem];
                });
            }
        };

        setAttachments((prev) => {
            prev.forEach((entry) => {
                if (entry.previewUrl && entry.fromObjectUrl) URL.revokeObjectURL(entry.previewUrl);
            });
            return [];
        });
        void loadInitialAttachment();

        return () => {
            cancelled = true;
        };
    }, [initialAttachment, mode]);

    const updateValues = (next: CorrespondenceFormValues) => {
        setValues(next);
        localUpdateRef.current = true;
        onValuesChange?.(next);
    };

    const onAttachmentSelect = (event: ChangeEvent<HTMLInputElement>) => {
        const countPdfPages = async (file: File): Promise<number> => {
            if (file.type !== 'application/pdf') return 0;
            try {
                const buffer = await file.arrayBuffer();
                const content = new TextDecoder('latin1').decode(buffer);
                const matches = content.match(/\/Type\s*\/Page\b/g);
                return matches?.length ? matches.length : 1;
            } catch {
                return 1;
            }
        };

        const buildAttachment = async (file: File) => {
            const pdfPageCount = await countPdfPages(file);
            const item = {
                id: `${file.name}-${file.size}-${file.lastModified}`,
                file,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                previewUrl: URL.createObjectURL(file),
                pdfPageCount,
                fromObjectUrl: true,
            };
            setAttachments((prev) => {
                prev.forEach((entry) => {
                    if (entry.previewUrl && entry.fromObjectUrl) URL.revokeObjectURL(entry.previewUrl);
                });
                return [item];
            });
        };

        const file = Array.from(event.target.files ?? []).find((entry) => entry.type === 'application/pdf');
        if (!file) return;
        void buildAttachment(file);
        event.target.value = '';
    };

    const removeAttachment = (id: string) => {
        setAttachments((prev) => {
            const item = prev.find((entry) => entry.id === id);
            if (item?.previewUrl && item.fromObjectUrl) URL.revokeObjectURL(item.previewUrl);
            return prev.filter((entry) => entry.id !== id);
        });
    };

    const buildRegistryPayload = (): CorrespondenceRegistryPayload => {
        const currentAttachment = attachments[0];
        const registeredAt = normalizeSqlDatetime(values.registered_at) || toSqlDatetime(new Date());
        const registeredBy = values.registered_by || currentUsername || '';

        return {
            ...(mode === 'edit' && recordId ? { id: recordId } : {}),
            reference_no: values.reference_no.trim() || null,
            date_received: values.date_received || null,
            letter_date: values.letter_date || null,
            sender: values.sender.trim(),
            sender_ref: values.sender_ref.trim() || null,
            document_cover_page: Number(values.document_cover_page),
            document_full_letters: Number(values.document_full_letters),
            document_claim_attachment: Number(values.document_claim_attachment),
            document_others: Number(values.document_others),
            document_others_specify: values.document_others_specify.trim() || null,
            subject: values.subject.trim(),
            direction: values.direction,
            registered_at: registeredAt,
            registered_by: registeredBy || null,
            attachment_filename: currentAttachment?.fileName ?? initialAttachment?.fileName ?? null,
            attachment_mime_type: currentAttachment?.fileType ?? initialAttachment?.mimeType ?? null,
            attachment_size: currentAttachment?.fileSize ?? initialAttachment?.fileSize ?? null,
            attachment_pdf_page_count: currentAttachment?.pdfPageCount ?? initialAttachment?.pdfPageCount ?? null,
            attachment_file_path: currentAttachment?.file ? null : initialAttachment?.filePath ?? null,
        };
    };

    const appendFormValue = (formData: FormData, key: keyof CorrespondenceRegistryPayload, value: string | number | null | undefined) => {
        formData.append(key, value === null || value === undefined ? '' : String(value));
    };

    const buildRegistryFormData = (payload: CorrespondenceRegistryPayload) => {
        const formData = new FormData();
        const selectedAttachment = attachments[0]?.file;

        appendFormValue(formData, 'id', payload.id);
        appendFormValue(formData, 'reference_no', payload.reference_no);
        appendFormValue(formData, 'date_received', payload.date_received);
        appendFormValue(formData, 'letter_date', payload.letter_date);
        appendFormValue(formData, 'sender', payload.sender);
        appendFormValue(formData, 'sender_ref', payload.sender_ref);
        appendFormValue(formData, 'document_cover_page', payload.document_cover_page);
        appendFormValue(formData, 'document_full_letters', payload.document_full_letters);
        appendFormValue(formData, 'document_claim_attachment', payload.document_claim_attachment);
        appendFormValue(formData, 'document_others', payload.document_others);
        appendFormValue(formData, 'document_others_specify', payload.document_others_specify);
        appendFormValue(formData, 'subject', payload.subject);
        appendFormValue(formData, 'direction', payload.direction);
        appendFormValue(formData, 'registered_at', payload.registered_at);
        appendFormValue(formData, 'registered_by', payload.registered_by);
        appendFormValue(formData, 'attachment_filename', payload.attachment_filename);
        appendFormValue(formData, 'attachment_mime_type', payload.attachment_mime_type);
        appendFormValue(formData, 'attachment_size', payload.attachment_size);
        appendFormValue(formData, 'attachment_pdf_page_count', payload.attachment_pdf_page_count);
        appendFormValue(formData, 'attachment_file_path', payload.attachment_file_path);

        if (selectedAttachment instanceof File) {
            formData.append('file', selectedAttachment);
        }

        return formData;
    };

    const submitRegistry = async () => {
        if (!isRegistrySectionComplete || isSubmitting) return;
        if (mode === 'edit' && !recordId) {
            toast.error('Unable to resolve correspondence ID for update');
            return;
        }

        try {
            setIsSubmitting(true);
            const payload = buildRegistryPayload();
            const formData = buildRegistryFormData(payload);

            if (mode === 'edit' && recordId) {
                await authenticatedApi.put(`/api/media/correspondence/${recordId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                setIsRegistryEditing(false);
                setValues((current) => ({
                    ...current,
                    registered_at: payload.registered_at ?? current.registered_at,
                    registered_by: payload.registered_by ?? current.registered_by,
                    reference_no: payload.reference_no ?? current.reference_no,
                }));
                toast.success('Registry updated successfully.');
            } else {
                await authenticatedApi.post('/api/media/correspondence', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                localStorage.removeItem(CREATE_DRAFT_STORAGE_KEY);
            }

            setSuccessDialogOpen(true);
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || 'Failed to save registry';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isQaSectionComplete = Boolean(
        values.letter_type.trim() &&
        values.category.trim() &&
        values.remarks.trim() &&
        qaRecipients.some((r) => r.ramco_id.trim()),
    );

    const submitQaReview = async () => {
        if (!isQaSectionComplete || isSubmitting) return;
        if (!recordId) {
            toast.error('Unable to resolve correspondence ID for QA update');
            return;
        }
        try {
            setIsSubmitting(true);
            await authenticatedApi.put(`/api/media/correspondence/${recordId}/qa`, {
                letter_type: values.letter_type.trim() || null,
                category: values.category.trim() || null,
                priority: values.priority,
                qa_review_date: new Date().toISOString().slice(0, 10),
                qa_reviewed_by: currentUsername || null,
                qa_status: 'completed',
                recipients: qaRecipients.filter((r) => r.ramco_id.trim()).map((r) => ({ ramco_id: r.ramco_id, department_id: r.department_id })),
                remarks: values.remarks.trim() || null,
            });
            setSuccessDialogOpen(true);
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || 'Failed to save QA review';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openFilePicker = () => {
        attachmentInputRef.current?.click();
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDisplayDate = (value: string) => {
        if (!value) return '-';
        const [year, month, day] = value.split('-');
        if (!year || !month || !day) return value;
        return `${Number(day)}/${Number(month)}/${year}`;
    };

    const registryDocumentContents = [
        values.document_cover_page ? 'Cover page' : null,
        values.document_full_letters ? 'Full letter' : null,
        values.document_claim_attachment ? 'Attachment' : null,
        values.document_others ? `Others${values.document_others_specify ? `: ${values.document_others_specify}` : ''}` : null,
    ].filter(Boolean) as string[];
    const hasRegistryAttachment = attachments.length > 0 || Boolean(initialAttachment?.filePath || initialAttachment?.fileName);
    const isRegistrySectionComplete = Boolean(
        (mode === 'create' || values.reference_no.trim()) &&
        values.direction.trim() &&
        values.date_received.trim() &&
        values.letter_date.trim() &&
        values.sender.trim() &&
        values.sender_ref.trim() &&
        values.subject.trim() &&
        registryDocumentContents.length > 0 &&
        (!values.document_others || values.document_others_specify.trim()) &&
        hasRegistryAttachment,
    );
    return (
        <Card className="mx-auto w-full max-w-7xl">
            {showCardHeader ? (
                <CardHeader>
                    <CardTitle>{mode === 'edit' ? 'Edit Mail Registry' : 'Create Mail Registry'}</CardTitle>
                    <CardDescription>
                        {mode === 'edit'
                            ? `Update registry details${recordSlug ? ` for ${recordSlug}` : ''}.`
                            : 'Register new incoming or outgoing correspondence details.'}
                    </CardDescription>
                </CardHeader>
            ) : null}
            <CardContent>
                <form className="space-y-4">
                    {/* ── Registry Section ── */}
                    {workflowAction === 'registry' && <div className="space-y-5">
                            <p className="text-sm font-bold text-slate-900">Mail Registry</p>

                            {(mode === 'edit' && !isRegistryEditing) || workflowAction !== 'registry' ? (
                                <div className="space-y-4 text-sm text-slate-700">
                                    <div className="grid gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)]">
                                        <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Reference No.:</p>
                                        <p className="min-w-0 wrap-break-words">{values.reference_no || '-'}</p>

                                        <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Direction:</p>
                                        <p className="min-w-0 wrap-break-words capitalize">{values.direction}</p>

                                        <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Date Received:</p>
                                        <p className="min-w-0 wrap-break-words">{formatDisplayDate(values.date_received)}</p>

                                        <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Letter Date:</p>
                                        <p className="min-w-0 wrap-break-words">{formatDisplayDate(values.letter_date)}</p>

                                        <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Sender Name:</p>
                                        <p className="min-w-0 wrap-break-words">{values.sender || '-'}</p>

                                        <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Sender Ref. No.:</p>
                                        <p className="min-w-0 wrap-break-words">{values.sender_ref || '-'}</p>

                                        <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Mail Contents:</p>
                                        <p className="min-w-0 wrap-break-words">
                                            {registryDocumentContents.length > 0 ? registryDocumentContents.join(', ') : '-'}
                                        </p>

                                        <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Subject Matters:</p>
                                        <p className="min-w-0 whitespace-pre-wrap wrap-break-words">{values.subject || '-'}</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Row 1: Reference no. | Direction toggle | Registration date */}
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label>Reference no.</Label>
                                            <div className="flex h-10 items-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-500">
                                                {values.reference_no || (mode === 'create' ? 'Auto-generated by system' : '-')}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Direction <span className="text-rose-500">*</span></Label>
                                            <div className="flex h-10 overflow-hidden rounded-md border border-slate-200">
                                                <button
                                                    type="button"
                                                    onClick={() => updateValues({ ...values, direction: 'incoming' })}
                                                    className={`flex-1 text-sm font-medium transition-colors ${values.direction === 'incoming' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    IN
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateValues({ ...values, direction: 'outgoing' })}
                                                    className={`flex-1 text-sm font-medium transition-colors ${values.direction === 'outgoing' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    OUT
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Registration date</Label>
                                            <div className="flex h-10 items-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-500">
                                                {values.registered_at
                                                    ? new Date(values.registered_at).toLocaleString()
                                                    : new Date().toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mail details */}
                                    <div>
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Mail details</p>
                                        <div className="grid gap-4 sm:grid-cols-3">
                                            <div className="space-y-2">
                                                <Label htmlFor="date-received">Date received <span className="text-rose-500">*</span></Label>
                                                <Input
                                                    id="date-received"
                                                    type="date"
                                                    value={values.date_received}
                                                    onChange={(event) => updateValues({ ...values, date_received: event.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="letter-date">Letter date <span className="text-rose-500">*</span></Label>
                                                <Input
                                                    id="letter-date"
                                                    type="date"
                                                    value={values.letter_date}
                                                    onChange={(event) => updateValues({ ...values, letter_date: event.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="sender-ref">Sender ref. no.</Label>
                                                <Input
                                                    id="sender-ref"
                                                    value={values.sender_ref}
                                                    onChange={(event) => updateValues({ ...values, sender_ref: event.target.value })}
                                                    placeholder="e.g. ABC/LGL/2"
                                                    className="uppercase placeholder:normal-case"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            <Label htmlFor="sender">Sender name <span className="text-rose-500">*</span></Label>
                                            <Input
                                                id="sender"
                                                value={values.sender}
                                                onChange={(event) => updateValues({ ...values, sender: event.target.value })}
                                                placeholder="Company or individual name"
                                                className="uppercase placeholder:normal-case"
                                            />
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            <Label htmlFor="subject">Subject matters <span className="text-rose-500">*</span></Label>
                                            <Textarea
                                                id="subject"
                                                value={values.subject}
                                                onChange={(event) => updateValues({ ...values, subject: event.target.value })}
                                                placeholder="Brief subject of the mail"
                                                rows={2}
                                                required
                                                className="uppercase placeholder:normal-case"
                                            />
                                        </div>
                                    </div>

                                    {/* Mail contents */}
                                    <div>
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                                            Mail contents <span className="font-normal normal-case text-rose-500">*</span>
                                        </p>
                                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                                            {[
                                                {
                                                    id: 'document-cover-page',
                                                    label: 'Cover page',
                                                    checked: values.document_cover_page,
                                                    onChange: (v: boolean) => updateValues({ ...values, document_cover_page: v }),
                                                },
                                                {
                                                    id: 'document-full-letters',
                                                    label: 'Full letter',
                                                    checked: values.document_full_letters,
                                                    onChange: (v: boolean) => updateValues({ ...values, document_full_letters: v }),
                                                },
                                                {
                                                    id: 'document-claim-attachment',
                                                    label: 'Attachment',
                                                    checked: values.document_claim_attachment,
                                                    onChange: (v: boolean) => updateValues({ ...values, document_claim_attachment: v }),
                                                },
                                                {
                                                    id: 'document-others',
                                                    label: 'Others',
                                                    checked: values.document_others,
                                                    onChange: (v: boolean) =>
                                                        updateValues({
                                                            ...values,
                                                            document_others: v,
                                                            document_others_specify: v ? values.document_others_specify : '',
                                                        }),
                                                },
                                            ].map((item) => (
                                                <label
                                                    key={item.id}
                                                    htmlFor={item.id}
                                                    className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                                                >
                                                    <Checkbox
                                                        id={item.id}
                                                        checked={item.checked}
                                                        onCheckedChange={(checked) => item.onChange(checked === true)}
                                                    />
                                                    {item.label}
                                                </label>
                                            ))}
                                        </div>
                                        {values.document_others ? (
                                            <div className="mt-3 space-y-2">
                                                <Label htmlFor="document-others-specify">Specify others</Label>
                                                <Input
                                                    id="document-others-specify"
                                                    value={values.document_others_specify}
                                                    onChange={(event) =>
                                                        updateValues({ ...values, document_others_specify: event.target.value })
                                                    }
                                                    placeholder="Specify other document contents"
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                </>
                            )}
                    </div>}

                    {/* ── QA Review Section ── */}
                    {workflowAction === 'qa' && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-900">QA Review</p>
                                    {values.reference_no && (
                                        <span className="text-sm text-slate-400">· {values.reference_no}</span>
                                    )}
                                </div>
                                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-white">Stage 2 — QA Review</span>
                            </div>
                        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
                            {/* Left — Classification form */}
                            <div className="space-y-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Classification</p>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="letter-type">Letter type <span className="text-rose-500">*</span></Label>
                                        <Select
                                            value={values.letter_type}
                                            onValueChange={(v) => updateValues({ ...values, letter_type: v })}
                                        >
                                            <SelectTrigger id="letter-type" className='w-full'>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Letter of Demand">Letter of Demand</SelectItem>
                                                <SelectItem value="Circular Letter">Circular Letter</SelectItem>
                                                <SelectItem value="Official Letter">Official Letter</SelectItem>
                                                <SelectItem value="Notice">Notice</SelectItem>
                                                <SelectItem value="Memorandum">Memorandum</SelectItem>
                                                <SelectItem value="Others">Others</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="category">Category <span className="text-rose-500">*</span></Label>
                                        <Select
                                            value={values.category}
                                            onValueChange={(v) => updateValues({ ...values, category: v })}
                                        >
                                            <SelectTrigger id="category" className='w-full'>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Legal / Contract">Legal / Contract</SelectItem>
                                                <SelectItem value="Finance">Finance</SelectItem>
                                                <SelectItem value="Administration">Administration</SelectItem>
                                                <SelectItem value="Operations">Operations</SelectItem>
                                                <SelectItem value="Human Resources">Human Resources</SelectItem>
                                                <SelectItem value="Others">Others</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Priority <span className="text-rose-500">*</span></Label>
                                    <div className="flex gap-2">
                                        {(['high', 'normal', 'low'] as Priority[]).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => updateValues({ ...values, priority: p })}
                                                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                                                    values.priority === p
                                                        ? p === 'high' ? 'bg-rose-500 text-white' : p === 'normal' ? 'bg-amber-400 text-white' : 'bg-slate-400 text-white'
                                                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                {p === 'normal' ? 'Medium' : p.charAt(0).toUpperCase() + p.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Recipient(s) <span className="text-rose-500">*</span></Label>
                                    <div className="space-y-2">
                                        {qaRecipients.map((recipient, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <div className="flex-1">
                                                    <Combobox
                                                        options={employeeOptions}
                                                        value={recipient.ramco_id}
                                                        onValueChange={(val) => {
                                                            const emp = employeeOptionsRef.current.find((o) => o.value === val);
                                                            const updated = [...qaRecipients];
                                                            updated[idx] = {
                                                                ramco_id: emp?.value ?? '',
                                                                department_id: emp?.departmentId ?? null,
                                                                department_name: emp?.departmentName ?? '',
                                                            };
                                                            setQaRecipients(updated);
                                                        }}
                                                        placeholder="Search employee..."
                                                        searchPlaceholder="Type name..."
                                                        emptyMessage="No employee found"
                                                        clearable
                                                    />
                                                </div>
                                                <Input
                                                    value={recipient.department_name}
                                                    readOnly
                                                    placeholder="Department"
                                                    className="flex-1 bg-slate-50 text-slate-500"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => setQaRecipients((prev) => prev.filter((_, i) => i !== idx))}
                                                    disabled={qaRecipients.length === 1}
                                                    className="shrink-0"
                                                >
                                                    &minus;
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setQaRecipients((prev) => [...prev, { ramco_id: '', department_id: null, department_name: '' }])}
                                        >
                                            + Add recipient
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="remarks">Summary <span className="text-rose-500">*</span></Label>
                                    <Textarea
                                        id="remarks"
                                        value={values.remarks}
                                        onChange={(e) => updateValues({ ...values, remarks: e.target.value })}
                                        placeholder="Brief summary of the mail contents and action required"
                                        rows={4}
                                    />
                                </div>
                            </div>

                            {/* Right — Mail info panel */}
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <p className="mb-3 text-sm font-bold text-slate-900">Mail Info</p>
                                <div className="space-y-2 text-sm">
                                    {[
                                        { label: 'Reference', value: values.reference_no || '-' },
                                        { label: 'Direction', value: values.direction === 'incoming' ? 'IN' : 'OUT' },
                                        { label: 'Date received', value: formatDisplayDate(values.date_received) },
                                        { label: 'Letter date', value: formatDisplayDate(values.letter_date) },
                                        { label: 'Sender', value: values.sender || '-' },
                                        { label: 'Sender ref.', value: values.sender_ref || '-' },
                                        { label: 'Subject', value: values.subject || '-' },
                                        { label: 'Contents', value: registryDocumentContents.join(', ') || '-' },
                                        { label: 'Registered by', value: values.registered_by || '-' },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="grid grid-cols-[120px_1fr] gap-1">
                                            <span className="text-xs font-medium text-slate-500">{label}</span>
                                            <span className="min-w-0 wrap-break-word text-slate-800">{value}</span>
                                        </div>
                                    ))}
                                    {(attachments[0] || initialAttachment) && (
                                        <div className="grid grid-cols-[120px_1fr] gap-1">
                                            <span className="text-xs font-medium text-slate-500">Attachment</span>
                                            <span className="flex items-center gap-1 text-slate-800">
                                                <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                <span className="min-w-0 truncate">
                                                    {attachments[0]?.fileName ?? initialAttachment?.fileName ?? 'Document'}
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        </div>
                    )}

                    {/* ── Endorsement Section ── */}
                    {workflowAction === 'endorsement' && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-900">Endorsement</p>
                                    {values.reference_no && (
                                        <span className="text-sm text-slate-400">· {values.reference_no}</span>
                                    )}
                                </div>
                                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-white">Stage 3 — Endorsement</span>
                            </div>
                            <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
                                {/* Left — Endorsement form */}
                                <div className="space-y-5">
                                    {/* QA Summary read-only */}
                                    {values.remarks && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">QA summary</p>
                                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                                {values.remarks}
                                            </div>
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {values.letter_type && (
                                                    <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-700">{values.letter_type}</span>
                                                )}
                                                {values.category && (
                                                    <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-600">{values.category}</span>
                                                )}
                                                {values.priority && (
                                                    <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                                                        values.priority === 'high' ? 'bg-rose-100 text-rose-700'
                                                        : values.priority === 'normal' ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {values.priority === 'normal' ? 'Medium' : values.priority.charAt(0).toUpperCase() + values.priority.slice(1)} priority
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Confirmed recipients (read-only from QA) */}
                                    <div className="space-y-2">
                                        <Label>Confirmed recipient(s) <span className="text-rose-500">*</span></Label>
                                        <div className="space-y-2">
                                            {qaRecipients.filter((r) => r.ramco_id.trim()).map((r, idx) => {
                                                const emp = employeeOptions.find((o) => o.value === r.ramco_id);
                                                const displayName = emp?.label ?? r.ramco_id;
                                                return (
                                                    <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                                                                {displayName.charAt(0).toUpperCase()}
                                                            </span>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-800">{displayName}</p>
                                                                {r.department_name && <p className="text-xs text-slate-400">{r.department_name}</p>}
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-slate-400">From QA</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-xs text-slate-400">No changes — recipient confirmed as assigned by QA.</p>
                                    </div>

                                    {/* Priority override */}
                                    <div className="space-y-2">
                                        <Label>Priority override <span className="text-xs font-normal text-slate-400">(optional)</span></Label>
                                        <div className="flex gap-2">
                                            {(['high', 'normal', 'low'] as Priority[]).map((p) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setEndorsementPriorityOverride(endorsementPriorityOverride === p ? null : p)}
                                                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                                                        endorsementPriorityOverride === p
                                                            ? p === 'high' ? 'bg-rose-500 text-white' : p === 'normal' ? 'bg-amber-400 text-white' : 'bg-slate-400 text-white'
                                                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {p === 'normal' ? 'Medium' : p.charAt(0).toUpperCase() + p.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                        {endorsementPriorityOverride && (
                                            <p className="text-xs text-slate-400">
                                                QA original: <span className="font-medium capitalize">{values.priority === 'normal' ? 'Medium' : values.priority}</span>. Override is optional — only change if required.
                                            </p>
                                        )}
                                    </div>

                                    {/* Remarks / Instructions */}
                                    <div className="space-y-2">
                                        <Label htmlFor="endorsement-remarks">Remarks / Instructions <span className="text-xs font-normal text-slate-400">(optional)</span></Label>
                                        <Textarea
                                            id="endorsement-remarks"
                                            value={endorsementRemarks}
                                            onChange={(e) => setEndorsementRemarks(e.target.value)}
                                            placeholder="Any instructions or remarks for the recipient"
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                {/* Right — Mail info panel */}
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                    <p className="mb-3 text-sm font-bold text-slate-900">Mail Info</p>
                                    <div className="space-y-2 text-sm">
                                        {[
                                            { label: 'Reference', value: values.reference_no || '-' },
                                            { label: 'Sender', value: values.sender || '-' },
                                            { label: 'Letter type', value: values.letter_type || '-' },
                                            { label: 'Category', value: values.category || '-' },
                                            { label: 'Date received', value: formatDisplayDate(values.date_received) },
                                            { label: 'Reviewed by', value: values.qa_reviewed_by || '-' },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="grid grid-cols-[110px_1fr] gap-1">
                                                <span className="text-xs font-medium text-slate-500">{label}</span>
                                                <span className="min-w-0 wrap-break-word text-slate-800">{value}</span>
                                            </div>
                                        ))}
                                        {/* QA Priority with badge */}
                                        <div className="grid grid-cols-[110px_1fr] gap-1">
                                            <span className="text-xs font-medium text-slate-500">QA priority</span>
                                            <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                values.priority === 'high' ? 'bg-rose-100 text-rose-700'
                                                : values.priority === 'normal' ? 'bg-amber-100 text-amber-700'
                                                : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {values.priority === 'normal' ? 'Medium' : (values.priority?.charAt(0).toUpperCase() ?? '') + (values.priority?.slice(1) ?? '')}
                                            </span>
                                        </div>
                                        {(attachments[0] || initialAttachment) && (
                                            <div className="grid grid-cols-[110px_1fr] gap-1">
                                                <span className="text-xs font-medium text-slate-500">Attachment</span>
                                                <span className="flex items-center gap-1 text-slate-800">
                                                    <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                    <span className="min-w-0 truncate">
                                                        {attachments[0]?.fileName ?? initialAttachment?.fileName ?? 'Document'}
                                                    </span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Action Buttons ── */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setCancelDialogOpen(true)}>
                            Cancel
                        </Button>
                        {workflowAction === 'registry' && (
                            <Button
                                type="button"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => setConfirmDialogOpen(true)}
                                disabled={!isRegistrySectionComplete || isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : 'Submit & send to QA →'}
                            </Button>
                        )}
                        {workflowAction === 'qa' && (
                            <Button
                                type="button"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => setConfirmDialogOpen(true)}
                                disabled={!isQaSectionComplete || isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : 'Submit to management →'}
                            </Button>
                        )}
                        {workflowAction === 'endorsement' && (
                            <Button
                                type="button"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => setConfirmDialogOpen(true)}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : 'Endorse & forward →'}
                            </Button>
                        )}
                    </div>

                    {/* ── Attachment Section ── */}
                    <div>
                        <div
                            className={`rounded-xl border border-dashed border-slate-300 bg-stone-100/50 px-4 py-4 transition-colors ${registryEditable ? 'cursor-pointer hover:bg-stone-100' : ''}`}
                            onClick={registryEditable ? openFilePicker : undefined}
                            onKeyDown={(event) => {
                                if (!registryEditable) return;
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    openFilePicker();
                                }
                            }}
                            role={registryEditable ? 'button' : undefined}
                            tabIndex={registryEditable ? 0 : -1}
                        >
                            <p className="mb-3 text-base font-semibold text-slate-900">Attachment</p>
                            {attachments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                                    <UploadCloud className="h-6 w-6 text-slate-500" />
                                    <p className="text-sm font-medium text-slate-700">Drop files here or click to upload</p>
                                    <p className="text-xs text-slate-500">Supports PDF only. Single file only.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                                            Scanned Document
                                        </p>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 rounded-full bg-white text-slate-600 hover:bg-slate-100"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                removeAttachment(attachments[0].id);
                                            }}
                                            disabled={!registryEditable}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <div>
                                        {attachments.map((item) => (
                                            <div
                                                key={item.id}
                                                className="rounded-md border-slate-200 p-2"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                <div className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                                                    {(item.fileType === 'application/pdf' || item.previewUrl?.toLowerCase().includes('.pdf')) && item.previewUrl ? (
                                                        <div className="space-y-2 p-2">
                                                            <div className="aspect-210/297 min-h-144 overflow-hidden rounded-md border border-slate-200 bg-white">
                                                                <iframe
                                                                    src={`${item.previewUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH`}
                                                                    title={`${item.fileName} preview`}
                                                                    className="h-full w-full"
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                                                                <p>Page 1 / {item.pdfPageCount || 1}</p>
                                                                <p>Total pages: {item.pdfPageCount || 1}</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex h-32 w-full items-center justify-center pt-6">
                                                            <FileText className="h-8 w-8 text-slate-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <p className="truncate text-xs font-medium text-slate-700">{item.fileName}</p>
                                                    <a
                                                        href={item.previewUrl ?? '#'}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(event) => event.stopPropagation()}
                                                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${item.previewUrl
                                                            ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                                            : 'pointer-events-none border-slate-200 bg-slate-100 text-slate-400'
                                                            }`}
                                                    >
                                                        Preview
                                                    </a>
                                                </div>
                                                <p className="truncate text-[11px] text-slate-500">
                                                    {item.fileSize > 0 ? formatFileSize(item.fileSize) : 'Saved attachment'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <Input
                            ref={attachmentInputRef}
                            id="attachments"
                            type="file"
                            accept="application/pdf,.pdf"
                            onChange={onAttachmentSelect}
                            className="hidden"
                        />
                    </div>

                </form>
            </CardContent>
            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Discard this form?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Unsaved changes in the correspondence form will be lost if you leave now.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Stay</AlertDialogCancel>
                        <Button type="button" onClick={onCancel} disabled={isSubmitting}>
                            Leave Form
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Submit mail registry?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Please confirm that all details are correct before submitting. This will register the mail record.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Review again</AlertDialogCancel>
                        <Button
                            type="button"
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={isSubmitting}
                            onClick={() => {
                                setConfirmDialogOpen(false);
                                if (workflowAction === 'qa') {
                                    void submitQaReview();
                                } else {
                                    void submitRegistry();
                                }
                            }}
                        >
                            {isSubmitting ? 'Submitting...' : 'Yes, submit'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Submission successful</AlertDialogTitle>
                        <AlertDialogDescription>
                            The mail registry has been {mode === 'edit' ? 'updated' : 'created'} successfully. You may go back to the records list or stay on this page.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSuccessDialogOpen(false)}>Stay</AlertDialogCancel>
                        <Button
                            type="button"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                                setSuccessDialogOpen(false);
                                void onSubmit?.();
                            }}
                        >
                            Back to Records
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
};

export default CorrespondenceForm;


//CRETE TABLE
/* 
-- MySQL 8+
CREATE TABLE `correspondences` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  `reference_no` VARCHAR(100) NOT NULL,
  `sender` VARCHAR(255) NOT NULL,
  `sender_ref` VARCHAR(100) NULL,

  `document_cover_page` TINYINT(1) NOT NULL DEFAULT 0,
  `document_full_letters` TINYINT(1) NOT NULL DEFAULT 0,
  `document_claim_attachment` TINYINT(1) NOT NULL DEFAULT 0,
  `document_others` TINYINT(1) NOT NULL DEFAULT 0,
  `document_others_specify` VARCHAR(255) NULL,

  `subject` TEXT NOT NULL,
  `correspondent` TEXT NOT NULL,
  `direction` ENUM('incoming','outgoing') NOT NULL,
  `department` TEXT NOT NULL,
  `letter_type` VARCHAR(100) NULL,
  `category` VARCHAR(100) NULL,
  `priority` ENUM('low','normal','high') NOT NULL DEFAULT 'normal',
  `date_received` DATE NULL,
  `remarks` TEXT NULL,

  `registered_at` DATETIME NULL,
  `registered_by` VARCHAR(100) NULL,
  `disseminated_at` DATETIME NULL,
  `disseminated_by` VARCHAR(100) NULL,

  `attachment_filename` VARCHAR(255) NULL,
  `attachment_mime_type` VARCHAR(100) NULL,
  `attachment_size` BIGINT NULL,
  `attachment_pdf_page_count` INT NULL,
  `attachment_file_path` TEXT NULL,

  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_correspondences_reference_no` (`reference_no`),
  KEY `idx_correspondences_direction` (`direction`),
  KEY `idx_correspondences_priority` (`priority`),
  KEY `idx_correspondences_date_received` (`date_received`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- PostgreSQL
CREATE TABLE IF NOT EXISTS correspondences (
    id BIGSERIAL PRIMARY KEY,

    reference_no VARCHAR(100) NOT NULL,
    sender VARCHAR(255) NOT NULL,
    sender_ref VARCHAR(100),

    document_cover_page BOOLEAN NOT NULL DEFAULT FALSE,
    document_full_letters BOOLEAN NOT NULL DEFAULT FALSE,
    document_claim_attachment BOOLEAN NOT NULL DEFAULT FALSE,
    document_others BOOLEAN NOT NULL DEFAULT FALSE,
    document_others_specify VARCHAR(255),

    subject TEXT NOT NULL,
    correspondent TEXT NOT NULL,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    department TEXT NOT NULL,
    letter_type VARCHAR(100),
    category VARCHAR(100),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'normal', 'high')),
    date_received DATE,
    remarks TEXT,

    registered_at TIMESTAMP NULL,
    registered_by VARCHAR(100) NULL,
    disseminated_at TIMESTAMP NULL,
    disseminated_by VARCHAR(100) NULL,

    attachment_filename VARCHAR(255),
    attachment_mime_type VARCHAR(100),
    attachment_size BIGINT,
    attachment_pdf_page_count INT,
    attachment_file_path TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_correspondences_reference_no ON correspondences(reference_no);
CREATE INDEX IF NOT EXISTS idx_correspondences_direction ON correspondences(direction);
CREATE INDEX IF NOT EXISTS idx_correspondences_priority ON correspondences(priority);
CREATE INDEX IF NOT EXISTS idx_correspondences_date_received ON correspondences(date_received);

*/
