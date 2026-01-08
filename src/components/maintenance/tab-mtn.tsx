'use client';
import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, List, Activity, Wrench } from 'lucide-react';
import MaintenanceDash from './mtn-dash';
import VehicleMaintenanceAdmin from './vehicle-mtn-admin';
import ServiceTypes from './service-types';
import Workshop from '@components/billings/workshop';
import Workflows from '@components/maintenance/workflows';
import InsuranceModule from './insurance-module';
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const TabMaintenance = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const tabs = [
        {
            value: 'dashboard',
            label: 'Dashboard',
            icon: BarChart3,
            content: (
                <Card>
                    <CardContent className="p-0">
                        <MaintenanceDash />
                    </CardContent>
                </Card>
            ),
        },
        { value: 'records', label: 'Records', icon: List, content: <VehicleMaintenanceAdmin /> },
        { value: 'service-types', label: 'Service Types', icon: Wrench, content: <ServiceTypes displayMode="management" className="space-y-6" />,
        },
        { value: 'workshop', label: 'Workshop', icon: Wrench, content: <Workshop /> },
        { value: 'insurance', label: 'Insurance', icon: Wrench, content: <InsuranceModule /> },
        { value: 'workflows', label: 'Authorization Workflows', icon: Activity, content: <Workflows /> },
    ];

    const tabValues = tabs.map(t => t.value);

    // Restore last tab from URL or localStorage
    useEffect(() => {
        const urlTab = searchParams?.get('tab');
        const stored = typeof window !== 'undefined' ? localStorage.getItem('maintenanceTab') : null;
        const next = tabValues.includes(urlTab ?? '') ? urlTab : tabValues.includes(stored ?? '') ? stored : 'dashboard';
        if (next && next !== activeTab) setActiveTab(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Persist tab to URL and localStorage
    useEffect(() => {
        const params = new URLSearchParams(searchParams?.toString());
        if (params.get('tab') !== activeTab) {
            params.set('tab', activeTab);
            router.replace(`${pathname}?${params.toString()}`);
        }
        if (typeof window !== 'undefined') {
            localStorage.setItem('maintenanceTab', activeTab);
        }
    }, [activeTab, pathname, router, searchParams]);

    return (
        <>

            <ul className="mb-6 flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="#" className="text-primary hover:underline">
                        Vehicle Maintenance Management
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{tabs.find(t => t.value === activeTab)?.label}</span>
                </li>

            </ul>
            <p className="text-gray-600 dark:text-gray-400">
                Monitor and manage vehicle maintenance requests and analytics
            </p>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                    {tabs.map(({ value, label, icon: Icon }) => (
                        <TabsTrigger key={value} value={value} className="flex items-center gap-2">
                            <Icon size={16} />
                            {label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {tabs.map(({ value, content }) => (
                    <TabsContent key={value} value={value} className="mt-6">
                        {content}
                    </TabsContent>
                ))}
            </Tabs>
        </>
    );
};

export default TabMaintenance;
