import CDash from "@components/stockinventory/c-dash";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
    title: "Inventory Dashboard",
};

const Dashboard = () => {
    return (
        <div className="flex flex-col gap-6 p-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <CDash />
        </div>
    );
}
export default Dashboard;