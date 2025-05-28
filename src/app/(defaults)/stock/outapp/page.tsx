import COutApp from "@components/stockinventory/c-outapp";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Stock-Out",
};

const StockOut = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Stock Request</h1>
      <COutApp />
    </div>
  );
}
export default StockOut;
