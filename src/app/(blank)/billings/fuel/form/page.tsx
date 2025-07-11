"use client";
import React from "react";
import FuelMtnDetail from "@components/billings/fuel-bill-form";
import { useSearchParams } from "next/navigation";

export default function FuelMtnBlankPage() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");

    // Always pass a number for stmtId, use 0 or -1 for create mode
    return (
        <div className="w-full">
            <FuelMtnDetail stmtId={id ? Number(id) : 0} />
        </div>
    );
}
