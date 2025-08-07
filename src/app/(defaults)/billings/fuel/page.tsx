import FuelBillTab from "@components/billings/tab-fuel-bill";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Fuel Billing",
};

const Telcos = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Fuel Billings</h1>
      <FuelBillTab />
    </div>
  );
}
export default Telcos;