import FuelMaintenance from "@components/billings/tab-fuel";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Fuel Billings",
};

const Billings = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Fuel Maintenance</h1>
      <FuelMaintenance />
    </div>
  );
}
export default Billings;
