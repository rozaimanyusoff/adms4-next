"use client";
import React from "react";
import TelcoBillForm from "@components/billings/telco-bill-form";
import { useSearchParams } from "next/navigation";

export default function TelcoBillBlankPage() {
    const searchParams = useSearchParams();
    const id = searchParams?.get("id");

    // Always pass a number for stmtId, use 0 or -1 for create mode
    return (
        <div className="w-full">
            <TelcoBillForm utilId={id ? Number(id) : 0} />
        </div>
    );
}
