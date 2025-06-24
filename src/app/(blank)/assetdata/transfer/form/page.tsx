"use client";
import React from "react";
import AssetTransferForm from "@/components/assetmgmt/asset-transfer-form";
import { useSearchParams } from "next/navigation";

export default function AssetTransferBlankPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  return (
    <div className="w-full">
      <AssetTransferForm id={id} />
    </div>
  );
}
