"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrgDept from "./org-dept";
import OrgSection from "./org-section";
import OrgPos from "./org-pos";
import OrgCostCenter from "./org-costcenter";
import SiteDistrict from "./site-district";
import OrgTeam from "./org-team";
import Link from "next/link";

const TabOrg: React.FC = () => {
    const tabTitles = [
        { value: "pos", label: "Position" },
        { value: "dept", label: "Department" },
        { value: "sect", label: "Section" },
        { value: "costctr", label: "Cost Center" },
        { value: "team", label: "District" },
    ];

    const tabComponents: Record<string, React.ReactNode> = {
        pos: <OrgPos />,
        dept: <OrgDept />,
        sect: <OrgSection />,
        costctr: <OrgCostCenter />,
        team: <SiteDistrict />,
    };

    const [activeTab, setActiveTab] = useState<string>(() => {
        // Retrieve the last active tab from localStorage or default to "assets"
        return localStorage.getItem("orgTabs") || "pos";
    });

    useEffect(() => {
        // Save the active tab to localStorage whenever it changes
        localStorage.setItem("orgTabs", activeTab);
    }, [activeTab]);

    return (
        <div className="p-4">
            <ul className="mb-6 flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="#" className="text-primary hover:underline">
                        Asset Management
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

export default TabOrg;