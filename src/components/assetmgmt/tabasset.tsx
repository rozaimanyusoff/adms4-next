'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashAsset from "./dash-asset";
import CoreAsset from "./record-asset";
import AssetManager from "./asset-manager";
import AssetTransferChecklist from "./asset-transfer-checklist";
import CoreType from "./assetdata-types";
import CoreCategory from "./assetdata-categories";
import BrandsView from "./assetdata-brands";
import CoreModel from "./assetdata-models";
import SpecPropertiesManager from "./spec-properties";

const AssetMgmtMain = () => {
    const tabTitles = [
        { value: "dash", label: "Dashboard" },
        { value: "records", label: "Asset Records" },
        { value: "manager", label: "Asset Manager" },
        { value: "checklist", label: "Transfer Checklist" },
        { value: "types", label: "Types & Categories" },
        { value: "brands", label: "Brands" },
        { value: "models", label: "Models" },
        { value: "specs", label: "Specifications" }
    ];

    const tabComponents: Record<string, React.ReactNode> = {
        dash: <DashAsset />,
        records: <CoreAsset />,
        manager: <AssetManager />,
        checklist: <AssetTransferChecklist />,
        types: <CoreType />,
        brands: <BrandsView />,
        models: <CoreModel />,
        specs: <SpecPropertiesManager />
    };

    const validTabValues = tabTitles.map(t => t.value);
    const [activeTab, setActiveTab] = useState<string>(() => {
        const stored = localStorage.getItem("assetmgmtTabs");
        return stored && validTabValues.includes(stored) ? stored : "dash";
    });

    useEffect(() => {
        localStorage.setItem("assetmgmtTabs", activeTab);
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