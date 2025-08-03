"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Workshop from "./workshop";
import FleetCardList from "./fleet-card";
import TempVehicle from "./temp-vehicle";
import VehicleMtnReport from "./vehicle-mtn-report";
import Link from "next/link";

const BillingMaintenance: React.FC = () => {
    const tabTitles = [
        { value: "workshop", label: "Workshop" },
        { value: "svcopt", label: "Service Option" },
        { value: "fleet", label: "Fleet Card" },
        { value: "tempvehicle", label: "Vehiclec Records" },
        { value: "vehiclereport", label: "Vehicle Maintenance Report" },
    ];

    const tabComponents: Record<string, React.ReactNode> = {
        workshop: <Workshop />,
        fleet: <FleetCardList />,
        tempvehicle: <TempVehicle />,
        vehiclereport: <VehicleMtnReport />,
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
        <div className="mt-4">
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