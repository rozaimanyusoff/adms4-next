'use client';
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, List, Activity, Wrench } from 'lucide-react';
import MaintenanceDash from './mtn-dash';
import VehicleMaintenanceAdmin from './vehicle-mtn-admin';
import ServiceTypes from './service-types';
import Link from "next/link";

const TabMaintenance = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const tabTitles = [
        { value: 'dashboard', label: 'Dashboard' },
        { value: 'records', label: 'Records' },
        { value: 'service-types', label: 'Service Types' },
    ];


    return (
        <div className="p-4">

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
                <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
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
                </TabsList>

                <TabsContent value="dashboard" className="mt-6">
                    <Card>
                        <CardContent className="p-0">
                            <MaintenanceDash />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="records" className="mt-6">
                    <Card>
                        <CardContent className="p-0">
                            <VehicleMaintenanceAdmin />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="service-types" className="mt-6">
                    <ServiceTypes
                        displayMode="management"
                        className="space-y-6"
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default TabMaintenance;
