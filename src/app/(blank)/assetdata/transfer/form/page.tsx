"use client";
import React, { useState, useEffect } from "react";
import AssetTransferForm from "@/components/assetmgmt/asset-transfer-form";
import { useSearchParams } from "next/navigation";

export default function AssetTransferBlankPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [loading, setLoading] = useState(false);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="w-full">
      <AssetTransferForm/>
    </div>
  );
}
