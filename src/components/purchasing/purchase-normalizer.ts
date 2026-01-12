"use client";

import { ApiPurchase, FlatPurchase } from "./types";

export const deriveAssetStatus = (p: ApiPurchase): "undelivered" | "unregistered" | "registered" => {
  const assetRegistry = String((p as any).asset_registry || "").toLowerCase();
  const deliveries = Array.isArray(p.deliveries) ? p.deliveries : [];
  const hasDeliveries = deliveries.length > 0;
  const hasDeliveryProof = hasDeliveries && deliveries.some((d: any) => Boolean((d as any)?.upload_path));

  if (assetRegistry === "completed") return "registered";
  // Deliveries exist but no supporting files means treat as undelivered
  if (hasDeliveries && !hasDeliveryProof) return "undelivered";
  if (hasDeliveries) return "unregistered";
  return "undelivered";
};

const parseYear = (val?: string | null) => {
  if (!val) return undefined;
  const parsed = new Date(val);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.getFullYear();
};

export const flattenPurchase = (p: ApiPurchase): FlatPurchase => {
  const requester = p.request?.requested_by;
  const requesterFromReq = requester
    ? `${requester.ramco_id || ""}${requester.ramco_id ? " - " : ""}${requester.full_name || ""}`.trim()
    : "";
  const requesterLoose = typeof p.requestor === "string" ? p.requestor : (p.requestor?.full_name || "");
  const prDate = p.request?.pr_date || p.pr_date || "";
  const prNo = p.request?.pr_no || p.pr_no || "";
  const requestType = p.request?.request_type || (p as any).request_type || "";
  const typeName = typeof p.type === "string" ? p.type : (p.type?.name || "");
  const categoryName = typeof p.category === "string" ? p.category : (p.category?.name || "");
  const costcenterName = p.request?.costcenter?.name || (typeof p.costcenter === "string" ? p.costcenter : (p.costcenter as any)?.name || "");
  const supplierName = p.supplier_name || (typeof p.supplier === "string" ? p.supplier : (p.supplier?.name || ""));
  const brandName = typeof p.brand === "string" ? p.brand : (p.brand?.name || "");
  const deliveries = Array.isArray(p.deliveries) ? p.deliveries : [];
  const lastDelivery = deliveries.length > 0 ? deliveries[deliveries.length - 1] : undefined;

  const doDate = p.do_date || lastDelivery?.do_date || "";
  const invDate = p.inv_date || lastDelivery?.inv_date || "";
  const grnDate = p.grn_date || lastDelivery?.grn_date || "";

  const purchaseYear =
    parseYear(p.po_date || "") ||
    parseYear(prDate) ||
    parseYear(doDate) ||
    parseYear(invDate) ||
    parseYear(grnDate);

  const status = deriveAssetStatus(p);
  const unitPrice = Number(p.unit_price) || 0;
  const totalAmount = (() => {
    const total = Number(p.total_price);
    if (!Number.isNaN(total)) return total;
    return unitPrice * (p.qty || 0);
  })();

  return {
    ...p,
    pr_date: prDate,
    pr_no: prNo,
    po_date: p.po_date || "",
    po_no: p.po_no || "",
    do_date: doDate,
    do_no: p.do_no || lastDelivery?.do_no || "",
    inv_date: invDate,
    inv_no: p.inv_no || lastDelivery?.inv_no || "",
    grn_date: grnDate,
    grn_no: p.grn_no || lastDelivery?.grn_no || "",
    request_type: requestType,
    type_name: typeName,
    category_name: categoryName,
    costcenter_name: costcenterName,
    supplier_name: supplierName,
    brand_name: brandName,
    pic: requesterFromReq || requesterLoose || "",
    status,
    total_amount: totalAmount,
    purchase_year: purchaseYear
  };
};
