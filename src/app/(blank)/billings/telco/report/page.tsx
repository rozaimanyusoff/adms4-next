"use client";
import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { exportTelcoBillSummaryPDFs } from "@/components/billings/report-telco-bill";

const TelcoBillBatchExportPage = () => {
  const searchParams = useSearchParams();
  const ids =
    searchParams?.get("ids")?.split(",").map(Number).filter(Boolean) || [];

  useEffect(() => {
    if (ids.length > 0) {
      exportTelcoBillSummaryPDFs(ids);
    }
  }, [ids]);

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold">Exporting {ids.length} Telco Bill(s)...</h2>
      <div>Please check your downloads.</div>
    </div>
  );
};

export default TelcoBillBatchExportPage;
