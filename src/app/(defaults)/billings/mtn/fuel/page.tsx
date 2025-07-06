import FuelMtn from "@components/billings/fuel-mtn";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Fuel Billings",
};

const Billings = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Maintenance Billings</h1>
      <FuelMtn />
    </div>
  );
}
export default Billings;
