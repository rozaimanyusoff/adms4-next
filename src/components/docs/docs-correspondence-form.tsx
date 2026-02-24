'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, UploadCloud, X } from 'lucide-react';
import type { Direction, Priority } from './correspondence-tracking-data';

export type CorrespondenceFormValues = {
    reference_no: string;
    sender: string;
    sender_ref: string;
    subject: string;
    correspondent: string;
    direction: Direction;
    department: string;
    owner: string;
    priority: Priority;
    date_received: string;
    due_date: string;
    remarks: string;
};

type AttachmentItem = {
    id: string;
    file: File;
    previewUrl?: string;
    pdfPageCount?: number;
};

type CorrespondenceFormProps = {
    mode?: 'create' | 'edit';
    recordSlug?: string;
    initialValues?: CorrespondenceFormValues;
    onCancel: () => void;
    onSubmit?: (values: CorrespondenceFormValues) => void;
    onValuesChange?: (values: CorrespondenceFormValues) => void;
};

const emptyFormValues: CorrespondenceFormValues = {
    reference_no: '',
    sender: '',
    sender_ref: '',
    subject: '',
    correspondent: '',
    direction: 'incoming',
    department: '',
    owner: '',
    priority: 'normal',
    date_received: '',
    due_date: '',
    remarks: '',
};

export const CorrespondenceForm = ({
    mode = 'create',
    recordSlug,
    initialValues,
    onCancel,
    onSubmit,
    onValuesChange,
}: CorrespondenceFormProps) => {
    const attachmentInputRef = useRef<HTMLInputElement | null>(null);
    const [values, setValues] = useState<CorrespondenceFormValues>({
        ...emptyFormValues,
        ...(initialValues ?? {}),
    });
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

    useEffect(() => {
        setValues({
            ...emptyFormValues,
            ...(initialValues ?? {}),
        });
    }, [initialValues]);

    useEffect(() => {
        return () => {
            attachments.forEach((item) => {
                if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
            });
        };
    }, [attachments]);

    const updateValues = (next: CorrespondenceFormValues) => {
        setValues(next);
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

    const submitHandler = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit?.(values);
    };

    const openFilePicker = () => {
        attachmentInputRef.current?.click();
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Card className="mx-auto max-w-7xl">
            <CardHeader>
                <CardTitle>{mode === 'edit' ? 'Edit Correspondence Registry' : 'Create Correspondence Registry'}</CardTitle>
                <CardDescription>
                    {mode === 'edit'
                        ? `Update registry details${recordSlug ? ` for ${recordSlug}` : ''}.`
                        : 'Register new incoming or outgoing correspondence details.'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={submitHandler} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="attachments">Attachment</Label>
                        <div
                            className="cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 transition-colors hover:bg-slate-100"
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
                            {attachments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
                                    <UploadCloud className="h-6 w-6 text-slate-500" />
                                    <p className="text-sm font-medium text-slate-700">Drop files here or click to upload</p>
                                    <p className="text-xs text-slate-500">Supports PDF only. Single file only.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                                        Scanned Document ({attachments.length})
                                    </p>
                                    <div>
                                        {attachments.map((item) => (
                                            <div
                                                key={item.id}
                                                className="rounded-md border-slate-200 p-2"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                <div className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="absolute right-1 top-1 z-10 h-6 w-6 bg-white/90 text-slate-600 hover:bg-white"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            removeAttachment(item.id);
                                                        }}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {item.file.type === 'application/pdf' && item.previewUrl ? (
                                                        <div className="space-y-2 p-2 pt-8">
                                                            <div className="flex w-full gap-3 overflow-x-auto pb-1">
                                                                {Array.from({ length: item.pdfPageCount || 1 }, (_, index) => index + 1).map((page) => (
                                                                    <a
                                                                        key={`${item.id}-page-${page}`}
                                                                        href={`${item.previewUrl}#page=${page}`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        onClick={(event) => event.stopPropagation()}
                                                                        className="block w-24 shrink-0"
                                                                    >
                                                                        <iframe
                                                                            src={`${item.previewUrl}#page=${page}&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                                                                            title={`${item.file.name} page ${page}`}
                                                                            className="pointer-events-none aspect-3/4 w-full rounded-sm border-0"
                                                                        />
                                                                        <p className="px-1 py-1 text-center text-[10px] text-slate-600">Page {page}</p>
                                                                    </a>
                                                                ))}
                                                            </div>
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
                                                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                                            item.previewUrl
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

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="reference-no">Reference No.</Label>
                            <Input
                                id="reference-no"
                                value={values.reference_no}
                                onChange={(event) => updateValues({ ...values, reference_no: event.target.value })}
                                placeholder="IN/FIN/2026/0013"
                                required
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
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sender-ref">Sender Ref.</Label>
                            <Input
                                id="sender-ref"
                                value={values.sender_ref}
                                onChange={(event) => updateValues({ ...values, sender_ref: event.target.value })}
                                placeholder="Sender reference number"
                            />
                        </div>
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
                        />
                    </div>
                    <div className="border-t border-slate-200" />

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="correspondent">Correspondent</Label>
                            <Input
                                id="correspondent"
                                value={values.correspondent}
                                onChange={(event) => updateValues({ ...values, correspondent: event.target.value })}
                                placeholder="Sender or recipient name"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="department">Department</Label>
                            <Input
                                id="department"
                                value={values.department}
                                onChange={(event) => updateValues({ ...values, department: event.target.value })}
                                placeholder="e.g. Finance"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="owner">Owner</Label>
                            <Input
                                id="owner"
                                value={values.owner}
                                onChange={(event) => updateValues({ ...values, owner: event.target.value })}
                                placeholder="Assigned officer"
                                required
                            />
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
                        <div className="space-y-2">
                            <Label htmlFor="due-date">Due Date</Label>
                            <Input
                                id="due-date"
                                type="date"
                                value={values.due_date}
                                onChange={(event) => updateValues({ ...values, due_date: event.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="remarks">Remarks</Label>
                        <Textarea
                            id="remarks"
                            value={values.remarks}
                            onChange={(event) => updateValues({ ...values, remarks: event.target.value })}
                            placeholder="Add notes or handling instructions"
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                            Save Registry
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default CorrespondenceForm;
