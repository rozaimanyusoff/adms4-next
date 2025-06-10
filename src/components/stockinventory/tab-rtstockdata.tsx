"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CDash from "./c-rtstockdash";
import CItems from "./c-rtstockitems";
import CCard from "./c-rtstockcard";
import CStockTracking from "./c-rtstocktracking";
import Link from "next/link";

const tabTitles = [
    { value: "stockdashboard", label: "Dashboard" },
    { value: "stockitems", label: "Stock Items" },
    { value: "stockcard", label: "Stock Card" },
    { value: "stocktracking", label: "Stock Tracking" },
];

const tabComponents: Record<string, React.ReactNode> = {
    stockdashboard: <CDash />,
    stockitems: <CItems />,
    stockcard: <CCard />,
    stocktracking: <CStockTracking />,
};

const TabRTStock: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>(() => {
        // Retrieve the last active tab from localStorage or default to "assets"
        return localStorage.getItem("stockTabs") || "stockdashboard";
    });

    useEffect(() => {
        // Save the active tab to localStorage whenever it changes
        localStorage.setItem("stockTabs", activeTab);
    }, [activeTab]);

    return (
        <div className="mt-4">
            <ul className="mb-6 flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="#" className="text-primary hover:underline">
                        Stock Inventory
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

export default TabRTStock;