"use client";
import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TrainingDashboard from '@/components/training/training-dashboard';
import TrainingRecordList from '@/components/training/training-record';
import TrainingParticipant from './training-participant';
import TrainingCourses from '@/components/training/training-courses';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const TrainingTabs = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const LAST_TAB_KEY = 'training-tabs-last';

    const allowed = ['dashboard', 'records', 'participants', 'courses'] as const;
    const [activeTab, setActiveTab] = useState<string>(() => {
        const getInitial = () => {
            const tabFromUrl = typeof window !== 'undefined'
                ? new URLSearchParams(window.location.search).get('tab')
                : searchParams?.get('tab');
            if (tabFromUrl && (allowed as readonly string[]).includes(tabFromUrl)) return tabFromUrl;
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem(LAST_TAB_KEY);
                if (stored && (allowed as readonly string[]).includes(stored)) return stored;
            }
            return 'dashboard';
        };
        return getInitial();
    });

    const tabTitles = [
        { value: 'dashboard', label: 'Dashboard' },
        { value: 'records', label: 'Records' },
        { value: 'participants', label: 'Participants' },
        { value: 'courses', label: 'Courses' },
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
         
    }, [activeTab, pathname, router]);

    // Persist last selected tab
    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(LAST_TAB_KEY, activeTab);
    }, [activeTab]);

    return (
        <>
            <h1 className='text-xl font-bold mt-4'>Training Management</h1>
            <div className="text-gray-600 dark:text-gray-400 -mt-6">
                Plan, track, and analyze training sessions and records
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="records">Records</TabsTrigger>
                    <TabsTrigger value="participants">Participants</TabsTrigger>
                    <TabsTrigger value="courses">Courses</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard">
                    <TrainingDashboard />
                </TabsContent>

                <TabsContent value="records">
                    <TrainingRecordList />
                </TabsContent>

                <TabsContent value="participants">
                    <TrainingParticipant />
                </TabsContent>

                <TabsContent value="courses">
                    <TrainingCourses />
                </TabsContent>
            </Tabs>
        </>
    );
};

export default TrainingTabs;
