'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import CorrespondenceForm, { type CorrespondenceFormValues } from '@/components/docs/docs-correspondence-form';
import { authenticatedApi } from '@/config/api';

type ApiCorrespondenceDetail = {
    id: number | string;
    reference_no?: string | null;
    sender?: string | null;
    sender_ref?: string | null;
    document_cover_page?: boolean | number | null;
    document_full_letters?: boolean | number | null;
    document_claim_attachment?: boolean | number | null;
    document_others?: boolean | number | null;
    document_others_specify?: string | null;
    subject?: string | null;
    correspondent?: string | null;
    direction?: 'incoming' | 'outgoing' | null;
    department?: string | null;
    letter_type?: string | null;
    category?: string | null;
    priority?: 'low' | 'normal' | 'high' | null;
    date_received?: string | null;
    remarks?: string | null;
    attachment_file_path?: string | null;
    attachment_filename?: string | null;
    attachment_mime_type?: string | null;
    attachment_size?: number | null;
    attachment_pdf_page_count?: number | null;
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

const toBool = (value: boolean | number | null | undefined) => value === true || value === 1;

const toDateInputValue = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

const toFormValues = (record: ApiCorrespondenceDetail): CorrespondenceFormValues => ({
    reference_no: String(record.reference_no ?? ''),
    sender: String(record.sender ?? ''),
    sender_ref: String(record.sender_ref ?? ''),
    document_cover_page: toBool(record.document_cover_page),
    document_full_letters: toBool(record.document_full_letters),
    document_claim_attachment: toBool(record.document_claim_attachment),
    document_others: toBool(record.document_others),
    document_others_specify: String(record.document_others_specify ?? ''),
    subject: String(record.subject ?? ''),
    correspondent: String(record.correspondent ?? ''),
    direction: record.direction === 'outgoing' ? 'outgoing' : 'incoming',
    department: String(record.department ?? ''),
    letter_type: String(record.letter_type ?? ''),
    category: String(record.category ?? ''),
    priority: record.priority === 'low' || record.priority === 'high' ? record.priority : 'normal',
    date_received: toDateInputValue(record.date_received),
    remarks: String(record.remarks ?? ''),
});

export default function EditCorrespondencePageClient() {
    const params = useParams<{ slug: string }>();
    const router = useRouter();
    const slug = params?.slug ?? '';
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recordId, setRecordId] = useState<string | number | null>(null);
    const [formValues, setFormValues] = useState<CorrespondenceFormValues>(emptyFormValues);
    const [initialAttachment, setInitialAttachment] = useState<{
        filePath: string;
        fileName?: string | null;
        mimeType?: string | null;
        fileSize?: number | null;
        pdfPageCount?: number | null;
    } | null>(null);

    useEffect(() => {
        let cancelled = false;

        const fetchRecord = async () => {
            if (!slug) {
                setError('Missing correspondence ID.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const response = await authenticatedApi.get(`/api/media/correspondence/${slug}`);
                const payload = (response.data as { data?: ApiCorrespondenceDetail })?.data;
                const record = payload ?? (response.data as ApiCorrespondenceDetail);

                if (!record || record.id === undefined || record.id === null) {
                    throw new Error('Correspondence record not found.');
                }

                if (cancelled) return;
                setRecordId(record.id);
                setFormValues(toFormValues(record));
                setInitialAttachment(
                    record.attachment_file_path
                        ? {
                            filePath: record.attachment_file_path,
                            fileName: record.attachment_filename,
                            mimeType: record.attachment_mime_type,
                            fileSize: record.attachment_size,
                            pdfPageCount: record.attachment_pdf_page_count,
                        }
                        : null,
                );
            } catch (err: any) {
                if (cancelled) return;
                const message =
                    err?.response?.data?.message ||
                    err?.message ||
                    `Correspondence record not found for ID: ${slug}`;
                setError(message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void fetchRecord();

        return () => {
            cancelled = true;
        };
    }, [slug]);

    const goBackToRecords = () => {
        router.push('/docs/correspondence?tab=records');
    };

    if (loading) {
        return <p className="text-sm text-muted-foreground">Loading correspondence record...</p>;
    }

    if (error || recordId === null) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{error || `Correspondence record not found for ID: ${slug}`}</p>
                <Button type="button" variant="outline" onClick={goBackToRecords}>
                    Back to Records
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-slate-900">Edit Correspondence Registry</h1>
                <p className="text-sm text-muted-foreground">
                    Update registry details for {String(formValues.reference_no || recordId)}.
                </p>
            </div>
            <CorrespondenceForm
                mode="edit"
                recordId={recordId}
                recordSlug={slug}
                showCardHeader={false}
                initialValues={formValues}
                initialAttachment={initialAttachment}
                onCancel={goBackToRecords}
                onSubmit={goBackToRecords}
            />
        </div>
    );
}
