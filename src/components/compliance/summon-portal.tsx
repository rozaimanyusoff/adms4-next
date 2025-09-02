'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface SummonPortalProps { smnId: string }

const SummonPortal: React.FC<SummonPortalProps> = ({ smnId }) => {
    const [record, setRecord] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!smnId) return;
        const run = async () => {
            setLoading(true);
            try {
                const res = await authenticatedApi.get(`/api/compliance/summon/${smnId}`);
                const data = (res as any).data?.data || (res as any).data || null;
                setRecord(data);
            } catch (err) {
                console.error('Failed to load summon', err);
                setRecord(null);
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [smnId]);

    if (loading) return <div className="p-4">Loading…</div>;
    if (!record) return <div className="p-4">Summon not found.</div>;

    const attachment = record.attachment_url || record.summon_upl || null;

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Summon Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div><strong>Summon No:</strong> {record.summon_no || record.entry_code || '-'}</div>
                        <div><strong>Date:</strong> {record.summon_date || '-'}</div>
                        <div><strong>Time:</strong> {record.summon_time || '-'}</div>
                        <div><strong>Vehicle / Reg No:</strong> {record.asset?.register_number || record.vehicle_id || '-'}</div>
                        <div><strong>Assigned Driver:</strong> {record.employee?.full_name || record.ramco_id || '-'}</div>
                        <div><strong>Location:</strong> {record.summon_loc || '-'}</div>
                        <div><strong>MyEG Date:</strong> {record.myeg_date || '-'}</div>
                        <div><strong>Type:</strong> {record.type_of_summon || '-'}</div>
                        <div><strong>Agency:</strong> {record.summon_agency || '-'}</div>
                        <div><strong>Amount (RM):</strong> {record.summon_amt ? Number(record.summon_amt).toFixed(2) : '-'}</div>

                        <div>
                            <strong>Summon Ticket:</strong>
                            {attachment ? (
                                <div className="mt-2">
                                    {attachment.endsWith('.png') || attachment.endsWith('.jpg') || attachment.endsWith('.jpeg') ? (
                                        <img src={attachment} alt="summon" className="max-w-full" />
                                    ) : (
                                        <a className="text-blue-600" href={attachment} target="_blank" rel="noreferrer">Open attachment</a>
                                    )}
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500 mt-1">No attachment provided.</div>
                            )}
                        </div>

                        <div>
                            <strong>Notes / Remarks:</strong>
                            <div className="mt-1 text-sm text-gray-700">{record.remark || record.notes || '-'}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SummonPortal;
