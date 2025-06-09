'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashAsset from "./dash-asset";
import CoreAsset from "./core-asset";

const AssetMgmtMain = () => {
    const tabTitles = [
        { value: "dash", label: "Dashboard" },
        { value: "records", label: "Records" },
    ];

    const tabComponents: Record<string, React.ReactNode> = {
        dash: <DashAsset />,
        records: <CoreAsset />,
    };

    const [activeTab, setActiveTab] = useState<string>(() => {
        return localStorage.getItem("usermgmtTabs") || "account";
    });

    useEffect(() => {
        localStorage.setItem("usermgmtTabs", activeTab);
    }, [activeTab]);

    return (
        <div className="p-4">
            <ul className="mb-6 flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="#" className="text-primary hover:underline">
                        Assets Data
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{tabTitles.find(t => t.value === activeTab)?.label}</span>
                </li>
            </ul>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    {tabTitles.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
                    ))}
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

export default AssetMgmtMain;