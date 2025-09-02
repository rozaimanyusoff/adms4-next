'use client';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    const fileInputRef = useRef<HTMLInputElement | null>(null);

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
            return () => URL.revokeObjectURL(url);
        }
        setReceiptPreviewUrl(null);
    }, [receiptFile]);

    if (loading) return <div className="p-4">Loading…</div>;
    if (!record) return <div className="p-4">Summon not found.</div>;

    const attachment = record.attachment_url || record.summon_upl || null;
    const [attachmentBlobUrl, setAttachmentBlobUrl] = useState<string | null>(null);

    // Try to fetch the attachment through authenticatedApi as a blob and expose a blob URL for inline rendering.
    useEffect(() => {
        let mounted = true;
        // cleanup previous blob
        if (attachmentBlobUrl) {
            URL.revokeObjectURL(attachmentBlobUrl);
            setAttachmentBlobUrl(null);
        }
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
    }, [attachment]);

    const submitReceipt = async () => {
        try {
            if (!receiptFile) { toast.error('Please select a receipt file (PDF or PNG).'); return; }
            if (!receiptDate) { toast.error('Please enter receipt date.'); return; }
            const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
            if (!allowed.includes(receiptFile.type)) { toast.error('Invalid file type. Only PDF/PNG/JPEG allowed.'); return; }
            const maxBytes = 10 * 1024 * 1024;
            if (receiptFile.size > maxBytes) { toast.error('File too large. Max 10MB.'); return; }

            const fd = new FormData();
            fd.append('summon_receipt', receiptFile, receiptFile.name);
            fd.append('receipt_date', receiptDate);

            await authenticatedApi.put(`/api/compliance/summon/${smnId}/payment`, fd, ({ headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: (e: any) => {
                if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
            } } as any));
            toast.success('Receipt uploaded');
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
            <Card>
                <CardHeader>
                    <CardTitle>Summon Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div><strong>Summon No:</strong> <div className="text-sm">{record.summon_no || record.entry_code || '-'}</div></div>
                                <div><strong>Amount (RM):</strong> <div className="text-sm">{record.summon_amt ? Number(record.summon_amt).toFixed(2) : '-'}</div></div>
                                <div><strong>Date:</strong> <div className="text-sm">{record.summon_date || '-'}</div></div>
                                <div><strong>Time:</strong> <div className="text-sm">{record.summon_time || '-'}</div></div>
                                <div><strong>Vehicle / Reg No:</strong> <div className="text-sm">{record.asset?.register_number || record.vehicle_id || '-'}</div></div>
                                <div><strong>Assigned Driver:</strong> <div className="text-sm">{record.employee?.full_name || record.ramco_id || '-'}</div></div>
                                <div><strong>Location:</strong> <div className="text-sm">{record.summon_loc || '-'}</div></div>
                                <div><strong>MyEG Date:</strong> <div className="text-sm">{record.myeg_date || '-'}</div></div>
                                <div><strong>Type:</strong> <div className="text-sm">{record.type_of_summon || '-'}</div></div>
                                <div><strong>Agency:</strong> <div className="text-sm">{record.summon_agency || '-'}</div></div>
                            </div>

                            <div className="mt-4">
                                <strong>Notes / Remarks:</strong>
                                <div className="mt-1 text-sm text-gray-700">{record.remark || record.notes || '-'}</div>
                            </div>

                            <div className="mt-4">
                                <strong>Summon Ticket</strong>
                                <div className="mt-2 bg-white border rounded p-3">
                                    {attachment ? (
                                        (attachment.endsWith('.png') || attachment.endsWith('.jpg') || attachment.endsWith('.jpeg')) ? (
                                            <img src={attachmentBlobUrl || attachment} alt="summon" className="w-full object-contain" />
                                        ) : (
                                            <object data={attachmentBlobUrl || attachment} type="application/pdf" width="100%" height="600">
                                                <a className="text-blue-600" href={attachment} target="_blank" rel="noreferrer">Open attachment</a>
                                            </object>
                                        )
                                    ) : (
                                        <div className="text-sm text-gray-500">No attachment provided.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 border rounded">
                                <h4 className="font-semibold">Upload Payment Receipt</h4>
                                <div className="mt-3">
                                    <Label>Receipt Date</Label>
                                    <Input type="date" value={receiptDate} onChange={(e: any) => setReceiptDate(e.target.value)} />
                                </div>
                                <div className="mt-3">
                                    <Label>Receipt File (PDF/PNG/JPEG)</Label>
                                    <div className="mt-1">
                                        <input ref={fileInputRef} type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) setReceiptFile(f); }} />
                                    </div>
                                    {receiptPreviewUrl && (
                                        <div className="mt-2">
                                            <img src={receiptPreviewUrl} alt="preview" className="max-h-40 w-full object-contain" />
                                        </div>
                                    )}
                                    {receiptFile && receiptFile.type === 'application/pdf' && (
                                        <div className="mt-2">
                                            <object data={URL.createObjectURL(receiptFile)} type="application/pdf" width="100%" height={240} />
                                        </div>
                                    )}
                                    {uploadProgress > 0 && (
                                        <div className="mt-2 w-full bg-gray-200 rounded h-2 overflow-hidden">
                                            <div className="bg-blue-500 h-2" style={{ width: `${uploadProgress}%` }} />
                                        </div>
                                    )}
                                    <div className="mt-3 flex flex-col gap-2">
                                        <Button onClick={submitReceipt} variant="secondary">Upload Receipt</Button>
                                        <Button onClick={() => { setReceiptFile(null); setReceiptDate(''); setReceiptPreviewUrl(null); }} variant="ghost">Clear</Button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border rounded">
                                <h4 className="font-semibold">Payment Status</h4>
                                <div className="mt-2 text-sm">
                                    {record.summon_receipt_url ? (
                                        <div>
                                            <div>Receipt uploaded on: {record.receipt_date || '-'}</div>
                                            <a className="text-blue-600" href={record.summon_receipt_url} target="_blank" rel="noreferrer">View uploaded receipt</a>
                                        </div>
                                    ) : (
                                        <div className="text-gray-500">No payment receipt uploaded yet.</div>
                                    )}
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
