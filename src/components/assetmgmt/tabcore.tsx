"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CoreCategory from "./core-category";
import CoreBrand from "./core-brand";
import CoreType from "./core-type";
import CoreModel from "./core-model";
import CoreSoftware from "./core-software";
import Link from "next/link";

const TabCore: React.FC = () => {
  const tabTitles = [
    { value: "types", label: "Types" },
    { value: "categories", label: "Categories" },
    { value: "brands", label: "Brands" },
    { value: "models", label: "Models" },
    { value: "softwares", label: "Softwares" },
  ];

  const tabComponents: Record<string, React.ReactNode> = {
    types: <CoreType />,
    categories: <CoreCategory />,
    brands: <CoreBrand />,
    models: <CoreModel />,
    softwares: <CoreSoftware />,
  };

  const [activeTab, setActiveTab] = useState<string>(() => {
    // Retrieve the last active tab from localStorage or default to "types"
    return localStorage.getItem("coreTabs") || "types";
  });

  useEffect(() => {
    // Save the active tab to localStorage whenever it changes
    localStorage.setItem("coreTabs", activeTab);
  }, [activeTab]);

  return (
    <div className="p-4">
      <ul className="mb-6 flex space-x-2 rtl:space-x-reverse">
        <li>
          <Link href="#" className="text-primary hover:underline">
            Asset Management
          </Link>
        </li>
        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
          <span>{tabTitles.find((t) => t.value === activeTab)?.label}</span>
        </li>
      </ul>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabTitles.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabTitles.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tabComponents[tab.value]}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default TabCore;