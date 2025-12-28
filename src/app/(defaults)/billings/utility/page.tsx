import UtilityBilling from "@components/billings/tab-utility-bill";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Utility Billing",
};

const UtilityBillingPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Utility Billing</h1>
      <UtilityBilling />
    </div>
  );
}

export default UtilityBillingPage;
