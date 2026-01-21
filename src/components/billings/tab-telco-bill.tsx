"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TelcoDash from "./telco-dash";
import TelcoBill from "./telco-bill";
import TelcoAccounts from "./telco-accounts";
import TelcoSubs from "./telco-subs";
import TelcoSims from "./telco-sims";
import Link from "next/link";

const TelcoBillTab: React.FC = () => {
    const tabTitles = [
        { value: "telco-dash", label: "Dashboard" },
        { value: "telco-bill", label: "Billing" },
        { value: "telco-accounts", label: "Accounts Maintenance" },
        { value: "telco-subs", label: "Subs Maintenance" },
        { value: "telco-sims", label: "SIM Maintenance" },
        { value: "devices", label: "Devices" },
    ];

    const tabComponents: Record<string, React.ReactNode> = {
        "telco-dash": <TelcoDash />,
        "telco-bill": <TelcoBill />,
        "telco-accounts": <TelcoAccounts />,
        "telco-subs": <TelcoSubs />,
        "telco-sims": <TelcoSims />,
    };

    const [activeTab, setActiveTab] = useState<string>(() => {
        // Retrieve the last active tab from localStorage or default to "telco-dash"
        return localStorage.getItem("TelcoBillTab") || "telco-bill";
    });

    useEffect(() => {
        // Save the active tab to localStorage whenever it changes
        localStorage.setItem("TelcoBillTab", activeTab);
    }, [activeTab]);

    return (
        <>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="#" className="text-primary hover:underline">
                        Telco Maintenance
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
        </>
    );
};

export default TelcoBillTab;