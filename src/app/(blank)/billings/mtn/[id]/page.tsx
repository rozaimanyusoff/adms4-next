import React from "react";
import FuelMtnDetail from "@components/billings/fuel-mtn-detail";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Fuel Billing Detail"
};

export default async function Page(props: any) {
    const params = await props.params;
    return <FuelMtnDetail stmtId={params.id} />; /* params.id is referred to next routing assetdata/assets/[id] */
}