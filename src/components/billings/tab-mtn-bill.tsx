'use client';
import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MaintenanceDashboard from './mtn-dash';
import MaintenanceBill from './mtn-bill';

const TabMaintenanceBill: React.FC = () => {
    const [activeTab, setActiveTab] = useState('dashboard');

    useEffect(() => {
        // Load saved tab from localStorage
        const savedTab = localStorage.getItem('maintenanceBillActiveTab');
        if (savedTab && ['dashboard', 'bills'].includes(savedTab)) {
            setActiveTab(savedTab);
        }
    }, []);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        localStorage.setItem('maintenanceBillActiveTab', value);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Vehicle Maintenance</h1>
                    <p className="text-gray-600">
                        Monitor maintenance costs, workshops, and service records
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="dashboard" className="flex items-center gap-2">
                        <span>Dashboard</span>
                    </TabsTrigger>
                    <TabsTrigger value="bills" className="flex items-center gap-2">
                        <span>Bills</span>
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="dashboard" className="space-y-6">
                    <MaintenanceDashboard />
                </TabsContent>
                
                <TabsContent value="bills" className="space-y-6">
                    <MaintenanceBill />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default TabMaintenanceBill;
