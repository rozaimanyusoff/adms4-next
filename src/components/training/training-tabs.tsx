"use client";
import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TrainingDashboard from '@/components/training/training-dashboard';
import TrainingRecordList from '@/components/training/training-record';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const TrainingTabs = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const allowed = ['dashboard', 'records'] as const;
    const [activeTab, setActiveTab] = useState<string>(() => {
        const tab = (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : searchParams?.get('tab')) ?? '';
        return (allowed as readonly string[]).includes(tab) ? tab : 'dashboard';
    });

    const tabTitles = [
        { value: 'dashboard', label: 'Dashboard' },
        { value: 'records', label: 'Records' },
    ];

    // Keep state in sync if URL ?tab changes
    useEffect(() => {
        const tab = searchParams?.get('tab') ?? null;
        if (typeof tab === 'string' && (allowed as readonly string[]).includes(tab) && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    // Keep URL in sync when switching tabs
    useEffect(() => {
        const params = new URLSearchParams(searchParams?.toString());
        if (params.get('tab') === activeTab) return;
        params.set('tab', activeTab);
        router.replace(`${pathname}?${params.toString()}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, pathname, router]);

    return (
        <>
            <h1 className='text-xl font-bold mt-4'>Training Management</h1>
            <div className="text-gray-600 dark:text-gray-400 -mt-6">
                Plan, track, and analyze training sessions and records
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="w-full justify-start gap-2">
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="records">Records</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard">
                    <TrainingDashboard />
                </TabsContent>

                <TabsContent value="records">
                    <TrainingRecordList />
                </TabsContent>
            </Tabs>
        </>
    );
};

export default TrainingTabs;
