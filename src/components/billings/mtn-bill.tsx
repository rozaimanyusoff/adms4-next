'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

// Interface for the maintenance bill data based on the provided structure
interface MaintenanceBill {
    inv_id: number;
    inv_no: string | null;
    inv_date: string | null;
    svc_order: string;
    asset: {
        id: number;
        register_number: string;
        fuel_type: string;
        costcenter: {
            id: number;
            name: string;
        } | null;
        location: {
            id: number;
            name: string;
        } | null;
    } | null;
    workshop: {
        id: number;
        name: string;
    } | null;
    svc_date: string | null;
    svc_odo: string | null;
    inv_total: string;
    inv_stat: string | null;
    inv_remarks?: string | null;
    running_no: number;
    // Additional fields for grid convenience
    rowNumber?: number;
    formatted_inv_date?: string;
    formatted_svc_date?: string;
    formatted_inv_total?: string;
    formatted_svc_odo?: string;
}

// Add global type for window.reloadMaintenanceBillGrid
declare global {
    interface Window {
        reloadMaintenanceBillGrid?: () => void;
    }
}

const MaintenanceBill: React.FC = () => {
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    // showLatest controls whether we fetch only the current year's records
    const [showLatest, setShowLatest] = useState(true);
    const router = useRouter();

    // Format currency
    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-MY', {
            style: 'currency',
            currency: 'MYR',
            minimumFractionDigits: 2,
        }).format(num);
    };

    // Format date
    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('en-MY');
        } catch {
            return dateString;
        }
    };

    // Refetch grid data
    const fetchMaintenanceBills = async () => {
        // give immediate visual feedback by clearing existing rows
        // and showing a loading placeholder while the network request runs
        setLoading(true);
        setRows([]);
        try {
            // backend supports optional year filter when showLatest is true
            const yearParam = showLatest ? `?year=${new Date().getFullYear()}` : '';
            const res = await authenticatedApi.get(`/api/bills/mtn${yearParam}`);
            const data = (res.data as { data?: MaintenanceBill[] })?.data || [];
            setRows(data.map((item, idx) => ({
                ...item,
                rowNumber: idx + 1,
                formatted_inv_date: item.inv_date ? formatDate(item.inv_date) : 'N/A',
                formatted_svc_date: item.svc_date ? formatDate(item.svc_date) : 'N/A',
                formatted_inv_total: formatCurrency(item.inv_total),
                formatted_svc_odo: item.svc_odo && !isNaN(Number(item.svc_odo)) ? Number(item.svc_odo).toLocaleString() + ' km' : 'N/A',
            })));
        } catch (err) {
            console.error('Error fetching maintenance bills:', err);
            toast.error('Failed to fetch maintenance bills');
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMaintenanceBills();
    }, []);

    useEffect(() => {
        window.reloadMaintenanceBillGrid = () => {
            fetchMaintenanceBills();
        };
        return () => {
            delete window.reloadMaintenanceBillGrid;
        };
    }, []);

    const handleRowDoubleClick = (row: MaintenanceBill & { rowNumber: number }) => {
        if (row.inv_id) {
            window.open(`/billings/mtn/form?id=${row.inv_id}`, '_blank');
        }
    };

    const columns: ColumnDef<MaintenanceBill & { rowNumber: number }>[] = [
        {
            key: 'rowNumber',
            header: 'No',
            render: (row) => (
                <div className="flex items-center justify-between gap-2 min-w-[60px]">
                    <span>{row.rowNumber}</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="p-1 hover:bg-stone-300 rounded cursor-pointer" aria-label="Print Report">
                                    <Download size={16} />
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                Download maintenance memo
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            ),
        },
        { key: 'inv_no', header: 'Invoice No', filter: 'input' },
        { key: 'formatted_inv_date', header: 'Invoice Date' },
        {
            key: 'asset' as keyof (MaintenanceBill & { rowNumber: number }),
            header: 'Vehicle',
            filter: 'input',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-medium">{row.asset?.register_number || 'N/A'}</span>
                    <span className="text-xs text-gray-500 capitalize">{row.asset?.fuel_type || 'N/A'}</span>
                </div>
            )
        },
        { key: 'svc_order', header: 'Service Order', filter: 'input' },
        {
            key: 'workshop',
            header: 'Workshop',
            filter: 'singleSelect',
            render: (row) => (
                <div className="max-w-xs">
                    <div className="truncate font-medium" title={row.workshop?.name || 'Unknown Workshop'}>
                        {row.workshop?.name || 'Unknown Workshop'}
                    </div>
                </div>
            )
        },
        { key: 'formatted_svc_date', header: 'Service Date' },
        { key: 'formatted_svc_odo', header: 'Odometer', colClass: 'text-right' },
        {
            key: 'svc_date',
            header: 'Cost Center',
            filter: 'singleSelect',
            render: (row) => row.asset?.costcenter?.name || 'N/A'
        },
        {
            key: 'svc_odo',
            header: 'Location',
            filter: 'singleSelect',
            render: (row) => row.asset?.location?.name || 'N/A'
        },
        { key: 'formatted_inv_total', header: 'Amount', colClass: 'text-right font-medium text-green-600' },
        {
            key: 'inv_stat',
            header: 'Status',
            filter: 'singleSelect',
            render: (row) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.inv_stat === '1'
                        ? 'bg-green-100 text-green-800'
                        : row.inv_stat === '0'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}>
                    {row.inv_stat === '1' ? 'Active' : row.inv_stat === '0' ? 'Inactive' : 'Unknown'}
                </span>
            )
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Vehicle Maintenance Bills</h2>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                        <Switch checked={showLatest} onCheckedChange={(val) => { setShowLatest(Boolean(val)); }} />
                        <span className="text-sm">Show latest</span>
                    </label>
                </div>
            </div>

            <div className="min-h-[400px]">
                {loading ? (
                    <div className="p-6 text-center text-sm text-gray-500">
                        <span className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white border-l-transparent align-middle ltr:mr-2 rtl:ml-2"></span>
                        Loading...
                    </div>
                ) : (
                    <CustomDataGrid
                        data={rows}
                        columns={columns}
                        pagination={false}
                        onRowDoubleClick={handleRowDoubleClick}
                        inputFilter={false}
                    />
                )}
            </div>
        </div>
    );
};

export default MaintenanceBill;
