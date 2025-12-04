import FuelBillTab from "@components/billings/tab-fuel-bill";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Fuel Billing",
};

const Telcos = () => {
  return <FuelBillTab />;
}
export default Telcos;