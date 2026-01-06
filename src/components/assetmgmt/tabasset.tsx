"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashAsset from "./dash-asset";
import CoreAsset from "./asset-record";
import AssetRecordVehicle from "./asset-record-vehicle";
import AssetRecordComputer from "./asset-record-computer";
import AssetManager from "./asset-manager";
import AssetTransferChecklist from "./asset-transfer-checklist";
import CoreType from "./assetdata-types";
import BrandsView from "./assetdata-brands";
import CoreModel from "./assetdata-models";
import SpecPropertiesManager from "./spec-properties";
import { authenticatedApi } from "@/config/api";
import { AuthContext } from "@store/AuthContext";

interface ManagerEntry {
    id: number;
    ramco_id?: string;
    manager_id: number;
    employee?: { ramco_id?: string; full_name?: string };
}

interface ManagedTab {
    value: string;
    label: string;
    component: React.ReactNode;
}

const AssetMgmtMain = () => {
    const auth = React.useContext(AuthContext);
    const user = auth?.authData?.user;
    const [managedTabs, setManagedTabs] = useState<ManagedTab[]>([]);
    const [hideGeneralRecords, setHideGeneralRecords] = useState(false);
    const [managedLoaded, setManagedLoaded] = useState(false);

    const baseTabTitles = useMemo(() => {
        const tabs = [
            { value: "dash", label: "Dashboard" },
        ];
        if (!hideGeneralRecords) {
            tabs.push({ value: "records", label: "Asset Records" });
        }
        tabs.push(
            { value: "manager", label: "Asset Manager" },
            { value: "checklist", label: "Transfer Checklist" },
            { value: "types", label: "Types & Categories" },
            { value: "brands", label: "Brands & Models" },
            { value: "specs", label: "Specifications" }
        );
        return tabs;
    }, [hideGeneralRecords]);

    const baseTabComponents: Record<string, React.ReactNode> = useMemo(() => ({
        dash: <DashAsset />,
        records: <CoreAsset />,
        manager: <AssetManager />,
        checklist: <AssetTransferChecklist />,
        types: <CoreType />,
        brands: <BrandsView />,
        models: <CoreModel />,
        specs: <SpecPropertiesManager />
    }), []);

    // Fetch asset manager assignments and build per-type tabs (vehicle/computer) for current user
    useEffect(() => {
        const fetchManagedTabs = async () => {
            if (!user?.username) {
                setManagedTabs([]);
                return;
            }
            try {
                const [managersRes, typesRes] = await Promise.all([
                    authenticatedApi.get<any>("/api/assets/managers"),
                    authenticatedApi.get<any>("/api/assets/types")
                ]);
                const managers: ManagerEntry[] = (managersRes.data && managersRes.data.data) || managersRes.data || [];
                const typesData = Array.isArray(typesRes.data) ? typesRes.data : (typesRes.data && typesRes.data.data ? typesRes.data.data : []);

                const managedTypeIds = managers
                    .filter(entry => {
                        const ramcoId = entry.employee?.ramco_id || entry.ramco_id;
                        return ramcoId && ramcoId === user.username;
                    })
                    .map(entry => Number(entry.manager_id));

                const uniqueTypeIds = Array.from(new Set(managedTypeIds));
                const tabs: ManagedTab[] = [];

                uniqueTypeIds.forEach(typeId => {
                    const matchedType = typesData.find((t: any) => Number(t.id) === typeId);
                    const typeName = matchedType?.name || `Type ${typeId}`;
                    const typeLabel = typeName.toLowerCase();
                    if (typeLabel.includes("vehicle")) {
                        tabs.push({
                            value: `vehicle-${typeId}`,
                            label: `${typeName} Records`,
                            component: <AssetRecordVehicle typeId={typeId} />
                        });
                    } else if (typeLabel.includes("computer")) {
                        tabs.push({
                            value: `computer-${typeId}`,
                            label: `${typeName} Records`,
                            component: <AssetRecordComputer typeId={typeId} />
                        });
                    }
                });

                setManagedTabs(tabs);
                setHideGeneralRecords(tabs.length > 0);
            } catch (err) {
                setManagedTabs([]);
                setHideGeneralRecords(false);
            } finally {
                setManagedLoaded(true);
            }
        };

        fetchManagedTabs();
    }, [user?.username]);

    const tabTitles = useMemo(() => [...baseTabTitles, ...managedTabs], [baseTabTitles, managedTabs]);

    const tabComponents = useMemo(() => {
        const components: Record<string, React.ReactNode> = { ...baseTabComponents };
        managedTabs.forEach(tab => {
            components[tab.value] = tab.component;
        });
        return components;
    }, [baseTabComponents, managedTabs]);

    const [activeTab, setActiveTab] = useState<string>(() => {
        const stored = typeof window !== "undefined" ? localStorage.getItem("assetmgmtTabs") : null;
        return stored || "dash";
    });

    useEffect(() => {
        if (!managedLoaded) return;
        const validTabValues = tabTitles.map(t => t.value);
        if (!validTabValues.includes(activeTab)) {
            const stored = typeof window !== "undefined" ? localStorage.getItem("assetmgmtTabs") : null;
            if (stored && validTabValues.includes(stored)) {
                setActiveTab(stored);
                return;
            }
            setActiveTab("dash");
        }
    }, [tabTitles, activeTab, managedLoaded]);

    useEffect(() => {
        localStorage.setItem("assetmgmtTabs", activeTab);
    }, [activeTab]);

    return (
        <>
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
        </>
    );
};

export default AssetMgmtMain;
