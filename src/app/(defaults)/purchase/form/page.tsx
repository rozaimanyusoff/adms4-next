import PurchaseRequestForm from "@components/purchasing/purchase-request-form";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
    title: "New Purchase Request",
    description: "Create a new purchase request"
};

const PurchaseFormPage = () => {
    return <PurchaseRequestForm />;
};

export default PurchaseFormPage;
