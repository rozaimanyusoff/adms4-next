'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssetTransfer from "./asset-transfer";
import AssetTransferForm from "./asset-transfer-form";
import AssetTransferChecklist from "./asset-transfer-checklist";

const TransferApp = () => {
    const tabTitles = [
        { value: 'form', label: 'Form' },
        { value: "records", label: "Records" },
    ];

    const tabComponents: Record<string, React.ReactNode> = {
        form: <AssetTransferForm />,
        records: <AssetTransfer />,
    };

    const validTabValues = tabTitles.map(t => t.value);
    const [activeTab, setActiveTab] = useState<string>(() => {
        const stored = localStorage.getItem("assettransferTabs");
        return stored && validTabValues.includes(stored) ? stored : "dash";
    });

    useEffect(() => {
        localStorage.setItem("assettransferTabs", activeTab);
    }, [activeTab]);

    return (
        <>
            <ul className="mb-6 flex space-x-2 rtl:space-x-reverse ml-4 text-xl font-bold">
                <li>
                    <Link href="#" className="text-primary hover:underline">
                        Asset Transfer
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

export default TransferApp;