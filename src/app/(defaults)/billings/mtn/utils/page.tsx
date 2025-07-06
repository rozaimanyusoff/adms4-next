import BillingMaintenance from "@components/billings/tab-billing-mtn";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Billing Maintenance",
};

const Billings = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Billing Maintenance</h1>
      <BillingMaintenance />
    </div>
  );
}
export default Billings;
