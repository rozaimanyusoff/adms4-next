'use client';
import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, List, Activity, Wrench } from 'lucide-react';
import MaintenanceDash from './mtn-dash';
import VehicleMaintenanceAdmin from './vehicle-mtn-admin';
import ServiceTypes from './service-types';
import Workshop from '@components/billings/workshop';
import InsuranceModule from './insurance-module';
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const TabMaintenance = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [activeTab, setActiveTab] = useState('dashboard');
    const tabTitles = [
        { value: 'dashboard', label: 'Dashboard' },
        { value: 'records', label: 'Records' },
        { value: 'service-types', label: 'Service Types' },
        { value: 'workshop', label: 'Workshop' },
        { value: 'insurance', label: 'Insurance' },

    ];
    // Initialize from ?tab=... if provided
    useEffect(() => {
        const tab = searchParams?.get('tab') ?? null;
        const allowed = ['dashboard', 'records', 'service-types', 'workshop', 'insurance'];
        if (typeof tab === 'string' && allowed.includes(tab)) {
            setActiveTab(tab);
        }
        // Re-run when search params change (e.g., from back/forward navigation)
    }, [searchParams]);

    // Optional: keep URL in sync when switching tabs
    useEffect(() => {
        // Preserve current params but avoid redundant replaces
        const params = new URLSearchParams(searchParams?.toString());
        if (params.get('tab') === activeTab) return;
        params.set('tab', activeTab);
        router.replace(`${pathname}?${params.toString()}`);
        // Do not include searchParams to avoid loops; we only react to activeTab/path changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, pathname, router]);

    return (
        <>

            <ul className="mb-6 flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="#" className="text-primary hover:underline">
                        Vehicle Maintenance Management
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{tabTitles.find(t => t.value === activeTab)?.label}</span>
                </li>

            </ul>
            <p className="text-gray-600 dark:text-gray-400">
                Monitor and manage vehicle maintenance requests and analytics
            </p>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                    <TabsTrigger value="dashboard" className="flex items-center gap-2">
                        <BarChart3 size={16} />
                        Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="records" className="flex items-center gap-2">
                        <List size={16} />
                        Records
                    </TabsTrigger>
                    <TabsTrigger value="service-types" className="flex items-center gap-2">
                        <Wrench size={16} />
                        Service Types
                    </TabsTrigger>
                    <TabsTrigger value="workshop" className="flex items-center gap-2">
                        <Wrench size={16} />
                        Workshop
                    </TabsTrigger>
                    <TabsTrigger value="insurance" className="flex items-center gap-2">
                        Insurance
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="mt-6">
                    <Card>
                        <CardContent className="p-0">
                            <MaintenanceDash />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="records" className="mt-6">
                    <VehicleMaintenanceAdmin />
                </TabsContent>

                <TabsContent value="service-types" className="mt-6">
                    <ServiceTypes
                        displayMode="management"
                        className="space-y-6"
                    />
                </TabsContent>
                <TabsContent value="workshop" className="mt-6">
                    <Workshop />
                </TabsContent>
                <TabsContent value="insurance" className="mt-6">
                    <InsuranceModule />
                </TabsContent>
            </Tabs>
        </>
    );
};

export default TabMaintenance;
