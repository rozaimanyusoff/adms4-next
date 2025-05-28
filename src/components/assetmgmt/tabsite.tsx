"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SiteSites from "./site-sites";
import SiteDistrict from "./site-district";
import SiteZone from "./site-zone";
import SiteModule from "./site-module";

const TabSite: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>(() => {
        // Retrieve the last active tab from localStorage or default to "assets"
        return localStorage.getItem("siteTabs") || "sites";
    });

    useEffect(() => {
        // Save the active tab to localStorage whenever it changes
        localStorage.setItem("siteTabs", activeTab);
    }, [activeTab]);

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Asset Management</h2>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="sites">Sites</TabsTrigger>
                    <TabsTrigger value="district">District</TabsTrigger>
                    <TabsTrigger value="zone">Zones</TabsTrigger>
                    <TabsTrigger value="module">Module</TabsTrigger>
                </TabsList>
                <TabsContent value="sites">
                    <SiteSites />
                </TabsContent>
                <TabsContent value="district">
                    <SiteDistrict />
                </TabsContent>
                <TabsContent value="zone">
                    <SiteZone />
                </TabsContent>
                <TabsContent value="module">
                    <SiteModule />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default TabSite;