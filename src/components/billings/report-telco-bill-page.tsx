"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticatedApi } from "@/config/api";
import { Button } from "@/components/ui/button";
import { exportTelcoBillSummaryPDF } from "./report-telco-bill";

const ReportTelcoBillPage = () => {
    const searchParams = useSearchParams();
    const ids =
        searchParams && searchParams.get("ids")
            ? searchParams.get("ids")!.split(",").map(Number).filter(Boolean)
            : [];
    useEffect(() => {
        if (ids.length > 0) {
            (async () => {
                for (const id of ids) {
                    await exportTelcoBillSummaryPDF(id);
                }
            })();
        }
    }, [ids]);

    return (
        <div className="p-4">
            <h2 className="text-lg font-bold">Exporting {ids.length} Telco Bill(s)...</h2>
            <div>Please check your downloads.</div>
        </div>
    );
};

export default ReportTelcoBillPage;
