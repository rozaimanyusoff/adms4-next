"use client";

import React, { useEffect, useState } from "react";
import { authenticatedApi } from '@/config/api';
import AssessmentRecord from "./assessment-record";
import AssessmentCriteriaGrid from "@/components/compliance/assessment-criteria";
import DashAssessment from "@/components/compliance/dash-assessment";
import AssessmentOwnership from "./assessment-ownership";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const AssessmentSummary: React.FC = () => {
    const [total, setTotal] = useState<number | null>(null);
    const [byYear, setByYear] = useState<Record<string, number>>({});
    const [ncrSummary, setNcrSummary] = useState<{ open: number; closed: number }>({ open: 0, closed: 0 });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            try {
                const res = await authenticatedApi.get('/api/compliance/assessments');
                const list = (res as any).data?.data || (res as any).data || [];
                if (!mounted) return;
                setTotal(Array.isArray(list) ? list.length : 0);
                const counts: Record<string, number> = {};
                let ncrOpen = 0;
                let ncrClosed = 0;
                (list || []).forEach((it: any) => {
                    const d = it.a_date ? new Date(it.a_date) : null;
                    const y = d ? String(d.getFullYear()) : 'Unknown';
                    counts[y] = (counts[y] || 0) + 1;

                    const details = Array.isArray(it?.ncr_details) ? it.ncr_details : [];
                    details.forEach((detail: any) => {
                        const status = (detail?.ncr_status || '').toLowerCase();
                        const hasClosedAt = Boolean(detail?.closed_at);
                        const isClosed = status === 'closed' || hasClosedAt || detail?.is_closed === true;
                        if (isClosed) ncrClosed += 1;
                        else ncrOpen += 1;
                    });
                });
                if (mounted) {
                    setByYear(counts);
                    setNcrSummary({ open: ncrOpen, closed: ncrClosed });
                }
            } catch (err) {
                // silent: keep summary minimal; other components surface errors
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    const renderBody = () => {
        if (loading) {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle>Assessment Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Loading summary…</p>
                    </CardContent>
                </Card>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Total assessments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-semibold">{total ?? '-'}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>By year</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {Object.keys(byYear).length === 0 ? (
                                <p className="text-sm text-muted-foreground">No data</p>
                            ) : (
                                Object.entries(byYear).sort((a,b) => b[0].localeCompare(a[0])).map(([year, count]) => (
                                    <div key={year} className="flex items-center justify-between">
                                        <span className="text-sm">{year}</span>
                                        <span className="font-medium">{count}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>NCR status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Open</span>
                                <span className="font-medium">{ncrSummary.open}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Closed</span>
                                <span className="font-medium">{ncrSummary.closed}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    return renderBody();
};

const TabAssessment: React.FC = () => {
    const tabTitles = [
        { value: 'dash', label: 'Dashboard' },
        { value: 'record', label: 'Assessment Record' },
        { value: 'criteria', label: 'Assessment Criteria' },
        { value: 'ownership', label: 'Ownership' }, // Future feature
    ];

    const tabComponents: Record<string, React.ReactNode> = {
        dash: <DashAssessment />,
        record: <AssessmentRecord />,
        ownership: <AssessmentOwnership />,
        criteria: <AssessmentCriteriaGrid />,
    };

    const [activeTab, setActiveTab] = useState<string>(() => {
        if (typeof window === 'undefined') return 'dash';
        const stored = localStorage.getItem('assessmentTab');
        return stored && tabTitles.some(tab => tab.value === stored) ? stored : 'dash';
    });

    useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('assessmentTab', activeTab); }, [activeTab]);

    return (
        <div className="mt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    {tabTitles.map(tab => (<TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>))}
                </TabsList>
                {activeTab !== 'dash' && (
                    <div className="mt-4">
                        <AssessmentSummary />
                    </div>
                )}
                {tabTitles.map(tab => (
                    <TabsContent key={tab.value} value={tab.value}>
                        {tabComponents[tab.value]}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};

export default TabAssessment;
