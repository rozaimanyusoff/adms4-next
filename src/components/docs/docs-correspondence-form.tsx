'use client';

import { ChangeEvent, FormEvent, useContext, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authenticatedApi } from '@/config/api';
import { FileText, Minus, Pencil, Plus, Save, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Direction, Priority } from './correspondence-tracking-data';
import { AuthContext } from '@/store/AuthContext';

export type CorrespondenceFormValues = {
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

export type CorrespondenceFormSubmitPayload = Omit<CorrespondenceFormValues, 'reference_no'> & {
    reference_no: string | null;
    attachment_filename: string | null;
    attachment_mime_type: string | null;
    attachment_size: number | null;
    attachment_pdf_page_count: number | null;
    attachment_file_path: string | null;
};

export type CorrespondenceRegistryPayload = {
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

export type CorrespondenceQaPayload = {
    id: string | number;
    qa_review_date: string | null;
    qa_reviewed_by: string | null;
    qa_status: string;
    letter_type: string;
    category: string;
    priority: Priority;
    remarks: string;
    recipients: Array<{
        ramco_id: string;
        department_id: number;
    }>;
};

export type CorrespondenceEndorsementPayload = {
    id: string | number;
    endorsed_by: string | null;
    endorsed_at: string | null;
    endorsed_remarks: string | null;
    endorsed_status: string;
};

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

type CorrespondenceInitialAttachment = {
    filePath: string;
    fileName?: string | null;
    mimeType?: string | null;
    fileSize?: number | null;
    pdfPageCount?: number | null;
};

type CorrespondenceFormProps = {
    mode?: 'create' | 'edit';
    recordId?: string | number;
    recordSlug?: string;
    showCardHeader?: boolean;
    initialValues?: CorrespondenceFormValues;
    initialRecipients?: Array<{
        ramcoId: string;
        departmentId: string | number;
    }>;
    initialAttachment?: CorrespondenceInitialAttachment | null;
    onCancel: () => void;
    onSubmit?: (payload: CorrespondenceFormSubmitPayload) => void | Promise<void>;
    onValuesChange?: (values: CorrespondenceFormValues) => void;
};

const emptyFormValues: CorrespondenceFormValues = {
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

const LETTER_TYPE_OPTIONS = [
    'Formal Letters',
    'Notice',
    'Regulatory',
    'Letter of Demand',
    'Subpoena',
    'Reminder',
    'Complaint',
    'Third-party Surveys',
    'Invoice',
    'Delivery Order',
    'Summons',
    'HR Matters',
    'Others',
    'Certificate of Payment',
] as const;

const CATEGORY_OPTIONS = ['Application', 'Notice', 'Finance', 'Invitation'] as const;

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

const buildRegistryPayload = (payload: CorrespondenceFormSubmitPayload): CorrespondenceRegistryPayload => ({
    reference_no: payload.reference_no,
    date_received: payload.date_received || null,
    letter_date: payload.letter_date || null,
    sender: payload.sender,
    sender_ref: payload.sender_ref || null,
    document_cover_page: Number(payload.document_cover_page),
    document_full_letters: Number(payload.document_full_letters),
    document_claim_attachment: Number(payload.document_claim_attachment),
    document_others: Number(payload.document_others),
    document_others_specify: payload.document_others_specify || null,
    subject: payload.subject,
    direction: payload.direction,
    registered_at: payload.registered_at,
    registered_by: payload.registered_by,
    attachment_filename: payload.attachment_filename,
    attachment_mime_type: payload.attachment_mime_type,
    attachment_size: payload.attachment_size,
    attachment_pdf_page_count: payload.attachment_pdf_page_count,
    attachment_file_path: payload.attachment_file_path,
});

const buildQaPayload = (
    payload: CorrespondenceFormSubmitPayload,
    qaRows: QaRow[],
    recordId: string | number,
): CorrespondenceQaPayload => {
    return {
        id: recordId,
        qa_review_date: payload.qa_review_date || null,
        qa_reviewed_by: payload.qa_reviewed_by || null,
        qa_status: payload.qa_status || 'submitted',
        letter_type: payload.letter_type,
        category: payload.category,
        priority: payload.priority,
        remarks: payload.remarks,
        recipients: qaRows
            .map((row) => ({
                ramco_id: row.recipientRamcoId.trim(),
                department_id: Number(row.departmentId),
            }))
            .filter((row) => row.ramco_id && Number.isFinite(row.department_id)),
    };
};

const buildEndorsementPayload = (
    payload: CorrespondenceFormSubmitPayload,
    recordId: string | number,
): CorrespondenceEndorsementPayload | null => {
    const hasEndorsementData = Boolean(
        payload.endorsed_status.trim() ||
        payload.endorsed_remarks.trim() ||
        payload.endorsed_by.trim() ||
        payload.endorsed_at.trim(),
    );
    if (!hasEndorsementData) return null;
    return {
        id: recordId,
        endorsed_by: payload.endorsed_by.trim() || null,
        endorsed_at: payload.endorsed_at.trim() || null,
        endorsed_remarks: payload.endorsed_remarks.trim() || null,
        endorsed_status: payload.endorsed_status.trim(),
    };
};

type QaRow = {
    id: string;
    recipientRamcoId: string;
    departmentId: string;
    departmentCode: string;
};

type EmployeeOption = ComboboxOption & {
    departmentId: string;
    departmentCode: string;
};

const CREATE_DRAFT_STORAGE_KEY = 'docs.correspondence.create-draft.v1';

const createQaRow = (recipientRamcoId = '', departmentId = '', departmentCode = ''): QaRow => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    recipientRamcoId,
    departmentId,
    departmentCode,
});

const getDepartmentId = (item: any) =>
    String(item?.department?.id ?? item?.department_id ?? item?.dept_id ?? item?.dept?.id ?? '').trim();

const getDepartmentCode = (item: any) =>
    String(item?.department?.code ?? item?.department_code ?? item?.dept_code ?? item?.dept?.code ?? '').trim();

const appendFormValue = (formData: FormData, key: string, value: string | number | boolean | null | undefined) => {
    if (value === null || value === undefined) {
        formData.append(key, '');
        return;
    }
    formData.append(key, String(value));
};

const buildQaRows = (
    recipients: Array<{ ramcoId: string; departmentId: string | number }> = [],
    recipientOptions: EmployeeOption[] = [],
): QaRow[] => {
    if (recipients.length === 0) return [createQaRow()];
    return recipients.map((recipient) => {
        const ramcoId = String(recipient.ramcoId ?? '').trim();
        const departmentId = String(recipient.departmentId ?? '').trim();
        const selected = recipientOptions.find((option) => option.value === ramcoId);
        return createQaRow(ramcoId, departmentId || selected?.departmentId || '', selected?.departmentCode || '');
    });
};

export const CorrespondenceForm = ({
    mode = 'create',
    recordId,
    recordSlug,
    showCardHeader = true,
    initialValues,
    initialRecipients = [],
    initialAttachment,
    onCancel,
    onSubmit,
    onValuesChange,
}: CorrespondenceFormProps) => {
    const attachmentInputRef = useRef<HTMLInputElement | null>(null);
    const localUpdateRef = useRef(false);
    const draftHydratedRef = useRef(false);
    const auth = useContext(AuthContext);
    const currentUsername = auth?.authData?.user?.username || null;
    const [recipientOptions, setRecipientOptions] = useState<EmployeeOption[]>([]);
    const [values, setValues] = useState<CorrespondenceFormValues>({
        ...emptyFormValues,
        ...(initialValues ?? {}),
    });
    const [qaRows, setQaRows] = useState<QaRow[]>(buildQaRows(initialRecipients));
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [successDialogOpen, setSuccessDialogOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('Correspondence saved successfully.');
    const [pendingPayload, setPendingPayload] = useState<CorrespondenceFormSubmitPayload | null>(null);
    const [submittedPayload, setSubmittedPayload] = useState<CorrespondenceFormSubmitPayload | null>(null);
    const [isRegistryEditing, setIsRegistryEditing] = useState(mode === 'create');
    const [isRegistrySaving, setIsRegistrySaving] = useState(false);
    const qaSectionDisabled = mode === 'create';
    const endorsementSectionDisabled = mode === 'create';
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
        setQaRows(mode === 'create' ? [createQaRow()] : buildQaRows(initialRecipients, recipientOptions));
    }, [initialValues, initialRecipients, recipientOptions, mode]);

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

    useEffect(() => {
        let ignore = false;
        const loadRecipients = async () => {
            try {
                const response = await authenticatedApi.get('/api/assets/employees?status=active');
                const raw = (response as any)?.data;
                const list: any[] = Array.isArray(raw?.data)
                    ? raw.data
                    : Array.isArray(raw?.items)
                        ? raw.items
                        : Array.isArray(raw?.data?.items)
                            ? raw.data.items
                            : Array.isArray(raw)
                                ? raw
                                : [];
                if (ignore) return;
                const unique = new Set<string>();
                const options: EmployeeOption[] = [];
                list.forEach((item) => {
                    const ramcoId = String(item?.ramco_id ?? '').trim();
                    const label = String(item?.full_name ?? item?.name ?? '').trim();
                    const departmentId = getDepartmentId(item);
                    const departmentCode = getDepartmentCode(item);
                    if (!ramcoId || !label || unique.has(ramcoId)) return;
                    unique.add(ramcoId);
                    options.push({ value: ramcoId, label, departmentId, departmentCode });
                });
                setRecipientOptions(options);
            } catch {
                if (!ignore) setRecipientOptions([]);
            }
        };
        void loadRecipients();
        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        if (recipientOptions.length === 0) return;
        setQaRows((prev) =>
            prev.map((row) => {
                const selected =
                    recipientOptions.find((option) => option.value === row.recipientRamcoId) ??
                    recipientOptions.find((option) => option.label === row.recipientRamcoId);
                if (!selected) return row;
                return {
                    ...row,
                    departmentId: row.departmentId || selected.departmentId,
                    departmentCode: selected.departmentCode || row.departmentCode,
                };
            }),
        );
    }, [recipientOptions]);

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

    const buildPayload = (): CorrespondenceFormSubmitPayload => {
        const currentAttachment = attachments[0];
        const payloadValues = mode === 'create' ? stripQaValues(values) : values;
        const nowIso = new Date().toISOString();
        const hasEndorsementDraft = Boolean(
            payloadValues.endorsed_status.trim() ||
            payloadValues.endorsed_remarks.trim() ||
            payloadValues.endorsed_by.trim() ||
            payloadValues.endorsed_at.trim(),
        );
        return {
            ...payloadValues,
            reference_no: payloadValues.reference_no.trim() || null,
            registered_at: payloadValues.registered_at || nowIso,
            registered_by: payloadValues.registered_by || currentUsername || '',
            qa_review_date: mode === 'edit' ? payloadValues.qa_review_date || nowIso : '',
            qa_reviewed_by: mode === 'edit' ? payloadValues.qa_reviewed_by || currentUsername || '' : '',
            qa_status: mode === 'edit' ? payloadValues.qa_status || 'submitted' : '',
            endorsed_at:
                mode === 'edit' && hasEndorsementDraft ? payloadValues.endorsed_at || nowIso : payloadValues.endorsed_at,
            endorsed_by:
                mode === 'edit' && hasEndorsementDraft
                    ? payloadValues.endorsed_by || currentUsername || ''
                    : payloadValues.endorsed_by,
            attachment_filename: currentAttachment?.fileName ?? initialAttachment?.fileName ?? null,
            attachment_mime_type: currentAttachment?.fileType ?? initialAttachment?.mimeType ?? null,
            attachment_size: currentAttachment?.fileSize ?? initialAttachment?.fileSize ?? null,
            attachment_pdf_page_count: currentAttachment?.pdfPageCount ?? initialAttachment?.pdfPageCount ?? null,
            attachment_file_path: currentAttachment?.file ? null : (initialAttachment?.filePath ?? null),
        };
    };

    const submitHandler = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;
        setPendingPayload(buildPayload());
        setConfirmDialogOpen(true);
    };

    const buildRegistryFormData = (registryPayload: CorrespondenceRegistryPayload) => {
        const selectedAttachment = attachments[0]?.file;
        const formData = new FormData();
        appendFormValue(formData, 'reference_no', registryPayload.reference_no);
        appendFormValue(formData, 'date_received', registryPayload.date_received);
        appendFormValue(formData, 'letter_date', registryPayload.letter_date);
        appendFormValue(formData, 'sender', registryPayload.sender);
        appendFormValue(formData, 'sender_ref', registryPayload.sender_ref);
        appendFormValue(formData, 'document_cover_page', registryPayload.document_cover_page);
        appendFormValue(formData, 'document_full_letters', registryPayload.document_full_letters);
        appendFormValue(formData, 'document_claim_attachment', registryPayload.document_claim_attachment);
        appendFormValue(formData, 'document_others', registryPayload.document_others);
        appendFormValue(formData, 'document_others_specify', registryPayload.document_others_specify);
        appendFormValue(formData, 'subject', registryPayload.subject);
        appendFormValue(formData, 'direction', registryPayload.direction);
        appendFormValue(formData, 'registered_at', registryPayload.registered_at);
        appendFormValue(formData, 'registered_by', registryPayload.registered_by);
        appendFormValue(formData, 'attachment_filename', registryPayload.attachment_filename);
        appendFormValue(formData, 'attachment_mime_type', registryPayload.attachment_mime_type);
        appendFormValue(formData, 'attachment_size', registryPayload.attachment_size);
        appendFormValue(formData, 'attachment_pdf_page_count', registryPayload.attachment_pdf_page_count);
        appendFormValue(formData, 'attachment_file_path', registryPayload.attachment_file_path);
        if (selectedAttachment instanceof File) {
            formData.append('file', selectedAttachment);
        }
        return formData;
    };

    const saveRegistrySection = async () => {
        if (mode !== 'edit') return;
        if (!recordId) {
            toast.error('Unable to resolve correspondence ID for update');
            return;
        }

        try {
            setIsRegistrySaving(true);
            const payload = buildPayload();
            const registryPayload = buildRegistryPayload(payload);
            const formData = buildRegistryFormData(registryPayload);

            await authenticatedApi.put(`/api/media/correspondence/${recordId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setIsRegistryEditing(false);
            setValues((current) => ({
                ...current,
                reference_no: payload.reference_no ?? current.reference_no,
                registered_at: payload.registered_at,
                registered_by: payload.registered_by,
            }));
            toast.success('Registry updated successfully.');
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || 'Failed to update registry';
            toast.error(message);
        } finally {
            setIsRegistrySaving(false);
        }
    };

    const confirmSubmit = async () => {
        if (!pendingPayload || isSubmitting) return;
        const payload = pendingPayload;
        const registryPayload = buildRegistryPayload(payload);
        const qaPayload = mode === 'edit' && recordId ? buildQaPayload(payload, qaRows, recordId) : null;
        const endorsementPayload = mode === 'edit' && recordId ? buildEndorsementPayload(payload, recordId) : null;

        try {
            setIsSubmitting(true);
            setConfirmDialogOpen(false);
            const formData = buildRegistryFormData(registryPayload);

            if (mode === 'edit') {
                if (!recordId) {
                    toast.error('Unable to resolve correspondence ID for update');
                    return;
                }
                await authenticatedApi.put(`/api/media/correspondence/${recordId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                if (qaPayload) {
                    await authenticatedApi.put(`/api/media/correspondence/${recordId}/qa`, qaPayload);
                }
                if (endorsementPayload) {
                    await authenticatedApi.put(`/api/media/correspondence/${recordId}/endorse`, endorsementPayload);
                }
                setSuccessMessage('Correspondence updated successfully.');
            } else {
                await authenticatedApi.post('/api/media/correspondence', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                localStorage.removeItem(CREATE_DRAFT_STORAGE_KEY);
                setSuccessMessage('Correspondence created successfully.');
            }
            setSubmittedPayload(payload);
            setSuccessDialogOpen(true);
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || 'Failed to save correspondence';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
            setPendingPayload(null);
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
        values.document_full_letters ? 'Full letters' : null,
        values.document_claim_attachment ? 'Claim attachment' : null,
        values.document_others ? `Others${values.document_others_specify ? `: ${values.document_others_specify}` : ''}` : null,
    ].filter(Boolean) as string[];

    const syncQaRowsToValues = (nextRows: QaRow[]) => {
        setQaRows(nextRows);
    };

    return (
        <Card className="mx-auto w-full max-w-7xl">
            {showCardHeader ? (
                <CardHeader>
                    <CardTitle>{mode === 'edit' ? 'Edit Correspondence Registry' : 'Create Correspondence Registry'}</CardTitle>
                    <CardDescription>
                        {mode === 'edit'
                            ? `Update registry details${recordSlug ? ` for ${recordSlug}` : ''}.`
                            : 'Register new incoming or outgoing correspondence details.'}
                    </CardDescription>
                </CardHeader>
            ) : null}
            <CardContent>
                <form onSubmit={submitHandler} className="space-y-4">
                    <div className="grid gap-6 xl:grid-cols-[minmax(320px,3fr)_minmax(0,2fr)] xl:items-stretch">
                        <div className="h-full">
                            <div
                                className={`h-full rounded-xl border border-dashed border-slate-300 bg-stone-100/50 px-4 py-4 transition-colors ${
                                    registryEditable ? 'cursor-pointer hover:bg-stone-100' : ''
                                }`}
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
                                    <div className="flex flex-col items-center justify-center gap-2 py-4 text-center xl:h-full">
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

                        <div className="space-y-4">
                            <Card className='bg-stone-100/50 hover:bg-stone-100'>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-bold text-slate-900">Registy Section</p>
                                        {mode === 'edit' ? (
                                            isRegistryEditing ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => void saveRegistrySection()}
                                                    disabled={isRegistrySaving || isSubmitting}
                                                    aria-label="Save registry section"
                                                >
                                                    <Save className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => setIsRegistryEditing(true)}
                                                    aria-label="Edit registry section"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )
                                        ) : null}
                                    </div>

                                    {mode === 'edit' && !isRegistryEditing ? (
                                        <div className="space-y-4 text-sm text-slate-700">
                                            <div className="grid gap-4 md:grid-cols-3">
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Reference No.</p>
                                                    <p className="mt-1">{values.reference_no || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Direction</p>
                                                    <p className="mt-1 capitalize">{values.direction}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Date Received</p>
                                                    <p className="mt-1">{formatDisplayDate(values.date_received)}</p>
                                                </div>
                                            </div>
                                            <div className="grid gap-4 md:grid-cols-3">
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Sender</p>
                                                    <p className="mt-1">{values.sender || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Sender Ref.</p>
                                                    <p className="mt-1">{values.sender_ref || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Letter Date</p>
                                                    <p className="mt-1">{formatDisplayDate(values.letter_date)}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Document Contents</p>
                                                <p className="mt-1">{registryDocumentContents.length > 0 ? registryDocumentContents.join(', ') : '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Subject Matters</p>
                                                <p className="mt-1 whitespace-pre-wrap">{values.subject || '-'}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid gap-4 md:grid-cols-3">
                                                <div className="space-y-2">
                                                    <Label>Reference No.</Label>
                                                    <div className="min-h-10 py-2 text-sm">
                                                        {values.reference_no || (mode === 'create' ? 'Auto-generated by system' : '-')}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="direction">Direction</Label>
                                                    <Select
                                                        value={values.direction}
                                                        onValueChange={(value) => updateValues({ ...values, direction: value as Direction })}
                                                    >
                                                        <SelectTrigger id="direction" className="w-full">
                                                            <SelectValue placeholder="Select direction" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="incoming">Incoming</SelectItem>
                                                            <SelectItem value="outgoing">Outgoing</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="date-received">Date Received</Label>
                                                    <Input
                                                        id="date-received"
                                                        type="date"
                                                        value={values.date_received}
                                                        onChange={(event) => updateValues({ ...values, date_received: event.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-3">
                                                <div className="space-y-2">
                                                    <Label htmlFor="sender">Sender</Label>
                                                    <Input
                                                        id="sender"
                                                        value={values.sender}
                                                        onChange={(event) => updateValues({ ...values, sender: event.target.value })}
                                                        placeholder="Name of sender"
                                                        className='uppercase placeholder:normal-case'
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="sender-ref">Sender Ref.</Label>
                                                    <Input
                                                        id="sender-ref"
                                                        value={values.sender_ref}
                                                        onChange={(event) => updateValues({ ...values, sender_ref: event.target.value })}
                                                        placeholder="Sender reference number"
                                                        className='uppercase placeholder:normal-case'
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="letter-date">Letter Date</Label>
                                                    <Input
                                                        id="letter-date"
                                                        type="date"
                                                        value={values.letter_date}
                                                        onChange={(event) => updateValues({ ...values, letter_date: event.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Label>Document Contents</Label>
                                                <div className="flex flex-wrap items-center gap-6">
                                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                                        <Checkbox
                                                            id="document-cover-page"
                                                            checked={values.document_cover_page}
                                                            onCheckedChange={(checked) =>
                                                                updateValues({ ...values, document_cover_page: checked === true })
                                                            }
                                                        />
                                                        <Label htmlFor="document-cover-page" className="font-normal text-slate-700">
                                                            Cover page
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                                        <Checkbox
                                                            id="document-full-letters"
                                                            checked={values.document_full_letters}
                                                            onCheckedChange={(checked) =>
                                                                updateValues({ ...values, document_full_letters: checked === true })
                                                            }
                                                        />
                                                        <Label htmlFor="document-full-letters" className="font-normal text-slate-700">
                                                            Full letters
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                                        <Checkbox
                                                            id="document-claim-attachment"
                                                            checked={values.document_claim_attachment}
                                                            onCheckedChange={(checked) =>
                                                                updateValues({ ...values, document_claim_attachment: checked === true })
                                                            }
                                                        />
                                                        <Label
                                                            htmlFor="document-claim-attachment"
                                                            className="font-normal text-slate-700"
                                                        >
                                                            Claim attachment
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                                        <Checkbox
                                                            id="document-others"
                                                            checked={values.document_others}
                                                            onCheckedChange={(checked) =>
                                                                updateValues({
                                                                    ...values,
                                                                    document_others: checked === true,
                                                                    document_others_specify:
                                                                        checked === true ? values.document_others_specify : '',
                                                                })
                                                            }
                                                        />
                                                        <Label htmlFor="document-others" className="font-normal text-slate-700">
                                                            Others
                                                        </Label>
                                                    </div>
                                                </div>
                                                {values.document_others ? (
                                                    <div className="space-y-2">
                                                        <Label htmlFor="document-others-specify">Specify</Label>
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

                                            <div className="space-y-2">
                                                <Label htmlFor="subject">Subject Matters</Label>
                                                <Textarea
                                                    id="subject"
                                                    value={values.subject}
                                                    onChange={(event) => updateValues({ ...values, subject: event.target.value })}
                                                    placeholder="Enter correspondence subject matters"
                                                    rows={3}
                                                    required
                                                    className='uppercase placeholder:normal-case'
                                                />
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className='bg-stone-100/50 hover:bg-stone-100'>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-slate-900">QA Section</p>
                                        {qaSectionDisabled ? (
                                            <p className="text-xs text-slate-500">
                                                Available after registry creation as part of the second workflow.
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="letter-type">Letter Type</Label>
                                            <Select
                                                value={values.letter_type}
                                                onValueChange={(value) => updateValues({ ...values, letter_type: value })}
                                                disabled={qaSectionDisabled}
                                            >
                                                <SelectTrigger id="letter-type" className="w-full">
                                                    <SelectValue placeholder="Select letter type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {LETTER_TYPE_OPTIONS.map((option) => (
                                                        <SelectItem key={option} value={option}>
                                                            {option}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="category">Category</Label>
                                            <Select
                                                value={values.category}
                                                onValueChange={(value) => updateValues({ ...values, category: value })}
                                                disabled={qaSectionDisabled}
                                            >
                                                <SelectTrigger id="category" className="w-full">
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {CATEGORY_OPTIONS.map((option) => (
                                                        <SelectItem key={option} value={option}>
                                                            {option}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="priority">Priority</Label>
                                            <Select
                                                value={values.priority}
                                                onValueChange={(value) => updateValues({ ...values, priority: value as Priority })}
                                                disabled={qaSectionDisabled}
                                            >
                                                <SelectTrigger id="priority" className="w-full">
                                                    <SelectValue placeholder="Select priority" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="low">Low</SelectItem>
                                                    <SelectItem value="normal">Normal</SelectItem>
                                                    <SelectItem value="high">High</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {qaRows.map((row, index) => (
                                            <div key={row.id} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                                                <div className="space-y-2">
                                                    <Label>Recipient</Label>
                                                    <Combobox
                                                        options={recipientOptions}
                                                        value={row.recipientRamcoId}
                                                        onValueChange={(value) => {
                                                            if (qaSectionDisabled) return;
                                                            const selected =
                                                                recipientOptions.find((option) => option.value === value) ??
                                                                recipientOptions.find((option) => option.label === value);
                                                            const nextRows = qaRows.map((entry) =>
                                                                entry.id === row.id
                                                                    ? {
                                                                        ...entry,
                                                                        recipientRamcoId: value,
                                                                        departmentId: selected?.departmentId ?? entry.departmentId,
                                                                        departmentCode: selected?.departmentCode ?? entry.departmentCode,
                                                                    }
                                                                    : entry,
                                                            );
                                                            syncQaRowsToValues(nextRows);
                                                        }}
                                                        placeholder="Select recipient"
                                                        searchPlaceholder="Search recipient..."
                                                        emptyMessage="No active employee found."
                                                        disabled={qaSectionDisabled}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor={`department-${row.id}`}>Department</Label>
                                                    <Input
                                                        id={`department-${row.id}`}
                                                        value={row.departmentCode}
                                                        readOnly
                                                        disabled={qaSectionDisabled}
                                                        placeholder="Auto from recipient"
                                                        required={!qaSectionDisabled && index === 0}
                                                    />
                                                </div>
                                                <div className="flex items-end">
                                                    {index === 0 ? (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            className="w-full md:w-9 border-emerald-600 text-emerald-600 hover:bg-emerald-50 focus-visible:ring-emerald-600"
                                                            onClick={() => syncQaRowsToValues([...qaRows, createQaRow()])}
                                                            aria-label="Add correspondence row"
                                                            disabled={qaSectionDisabled}
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            className="w-full md:w-9 border-rose-600 text-rose-600 hover:bg-rose-50 focus-visible:ring-rose-600"
                                                            onClick={() => {
                                                                const nextRows = qaRows.filter((entry) => entry.id !== row.id);
                                                                syncQaRowsToValues(nextRows);
                                                            }}
                                                            aria-label="Remove correspondence row"
                                                            disabled={qaSectionDisabled}
                                                        >
                                                            <Minus className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="remarks">QA Remarks</Label>
                                        <Textarea
                                            id="remarks"
                                            value={values.remarks}
                                            onChange={(event) => updateValues({ ...values, remarks: event.target.value })}
                                            placeholder="Add letter summary"
                                            rows={4}
                                            disabled={qaSectionDisabled}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className='bg-stone-100/50 hover:bg-stone-100'>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-slate-900">Endorsement Section</p>
                                        {endorsementSectionDisabled ? (
                                            <p className="text-xs text-slate-500">
                                                Available after registry creation as part of the endorsement workflow.
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="endorsed-status">Endorsement Status</Label>
                                            <Select
                                                value={values.endorsed_status}
                                                onValueChange={(value) => updateValues({ ...values, endorsed_status: value })}
                                                disabled={endorsementSectionDisabled}
                                            >
                                                <SelectTrigger id="endorsed-status" className="w-full">
                                                    <SelectValue placeholder="Select endorsement status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="endorsed">Endorsed</SelectItem>
                                                    <SelectItem value="pending">Pending</SelectItem>
                                                    <SelectItem value="rejected">Rejected</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Endorsed By</Label>
                                            <div className="min-h-10 py-2 text-sm text-slate-700">
                                                {values.endorsed_by || (!endorsementSectionDisabled && currentUsername ? currentUsername : '-')}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Endorsed At</Label>
                                            <div className="min-h-10 py-2 text-sm text-slate-700">
                                                {values.endorsed_at ? new Date(values.endorsed_at).toLocaleString() : '-'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="endorsed-remarks">Endorsement Remarks</Label>
                                        <Textarea
                                            id="endorsed-remarks"
                                            value={values.endorsed_remarks}
                                            onChange={(event) => updateValues({ ...values, endorsed_remarks: event.target.value })}
                                            placeholder="Add endorsement remarks"
                                            rows={4}
                                            disabled={endorsementSectionDisabled}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                        <Button type="button" variant="outline" onClick={() => setCancelDialogOpen(true)}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting || isRegistrySaving}>
                            {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Save Workflow' : 'Save Registry'}
                        </Button>
                    </div>
                </form>
            </CardContent>
            <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to submit this correspondence record?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void confirmSubmit()} disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
                        <AlertDialogAction onClick={onCancel} disabled={isSubmitting}>
                            Leave Form
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Submission Successful</AlertDialogTitle>
                        <AlertDialogDescription>{successMessage}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={() => {
                                if (submittedPayload) {
                                    void onSubmit?.(submittedPayload);
                                }
                            }}
                        >
                            Return to Records
                        </AlertDialogAction>
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
