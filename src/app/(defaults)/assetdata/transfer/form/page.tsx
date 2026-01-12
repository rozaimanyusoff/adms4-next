"use client";
import React from "react";
import type { Metadata } from "next";
import AssetTransferForm from "@/components/assetmgmt/asset-transfer-form";
import { useSearchParams } from "next/navigation";

export const metadata: Metadata = {
  title: "Asset Transfer Form",
  description: "Use this form to transfer an asset to another person or location within the organization.",
  robots: { index: false, follow: false },
};

const AssetTransferFormPage = () => {
  const searchParams = useSearchParams();
  const id = searchParams?.get("id");

  return (
    <div className="w-full">
      <AssetTransferForm id={id} />
    </div>
  );
};

export default AssetTransferFormPage;
