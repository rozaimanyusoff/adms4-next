"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrgDept from "./org-dept";
import OrgSection from "./org-section";
import OrgPos from "./org-pos";
import OrgCostCenter from "./org-costcenter";
import OrgEmployee from "./org-emp";
import OrgTeam from "./org-team";

const TabOrg: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>(() => {
        // Retrieve the last active tab from localStorage or default to "assets"
        return localStorage.getItem("orgTabs") || "organization";
    });

    useEffect(() => {
        // Save the active tab to localStorage whenever it changes
        localStorage.setItem("orgTabs", activeTab);
    }, [activeTab]);

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Asset Management</h2>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="pos">Position</TabsTrigger>
                    <TabsTrigger value="dept">Department</TabsTrigger>
                    <TabsTrigger value="sect">Section</TabsTrigger>
                    <TabsTrigger value="costctr">Cost Center</TabsTrigger>
                    <TabsTrigger value="emp">Employee</TabsTrigger>
                    <TabsTrigger value="team">Team</TabsTrigger>
                </TabsList>
                <TabsContent value="pos">
                    <OrgPos />
                </TabsContent>
                <TabsContent value="dept">
                    <OrgDept />
                </TabsContent>
                <TabsContent value="sect">
                    <OrgSection />
                </TabsContent>
                <TabsContent value="costctr">
                    <OrgCostCenter />
                </TabsContent>
                <TabsContent value="emp">
                    <OrgEmployee />
                </TabsContent>
                <TabsContent value="team">
                    <OrgTeam />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default TabOrg;