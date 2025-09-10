'use client';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Paperclip } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export interface SummonPortalProps { smnId: string }

const SummonPortal: React.FC<SummonPortalProps> = ({ smnId }) => {
    const [record, setRecord] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptDate, setReceiptDate] = useState<string>('');
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
    const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const fetchRecord = async () => {
        if (!smnId) return;
        setLoading(true);
        try {
            const res = await authenticatedApi.get(`/api/compliance/summon/${smnId}`);
            const data = (res as any).data?.data || (res as any).data || null;
            setRecord(data);
            // prefill receipt date if exists
            if (data?.receipt_date) setReceiptDate(data.receipt_date);
        } catch (err) {
            console.error('Failed to load summon', err);
            setRecord(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRecord(); }, [smnId]);

    // create preview for image receipts
    useEffect(() => {
        if (!receiptFile) { setReceiptPreviewUrl(null); return; }
        if (receiptFile.type === 'image/png' || receiptFile.type.startsWith('image/')) {
            const url = URL.createObjectURL(receiptFile);
            setReceiptPreviewUrl(url);
            setImageDims(null);
            return () => URL.revokeObjectURL(url);
        }
        setReceiptPreviewUrl(null);
    }, [receiptFile]);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileExtension = (file?: File | null) => {
        if (!file) return '';
        const name = file.name || '';
        const idx = name.lastIndexOf('.');
        if (idx >= 0) return name.slice(idx).toLowerCase();
        // fallback from mime
        if (file.type) {
            const mime = file.type.split('/').pop();
            if (mime) return '.' + mime.toLowerCase();
        }
        return '';
    };

    // Attachment blob URL state (declare hooks at top-level to preserve hook order)
    const [attachmentBlobUrl, setAttachmentBlobUrl] = useState<string | null>(null);

    const formatDateDMY = (dateInput?: string | Date | null): string => {
        if (!dateInput) return '';
        const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        if (!d || isNaN((d as Date).getTime())) return String(dateInput);
        const day = String((d as Date).getDate());
        const month = String((d as Date).getMonth() + 1);
        const year = (d as Date).getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Try to fetch the attachment through authenticatedApi as a blob and expose a blob URL for inline rendering.
    // This effect depends on `record` (not on local derived `attachment`) so hooks order stays consistent.
    useEffect(() => {
        let mounted = true;
        // cleanup previous blob
        if (attachmentBlobUrl) {
            URL.revokeObjectURL(attachmentBlobUrl);
            setAttachmentBlobUrl(null);
        }
        const attachment = record?.attachment_url || record?.summon_upl || null;
        if (!attachment) return;
        const run = async () => {
            try {
                // request as blob (authenticated) to avoid Content-Disposition: attachment or CORS issues
                const res = await authenticatedApi.get(attachment, { responseType: 'blob' } as any);
                const blob = (res as any).data || res;
                if (!mounted || !blob) return;
                const url = URL.createObjectURL(blob);
                setAttachmentBlobUrl(url);
            } catch (err) {
                // fallback: leave attachment as-is (link)
                console.error('Failed to fetch attachment as blob, will fallback to direct URL', err);
                setAttachmentBlobUrl(null);
            }
        };
        run();
        return () => { mounted = false; if (attachmentBlobUrl) { URL.revokeObjectURL(attachmentBlobUrl); } };
    }, [record]);

    // Determine payment status for badge display
    const paymentStatusInfo = (() => {
        const hasReceipt = !!record?.summon_receipt_url;
        const stat = String(record?.summon_stat || '').toLowerCase();
        if (hasReceipt) return { label: 'Receipt uploaded', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' };
        if (['paid', 'settled', 'closed'].includes(stat)) return { label: (record?.summon_stat || 'Paid'), bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' };
        if (stat) return { label: (record?.summon_stat || 'Pending'), bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' };
        return { label: 'Unpaid', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' };
    })();

    if (loading) return <div className="p-4">Loading…</div>;
    if (!record) return <div className="p-4">Summon not found.</div>;

    const submitReceipt = async () => {
        try {
            if (!receiptFile) { toast.error('Please select a receipt file (PDF or PNG).'); return; }
            if (!receiptDate) { toast.error('Please enter receipt date.'); return; }
            const allowed = ['application/pdf', 'image/png', 'image/jpg', 'image/jpeg'];
            if (!allowed.includes(receiptFile.type)) { toast.error('Invalid file type. Only PDF/PNG/JPG/JPEG allowed.'); return; }
            const maxBytes = 10 * 1024 * 1024;
            if (receiptFile.size > maxBytes) { toast.error('File too large. Max 10MB.'); return; }

            const fd = new FormData();
            fd.append('summon_receipt', receiptFile, receiptFile.name);
            fd.append('receipt_date', receiptDate);

            await authenticatedApi.put(`/api/compliance/summon/${smnId}/payment`, fd, ({
                headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: (e: any) => {
                    if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
                }
            } as any));
            const TOAST_DURATION = 4000; // ms - match sonner default (safe explicit duration)
            toast.success('Receipt uploaded', { duration: TOAST_DURATION });
            // Close the tab after the toast disappears. Note: window.close() only works reliably
            // for windows opened by script; browsers may block closing user-opened tabs.
            setTimeout(() => {
                try {
                    window.close();
                } catch (e) {
                    // ignore
                }
            }, TOAST_DURATION + 200);

            setReceiptFile(null);
            setUploadProgress(0);
            setReceiptPreviewUrl(null);
            await fetchRecord();
        } catch (err) {
            console.error('failed upload', err);
            toast.error('Upload failed');
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Simple navbar/header */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <button onClick={() => history.back()} className="p-2 rounded hover:bg-gray-100" title="Back">
                        ←
                    </button>
                    <h1 className="text-lg font-semibold">Summon Portal</h1>
                </div>
                <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500">Summon ID: {smnId}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${paymentStatusInfo.bg} ${paymentStatusInfo.text} ${paymentStatusInfo.border}`}>{paymentStatusInfo.label}</span>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className='text-lg font-semibold'>Summon Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div><strong>Summon No:</strong> <div className="text-sm">{record.summon_no || record.entry_code || '-'}</div></div>
                                <div><strong>Amount (RM):</strong> <div className="text-sm">{record.summon_amt ? Number(record.summon_amt).toFixed(2) : '-'}</div></div>
                                <div><strong>Date:</strong> <div className="text-sm">{record.summon_date ? formatDateDMY(record.summon_date) : '-'}</div></div>
                                <div><strong>Time:</strong> <div className="text-sm">{record.summon_time || '-'}</div></div>
                                <div><strong>Vehicle / Reg No:</strong> <div className="text-sm">{record.asset?.register_number || record.vehicle_id || '-'}</div></div>
                                <div><strong>Assigned Driver:</strong> <div className="text-sm">{record.employee?.full_name || record.ramco_id || '-'}</div></div>
                                <div><strong>Location:</strong> <div className="text-sm">{record.summon_loc || '-'}</div></div>
                                <div><strong>MyEG Date:</strong> <div className="text-sm">{record.myeg_date ? formatDateDMY(record.myeg_date) : '-'}</div></div>
                                <div><strong>Type:</strong> <div className="text-sm">{record.type_of_summon || '-'}</div></div>
                                <div><strong>Agency:</strong> <div className="text-sm">{record.summon_agency || '-'}</div></div>
                            </div>

                            <div className="mt-4">
                                <strong>Notes / Remarks:</strong>
                                <div className="mt-1 text-sm text-gray-700">{record.remark || record.notes || '-'}</div>
                            </div>

                            <div className="mt-4">
                                <strong>Summon Ticket</strong>
                                <div className="mt-2">
                                    {(record?.attachment_url || record?.summon_upl) ? (
                                        <div className="flex items-center space-x-3">
                                            <a
                                                href={attachmentBlobUrl || record.attachment_url || record.summon_upl}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center text-blue-600"
                                            >
                                                <Paperclip className="h-5 w-5 mr-2" />
                                                <span className="underline">Open attachment</span>
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">No attachment provided.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 border rounded-2xl bg-blue-50">
                                <h4 className="font-semibold">Upload Payment Receipt</h4>
                                <div className="mt-3">
                                    <Label>Receipt Date</Label>
                                    <Input type="date" value={receiptDate} onChange={(e: any) => setReceiptDate(e.target.value)} />
                                </div>
                                <div className="mt-3">
                                    <Label>Receipt File (PDF/PNG/JPEG)</Label>
                                    <div className="mt-1">
                                        {/* Dropzone area: supports drag-drop and click to open file picker */}
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                                            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                                            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsDragging(false);
                                                const f = e.dataTransfer?.files && e.dataTransfer.files[0];
                                                if (!f) return;
                                                const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
                                                if (!allowed.includes(f.type)) {
                                                    toast.error('Invalid file type. Only PDF/PNG/JPEG allowed.');
                                                    return;
                                                }
                                                const maxBytes = 10 * 1024 * 1024;
                                                if (f.size > maxBytes) {
                                                    toast.error('File too large. Max 10MB.');
                                                    return;
                                                }
                                                setReceiptFile(f);
                                            }}
                                            className={`w-full border-dashed rounded p-4 cursor-pointer flex items-center justify-center text-center ${isDragging ? 'border-2 border-blue-400 bg-blue-50' : 'border border-gray-200'}`}
                                        >
                                            <div>
                                                <div className="text-sm text-gray-600">Drag & drop receipt here, or click to select file</div>
                                                <div className="text-xs text-gray-400 mt-1">PDF, PNG, JPEG — max 10MB</div>
                                            </div>
                                        </div>
                                        <input ref={fileInputRef} type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => {
                                            const f = e.target.files && e.target.files[0]; if (f) {
                                                const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
                                                if (!allowed.includes(f.type)) { toast.error('Invalid file type. Only PDF/PNG/JPEG allowed.'); return; }
                                                const maxBytes = 10 * 1024 * 1024; if (f.size > maxBytes) { toast.error('File too large. Max 10MB.'); return; }
                                                setReceiptFile(f);
                                            }
                                        }} />
                                    </div>
                                    {receiptPreviewUrl && (
                                        <div className="mt-2">
                                            <img src={receiptPreviewUrl} alt="preview" className="max-h-40 w-full object-contain" onLoad={(e) => {
                                                const img = e.currentTarget as HTMLImageElement;
                                                setImageDims({ width: img.naturalWidth, height: img.naturalHeight });
                                            }} />
                                            <div className="text-xs text-gray-500 mt-1">
                                                {receiptFile ? `${formatBytes(receiptFile.size)} ${getFileExtension(receiptFile)} •` : ''} {imageDims ? `${imageDims.width}×${imageDims.height}px` : ''}
                                            </div>
                                        </div>
                                    )}
                                    {receiptFile && receiptFile.type === 'application/pdf' && (
                                        <div className="mt-2">
                                            <object data={URL.createObjectURL(receiptFile)} type="application/pdf" width="100%" height={240} />
                                            <div className="text-xs text-gray-500 mt-1">{receiptFile ? `${formatBytes(receiptFile.size)} ${getFileExtension(receiptFile)}` : ''}</div>
                                        </div>
                                    )}
                                    {uploadProgress > 0 && (
                                        <div className="mt-2 w-full bg-gray-200 rounded h-2 overflow-hidden">
                                            <div className="bg-blue-500 h-2" style={{ width: `${uploadProgress}%` }} />
                                        </div>
                                    )}
                                    <div className="mt-3 flex flex-col gap-2">
                                        <Button onClick={submitReceipt} variant="secondary" className='bg-green-600 text-white hover:bg-green-700'>Upload Receipt</Button>
                                        <Button onClick={() => { setReceiptFile(null); setReceiptDate(''); setReceiptPreviewUrl(null); }} variant="ghost" className='bg-gray-200 hover:bg-gray-300'>Clear</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SummonPortal;
