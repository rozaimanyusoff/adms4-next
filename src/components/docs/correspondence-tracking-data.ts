export type Direction = 'incoming' | 'outgoing';
export type RegisterStatus = 'registered' | 'in_progress' | 'completed';
export type Priority = 'low' | 'normal' | 'high';

export type CorrespondenceRecord = {
    id: string;
    reference_no: string;
    subject: string;
    direction: Direction;
    correspondent: string;
    department: string;
    medium: 'email' | 'letter' | 'courier' | 'memo';
    received_at?: string;
    sent_at?: string;
    due_date?: string;
    status: RegisterStatus;
    priority: Priority;
    owner: string;
};

export const seedCorrespondenceRecords: CorrespondenceRecord[] = [
    {
        id: 'CT-2026-001',
        reference_no: 'IN/FIN/2026/0012',
        subject: 'Budget revision request for Q2 operations',
        direction: 'incoming',
        correspondent: 'Finance Division HQ',
        department: 'Corporate Services',
        medium: 'email',
        received_at: '2026-02-18T09:20:00.000Z',
        due_date: '2026-02-26T00:00:00.000Z',
        status: 'in_progress',
        priority: 'high',
        owner: 'Nur Aina',
    },
    {
        id: 'CT-2026-002',
        reference_no: 'OUT/OPS/2026/0008',
        subject: 'Response on preventive maintenance closure',
        direction: 'outgoing',
        correspondent: 'Regional Operations Office',
        department: 'Maintenance',
        medium: 'letter',
        sent_at: '2026-02-15T07:50:00.000Z',
        due_date: '2026-02-20T00:00:00.000Z',
        status: 'completed',
        priority: 'normal',
        owner: 'Amir Hafiz',
    },
    {
        id: 'CT-2026-003',
        reference_no: 'IN/HSE/2026/0034',
        subject: 'Incident clarification request',
        direction: 'incoming',
        correspondent: 'State Safety Unit',
        department: 'HSE',
        medium: 'courier',
        received_at: '2026-02-20T03:10:00.000Z',
        due_date: '2026-02-24T00:00:00.000Z',
        status: 'registered',
        priority: 'high',
        owner: 'Farid Rahman',
    },
    {
        id: 'CT-2026-004',
        reference_no: 'OUT/HR/2026/0011',
        subject: 'Verification of staffing movement list',
        direction: 'outgoing',
        correspondent: 'People & Culture HQ',
        department: 'HR',
        medium: 'email',
        sent_at: '2026-02-21T02:40:00.000Z',
        due_date: '2026-03-01T00:00:00.000Z',
        status: 'in_progress',
        priority: 'normal',
        owner: 'Alya Shafika',
    },
    {
        id: 'CT-2026-005',
        reference_no: 'IN/IT/2026/0005',
        subject: 'Network change notification',
        direction: 'incoming',
        correspondent: 'IT Shared Services',
        department: 'ICT',
        medium: 'memo',
        received_at: '2026-02-14T05:35:00.000Z',
        due_date: '2026-02-28T00:00:00.000Z',
        status: 'registered',
        priority: 'low',
        owner: 'Hakim Lee',
    },
    {
        id: 'CT-2026-006',
        reference_no: 'OUT/LEGAL/2026/0003',
        subject: 'Submission of supporting contract annexures',
        direction: 'outgoing',
        correspondent: 'Legal & Compliance',
        department: 'Contracts',
        medium: 'courier',
        sent_at: '2026-02-10T10:15:00.000Z',
        due_date: '2026-02-17T00:00:00.000Z',
        status: 'completed',
        priority: 'normal',
        owner: 'Wan Idris',
    },
];
