'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CorrespondenceRegister from './docs-correspondence-register';
import CorrespondenceDashboardView from './docs-correspondence-dashboard';
import { seedCorrespondenceRecords } from './correspondence-tracking-data';

type CorrespondenceTab = 'dashboard' | 'records';
const TAB_STORAGE_KEY = 'docs.correspondence.active-tab.v1';

type CorrespondenceTabsProps = {
    value: CorrespondenceTab;
    onValueChange: (value: CorrespondenceTab) => void;
};

export const CorrespondenceTabs = ({ value, onValueChange }: CorrespondenceTabsProps) => {
    return (
        <Tabs value={value} onValueChange={(next) => onValueChange(next as CorrespondenceTab)} className="w-full">
            <TabsList>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="records">Records</TabsTrigger>
            </TabsList>
        </Tabs>
    );
};

export const DocsCorrespondenceTabs = () => {
    const [activeTab, setActiveTab] = useState<CorrespondenceTab | null>(null);
    const hydratedRef = useRef(false);
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (hydratedRef.current) return;
        const tabFromUrl = searchParams.get('tab');
        const hasFormQuery = searchParams.has('form') || searchParams.has('edit');
        const storedTab = localStorage.getItem(TAB_STORAGE_KEY);
        const nextTab: CorrespondenceTab =
            tabFromUrl === 'dashboard' || tabFromUrl === 'records'
                ? tabFromUrl
                : hasFormQuery
                  ? 'records'
                  : storedTab === 'dashboard' || storedTab === 'records'
                    ? storedTab
                    : 'dashboard';
        setActiveTab(nextTab);
        hydratedRef.current = true;
    }, [searchParams]);

    useEffect(() => {
        if (!hydratedRef.current || !activeTab) return;
        localStorage.setItem(TAB_STORAGE_KEY, activeTab);
        const params = new URLSearchParams(window.location.search);
        params.set('tab', activeTab);
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [activeTab, pathname, router]);

    if (!activeTab) {
        return (
            <div className="space-y-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold text-slate-900">Correspondence Tracking</h1>
                    <p className="text-sm text-muted-foreground">Monitor workflow, activity, and records in one module.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-slate-900">Correspondence Tracking</h1>
                <p className="text-sm text-muted-foreground">Monitor workflow, activity, and records in one module.</p>
            </div>
            <CorrespondenceTabs value={activeTab} onValueChange={setActiveTab} />
            {activeTab === 'dashboard' ? (
                <CorrespondenceDashboardView records={seedCorrespondenceRecords} />
            ) : (
                <CorrespondenceRegister />
            )}
        </div>
    );
};

export default DocsCorrespondenceTabs;
