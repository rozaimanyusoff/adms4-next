'use client'

import CCard from "@components/stockinventory/c-card";
import { Metadata } from "next";
import React from "react";

/* export const metadata: Metadata = {
  title: "Cart",
}; */

const Card = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Stock Card</h1>
      <CCard />
    </div>
  );
}
export default Card;