import CInApp from "@components/stockinventory/c-inapp";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Stock-In",
};

const StockIn = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Stock-In Application</h1>
      <CInApp />
    </div>
  );
}
export default StockIn;
