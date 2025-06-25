"use client";
import React from "react";
import PurchaseRequestForm from "@components/assetmgmt/purchase-request-form";
import { useSearchParams } from "next/navigation";
import { Metadata } from "next";

export default function PurchaseRequest() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  return (
    <div className="w-full">
      <PurchaseRequestForm id={id} />
    </div>
  );
}
