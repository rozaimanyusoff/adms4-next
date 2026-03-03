'use client';

import { useRouter } from 'next/navigation';
import CorrespondenceForm, { type CorrespondenceFormValues } from '@/components/docs/docs-correspondence-form';

const EMPTY_FORM_VALUES: CorrespondenceFormValues = {
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

export default function CreateCorrespondencePageClient() {
    const router = useRouter();

    const goBackToRecords = () => {
        router.push('/docs/correspondence?tab=records');
    };

    return (
        <div className="space-y-8">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-slate-900">Create Correspondence Registry</h1>
                <p className="text-sm text-muted-foreground">Register new incoming or outgoing correspondence details.</p>
            </div>
            <CorrespondenceForm
                mode="create"
                showCardHeader={false}
                initialValues={EMPTY_FORM_VALUES}
                onCancel={goBackToRecords}
                onSubmit={goBackToRecords}
            />
        </div>
    );
}
