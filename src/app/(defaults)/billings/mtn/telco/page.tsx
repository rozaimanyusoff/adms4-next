import TelcoBillings from "@components/billings/tab-telco-bill";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Telco Billings",
};

const TelcoBilling = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Telco Maintenance</h1>
      <TelcoBillings />
    </div>
  );
}
export default TelcoBilling;
