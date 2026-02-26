'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import CorrespondenceForm, { type CorrespondenceFormValues } from '@/components/docs/docs-correspondence-form';
import { seedCorrespondenceRecords } from '@/components/docs/correspondence-tracking-data';

const toSlug = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const toDateInputValue = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

const toFormValues = (record: (typeof seedCorrespondenceRecords)[number]): CorrespondenceFormValues => ({
    reference_no: record.reference_no,
    sender: record.correspondent,
    sender_ref: '',
    document_cover_page: false,
    document_full_letters: false,
    document_claim_attachment: false,
    document_others: false,
    document_others_specify: '',
    subject: record.subject,
    correspondent: record.correspondent,
    direction: record.direction,
    department: record.department,
    letter_type: '',
    category: '',
    priority: record.priority,
    date_received: toDateInputValue(record.received_at),
    remarks: '',
});

export default function EditCorrespondencePage() {
    const params = useParams<{ slug: string }>();
    const slug = params?.slug ?? '';

    const selectedRecord = useMemo(
        () =>
            seedCorrespondenceRecords.find((item) => {
                const slugCandidates = [toSlug(item.id), toSlug(item.reference_no)];
                return slugCandidates.includes(slug);
            }),
        [slug],
    );

    const goBackToRecords = () => {
        window.location.href = `/docs/correspondence?tab=records&reload=${Date.now()}`;
    };

    if (!selectedRecord) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Correspondence record not found for slug: {slug}</p>
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
                    Update registry details{slug ? ` for ${slug}` : ''}.
                </p>
            </div>
            <CorrespondenceForm
                mode="edit"
                recordId={selectedRecord.id}
                recordSlug={slug}
                showCardHeader={false}
                initialValues={toFormValues(selectedRecord)}
                onCancel={goBackToRecords}
                onSubmit={goBackToRecords}
            />
        </div>
    );
}
