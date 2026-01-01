import React from "react";
import DetailAsset from "@components/assetmgmt/detail-asset2";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Asset Detail"
};

export default async function Page(props: any) {
    const params = await props.params;
    return <DetailAsset id={params.id} />; /* params.id is referred to next routing assetdata/assets/[id] */
}