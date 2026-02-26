'use client';

import CorrespondenceForm, { type CorrespondenceFormValues } from '@/components/docs/docs-correspondence-form';

const EMPTY_FORM_VALUES: CorrespondenceFormValues = {
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

export default function CreateCorrespondencePage() {
    const goBackToRecords = () => {
        window.location.href = `/docs/correspondence?tab=records&reload=${Date.now()}`;
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
