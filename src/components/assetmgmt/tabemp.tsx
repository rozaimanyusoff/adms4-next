'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashEmp from "./dash-emp";
import OrgEmp from "./org-emp";

const EmpMgmtMain = () => {
    const tabTitles = [
        { value: "dash", label: "Dashboard" },
        { value: "emp", label: "Records" },
    ];

    const tabComponents: Record<string, React.ReactNode> = {
        dash: <DashEmp />,
        emp: <OrgEmp />,
    };

    const [activeTab, setActiveTab] = useState<string>(() => {
        return localStorage.getItem("empmgmtTabs") || "dash";
    });

    useEffect(() => {
        localStorage.setItem("empmgmtTabs", activeTab);
    }, [activeTab]);

    return (
        <div className="mt-4">
            <ul className="mb-6 flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="#" className="text-primary hover:underline">
                        Employees Data
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

export default EmpMgmtMain;