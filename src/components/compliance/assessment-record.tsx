"use client";

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { openManualAssessmentForm } from './pdf-manual-assessment';
import { Plus, AlertTriangle, Eye, Trash2, CheckCircle } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/store/AuthContext';

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
    asset_reg?: string | null;
    assessed_location?: any;
    ncr_details?: any;
};

const AssessmentRecord: React.FC = () => {
    const auth = useContext(AuthContext);
    const username = (auth?.authData?.user?.username) || ((auth?.authData?.user as any)?.ramco_id) || '';
    const adminPermission = useMemo(() => new Set('000277,003461,003768,004550,000396,000712'.split(',').map((v) => v.trim())), []);
    const isAdmin = username && adminPermission.has(String(username));

    const [data, setData] = useState<Assessment[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
    // Dialog state for delete confirmation
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
    const router = useRouter();

    const parseNcrDetails = (value: any) => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        if (value && typeof value === 'object') {
            const maybeArray = (value as any).data || (value as any).items;
            return Array.isArray(maybeArray) ? maybeArray : [];
        }
        return [];
    };

    const formatDate = (value?: string | null) => {
        if (!value) return null;
        const dt = new Date(value);
        return Number.isNaN(dt.getTime()) ? null : dt.toLocaleDateString('en-GB');
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = {};
            if (username && !isAdmin) {
                params.owner = username;
            }
            const res = await authenticatedApi.get('/api/compliance/assessments', { params });
            const list = (res as any).data?.data || (res as any).data || [];
            const normalized = Array.isArray(list)
                ? list.map((item: any) => ({
                    ...item,
                    asset_reg: item?.asset?.register_number ?? '',
                    ncr_details: parseNcrDetails(item?.ncr_details ?? item?.ncrDetail ?? item?.ncr_detail ?? item?.details),
                }))
                : [];
            setData(normalized as Assessment[]);
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
        { key: 'asset_reg' as any, header: 'Asset', filter: 'input', render: (row) => row.asset_reg || row.asset?.register_number || '-' },
        { key: 'a_date' as any, header: 'Assessment Date', sortable: true, render: (row) => row.a_date ? new Date(row.a_date).toLocaleString() : '-' },
        { key: 'asset_owner' as any, header: 'Owner', filter: 'singleSelect', render: (row) => row.asset?.owner?.full_name || '-' },
        { key: 'assessed_location' as any, header: 'Location', filter: 'singleSelect', render: (row) => row.assessed_location?.code || '-' },
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
        {
            key: 'ncr_action' as any,
            header: 'NCR Action',
            render: (row) => {
                const details = parseNcrDetails(row.ncr_details);
                if (!details.length) {
                    if (Number(row.a_ncr) > 0) {
                        return (
                            <div className="inline-flex items-center gap-1 text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                <span>Open</span>
                            </div>
                        );
                    }
                    return <span className="text-gray-500">-</span>;
                }

                const isClosed = details.every((detail) => {
                    const status = (detail?.ncr_status || '').toLowerCase();
                    const hasClosedAt = Boolean(detail?.closed_at);
                    return status === 'closed' || hasClosedAt;
                });

                const closedDateRaw = details.find((detail) => detail?.closed_at)?.closed_at;
                const closedDate = formatDate(closedDateRaw);

                return isClosed ? (
                    <div className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>{closedDate ? `Closed ${closedDate}` : 'Closed'}</span>
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Open</span>
                    </div>
                );
            }
        },
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
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!assessId) { toast.error('Missing assessment id'); return; }
                                setPendingDeleteId(assessId);
                                setDeleteDialogOpen(true);
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

    const yearOptions = useMemo(() => {
        const years = new Set<string>(data.map((item) => {
            const d = item?.a_date ? new Date(item.a_date) : null;
            return d && !Number.isNaN(d.getTime()) ? String(d.getFullYear()) : '';
        }).filter(Boolean) as string[]);
        years.add(String(new Date().getFullYear()));
        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [data]);

    const filteredData = useMemo(() => {
        if (!selectedYear) return data;
        return data.filter((item) => {
            const d = item?.a_date ? new Date(item.a_date) : null;
            if (!d || Number.isNaN(d.getTime())) return false;
            return String(d.getFullYear()) === selectedYear;
        });
    }, [data, selectedYear]);

    const handleRowDoubleClick = (row: Assessment) => {
        router.push(`/compliance/assessment/form?id=${row.assess_id}`);
    };

    const handleConfirmDelete = async () => {
        if (!pendingDeleteId) return;
        try {
            setLoading(true);
            await authenticatedApi.delete(`/api/compliance/assessments/${pendingDeleteId}`);
            toast.success('Assessment deleted');
            await fetchData();
        } catch (err) {
            console.error('Delete failed', err);
            toast.error('Failed to delete assessment(s)');
        } finally {
            setLoading(false);
            setPendingDeleteId(null);
            setDeleteDialogOpen(false);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-bold">Assessment Records</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-35">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {yearOptions.map((year) => (
                                <SelectItem key={year} value={year}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className='ring-2 -ring-offset-2 ring-emerald-300 hover:bg-emerald-100' onClick={() => openManualAssessmentForm({ title: 'Vehicle Assessment Manual Form', ownership: 9, status: 'active' })}>
                        Print Manual Form
                    </Button>
                    <Button variant="default" onClick={handleCreate}><Plus className="h-4 w-4" /></Button>
                </div>
            </div>

            <CustomDataGrid
                data={filteredData}
                columns={columns}
                inputFilter={false}
                pageSize={10}
                pagination={false}
                onRowDoubleClick={handleRowDoubleClick}
                dataExport
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={(o) => { if(!o) { setDeleteDialogOpen(false); setPendingDeleteId(null);} }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove the selected assessment record. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                            disabled={loading}
                        >
                            {loading ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default AssessmentRecord;
