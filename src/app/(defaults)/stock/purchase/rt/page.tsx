import Purchase from "@components/stockinventory/c-rtpurchase";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Stock Purchasing",
};

const CPurchase = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Stock Inventory</h1>
      <Purchase />
    </div>
  );
}
export default CPurchase;
