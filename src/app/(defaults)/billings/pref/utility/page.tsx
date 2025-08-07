import UtilityBilling from "@components/billings/tab-utility-bill";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Billing Maintenance",
};

const Billings = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Utility Bills Preference</h1>
      <UtilityBilling />
    </div>
  );
}
export default Billings;
