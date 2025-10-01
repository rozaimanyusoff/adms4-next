import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { Button } from '@/components/ui/button';
import { openManualAssessmentForm } from './pdf-manual-assessment';
import { Plus, AlertTriangle, Eye, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Assessment = {
    assess_id: number;
    a_date: string | null;
    a_ncr: number;
    a_rate: string | number;
    a_upload?: string | null;
    a_upload2?: string | null;
    a_upload3?: string | null;
    a_upload4?: string | null;
    a_remark?: string | null;
    a_dt?: string | null;
    asset?: any;
    assessed_location?: any;
};

const AssessmentRecord: React.FC = () => {
    const [data, setData] = useState<Assessment[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await authenticatedApi.get('/api/compliance/assessments');
            const list = (res as any).data?.data || (res as any).data || [];
            setData(list as Assessment[]);
        } catch (err) {
            toast.error('Failed to load assessments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Listen for reload event from assessment form submission
        const reloadHandler = () => fetchData();
        window.addEventListener('storage', (e) => {
            if (e.key === 'assessment-record-reload') reloadHandler();
        });
        return () => {
            window.removeEventListener('storage', reloadHandler);
        };
    }, []);

    const columns: ColumnDef<Assessment>[] = [
        { key: 'assess_id' as any, header: 'ID', sortable: true },
        { key: 'a_date' as any, header: 'Assessment Date', sortable: true, render: (row) => row.a_date ? new Date(row.a_date).toLocaleString() : '-' },
        { key: 'a_rate' as any, header: 'Rate', sortable: true },
        {
            key: 'a_ncr' as any,
            header: 'NCR',
            sortable: true,
            render: (row) =>
                Number(row.a_ncr) > 0 ? (
                    <div className="inline-flex items-center gap-1 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{row.a_ncr}</span>
                    </div>
                ) : (
                    <span className="text-gray-500">None</span>
                ),
        },
        { key: 'asset_reg' as any, header: 'Asset', filter: 'singleSelect', render: (row) => row.asset?.register_number || '-' },
        { key: 'asset_owner' as any, header: 'Owner', filter: 'singleSelect', render: (row) => row.asset?.owner?.full_name || '-' },
        { key: 'assessed_location' as any, header: 'Location', filter: 'singleSelect', render: (row) => row.assessed_location?.code || '-' },
        {
            key: 'action' as any,
            header: 'Action',
            render: (row) => {
                const assetId = row.asset?.id ?? row.asset?.asset_id ?? row.asset?.aid;
                if (!assetId) return <span className="text-gray-400 text-xs">No Asset</span>;
                const href = `/compliance/assessment/portal/${assetId}`;
                const assessId = (row as any)?.assess_id ?? (row as any)?.id;
                return (
                    <div className="inline-flex items-center gap-2">
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800"
                            title="View"
                        >
                            <Eye className="h-4 w-4" />
                        </a>
                        <button
                            title="Delete"
                            className="inline-flex items-center text-red-600 hover:text-red-800"
                            onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const ok = window.confirm('Delete assessment(s) for this asset? This action cannot be undone.');
                                if (!ok) return;
                                if (!assessId) { toast.error('Missing assessment id'); return; }
                                try {
                                    // Optionally set loading state if you want to disable controls globally
                                    // setLoading(true);
                                    await authenticatedApi.delete(`/api/compliance/assessments/${assessId}`);
                                    toast.success('Assessment deleted');
                                    // Refresh list
                                    await fetchData();
                                } catch (err) {
                                    console.error('Delete failed', err);
                                    toast.error('Failed to delete assessment(s)');
                                } finally {
                                    // setLoading(false);
                                }
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                );
            }
        },
    ];

    const handleCreate = () => {
        router.push('/compliance/assessment/form');
    };

    const handleRowDoubleClick = (row: Assessment) => {
        router.push(`/compliance/assessment/form?id=${row.assess_id}`);
    };

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Assessment Records</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className='ring-2 -ring-offset-2 ring-emerald-300 hover:bg-emerald-100' onClick={() => openManualAssessmentForm({ title: 'Vehicle Assessment Manual Form', ownership: 9, status: 'active' })}>
                        Print Manual Form
                    </Button>
                    <Button variant="default" onClick={handleCreate}><Plus className="h-4 w-4" /></Button>
                </div>
            </div>

            <CustomDataGrid
                data={data}
                columns={columns}
                inputFilter={false}
                pageSize={10}
                pagination={false}
                onRowDoubleClick={handleRowDoubleClick}
                dataExport
            />
        </div>
    );
};

export default AssessmentRecord;
