import TelcoBillTab from "@components/billings/tab-telco-bill";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Telco Billing",
};

const Telcos = () => {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Telco Billings</h1>
      <TelcoBillTab />
    </div>
  );
}
export default Telcos;
