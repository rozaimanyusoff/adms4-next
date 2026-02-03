import React from "react";
import PurchaseRequestRecord from "@components/purchasing/purchase-request-record";
import { Metadata } from "next";

export const metadata: Metadata = {
   title: "My Purchase Requests",
   description: "View and track your submitted purchase requests"
};

const MyPurchaseRequestsPage = () => {
   return <PurchaseRequestRecord scope="mine" createHref="/purchase/form" />;
};

export default MyPurchaseRequestsPage;
