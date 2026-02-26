'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
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
import { FileText, Minus, Plus, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Direction, Priority } from './correspondence-tracking-data';

export type CorrespondenceFormValues = {
    reference_no: string;
    sender: string;
    sender_ref: string;
    document_cover_page: boolean;
    document_full_letters: boolean;
    document_claim_attachment: boolean;
    document_others: boolean;
    document_others_specify: string;
    subject: string;
    correspondent: string;
    direction: Direction;
    department: string;
    letter_type: string;
    category: string;
    priority: Priority;
    date_received: string;
    remarks: string;
};

export type CorrespondenceFormSubmitPayload = Omit<CorrespondenceFormValues, 'reference_no'> & {
    reference_no: string | null;
    registered_at: string | null;
    registered_by: string | null;
    disseminated_at: string | null;
    disseminated_by: string | null;
    attachment_filename: string | null;
    attachment_mime_type: string | null;
    attachment_size: number | null;
    attachment_pdf_page_count: number | null;
    attachment_file_path: string | null;
};

type AttachmentItem = {
    id: string;
    file: File;
    previewUrl?: string;
    pdfPageCount?: number;
};

type CorrespondenceFormProps = {
    mode?: 'create' | 'edit';
    recordId?: string | number;
    recordSlug?: string;
    showCardHeader?: boolean;
    initialValues?: CorrespondenceFormValues;
    onCancel: () => void;
    onSubmit?: (payload: CorrespondenceFormSubmitPayload) => void | Promise<void>;
    onValuesChange?: (values: CorrespondenceFormValues) => void;
};

const emptyFormValues: CorrespondenceFormValues = {
    reference_no: '',
    sender: '',
    sender_ref: '',
    document_cover_page: false,
    document_full_letters: false,
    document_claim_attachment: false,
    document_others: false,
    document_others_specify: '',
    subject: '',
    correspondent: '',
    direction: 'incoming',
    department: '',
    letter_type: '',
    category: '',
    priority: 'normal',
    date_received: '',
    remarks: '',
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

const parseList = (value: string) =>
    value
        .split(';')
        .map((entry) => entry.trim())
        .filter(Boolean);

const appendFormValue = (formData: FormData, key: string, value: string | number | boolean | null | undefined) => {
    if (value === null || value === undefined) {
        formData.append(key, '');
        return;
    }
    formData.append(key, String(value));
};

const buildQaRowsFromValues = (formValues: CorrespondenceFormValues, recipientOptions: EmployeeOption[] = []): QaRow[] => {
    const correspondences = parseList(formValues.correspondent);
    const departments = parseList(formValues.department);
    const total = Math.max(correspondences.length, departments.length, 1);
    return Array.from({ length: total }, (_, index) => {
        const recipientRamcoId = correspondences[index] ?? '';
        const payloadDepartmentId = departments[index] ?? '';
        const selected = recipientOptions.find((option) => option.value === recipientRamcoId);
        return createQaRow(
            recipientRamcoId,
            payloadDepartmentId || selected?.departmentId || '',
            selected?.departmentCode || '',
        );
    });
};

export const CorrespondenceForm = ({
    mode = 'create',
    recordId,
    recordSlug,
    showCardHeader = true,
    initialValues,
    onCancel,
    onSubmit,
    onValuesChange,
}: CorrespondenceFormProps) => {
    const attachmentInputRef = useRef<HTMLInputElement | null>(null);
    const localUpdateRef = useRef(false);
    const draftHydratedRef = useRef(false);
    const [recipientOptions, setRecipientOptions] = useState<EmployeeOption[]>([]);
    const [values, setValues] = useState<CorrespondenceFormValues>({
        ...emptyFormValues,
        ...(initialValues ?? {}),
    });
    const [qaRows, setQaRows] = useState<QaRow[]>(buildQaRowsFromValues({ ...emptyFormValues, ...(initialValues ?? {}) }));
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [successDialogOpen, setSuccessDialogOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('Correspondence saved successfully.');
    const [pendingPayload, setPendingPayload] = useState<CorrespondenceFormSubmitPayload | null>(null);
    const [submittedPayload, setSubmittedPayload] = useState<CorrespondenceFormSubmitPayload | null>(null);

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
        setValues(nextValues);
        setQaRows(buildQaRowsFromValues(nextValues, recipientOptions));
    }, [initialValues, recipientOptions, mode]);

    useEffect(() => {
        if (mode !== 'create') return;
        localStorage.setItem(CREATE_DRAFT_STORAGE_KEY, JSON.stringify(values));
    }, [mode, values]);

    useEffect(() => {
        return () => {
            attachments.forEach((item) => {
                if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
            });
        };
    }, [attachments]);

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
                previewUrl: URL.createObjectURL(file),
                pdfPageCount,
            };
            setAttachments((prev) => {
                prev.forEach((entry) => {
                    if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
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
            if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
            return prev.filter((entry) => entry.id !== id);
        });
    };

    const buildPayload = (): CorrespondenceFormSubmitPayload => {
        const currentAttachment = attachments[0];
        return {
            ...values,
            reference_no: mode === 'create' ? null : values.reference_no.trim() || null,
            registered_at: null,
            registered_by: null,
            disseminated_at: null,
            disseminated_by: null,
            attachment_filename: currentAttachment?.file.name ?? null,
            attachment_mime_type: currentAttachment?.file.type ?? null,
            attachment_size: currentAttachment?.file.size ?? null,
            attachment_pdf_page_count: currentAttachment?.pdfPageCount ?? null,
            attachment_file_path: null,
        };
    };

    const submitHandler = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;
        setPendingPayload(buildPayload());
        setConfirmDialogOpen(true);
    };

    const confirmSubmit = async () => {
        if (!pendingPayload || isSubmitting) return;
        const payload = pendingPayload;

        try {
            setIsSubmitting(true);
            setConfirmDialogOpen(false);
            const selectedAttachment = attachments[0]?.file;
            const formData = new FormData();
            appendFormValue(formData, 'reference_no', payload.reference_no);
            appendFormValue(formData, 'sender', payload.sender);
            appendFormValue(formData, 'sender_ref', payload.sender_ref);
            appendFormValue(formData, 'document_cover_page', payload.document_cover_page);
            appendFormValue(formData, 'document_full_letters', payload.document_full_letters);
            appendFormValue(formData, 'document_claim_attachment', payload.document_claim_attachment);
            appendFormValue(formData, 'document_others', payload.document_others);
            appendFormValue(formData, 'document_others_specify', payload.document_others_specify);
            appendFormValue(formData, 'subject', payload.subject);
            appendFormValue(formData, 'correspondent', payload.correspondent);
            appendFormValue(formData, 'direction', payload.direction);
            appendFormValue(formData, 'department', payload.department);
            appendFormValue(formData, 'letter_type', payload.letter_type);
            appendFormValue(formData, 'category', payload.category);
            appendFormValue(formData, 'priority', payload.priority);
            appendFormValue(formData, 'date_received', payload.date_received);
            appendFormValue(formData, 'remarks', payload.remarks);
            appendFormValue(formData, 'registered_at', payload.registered_at);
            appendFormValue(formData, 'registered_by', payload.registered_by);
            appendFormValue(formData, 'disseminated_at', payload.disseminated_at);
            appendFormValue(formData, 'disseminated_by', payload.disseminated_by);
            appendFormValue(formData, 'attachment_filename', payload.attachment_filename);
            appendFormValue(formData, 'attachment_mime_type', payload.attachment_mime_type);
            appendFormValue(formData, 'attachment_size', payload.attachment_size);
            appendFormValue(formData, 'attachment_pdf_page_count', payload.attachment_pdf_page_count);
            appendFormValue(formData, 'attachment_file_path', payload.attachment_file_path);
            if (selectedAttachment) {
                formData.append('file', selectedAttachment);
            }

            if (mode === 'edit') {
                if (!recordId) {
                    toast.error('Unable to resolve correspondence ID for update');
                    return;
                }
                await authenticatedApi.put(`/api/media/correspondence/${recordId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
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

    const syncQaRowsToValues = (nextRows: QaRow[]) => {
        setQaRows(nextRows);
        updateValues({
            ...values,
            correspondent: nextRows
                .map((row) => row.recipientRamcoId.trim())
                .filter(Boolean)
                .join('; '),
            department: nextRows
                .map((row) => row.departmentId.trim())
                .filter(Boolean)
                .join('; '),
        });
    };

    return (
        <Card className="mx-auto max-w-7xl">
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
                    <div className="grid gap-6 xl:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)] xl:items-stretch">
                        <div className="h-full">
                            <div
                                className="h-full cursor-pointer rounded-xl border border-dashed border-slate-300 bg-stone-100/50 px-4 py-4 transition-colors hover:bg-stone-100"
                                onClick={openFilePicker}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        openFilePicker();
                                    }
                                }}
                                role="button"
                                tabIndex={0}
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
                                                        {item.file.type === 'application/pdf' && item.previewUrl ? (
                                                            <div className="space-y-2 p-2">
                                                                <div className="h-120 overflow-hidden rounded-md border border-slate-200 bg-white">
                                                                    <iframe
                                                                        src={`${item.previewUrl}#toolbar=0&navpanes=0`}
                                                                        title={`${item.file.name} preview`}
                                                                        className="h-full w-full"
                                                                    />
                                                                </div>
                                                                <p className="text-right text-[11px] font-medium text-slate-600">
                                                                    Total pages: {item.pdfPageCount || 1}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="flex h-32 w-full items-center justify-center pt-6">
                                                                <FileText className="h-8 w-8 text-slate-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <p className="truncate text-xs font-medium text-slate-700">{item.file.name}</p>
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
                                                    <p className="truncate text-[11px] text-slate-500">{formatFileSize(item.file.size)}</p>
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
                                    <p className="text-sm font-bold text-slate-900">Registy Section</p>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="reference-no">Reference No.</Label>
                                            <Input
                                                id="reference-no"
                                                value={values.reference_no}
                                                readOnly
                                                placeholder={mode === 'create' ? 'Auto-generated by system' : 'Reference number'}
                                            />
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

                                    <div className="grid gap-4 md:grid-cols-2">
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
                                </CardContent>
                            </Card>

                            <Card className='bg-stone-100/50 hover:bg-stone-100'>
                                <CardContent className="space-y-4">
                                    <p className="text-sm font-bold text-slate-900">QA Section</p>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="letter-type">Letter Type</Label>
                                            <Select
                                                value={values.letter_type}
                                                onValueChange={(value) => updateValues({ ...values, letter_type: value })}
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
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor={`department-${row.id}`}>Department</Label>
                                                    <Input
                                                        id={`department-${row.id}`}
                                                        value={row.departmentCode}
                                                        readOnly
                                                        placeholder="Auto from recipient"
                                                        required={index === 0}
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
                                                        >
                                                            <Minus className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="remarks">Letter Summary</Label>
                                        <Textarea
                                            id="remarks"
                                            value={values.remarks}
                                            onChange={(event) => updateValues({ ...values, remarks: event.target.value })}
                                            placeholder="Add letter summary"
                                            rows={4}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Registry'}
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
