import VehiclePref from "@components/billings/tab-vehicle-pref";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Billing Maintenance",
};

const Billings = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Vehicle Preference</h1>
      <VehiclePref />
    </div>
  );
}
export default Billings;
