"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VendorMaintenance from "./vendor";
import Link from "next/link";

const BillingMaintenance: React.FC = () => {
    const tabTitles = [
        { value: "vendor", label: "Vendor" },
    ];

    const tabComponents: Record<string, React.ReactNode> = {
        vendor: <VendorMaintenance />,
    };

    const [activeTab, setActiveTab] = useState<string>(() => {
        // Retrieve the last active tab from localStorage or default to "assets"
        return localStorage.getItem("billingTab") || "vendor";
    });

    useEffect(() => {
        // Save the active tab to localStorage whenever it changes
        localStorage.setItem("billingTab", activeTab);
    }, [activeTab]);

    return (
        <div className="p-4">
            <ul className="mb-6 flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="#" className="text-primary hover:underline">
                        Vendor Maintenance
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

export default BillingMaintenance;