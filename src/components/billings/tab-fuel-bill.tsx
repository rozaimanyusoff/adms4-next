"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FuelBill from "./fuel-bill";
import FuelDash from "./fuel-dash";
import Link from "next/link";

const FuelBillTab: React.FC = () => {
    const tabTitles = [
        { value: "fuel-dash", label: "Dashboard" },
        { value: "fuel-bill", label: "Fuel Bills" },
    ];

    const tabComponents: Record<string, React.ReactNode> = {
        "fuel-dash": <FuelDash />,
        "fuel-bill": <FuelBill />,
    };

    const [activeTab, setActiveTab] = useState<string>(() => {
        // Retrieve the last active tab from localStorage or default to "assets"
        return localStorage.getItem("fuelTab") || "vendor";
    });

    useEffect(() => {
        // Save the active tab to localStorage whenever it changes
        localStorage.setItem("fuelTab", activeTab);
    }, [activeTab]);

    return (
        <div className="mt-4">
            <ul className="mb-6 flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="#" className="text-primary hover:underline">
                        Vehicle Maintenance
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

export default FuelBillTab;