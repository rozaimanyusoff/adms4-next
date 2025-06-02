import TabRTStock from "@components/stockinventory/tab-rtstockdata";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Stock Data",
};

const StockData = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Stock Inventory</h1>
      <TabRTStock />
    </div>
  );
}
export default StockData;