"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CoreAsset from "./core-asset";
import CoreCategory from "./core-category";
import CoreBrand from "./core-brand";
import CoreType from "./core-type";
import CoreModel from "./core-model";

const TabCore: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Retrieve the last active tab from localStorage or default to "assets"
    return localStorage.getItem("coreTabs") || "assets";
  });

  useEffect(() => {
    // Save the active tab to localStorage whenever it changes
    localStorage.setItem("coreTabs", activeTab);
  }, [activeTab]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Asset Management</h2>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
        </TabsList>
        <TabsContent value="assets">
          <CoreAsset />
        </TabsContent>
        <TabsContent value="types">
          <CoreType />
        </TabsContent>
        <TabsContent value="categories">
          <CoreCategory />
        </TabsContent>
        <TabsContent value="brands">
          <CoreBrand />
        </TabsContent>
        
        <TabsContent value="models">
          <CoreModel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TabCore;