'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Accounts from "./accounts";
import Groups from "./groups";
import Navigations from "./navigation";
import Roles from "./roles";
import CLogs from "./c-logs";
import Workflows from "./workflows";
import ManagementModule from "./mgmt-module";
import PermissionMgmt from "./permission";

const UserMgmtMain = () => {
    const tabTitles = [
        { value: "account", label: "Account" },
        { value: "roles", label: "Roles" },
        { value: "group", label: "Group" },
        { value: "navigation", label: "Navigation" },
        { value: "workflow", label: "Workflows" },
        { value: "permission", label: "Permissions" },
        { value: "module", label: "Modules" },
        { value: "logs", label: "Logs" },
    ];

    const tabComponents: Record<string, React.ReactNode> = {
        account: <Accounts />,
        roles: <Roles />,
        group: <Groups />,
        navigation: <Navigations />,
        workflow: <Workflows />,
        permission: <PermissionMgmt />,
        module: <ManagementModule />,
        logs: <CLogs />,
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

export default UserMgmtMain;