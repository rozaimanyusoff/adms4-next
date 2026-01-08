'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Accounts from "./accounts";
import Groups from "./groups";
import Navigations from "./navigation";
import Roles from "./roles";
import CLogs from "./logs";
import Workflows from "./workflows";
import ManagementModule from "./mgmt-module";
import PermissionMgmt from "./permission";
import AdminGuide from "./admin-guide";
import { CircleHelp } from "lucide-react";
import MaintenanceControl from "./maintenance-control";

const UserMgmtMain = () => {
    const tabTitles = [
        { value: "account", label: "Account" },
        { value: "roles", label: "Roles" },
        { value: "group", label: "Group" },
        { value: "navigation", label: "Navigation" },
        { value: "permission", label: "Permissions" },
        { value: "module", label: "Modules" },
        { value: "maintenance", label: "Maintenance" },
        { value: "logs", label: "Logs" },
        { value: "guide", label: "Admin Guide", icon: CircleHelp },
    ];

    const tabComponents: Record<string, React.ReactNode> = {
        account: <Accounts />,
        roles: <Roles />,
        group: <Groups />,
        navigation: <Navigations />,
        permission: <PermissionMgmt />,
        module: <ManagementModule />,
        maintenance: <MaintenanceControl />,
        logs: <CLogs />,
        guide: <AdminGuide />,
    };

    const validTabValues = tabTitles.map(t => t.value);
    const [activeTab, setActiveTab] = useState<string>(() => {
        const stored = localStorage.getItem("usermgmtTabs");
        return stored && validTabValues.includes(stored) ? stored : "account";
    });

    useEffect(() => {
        localStorage.setItem("usermgmtTabs", activeTab);
    }, [activeTab]);

    return (
        <div className="mt-4">
            <ul className="mb-6 flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="#" className="text-primary hover:underline">
                        Admin
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{tabTitles.find(t => t.value === activeTab)?.label}</span>
                </li>
            </ul>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    {tabTitles.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1">
                            {tab.icon ? <tab.icon className="h-4 w-4 text-blue-600" /> : null}
                            {tab.label}
                        </TabsTrigger>
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

export default UserMgmtMain;
