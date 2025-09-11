"use client";
import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SummonSummary from './summon-summary';
import SummonRecord from './summon-record';
import SummonAgencyManager from './summon-agency';

const TabSummon: React.FC = () => {
    const tabTitles = [
        { value: 'record', label: 'Summon Record' },
        { value: 'agency', label: 'Summon Agency' },
    ];

    const tabComponents: Record<string, React.ReactNode> = {
        record: <SummonRecord />,
        agency: <SummonAgencyManager />,
    };

    const [activeTab, setActiveTab] = useState<string>(() => {
        if (typeof window === 'undefined') return 'record';
        const stored = localStorage.getItem('summonTab');
        return stored === 'agency' ? 'agency' : 'record';
    });

    useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('summonTab', activeTab); }, [activeTab]);

    return (
        <div className="mt-4">
            {/* Summary sits above the tabs list */}
            <SummonSummary />
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

export default TabSummon;
