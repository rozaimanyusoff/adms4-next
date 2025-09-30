"use client";

import React, { useEffect, useMemo, useState } from "react";
import { authenticatedApi } from "@/config/api";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type Location = { id?: number; code?: string | null; name?: string | null } | null;
type Owner = { ramco_id?: string | null; full_name?: string | null } | null;
type Asset = {
  id?: number;
  register_number?: string | null;
  make?: string | null;
  model?: string | null;
  location?: Location;
  owner?: Owner;
} | null;

type AssessmentDetail = {
  adt_id: number;
  assess_id: number;
  adt_item: string | number;
  adt_ncr: number;
  adt_rate: string | number;
  adt_rate2: number;
  adt_rem: string | null;
  adt_image: string | null;
  qset_desc?: string | null;
  qset_type?: string | null; // 'NCR' | 'Rating' | 'Selection'
};

type Assessment = {
  assess_id: number;
  a_date: string | null;
  a_dt?: string | null;
  a_ncr?: number | null;
  a_rate?: string | number | null;
  asset?: Asset;
  assessment_location?: Location;
  details?: AssessmentDetail[];
};

const formatDMY = (v?: string | Date | null) => {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  if (!d || Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const parseRate = (v: Assessment["a_rate"]): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const toNcrLabel = (qType?: string | null, n?: number): string => {
  if ((qType || "").toUpperCase() !== "NCR") return "";
  if (n === 1) return "Comply";
  if (n === 2) return "Not-comply";
  return "";
};

const BlankRows: React.FC<{ count?: number }> = ({ count = 20 }) => {
  const rows = Array.from({ length: count });
  return (
    <tbody>
      {rows.map((_, i) => (
        <tr key={i}>
          <td>{i + 1}</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      ))}
    </tbody>
  );
};

const Page: React.FC = () => {
  const sp = useSearchParams();
  const id = sp?.get("id"); // assess_id (optional)

  const [data, setData] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await authenticatedApi.get(`/api/compliance/assessments/${id}`);
        const payload = (res as any)?.data?.data || (res as any)?.data || null;
        setData(payload);
      } catch (e) {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  const details: AssessmentDetail[] = useMemo(() => {
    return Array.isArray(data?.details) ? (data!.details as AssessmentDetail[]) : [];
  }, [data]);

  const header = (
    <div className="print:mt-0 mt-4">
      <div style={{ background: "#2d2d2d", color: "#fff", padding: "6px 10px", fontWeight: 600 }}>VEHICLE ASSESSMENT FORM</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #cbd5e1", padding: 6, width: "25%" }}>Assessment Date:</td>
            <td style={{ border: "1px solid #cbd5e1", padding: 6, width: "25%" }}>{formatDMY(data?.a_date || data?.a_dt) }</td>
            <td style={{ border: "1px solid #cbd5e1", padding: 6, width: "25%" }}>Vehicle Make/Model:</td>
            <td style={{ border: "1px solid #cbd5e1", padding: 6, width: "25%" }}>{[data?.asset?.make, data?.asset?.model].filter(Boolean).join(" ") || ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #cbd5e1", padding: 6 }}>Assessed Location:</td>
            <td style={{ border: "1px solid #cbd5e1", padding: 6 }}>{data?.assessment_location?.code || data?.asset?.location?.code || ""}</td>
            <td style={{ border: "1px solid #cbd5e1", padding: 6 }}>Driver's Employee ID:</td>
            <td style={{ border: "1px solid #cbd5e1", padding: 6 }}>{data?.asset?.owner?.ramco_id || ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #cbd5e1", padding: 6 }}>Vehicle Registration No:</td>
            <td style={{ border: "1px solid #cbd5e1", padding: 6 }}>{data?.asset?.register_number || ""}</td>
            <td style={{ border: "1px solid #cbd5e1", padding: 6 }} colSpan={2}>
              Skala: 1-Tidak Memuaskan / Tidak Berfungsi 2-Memuaskan 3-Baik 4-Cemerlang / Berfungsi Dengan Baik
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="no-print flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => window.history.back()}>Back</Button>
        <Button size="sm" onClick={() => window.print()}>Print / Save PDF</Button>
      </div>

      {header}

      <div className="mt-4">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={{ border: "1px solid #cbd5e1", padding: 6, width: 60, textAlign: "left" }}>Item</th>
              <th style={{ border: "1px solid #cbd5e1", padding: 6, textAlign: "left" }}>Description</th>
              <th style={{ border: "1px solid #cbd5e1", padding: 6, width: 120, textAlign: "left" }}>NCR</th>
              <th style={{ border: "1px solid #cbd5e1", padding: 6, width: 80, textAlign: "left" }}>Rate</th>
              <th style={{ border: "1px solid #cbd5e1", padding: 6, width: 110, textAlign: "left" }}>Type</th>
            </tr>
          </thead>
          {id && !loading && details.length ? (
            <tbody>
              {details.map((d) => (
                <tr key={d.adt_id}>
                  <td style={{ border: "1px solid #cbd5e1", padding: 6 }}>{d.adt_item}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: 6 }}>{d.qset_desc || ""}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: 6 }}>{toNcrLabel(d.qset_type, d.adt_ncr)}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: 6 }}>{typeof d.adt_rate === 'number' ? d.adt_rate.toFixed(2) : String(d.adt_rate)}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: 6 }}>{(d.qset_type || "").toUpperCase()}</td>
                </tr>
              ))}
            </tbody>
          ) : (
            <BlankRows count={22} />
          )}
        </table>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4 portrait; margin: 12mm; }
        }
      `}</style>
    </div>
  );
};

export default Page;

