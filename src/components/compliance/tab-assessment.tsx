"use client";

import React, { useEffect, useState } from "react";
import { authenticatedApi } from '@/config/api';
import AssessmentRecord from "./assessment-record";
import AssessmentCriteriaGrid from "@/components/compliance/assessment-criteria";
import DashAssessment from "@/components/compliance/dash-assessment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AssessmentSummary: React.FC = () => {
    const [total, setTotal] = useState<number | null>(null);
    const [byYear, setByYear] = useState<Record<string, number>>({});
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
                (list || []).forEach((it: any) => {
                    const d = it.a_date ? new Date(it.a_date) : null;
                    const y = d ? String(d.getFullYear()) : 'Unknown';
                    counts[y] = (counts[y] || 0) + 1;
                });
                if (mounted) setByYear(counts);
            } catch (err) {
                // silent: keep summary minimal; other components surface errors
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    return (
        <div className="mb-4">
            <Card className="border-2 border-cyan-500 bg-cyan-200">
                <CardHeader>
                    <CardTitle>Assessment Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading summary…</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Total assessments</p>
                                <p className="text-2xl font-semibold">{total ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">By year</p>
                                <div className="mt-2 space-y-1">
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
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const TabAssessment: React.FC = () => {
    const tabTitles = [
        { value: 'dash', label: 'Dashboard' },
        { value: 'record', label: 'Assessment Record' },
        { value: 'criteria', label: 'Assessment Criteria' },
    ];

    const tabComponents: Record<string, React.ReactNode> = {
        dash: <DashAssessment />,
        record: <AssessmentRecord />,
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
            {activeTab !== 'dash' && <AssessmentSummary />}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    {tabTitles.map(tab => (<TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>))}
                </TabsList>
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
