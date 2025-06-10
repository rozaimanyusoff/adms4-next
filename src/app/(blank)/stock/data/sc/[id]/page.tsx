import React from "react";
import DetailRTStockCard from "@components/stockinventory/detail-rtstockcard";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Stock Detail"
};

export default async function Page(props: any) {
    const params = await props.params;
    return <DetailRTStockCard id={params.id} />;
}