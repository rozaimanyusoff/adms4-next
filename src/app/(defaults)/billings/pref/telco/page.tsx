import TelcoPref from "@components/billings/tab-telco-pref";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Billing Maintenance",
};

const TelcoBilling = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Telco Preference</h1>
      <TelcoPref />
    </div>
  );
}
export default TelcoBilling;
