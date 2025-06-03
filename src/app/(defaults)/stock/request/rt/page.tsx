import RTRequest from "@components/stockinventory/c-rtrequest";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Stock Request",
};

const StockOut = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Stock Inventory</h1>
      <RTRequest />
    </div>
  );
}
export default StockOut;
