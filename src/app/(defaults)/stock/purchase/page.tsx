import Purchase from "@components/stockinventory/c-purchase";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Item Puschasing",
};

const CPurchase = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Purchase Item</h1>
      <Purchase />
    </div>
  );
}
export default CPurchase;
