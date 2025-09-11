'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Mail, Paperclip, Check, Trash } from 'lucide-react';
import { authenticatedApi } from '@/config/api';
import { AuthContext } from '@/store/AuthContext';
// dialog no longer used — use ActionSidebar on row double-click for edit
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import ActionSidebar from '@/components/ui/action-aside';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Combobox, SingleSelect, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fmtRM = (v: any) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Format date as d/m/yyyy (no leading zeros for day/month)
const formatDateDMY = (dateInput?: string | Date | null): string => {
    if (!dateInput) return '';
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (!d || isNaN((d as Date).getTime())) return String(dateInput);
    const day = String((d as Date).getDate());
    const month = String((d as Date).getMonth() + 1);
    const year = (d as Date).getFullYear();
    return `${day}/${month}/${year}`;
};

interface SummonRecord {
    smn_id: number;
    vehicle_id?: number;
    asset_id?: number;
    entry_code?: string;
    summon_no?: string;
    myeg_date?: string;
    summon_date?: string;
    summon_time?: string;
    ramco_id?: string;
    summon_loc?: string;
    type_of_summon?: string;
    summon_amt?: string;
    summon_upl?: string;
    receipt_date?: string;
    summon_stat?: string;
    summon_agency?: string;
    attachment_url?: string;
    asset?: any;
    employee?: any;
}

const ComplianceSummonList: React.FC = () => {
    const [rows, setRows] = useState<SummonRecord[]>([]);
    const [loading, setLoading] = useState(false);
    // selected dialog state removed; we use formData + sidebarOpen for create/update
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [assets, setAssets] = useState<any[]>([]);
    const [assetOptions, setAssetOptions] = useState<ComboboxOption[]>([]);
    const [driverOptions, setDriverOptions] = useState<ComboboxOption[]>([]);
    const [allDriverOptions, setAllDriverOptions] = useState<ComboboxOption[]>([]);
    const [formData, setFormData] = useState<any>({ register_number: '', asset_id: null, assigned_driver: '', summon_no: '', summon_date: '', summon_time: '', summon_loc: '', myeg_date: '', type_of_summon: '', summon_amt: '0.00', summon_agency: 'PDRM' });
    const [summonFile, setSummonFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
    const [createdPreviewUrl, setCreatedPreviewUrl] = useState<string | null>(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string | number>>(new Set());
    const [selectedRowsData, setSelectedRowsData] = useState<SummonRecord[]>([]);
    const [formErrors, setFormErrors] = useState<{ asset_id?: boolean; ramco_id?: boolean; summon_no?: boolean; summon_date?: boolean; summon_time?: boolean; summon_loc?: boolean; myeg_date?: boolean; type_of_summon?: boolean; summon_agency?: boolean; summon_amt?: boolean; summon_upl?: boolean }>({});
    const dataGridRef = useRef<any>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);

    const deleteAuthorizer = ['000712', '000277'];
    // get username from auth context or localStorage fallback
    const authCtx = React.useContext(AuthContext as any) as { authData?: any } | undefined;
    const username: string = authCtx?.authData?.user?.username || (() => {
        try {
            return JSON.parse(localStorage.getItem('authData') || '{}')?.user?.username || '';
        } catch {
            return '';
        }
    })();

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        authenticatedApi.get('/api/compliance/summon')
            .then(res => {
                const data = (res as any).data?.data || (res as any).data || [];
                if (mounted) {
                    const list = Array.isArray(data) ? data : [];
                    // keep original date fields for editing; only display will format via helper
                    setRows(list);
                }
            })
            .catch(() => { if (mounted) setRows([]); })
            .then(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, []);

    // Preload assets for Registration No select from manager=2
    useEffect(() => {
        let mounted = true;
        authenticatedApi.get('/api/assets', { params: { manager: 2 } })
            .then(res => {
                const data = (res as any).data?.data || (res as any).data || [];
                if (!mounted) return;
                const list = Array.isArray(data) ? data : [];
                setAssets(list);
                setAssetOptions(list.map((a: any) => ({ value: String(a.register_number ?? a.id), label: a.register_number ? `${a.register_number}` : `#${a.id}` })));
            })
            .catch(err => {
                console.error('Failed to load assets for summon form', err);
                setAssets([]);
                setAssetOptions([]);
            });
        return () => { mounted = false; };
    }, []);

    // Preload active employees so Assigned Driver can also choose from global list
    useEffect(() => {
        let mounted = true;
        authenticatedApi.get('/api/assets/employees', { params: { status: 'active' } })
            .then(res => {
                const data = (res as any).data?.data || (res as any).data || [];
                if (!mounted) return;
                const list = Array.isArray(data) ? data : [];
                setAllDriverOptions(list.map((e: any) => ({ value: String(e.ramco_id ?? e.id ?? e.employee_id ?? ''), label: e.full_name || e.name || String(e.ramco_id ?? e.id ?? '') })));
            })
            .catch(err => {
                console.error('Failed to load employees for Assigned Driver', err);
                setAllDriverOptions([]);
            });
        return () => { mounted = false; };
    }, []);

    const mergedDriverOptions = useMemo(() => {
        const map: Record<string, ComboboxOption> = {};
        // prefer asset-scoped options first
        (driverOptions || []).forEach(o => { if (o?.value) map[o.value] = o; });
        (allDriverOptions || []).forEach(o => { if (o?.value && !map[o.value]) map[o.value] = o; });
        return Object.values(map);
    }, [driverOptions, allDriverOptions]);

    // Create preview URL for PNG files
    useEffect(() => {
        if (!summonFile) {
            setFilePreviewUrl(null);
            return;
        }
        if (summonFile.type === 'image/png') {
            const url = URL.createObjectURL(summonFile);
            setFilePreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        setFilePreviewUrl(null);
    }, [summonFile]);

    // Helper to fetch attachment as blob and set preview if it's an image
    const fetchAttachmentPreview = async (attachmentUrl?: string | null) => {
        // cleanup previous created preview first
        if (!attachmentUrl) {
            if (createdPreviewUrl) {
                URL.revokeObjectURL(createdPreviewUrl);
                setCreatedPreviewUrl(null);
            }
            setFilePreviewUrl(null);
            return;
        }
        try {
            const res = await authenticatedApi.get(attachmentUrl, { responseType: 'blob' } as any);
            const blob = (res as any).data || res;
            if (!blob) {
                setFilePreviewUrl(null);
                return;
            }
            if (blob.type && blob.type.startsWith('image/')) {
                // revoke old
                if (createdPreviewUrl) {
                    URL.revokeObjectURL(createdPreviewUrl);
                }
                const url = URL.createObjectURL(blob);
                setFilePreviewUrl(url);
                setCreatedPreviewUrl(url);
                return;
            }
            // not an image
            setFilePreviewUrl(null);
            if (createdPreviewUrl) {
                URL.revokeObjectURL(createdPreviewUrl);
                setCreatedPreviewUrl(null);
            }
        } catch (err) {
            // fallback: if attachmentUrl looks like an image path, set directly
            const isImg = !!String(attachmentUrl).match(/\.(png|jpe?g|gif|webp)$/i);
            if (isImg) setFilePreviewUrl(attachmentUrl as string);
            else setFilePreviewUrl(null);
        }
    };

    const submitForm = async () => {
        try {
            // Prepare mapped payload fields
            const formatDate = (d?: string) => {
                if (!d) return '';
                // if it's already yyyy-mm-dd, keep; otherwise create from Date
                const dt = new Date(d);
                if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
                return d;
            };
            const formatTime = (t?: string) => {
                if (!t) return '';
                if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
                if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
                return t;
            };

            // Validate file type if present
                if (summonFile) {
                    const allowed = ['application/pdf', 'image/png'];
                    if (!allowed.includes(summonFile.type)) {
                        toast.error('Invalid file type. Only PDF and PNG are allowed.');
                        return;
                    }
                    const maxBytes = 10 * 1024 * 1024; // 10MB
                    if (summonFile.size > maxBytes) {
                        toast.error('File too large. Maximum allowed size is 10MB.');
                        return;
                    }
                }

            // Mapped values
            const mapped = {
                asset_id: formData.asset_id ?? null, // registration -> asset_id
                ramco_id: formData.assigned_driver ?? '', // assigned driver -> ramco_id
                summon_no: formData.summon_no ?? '',
                summon_date: formatDate(formData.summon_date),
                summon_time: formatTime(formData.summon_time),
                summon_loc: formData.summon_loc ?? '',
                myeg_date: formatDate(formData.myeg_date),
                type_of_summon: formData.type_of_summon ?? '',
                summon_agency: formData.summon_agency ?? 'PDRM',
                summon_amt: Number(formData.summon_amt) || 0
            };

            // Basic client-side validation for required fields
            const errs: any = {};
            const isCreate = !formData.smn_id;
            // require all fields except `myeg_date` when creating a new summon
            if (!mapped.asset_id) errs.asset_id = true;
            if (!mapped.ramco_id) errs.ramco_id = true;
            if (!mapped.summon_no) errs.summon_no = true;
            if (!mapped.summon_date) errs.summon_date = true;
            if (!mapped.summon_time) errs.summon_time = true;
            if (!mapped.summon_loc) errs.summon_loc = true;
            if (!isCreate && !mapped.myeg_date) errs.myeg_date = true; // myeg_date optional on create
            if (!mapped.type_of_summon) errs.type_of_summon = true;
            if (!mapped.summon_agency) errs.summon_agency = true;
            if (!mapped.summon_amt && mapped.summon_amt !== 0) errs.summon_amt = true;
            if (!summonFile) errs.summon_upl = true;
            if (Object.keys(errs).length) {
                setFormErrors(errs);
                toast.error('Please fill required fields highlighted in red.');
                return;
            }

            // If editing (smn_id present) perform update, else create
            if (formData.smn_id) {
                const id = formData.smn_id;
                // try PUT first; if backend doesn't support PUT (404/405) fall back to POST (include smn_id)
                const tryUpdate = async () => {
                    if (summonFile) {
                        const fd = new FormData();
                        Object.entries(mapped).forEach(([k, v]) => fd.append(k, String(v ?? '')));
                        fd.append('summon_upl', summonFile, summonFile.name);
                        await authenticatedApi.put(`/api/compliance/summon/${id}`, fd, ({ headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: (e: any) => {
                            if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
                        } } as any));
                    } else {
                        await authenticatedApi.put(`/api/compliance/summon/${id}`, mapped);
                    }
                };

                try {
                    await tryUpdate();
                    toast.success('Summon updated');
                } catch (err: any) {
                    console.error('Update failed (PUT);', err);
                    // Surface a clear error to the user; do not fallback to POST to avoid accidental creates
                    toast.error('Failed to update summon. Server error or PUT not supported.');
                    throw err;
                }
            } else {
                if (summonFile) {
                    const fd = new FormData();
                    Object.entries(mapped).forEach(([k, v]) => fd.append(k, String(v ?? '')));
                    fd.append('summon_upl', summonFile, summonFile.name);
                    await authenticatedApi.post('/api/compliance/summon', fd, ({ headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: (e: any) => {
                        if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
                    } } as any));
                } else {
                    await authenticatedApi.post('/api/compliance/summons', mapped);
                }
                toast.success('Summon registered');
            }
            // refresh
            const res = await authenticatedApi.get('/api/compliance/summon');
            const data = (res as any).data?.data || (res as any).data || [];
            setRows(Array.isArray(data) ? data : []);
            setSidebarOpen(false);
            // clear file and editing id after successful save
            setSummonFile(null);
            setUploadProgress(0);
            setFilePreviewUrl(null);
            setFormData((s: any) => ({ ...s, smn_id: undefined }));
        } catch (err) {
            console.error('failed save', err);
        }
    };

    // compute summary counts
    const openCount = rows.filter(r => !(String(r.summon_stat || '').toLowerCase() === 'paid' || String(r.summon_stat || '').toLowerCase() === 'closed' || String(r.summon_stat || '').toLowerCase() === 'settled')).length;
    const closedCount = rows.length - openCount;

    const yearlyData = useMemo(() => {
        const counts: Record<string, number> = {};
        rows.forEach(r => {
            if (r.summon_date) {
                const d = new Date(r.summon_date);
                if (!isNaN(d.getTime())) {
                    const y = String(d.getFullYear());
                    counts[y] = (counts[y] || 0) + 1;
                    return;
                }
            }
            counts['Unknown'] = (counts['Unknown'] || 0) + 1;
        });
        return Object.entries(counts).map(([year, count]) => ({ year, count })).sort((a, b) => a.year.localeCompare(b.year));
    }, [rows]);

    // Annual summary: group by YYYY and count open vs closed (closed if receipt_date exists)
    const annualSummary = useMemo(() => {
        const map: Record<string, { year: string; open: number; closed: number }> = {};
        rows.forEach(r => {
            let key = 'Unknown';
            if (r.summon_date) {
                const d = new Date(r.summon_date);
                if (!isNaN(d.getTime())) {
                    key = String(d.getFullYear());
                }
            }
            if (!map[key]) map[key] = { year: key, open: 0, closed: 0 };
            const closed = !!r.receipt_date;
            if (closed) map[key].closed += 1; else map[key].open += 1;
        });
        return Object.values(map).sort((a, b) => a.year.localeCompare(b.year));
    }, [rows]);

    // Cases by year stacked by agency
    const agencyList = useMemo(() => {
        const s = new Set<string>();
        rows.forEach(r => { if (r.summon_agency) s.add(r.summon_agency); else s.add('Unknown'); });
        return Array.from(s).sort();
    }, [rows]);

    const casesByYearAgency = useMemo(() => {
        const map: Record<string, any> = {};
        rows.forEach(r => {
            const d = r.summon_date ? new Date(r.summon_date) : null;
            const year = (d && !isNaN(d.getTime())) ? String(d.getFullYear()) : 'Unknown';
            if (!map[year]) map[year] = { year };
            const agency = r.summon_agency || 'Unknown';
            map[year][agency] = (map[year][agency] || 0) + 1;
        });
        // ensure each agency key exists on every year object (0 if missing)
        const years = Object.keys(map).sort();
        return years.map(y => {
            const obj = { year: y } as any;
            agencyList.forEach(a => { obj[a] = map[y][a] || 0; });
            return obj;
        });
    }, [rows, agencyList]);

    // totals for legend counters
    const annualTotals = useMemo(() => {
        let open = 0;
        let closed = 0;
        (annualSummary || []).forEach((s: any) => { open += s.open || 0; closed += s.closed || 0; });
        return { open, closed };
    }, [annualSummary]);

    const agencyTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        (casesByYearAgency || []).forEach((row: any) => {
            agencyList.forEach(a => { totals[a] = (totals[a] || 0) + (row[a] || 0); });
        });
        return totals;
    }, [casesByYearAgency, agencyList]);

    const columns: ColumnDef<SummonRecord>[] = [
        { key: 'summon_no' as any, header: 'Summon No', filter: 'input', sortable: true },
    { key: 'summon_date_time' as any, header: 'Summon Date/Time', sortable: true, render: (r: any) => {
            const date = r.summon_date ? formatDateDMY(r.summon_date) : '';
            let time = '';
            if (r.summon_time) {
                // normalize time to HH:MM
                const t = String(r.summon_time);
                time = t.length >= 5 ? t.slice(0,5) : t;
            }
            return date ? (time ? `${date} ${time}` : date) : (time || '-');
        } },
    { key: 'summon_agency' as any, header: 'Agency', sortable: false, render: (r: any) => r.summon_agency || '-' },
        { key: 'asset' as any, header: 'Vehicle', filter: 'input', render: (r: any) => r.asset?.register_number || r.vehicle_id || '-' },
        { key: 'employee' as any, header: 'Driver', filter: 'input', render: (r: any) => r.employee?.full_name || r.ramco_id || '-' },
        { key: 'summon_loc' as any, header: 'Location', render: (r: any) => r.summon_loc || r.asset?.location?.code || '-' },
        { key: 'summon_amt' as any, header: 'Amount (RM)', render: (r: any) => r.summon_amt ? `RM ${fmtRM(r.summon_amt)}` : '-' , colClass: 'text-right'},
        { key: 'summon_stat' as any, header: 'Status', filter: 'singleSelect', render: (r: any) => {
            const paid = !!(r.receipt_date);
            return (
                <div className="flex items-center space-x-2">
                    <span className={`${paid ? 'text-green-600' : 'text-yellow-600'} font-medium`}>{paid ? 'Paid' : 'Pending'}</span>
                    {r.summon_receipt ? (
                        <a
                            href={r.summon_receipt}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-gray-100"
                            title="Preview receipt"
                        >
                            <Paperclip className="h-5 w-5 text-blue-600" />
                        </a>
                    ) : null}
                </div>
            );
        } },
        { key: 'actions' as any, header: 'Actions', render: (r: any) => (
            <div className="flex items-center space-x-2">
                <NotifyButton smnId={r.smn_id} hasAttachment={!!(r.attachment_url || r.summon_upl)} />
                {(r.attachment_url || r.summon_upl) ? (
                    <a
                        href={r.attachment_url || r.summon_upl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded hover:bg-gray-100"
                        title="Open attachment"
                    >
                        <Paperclip className="h-5 w-5 text-green-600" />
                    </a>
                ) : null}
                {/* Paid indicator removed; status column now shows Paid/Pending */}
            </div>
        ) }
    ];

    // Small component to send notification and show loading state
    const NotifyButton: React.FC<{ smnId: number; hasAttachment?: boolean }> = ({ smnId, hasAttachment }) => {
        const [notifying, setNotifying] = useState(false);
        const handleNotify = async (e: React.MouseEvent) => {
            e.stopPropagation();
            if (notifying) return;
            setNotifying(true);
            try {
                await authenticatedApi.post('/api/compliance/summon/notify', { smn_id: smnId });
                toast.success('Notification sent');
            } catch (err) {
                console.error('Failed to send notification', err);
                toast.error('Failed to send notification');
            } finally {
                setNotifying(false);
            }
        };
        return (
            <button onClick={handleNotify} title="Send notification" className="p-1 rounded hover:bg-gray-100" aria-label="notify">
                <Mail className={`h-5 w-5 ${notifying ? 'animate-spin text-gray-400' : 'text-blue-600'}`} />
            </button>
        );
    };

    return (
        <div>
            <ActionSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                title="Register Summon"
                content={
                    <div className="space-y-3 p-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Registration No:</Label>
                                <SingleSelect
                                    options={assetOptions}
                                    value={formData.register_number}
                                    className={formErrors.asset_id ? 'ring-2 ring-red-500' : ''}
                                    onValueChange={(val) => {
                                        // find asset by register_number
                                        const asset = assets.find(a => String(a.register_number) === String(val) || String(a.id) === String(val));
                                        if (asset) {
                                            const owner = asset.owner;
                                            if (owner) {
                                                setDriverOptions([{ value: String(owner.ramco_id), label: owner.full_name }]);
                                                // set assigned_driver to ramco_id (SingleSelect stores value)
                                                setFormData((s: any) => ({ ...s, register_number: val, asset_id: asset.id, assigned_driver: String(owner.ramco_id) }));
                                            } else {
                                                setDriverOptions([]);
                                                setFormData((s: any) => ({ ...s, register_number: val, asset_id: asset.id, assigned_driver: '' }));
                                            }
                                        } else {
                                            setFormData((s: any) => ({ ...s, register_number: val, asset_id: null }));
                                            setDriverOptions([]);
                                        }
                                    }}
                                    placeholder="Select vehicle regno"
                                />
                            </div>

                            <div>
                                <Label>Assigned Driver:</Label>
                                <SingleSelect options={mergedDriverOptions} value={formData.assigned_driver} className={formErrors.ramco_id ? 'ring-2 ring-red-500' : ''} onValueChange={(val) => setFormData((s: any) => ({ ...s, assigned_driver: val }))} placeholder="Select driver" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Summon No:</Label>
                                <Input value={formData.summon_no} className={formErrors.summon_no ? 'ring-2 ring-red-500' : ''} onChange={(e: any) => setFormData((s: any) => ({ ...s, summon_no: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Summon Date:</Label>
                                <Input type="date" value={formData.summon_date} className={formErrors.summon_date ? 'ring-2 ring-red-500' : ''} onChange={(e: any) => setFormData((s: any) => ({ ...s, summon_date: e.target.value }))} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Summon Time:</Label>
                                <Input type="time" value={formData.summon_time} onChange={(e: any) => setFormData((s: any) => ({ ...s, summon_time: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Summon Location:</Label>
                                <Input value={formData.summon_loc} onChange={(e: any) => setFormData((s: any) => ({ ...s, summon_loc: e.target.value }))} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Date appear on MyEG:</Label>
                                <Input type="date" value={formData.myeg_date} onChange={(e: any) => setFormData((s: any) => ({ ...s, myeg_date: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Type of Summon:</Label>
                                <SingleSelect
                                    options={[
                                        { value: '', label: 'Please select..' },
                                        { value: 'Melebihi had laju', label: 'Melebihi had laju' },
                                        { value: 'Memotong barisan secara berbahaya', label: 'Memotong barisan secara berbahaya' },
                                        { value: 'Memandu di lorong kecemasan', label: 'Memandu di lorong kecemasan' },
                                        { value: 'Kesalahan lampu merah', label: 'Kesalahan lampu merah' },
                                        { value: 'Halangan lalulintas', label: 'Halangan lalulintas' },
                                        { value: 'Membuat pusingan U di tempat yang tidak dibenarkan', label: 'Membuat pusingan U di tempat yang tidak dibenarkan' },
                                        { value: 'Tiada lesen kenderaan/motor', label: 'Tiada lesen kenderaan/motor' },
                                        { value: 'Memandu sambil menggunakan alat komunikasi', label: 'Memandu sambil menggunakan alat komunikasi' },
                                        { value: 'Membawa barang di dalam kenderaan yang tidak bersesuaian', label: 'Membawa barang di dalam kenderaan yang tidak bersesuaian' },
                                        { value: 'Abai Isyarat Lalulintas', label: 'Abai Isyarat Lalulintas' }
                                    ]}
                                    value={formData.type_of_summon}
                                    onValueChange={(v) => setFormData((s: any) => ({ ...s, type_of_summon: v }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Agensi:</Label>
                                <SingleSelect
                                    options={[
                                        { value: 'PDRM', label: 'PDRM' },
                                        { value: 'JPJ', label: 'JPJ' },
                                        { value: 'PBT', label: 'PBT' }
                                    ]}
                                    value={formData.summon_agency}
                                    className={formErrors.summon_agency ? 'ring-2 ring-red-500' : ''}
                                    onValueChange={(v) => setFormData((s: any) => ({ ...s, summon_agency: v }))}
                                />
                                {formErrors.summon_agency ? <div className="text-xs text-red-600 mt-1">Agensi is required</div> : null}
                            </div>
                            <div>
                                <Label>Amount (RM):</Label>
                                <Input
                                    type="text"
                                    value={formData.summon_amt}
                                    className={formErrors.summon_amt ? 'ring-2 ring-red-500' : ''}
                                    onChange={(e: any) => {
                                        // allow only digits and dot
                                        const v = e.target.value.replace(/[^0-9.]/g, '');
                                        // prevent multiple dots
                                        const parts = v.split('.');
                                        const safe = parts.length <= 1 ? parts[0] : `${parts[0]}.${parts.slice(1).join('').slice(0,2)}`;
                                        setFormData((s: any) => ({ ...s, summon_amt: safe }));
                                    }}
                                    onBlur={() => {
                                        // format to 2 decimals
                                        const num = Number(String(formData.summon_amt).replace(/,/g, '')) || 0;
                                        setFormData((s: any) => ({ ...s, summon_amt: num.toFixed(2) }));
                                    }}
                                />
                                {formErrors.summon_amt ? <div className="text-xs text-red-600 mt-1">Amount is required</div> : null}
                            </div>
                        </div>

                        <div>
                            <Label>Summon Ticket (upload):</Label>
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) setSummonFile(e.dataTransfer.files[0]); }}
                                className={`mt-2 border border-dashed rounded p-4 text-center bg-white cursor-pointer ${formErrors.summon_upl ? 'ring-2 ring-red-500' : ''}`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {summonFile ? (
                                    <div className="text-sm">
                                        <strong>{summonFile.name}</strong>
                                        <div className="text-xs text-gray-500">{(summonFile.size / 1024 / 1024).toFixed(2)} MB — Click to replace or drag a new file</div>
                                        {summonFile.type === 'image/png' && filePreviewUrl && (
                                            <div className="mt-2">
                                                <img src={filePreviewUrl} alt="preview" className="max-h-40 mx-auto" />
                                            </div>
                                        )}
                                        {summonFile.type === 'application/pdf' && (
                                            <div className="mt-2 text-xs text-blue-600">PDF selected — will be uploaded</div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-500">Drag & drop summon ticket here, or click to browse</div>
                                )}
                                <input ref={fileInputRef} type="file" accept="application/pdf,image/png" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) setSummonFile(f); }} />
                            </div>
                            {formErrors.summon_upl ? <div className="text-xs text-red-600 mt-1">Summon ticket is required</div> : <div className="text-xs text-gray-400 mt-1">Allowed types: PDF, PNG. Max size: 10MB.</div>}
                        </div>

                        {uploadProgress > 0 && (
                            <div className="mt-2">
                                <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                                    <div className="bg-blue-500 h-2" style={{ width: `${uploadProgress}%` }} />
                                </div>
                                <div className="text-xs text-gray-600 mt-1">Uploading: {uploadProgress}%</div>
                            </div>
                        )}

                        <div className="pt-4 flex justify-end space-x-2">
                            <Button variant="secondary" onClick={() => setSidebarOpen(false)}>Cancel</Button>
                                                        {formData.smn_id && deleteAuthorizer.includes(username) ? (
                                                                <>
                                                                        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>Delete</Button>
                                                                        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                                                                            <DialogContent>
                                                                                <DialogHeader>
                                                                                    <DialogTitle>Confirm delete</DialogTitle>
                                                                                </DialogHeader>
                                                                                <div className="py-2">Delete this summon? This action cannot be undone.</div>
                                                                                <DialogFooter className="flex gap-2">
                                                                                    <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
                                                                                    <Button variant="destructive" onClick={async () => {
                                                                                            setConfirmLoading(true);
                                                                                            try {
                                                                                                    await authenticatedApi.delete(`/api/compliance/summon/${formData.smn_id}`);
                                                                                                    toast.success('Summon deleted');
                                                                                                    const res = await authenticatedApi.get('/api/compliance/summon');
                                                                                                    const data = (res as any).data?.data || (res as any).data || [];
                                                                                                    setRows(Array.isArray(data) ? data : []);
                                                                                                    setSidebarOpen(false);
                                                                                            } catch (err) {
                                                                                                    console.error('Failed delete', err);
                                                                                                    toast.error('Failed to delete summon');
                                                                                            } finally {
                                                                                                    setConfirmLoading(false);
                                                                                                    setShowDeleteDialog(false);
                                                                                            }
                                                                                    }}>
                                                                                        {confirmLoading ? 'Deleting...' : 'Delete'}
                                                                                    </Button>
                                                                                </DialogFooter>
                                                                            </DialogContent>
                                                                        </Dialog>
                                                                </>
                                                        ) : null}
                                                        <Button onClick={() => setShowSaveConfirm(true)}>Save</Button>
                                                        <Dialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
                                                            <DialogContent>
                                                                <DialogHeader>
                                                                    <DialogTitle>Confirm submission</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="py-2">Submit this summon record? Please confirm to proceed.</div>
                                                                <DialogFooter className="flex gap-2">
                                                                    <Button variant="outline" onClick={() => setShowSaveConfirm(false)}>Cancel</Button>
                                                                    <Button onClick={async () => { setConfirmLoading(true); try { await submitForm(); } finally { setConfirmLoading(false); setShowSaveConfirm(false); } }}>{confirmLoading ? 'Saving...' : 'Submit'}</Button>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                        </div>
                    </div>
                }
            />
            <div className="mt-4 flex gap-4 items-stretch">
                <Card className="flex-1 flex flex-col">
                    <CardHeader className="py-2">
                        <CardTitle>Monthly Summons (Open vs Closed)</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-2 h-44">
                        <div className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={annualSummary} margin={{ right: 16 }}>
                                    <XAxis dataKey="year" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="open" stackId="a" name={`Open (${annualTotals.open || 0})`} fill="#f59e0b" />
                                    <Bar dataKey="closed" stackId="a" name={`Closed (${annualTotals.closed || 0})`} fill="#10b981" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex-1 flex flex-col">
                    <CardHeader className="py-2">
                        <CardTitle>Cases by Year (stacked by Agency)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-44 p-2">
                        <div className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={casesByYearAgency}>
                                    <XAxis dataKey="year" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    {agencyList.map((a, idx) => (
                                        <Bar key={a} dataKey={a} stackId="a" name={`${a} (${agencyTotals[a] || 0})`} fill={['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'][idx % 5]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className='flex items-center justify-between my-4'>
                <h2 className='text-lg font-semibold'>Summon Management</h2>
                <div className="flex items-center space-x-2">
                                         {deleteAuthorizer.includes(username) ? (
                                         <>
                                         <Button
                                                variant="outline"
                                                size="icon"
                                                className="text-red-600"
                                                disabled={selectedRowsData.length === 0}
                                                onClick={(e) => { e.stopPropagation(); if (!selectedRowsData.length) return; setShowBulkDeleteDialog(true); }}
                                         ><Trash className="w-4 h-4" /></Button>

                                         <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                                             <DialogContent>
                                                 <DialogHeader>
                                                     <DialogTitle>Confirm delete</DialogTitle>
                                                 </DialogHeader>
                                                 <div className="py-2">Delete {selectedRowsData.length} selected summons? This cannot be undone.</div>
                                                 <DialogFooter className="flex gap-2">
                                                     <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>Cancel</Button>
                                                     <Button variant="destructive" onClick={async () => {
                                                             setConfirmLoading(true);
                                                             try {
                                                                     await Promise.all(selectedRowsData.map(r => authenticatedApi.delete(`/api/compliance/summon/${r.smn_id}`)));
                                                                     toast.success('Selected summons deleted');
                                                                     // refresh
                                                                     const res = await authenticatedApi.get('/api/compliance/summon');
                                                                     const data = (res as any).data?.data || (res as any).data || [];
                                                                     setRows(Array.isArray(data) ? data : []);
                                                                     // clear selection
                                                                     setSelectedRowKeys(new Set());
                                                                     setSelectedRowsData([]);
                                                                     if (dataGridRef.current?.clearSelectedRows) dataGridRef.current.clearSelectedRows();
                                                             } catch (err) {
                                                                     console.error('Failed delete selected', err);
                                                                     toast.error('Failed to delete selected summons');
                                                             } finally {
                                                                     setConfirmLoading(false);
                                                                     setShowBulkDeleteDialog(false);
                                                             }
                                                     }}>{confirmLoading ? 'Deleting...' : 'Delete'}</Button>
                                                 </DialogFooter>
                                             </DialogContent>
                                         </Dialog>
                                         </>
                                         ) : null}
                <Button onClick={() => { setFormData({ register_number: '', assigned_driver: '', summon_no: '', summon_date: '', summon_time: '', summon_loc: '', myeg_date: '', type_of_summon: '', summon_amt: '0.00', summon_agency: 'PDRM' });
                    // clear any existing preview
                    if (createdPreviewUrl) { URL.revokeObjectURL(createdPreviewUrl); setCreatedPreviewUrl(null); }
                    setFilePreviewUrl(null);
                    setSummonFile(null);
                    setSidebarOpen(true);
                 }}>
                    <Plus className="w-4 h-4" />
                </Button>
                 
                 </div>
            </div>
            <div className="mt-4">
                <CustomDataGrid
                    ref={dataGridRef}
                    data={rows}
                    columns={columns}
                    pagination={false}
                    pageSize={10}
                    inputFilter={false}
                    rowSelection={{ enabled: true, getRowId: (r: any) => r.smn_id, onSelect: (keys: (string | number)[], selected: any[]) => {
                        setSelectedRowKeys(new Set(keys));
                        setSelectedRowsData(selected || []);
                    } }}
                    onRowSelected={(keys, selected) => { setSelectedRowKeys(new Set(keys)); setSelectedRowsData(selected); }}
                    rowClass={(r: any) => {
                        // highlight open/unpaid/pending cases
                        const s = String(r.summon_stat || '').toLowerCase();
                        if (s === 'open' || s === 'unpaid' || s === 'pending' || s === '') return 'bg-yellow-50 dark:bg-yellow-900';
                        return '';
                    }}
                    onRowDoubleClick={(r: any) => {
                        // populate formData from row and open sidebar for update
                        const pre = {
                            register_number: r.asset?.register_number || r.register_number || '',
                            asset_id: r.asset?.id || r.asset_id || null,
                            assigned_driver: r.employee?.ramco_id ? String(r.employee.ramco_id) : (r.ramco_id ? String(r.ramco_id) : ''),
                            summon_no: r.summon_no || r.entry_code || '',
                            summon_date: r.summon_date || '',
                            summon_time: r.summon_time || '',
                            summon_loc: r.summon_loc || '',
                            myeg_date: r.myeg_date || '',
                            type_of_summon: r.type_of_summon || '',
                            summon_amt: (typeof r.summon_amt === 'number' ? Number(r.summon_amt).toFixed(2) : (r.summon_amt || '0.00')),
                            summon_agency: r.summon_agency || 'PDRM'
                        };
                        setFormData(pre);
                        // set driver options from asset owner or employee
                        const owner = r.asset?.owner;
                        if (owner) {
                            setDriverOptions([{ value: String(owner.ramco_id), label: owner.full_name }]);
                            setFormData((s: any) => ({ ...s, assigned_driver: String(owner.ramco_id) }));
                        } else if (r.employee) {
                            setDriverOptions([{ value: String(r.employee.ramco_id || r.employee.id), label: r.employee.full_name }]);
                        } else {
                            setDriverOptions([]);
                        }
                        // fetch preview for existing attachment if present
                        fetchAttachmentPreview(r.attachment_url || r.summon_upl);
                        setSidebarOpen(true);
                    }}
                />
                {loading && <div className="text-xs text-gray-500 mt-2">Loading…</div>}
            </div>

            {/* details dialog removed — use ActionSidebar for create/update */}
        </div>
    );
};

export default ComplianceSummonList;
