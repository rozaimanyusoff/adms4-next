import TelcoMaintenance from "@components/billings/tab-telco-mtn";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Billing Maintenance",
};

const Telcos = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Billing Maintenance</h1>
      <TelcoMaintenance />
    </div>
  );
}
export default Telcos;
