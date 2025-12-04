"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FuelBill from "./fuel-bill";
import FuelDash from "./fuel-dash";
import FleetCardList from "./fleet-card";
import Link from "next/link";

const FuelBillTab: React.FC = () => {
    const tabTitles = [
        { value: "fuel-dash", label: "Dashboard" },
        { value: "fuel-bill", label: "Fuel Bills" },
        { value: "fleet-card", label: "Fleet Cards" },
    ];

    const tabComponents: Record<string, React.ReactNode> = {
        "fuel-dash": <FuelDash />,
        "fuel-bill": <FuelBill />,
        "fleet-card": <FleetCardList />,
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Fuel Billings</h1>
                    <p className="text-gray-600">
                        Monitor fuel costs, consumption, and vehicle usage
                    </p>
                </div>
            </div>
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