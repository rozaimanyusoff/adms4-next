export interface ApiPurchase {
  id: number;
  request_id?: number;
  asset_registry?: string;
  request?: {
    id: number;
    pr_no?: string;
    pr_date?: string;
    request_type?: string;
    requested_by?: { ramco_id: string; full_name: string } | null;
    costcenter?: { id: number; name: string } | null;
    department?: any;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
  requestor?: { ramco_id: string; full_name: string } | string;
  costcenter?: { id: number; name: string } | string;
  type?: { id: number; name: string } | string;
  category?: { id: number; name: string } | string | null;
  description?: string;
  items?: string;
  purpose?: string | null;
  supplier?: { id: number; name: string } | string;
  brand?: { id: number; name: string } | string;
  qty: number;
  unit_price: string;
  total_price?: string;
  pr_date?: string;
  pr_no?: string;
  po_date?: string;
  po_no?: string;
  do_date?: string;
  do_no?: string;
  inv_date?: string;
  inv_no?: string;
  grn_date?: string;
  grn_no?: string;
  deliveries?: Array<{
    do_date?: string;
    do_no?: string;
    inv_date?: string;
    inv_no?: string;
    grn_date?: string;
    grn_no?: string;
    id?: number;
    purchase_id?: number;
    request_id?: number;
    upload_path?: string | null;
    upload_url?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  }>;
  handover_to?: string | null;
  handover_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  upload_path?: string | null;
  upload_url?: string | null;
  status?: string;
}

export interface PurchaseFormDelivery {
  do_date: string;
  do_no: string;
  inv_date: string;
  inv_no: string;
  grn_date: string;
  grn_no: string;
  upload_url?: string | null;
  id?: number;
}

export interface PurchaseFormData {
  request_type: string;
  costcenter: string;
  pic: string;
  type_id: string;
  category_id?: string;
  items: string;
  purpose?: string;
  supplier_id: string;
  brand_id: string;
  qty: number;
  unit_price: number;
  pr_date: string;
  pr_no: string;
  po_date: string;
  po_no: string;
  do_date: string;
  do_no: string;
  inv_date: string;
  inv_no: string;
  grn_date: string;
  grn_no: string;
  deliveries: PurchaseFormDelivery[];
}
