'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import CorrespondenceForm, { type CorrespondenceFormValues } from '@/components/docs/docs-correspondence-form';
import { authenticatedApi } from '@/config/api';

type ApiCorrespondenceDetail = {
    id: number | string;
    reference_no?: string | null;
    date_received?: string | null;
    letter_date?: string | null;
    sender?: string | null;
    sender_ref?: string | null;
    document_cover_page?: boolean | number | null;
    document_full_letters?: boolean | number | null;
    document_claim_attachment?: boolean | number | null;
    document_others?: boolean | number | null;
    document_others_specify?: string | null;
    subject?: string | null;
    direction?: 'incoming' | 'outgoing' | null;
    registered_at?: string | null;
    registered_by?: string | null;
    qa_review_date?: string | null;
    qa_reviewed_by?: string | null;
    qa_status?: string | null;
    qa_remarks?: string | null;
    endorsed_by?: string | null;
    endorsed_at?: string | null;
    endorsed_remarks?: string | null;
    endorsed_status?: string | null;
    letter_type?: string | null;
    category?: string | null;
    priority?: 'low' | 'normal' | 'high' | null;
    recipients?:
        | Array<{
              ramco_id?: string | null;
              department_id?: string | number | null;
          }>
        | null;
    attachment_file_path?: string | null;
    attachment_filename?: string | null;
    attachment_mime_type?: string | null;
    attachment_size?: number | null;
    attachment_pdf_page_count?: number | null;
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

const toBool = (value: boolean | number | null | undefined) => value === true || value === 1;

const toDateInputValue = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

const toFormValues = (record: ApiCorrespondenceDetail): CorrespondenceFormValues => ({
    reference_no: String(record.reference_no ?? ''),
    date_received: toDateInputValue(record.date_received),
    letter_date: toDateInputValue(record.letter_date),
    sender: String(record.sender ?? ''),
    sender_ref: String(record.sender_ref ?? ''),
    document_cover_page: toBool(record.document_cover_page),
    document_full_letters: toBool(record.document_full_letters),
    document_claim_attachment: toBool(record.document_claim_attachment),
    document_others: toBool(record.document_others),
    document_others_specify: String(record.document_others_specify ?? ''),
    subject: String(record.subject ?? ''),
    direction: record.direction === 'outgoing' ? 'outgoing' : 'incoming',
    registered_at: String(record.registered_at ?? ''),
    registered_by: String(record.registered_by ?? ''),
    qa_review_date: String(record.qa_review_date ?? ''),
    qa_reviewed_by: String(record.qa_reviewed_by ?? ''),
    qa_status: String(record.qa_status ?? ''),
    letter_type: String(record.letter_type ?? ''),
    category: String(record.category ?? ''),
    priority: record.priority === 'low' || record.priority === 'high' ? record.priority : 'normal',
    remarks: String(record.qa_remarks ?? ''),
    endorsed_by: String(record.endorsed_by ?? ''),
    endorsed_at: String(record.endorsed_at ?? ''),
    endorsed_remarks: String(record.endorsed_remarks ?? ''),
    endorsed_status: String(record.endorsed_status ?? ''),
});

export default function EditCorrespondencePageClient() {
    const params = useParams<{ slug: string }>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const slug = params?.slug ?? '';
    const actionParam = searchParams.get('action');
    const workflowAction =
        actionParam === 'qa' || actionParam === 'qa_review' ? 'qa'
        : actionParam === 'endorse' || actionParam === 'endorsement' ? 'endorsement'
        : 'registry';
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

    const refLabel = String(formValues.reference_no || recordId);

    return (
        <div className="space-y-8">
            <div className="space-y-1">
                {workflowAction !== 'registry' ? (
                    <h1 className="text-2xl font-semibold text-slate-900">
                        {workflowAction === 'qa' ? 'QA Review' : 'Endorsement'}
                    </h1>
                ) : (
                    <>
                        <h1 className="text-2xl font-semibold text-slate-900">Edit Mail Registry</h1>
                        <p className="text-sm text-muted-foreground">Update registry details for {refLabel}.</p>
                    </>
                )}
            </div>
            <CorrespondenceForm
                mode="edit"
                workflowAction={workflowAction}
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
