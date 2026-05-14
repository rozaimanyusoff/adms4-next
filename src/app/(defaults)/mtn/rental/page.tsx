import VehiclePref from "@components/maintenance/tab-vehicle-pref";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Rental Maintenance",
};

const Rental = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Rental Transport</h1>
      <VehiclePref />
    </div>
  );
}
export default Rental;
