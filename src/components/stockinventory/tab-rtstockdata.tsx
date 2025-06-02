"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CDash from "./c-rtstockdash";
import CItems from "./c-rtstockitems";
import CCard from "./c-rtstockcard";
import CStockTracking from "./c-rtstocktracking";

const TabRTStock: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>(() => {
        // Retrieve the last active tab from localStorage or default to "assets"
        return localStorage.getItem("stockTabs") || "stockinventory";
    });

    useEffect(() => {
        // Save the active tab to localStorage whenever it changes
        localStorage.setItem("stockTabs", activeTab);
    }, [activeTab]);

    return (
        <>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="stockdashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="stockitems">Stock Items</TabsTrigger>
                    <TabsTrigger value="stockcard">Stock Card</TabsTrigger>
                    <TabsTrigger value="stocktracking">Stock Tracking</TabsTrigger>
                </TabsList>
                <TabsContent value="stockdashboard">
                    <CDash />
                </TabsContent>
                <TabsContent value="stockitems">
                    <CItems />
                </TabsContent>
                <TabsContent value="stockcard">
                    <CCard />
                </TabsContent>
                <TabsContent value="stocktracking">
                    <CStockTracking />
                </TabsContent>
            </Tabs>
        </>
    );
};

export default TabRTStock;