import React from "react";
import PurchaseRequestRecord from "@components/purchasing/purchase-request-record";
import { Metadata } from "next";

export const metadata: Metadata = {
   title: "New Purchase Request",
   description: "Create a new purchase request"
};

const PurchaseRequestPage = () => {
   return <PurchaseRequestRecord />;
};

export default PurchaseRequestPage;
