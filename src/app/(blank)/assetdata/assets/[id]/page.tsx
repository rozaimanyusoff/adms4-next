import React from "react";
import DetailAsset from "@/components/assetmgmt/detail-asset";

// This page fetches asset data by id and renders the detail view

export default function AssetDetailPage({ params }: { params: { id: string } }) {
    return <DetailAsset id={params.id} />;
}
