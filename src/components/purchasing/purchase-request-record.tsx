'use client';

import React, { useEffect, useState, useMemo, useContext } from 'react';
import { AuthContext } from '@/store/AuthContext';
import { authenticatedApi } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import ActionSidebar from '@/components/ui/action-aside';
import { Textarea } from '@/components/ui/textarea';

interface RequestPerson {
   ramco_id?: string;
   full_name?: string;
}

interface RequestCostcenter {
   id?: number;
   name?: string;
}

interface RequestItem {
   id: number;
   type?: { id?: number; name?: string } | null;
   category?: any;
   brand?: { id?: number; name?: string } | null;
   qty?: number;
   description?: string | null;
   purpose?: string | null;
   supplier?: { id?: number; name?: string } | null;
   unit_price?: string | number | null;
   total_price?: string | number | null;
   po_no?: string | null;
   po_date?: string | null;
   handover_to?: string | null;
   handover_at?: string | null;
   asset_manager_remarks?: string | null;
}

interface PurchaseRequest {
   id: number;
   request_type?: string;
   pr_no?: string;
   pr_date?: string | null;
   requested_by?: RequestPerson | null;
   costcenter?: RequestCostcenter | null;
   department?: any;
   created_at?: string | null;
   updated_at?: string | null;
   items?: RequestItem[];
   hod_approval_date?: string | null;
   asset_manager_remarks_date?: string | null;
   asset_manager_hod_approval_date?: string | null;
   division_head_approval_date?: string | null;
   cpd_approval_date?: string | null;
}

interface Props {
   /** Prefer passing an id to fetch a single purchase request */
   id?: number | string;
   /** Alternatively pass prNo to look up by PR number */
   prNo?: string;
   /** If data is already available, pass it to avoid fetch */
   data?: PurchaseRequest | null;
   className?: string;
}

const fmtDate = (s?: string | null) => (s ? String(s).split('T')[0] : '');
const fmtRM = (v?: string | number | null) => {
   const num = Number(v || 0);
   return `RM ${Number.isFinite(num) ? num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`;
};

// Map known item types to badge classes
const getItemTypeBadgeClass = (typeName?: string) => {
   if (!typeName) return 'bg-gray-200 text-gray-800 text-xs';
   const t = String(typeName).trim().toLowerCase();
   switch (t) {
      case 'computer':
         return 'bg-blue-600 text-white text-xs';
      case 'motor vehicle':
      case 'motor vehicles':
         return 'bg-sky-600 text-white text-xs';
      case 'technical equipment':
         return 'bg-green-600 text-white text-xs';
      case 'furniture fitting':
         return 'bg-amber-500 text-white text-xs';
      case 'aircond':
      case 'air cond':
      case 'air-condition':
         return 'bg-indigo-600 text-white text-xs';
      case 'office equipment':
         return 'bg-emerald-500 text-white text-xs';
      case 'machinery':
         return 'bg-rose-600 text-white text-xs';
      default:
         return 'bg-gray-300 text-gray-900 text-xs';
   }
};

// Lighter background class for cards per item type
const getItemTypeCardClass = (typeName?: string) => {
   if (!typeName) return 'bg-white';
   const t = String(typeName).trim().toLowerCase();
   switch (t) {
      case 'computer':
         return 'bg-blue-50';
      case 'motor vehicle':
      case 'motor vehicles':
         return 'bg-gray-50';
      case 'technical equipment':
         return 'bg-green-50';
      case 'furniture fitting':
         return 'bg-rose-50';
      case 'aircond':
      case 'air cond':
      case 'air-condition':
         return 'bg-sky-50';
      case 'office equipment':
         return 'bg-emerald-50';
      case 'machinery':
         return 'bg-rose-50';
      default:
         return 'bg-white';
   }
};

const PurchaseRequestRecord: React.FC<Props> = ({ id, prNo, data, className }) => {
   // List of requests for the grid
   const [requests, setRequests] = useState<PurchaseRequest[]>([]);
   const [gridLoading, setGridLoading] = useState<boolean>(false);

   // Selected / detailed request
   const [request, setRequest] = useState<PurchaseRequest | null>(data || null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   // Active filters set by clicking cards / chips
   const [selectedType, setSelectedType] = useState<string | null>(null);
   const [selectedYear, setSelectedYear] = useState<string | null>(null);
   const [sidebarOpen, setSidebarOpen] = useState(false);
   const auth = useContext(AuthContext);
   const username = auth?.authData?.user?.username;
   const [managerTypeIds, setManagerTypeIds] = useState<number[]>([]);

   // Fetch asset manager assignments for this user when sidebar opens
   useEffect(() => {
      if (!sidebarOpen || !username) return;
      (async () => {
         try {
            const res: any = await authenticatedApi.get(`/api/assets/managers?ramco=${encodeURIComponent(username)}`);
            // Assume response is array of { manager_id: number, ... }
            const managers = res?.data?.data || res?.data || [];
            const ids = Array.isArray(managers) ? managers.map((m: any) => Number(m.manager_id)).filter(Boolean) : [];
            setManagerTypeIds(ids);
         } catch (err) {
            setManagerTypeIds([]);
         }
      })();
   }, [sidebarOpen, username]);

   // Load list of purchase requests for the grid
   const loadRequests = async () => {
      setGridLoading(true);
      try {
         const res: any = await authenticatedApi.get('/api/purchases/requests');
         const list = res?.data?.data || res?.data || [];
         setRequests(Array.isArray(list) ? list : []);
      } catch (err) {
          
         console.error('Failed to load purchase requests list', err);
         setRequests([]);
      } finally {
         setGridLoading(false);
      }
   };

   useEffect(() => {
      loadRequests();
      // If id or prNo provided, preload that detail
      if (id || prNo) {
         // existing logic: fetch single by id or pr_no
         (async () => {
            setLoading(true);
            setError(null);
            try {
               let res: any;
               if (id) {
                  res = await authenticatedApi.get(`/api/purchases/requests/${id}`);
                  const d = res?.data?.data || res?.data;
                  setRequest(d || null);
               } else {
                  res = await authenticatedApi.get(`/api/purchases/requests?pr_no=${encodeURIComponent(String(prNo))}`);
                  const list = res?.data?.data || res?.data || [];
                  setRequest(Array.isArray(list) ? (list[0] || null) : list);
               }
            } catch (err) {
                
               console.error('Failed to load purchase request', err);
               setError('Failed to load purchase request');
            } finally {
               setLoading(false);
            }
         })();
      }
       
   }, []);

   const loadRequestById = async (requestId?: number | string) => {
      if (!requestId) return;
      setLoading(true);
      setError(null);
      try {
         const res: any = await authenticatedApi.get(`/api/purchases/requests/${requestId}`);
         const d = res?.data?.data || res?.data;
         setRequest(d || null);
      } catch (err) {
          
         console.error('Failed to load purchase request by id', err);
         setError('Failed to load purchase request');
      } finally {
         setLoading(false);
      }
   };

   // Grid columns for purchase requests
   const requestCols: ColumnDef<PurchaseRequest>[] = [
      { key: 'id', header: 'ID' },
      { key: 'pr_no', header: 'PR No', filter: 'input', render: (r) => r.pr_no || String(r.id) },
      { key: 'request_type', header: 'Type', filter: 'singleSelect', render: (r) => r.request_type || '' },
      { key: 'pr_date', header: 'PR Date', render: (r) => fmtDate(r.pr_date) },
      { key: 'requested_by', header: 'Requested By', filter: 'input', render: (r) => (r.requested_by?.full_name || '') as any },
      { key: 'costcenter', header: 'Cost Center', filter: 'singleSelect', render: (r) => (r.costcenter?.name || '') as any },
      {
         key: 'items',
         header: 'Items',
         render: (r) => {
            const items: RequestItem[] = r.items || [];
            const counts: Record<string, number> = {};
            items.forEach((it) => {
               const name = (it.type?.name || 'Unknown').trim();
               const qty = Number(it.qty ?? 1) || 1;
               counts[name] = (counts[name] || 0) + qty;
            });
            const entries = Object.entries(counts);
            return (
               <div className="flex flex-wrap gap-1">
                  {entries.map(([name, cnt]) => (
                     <span key={name} className={`${getItemTypeBadgeClass(name)} inline-flex items-center px-2 py-0.5 rounded-full text-[length:var(--text-size-small)]`}>
                        {`${cnt} x ${name}`}
                     </span>
                  ))}
               </div>
            );
         }
      },
      {
         key: 'status' as any,
         header: 'Status',
         filter: 'singleSelect',
         render: (r) => {
            const items: RequestItem[] = r.items || [];
            const purchased = items.some(
               (it) => it.po_no && it.po_date && it.unit_price != null && it.unit_price !== ''
            );
            return purchased ? 'Purchased' : 'Pending Approval';
         }
      },
   ];

   // Apply client-side filters based on selectedType and selectedYear
   const filteredRequests = useMemo(() => {
      if (!selectedType && !selectedYear) return requests;
      const normalize = (name?: string) => {
         if (!name) return 'Unknown';
         const t = String(name).trim().toLowerCase();
         if (t.includes('computer') || t.includes('laptop') || t.includes('pc')) return 'Computer';
         if (t.includes('motor')) return 'Motor Vehicle';
         if (t.includes('technical')) return 'Technical Equipment';
         if (t.includes('furniture')) return 'Furniture Fitting';
         if (t.includes('air')) return 'Aircond';
         if (t.includes('office')) return 'Office Equipment';
         if (t.includes('machinery')) return 'Machinery';
         return String(name).trim();
      };

      return requests.filter((req) => {
         // check type
         const items = req.items || [];
         const byType = selectedType
            ? items.some((it) => normalize(it.type?.name) === selectedType)
            : true;
         // check year
         const dateStr = req.pr_date || req.created_at || '';
         const year = dateStr ? String(new Date(dateStr).getFullYear()) : 'Unknown';
         const byYear = selectedYear ? String(year) === String(selectedYear) : true;
         return byType && byYear;
      });
   }, [requests, selectedType, selectedYear]);

   const handleRowDoubleClick = (row: PurchaseRequest) => {
      loadRequestById(row.id);
      setSidebarOpen(true);
   };

   return (
      <div className={className}>
         <h2 className="text-lg font-bold my-6">Purchase Requests</h2>

         {/* Item-type summary cards (one card per item type). Each card shows per-year counts with current year first. */}
         {requests && requests.length > 0 && (
            <div className="mb-4 overflow-x-auto">
               <div className="flex gap-3">
                  {(() => {
                     // normalize type names to canonical keys
                     const normalize = (name?: string) => {
                        if (!name) return 'Unknown';
                        const t = String(name).trim().toLowerCase();
                        if (t.includes('computer') || t.includes('laptop') || t.includes('pc')) return 'Computer';
                        if (t.includes('motor')) return 'Motor Vehicle';
                        if (t.includes('technical')) return 'Technical Equipment';
                        if (t.includes('furniture')) return 'Furniture Fitting';
                        if (t.includes('air')) return 'Aircond';
                        if (t.includes('office')) return 'Office Equipment';
                        if (t.includes('machinery')) return 'Machinery';
                        return String(name).trim();
                     };

                     // build map: type -> year -> count
                     const typeYear: Record<string, Record<string, number>> = {};
                     const yearsSet = new Set<string>();
                     requests.forEach((req) => {
                        const dateStr = req.pr_date || req.created_at || '';
                        const year = dateStr ? String(new Date(dateStr).getFullYear()) : 'Unknown';
                        yearsSet.add(year);
                        (req.items || []).forEach((it) => {
                           const typeKey = normalize(it.type?.name || 'Unknown');
                           const qty = Number(it.qty ?? 1) || 1;
                           typeYear[typeKey] = typeYear[typeKey] || {};
                           typeYear[typeKey][year] = (typeYear[typeKey][year] || 0) + qty;
                        });
                     });

                     // order types by provided list, then any extras
                     const typeOrder = [
                        'Computer',
                        'Motor Vehicle',
                        'Technical Equipment',
                        'Furniture Fitting',
                        'Aircond',
                        'Office Equipment',
                        'Machinery'
                     ];
                     const extraTypes = Object.keys(typeYear).filter(t => !typeOrder.includes(t)).sort();
                     const allTypes = [...typeOrder.filter(t => Boolean(typeYear[t])), ...extraTypes];

                     // build sorted years with current year first
                     const currentYear = String(new Date().getFullYear());
                     const years = Array.from(yearsSet).filter(y => y !== 'Unknown').sort((a, b) => Number(b) - Number(a));
                     if (!years.includes(currentYear)) years.unshift(currentYear);
                     const includeUnknown = yearsSet.has('Unknown');

                     return allTypes.map((typeKey) => {
                        const map = typeYear[typeKey] || {};
                        const total = Object.values(map).reduce((s, n) => s + (n || 0), 0);
                        const displayedYears = [...years];
                        if (includeUnknown) displayedYears.push('Unknown');
                        return (
                           <div key={typeKey} className="min-w-[240px]">
                              <Card
                                 className={`${getItemTypeBadgeClass(typeKey).replace('text-', 'text-')} ${selectedType === typeKey ? 'ring-2 ring-offset-1 ring-indigo-300' : ''} overflow-hidden`}
                                 onClick={() => setSelectedType(selectedType === typeKey ? null : typeKey)}
                              >
                                 <CardHeader>
                                    <div className="flex items-center justify-between">
                                       <div>
                                          <div className="font-semibold flex items-center gap-2 text-white">
                                             <span className="text-sm">{typeKey}</span>
                                          </div>
                                          <div className="text-xs text-white/80">{total} items</div>
                                       </div>
                                    </div>
                                 </CardHeader>
                                 <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                       {displayedYears.map((yr) => (
                                          <button
                                             key={yr}
                                             type="button"
                                             onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedYear(selectedYear === yr ? null : yr);
                                             }}
                                             className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${selectedYear === yr ? 'bg-white/90 text-black' : 'bg-white/30 text-white'}`}>
                                             {yr}: {map[yr] || 0}
                                          </button>
                                       ))}
                                    </div>
                                 </CardContent>
                              </Card>
                           </div>
                        );
                     });
                  })()}
               </div>
            </div>
         )}

         {/* Grid of requests */}
         {/* No filter chips or clear button shown when filtered */}
         <div className="mb-2" />
         <CustomDataGrid
            data={filteredRequests}
            columns={requestCols}
            pageSize={10}
            pagination={false}
            inputFilter={false}
            onRowDoubleClick={handleRowDoubleClick}
         />
         <ActionSidebar
            title={request ? `Request #${request.pr_no || request.id}` : 'Request Details'}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            content={request ? (
               <div className="px-3">
                  <div className="mb-2">
                     <div><b>PR No:</b> {request.pr_no}</div>
                     <div><b>Type:</b> {request.request_type}</div>
                     <div><b>Date:</b> {fmtDate(request.pr_date)}</div>
                     <div><b>Requested By:</b> {request.requested_by?.full_name}</div>
                     <div><b>Cost Center:</b> {request.costcenter?.name}</div>
                  </div>
                  <Separator className="my-2" />
                  <div>
                     <b>Requested Items:</b>
                     <div className="mt-2 space-y-4">
                        {(request.items || []).map((item, idx) => {
                           const canEditRemarks = item.type?.id && managerTypeIds.includes(Number(item.type.id));
                           return (
                              <Card key={item.id || idx} className="border border-gray-200 shadow-sm">
                                 <CardContent className="py-4">
                                    <div className="mb-2 flex flex-wrap gap-4 items-center">
                                       <div className="font-bold text-blue-700">Item {idx + 1}</div>
                                       <div><b>Type:</b> {item.type?.name || '-'}</div>
                                       <div><b>Category:</b> {item.category?.name || '-'}</div>
                                       <div><b>Description:</b> {item.description || '-'}</div>
                                       <div><b>Quantity:</b> {item.qty ?? '-'}</div>
                                       <div><b>Purpose:</b> {item.purpose || '-'}</div>
                                    </div>
                                    <div className="mt-2">
                                       <label className="block text-xs font-semibold mb-1">Asset Manager Remarks</label>
                                       <Textarea
                                          className="w-full bg-gray-50 resize-none"
                                          rows={2}
                                          placeholder="No remarks"
                                          readOnly={!canEditRemarks}
                                          value={item.asset_manager_remarks || ''}
                                       />
                                    </div>
                                 </CardContent>
                              </Card>
                           );
                        })}
                     </div>
                  </div>
                  {/* Progress Timeline visualization for approvals/remarks */}
                  <Separator className="my-4" />
                  <div>
                     <b>Progress Timeline:</b>
                     <ol className="relative border-l border-gray-300 mt-4 ml-4">
                        {/* 1. Application submission */}
                        <li className="mb-8 ml-6">
                           <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${request.pr_date ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'}`}>1</span>
                           <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold">Application submission</div>
                              <div className="text-xs text-black min-w-[80px] text-right">{request.pr_date ? fmtDate(request.pr_date) : '-'}</div>
                           </div>
                        </li>
                        {/* 2. Requestor&apos;s HOD approval */}
                        <li className="mb-8 ml-6">
                           <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${request.hod_approval_date ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'}`}>2</span>
                           <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold">Requestor&apos;s HOD approval</div>
                              <div className="text-xs text-black min-w-[80px] text-right">{request.hod_approval_date ? fmtDate(request.hod_approval_date) : '-'}</div>
                           </div>
                        </li>
                        {/* 3. Asset Manager remarks */}
                        <li className="mb-8 ml-6">
                           <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${request.asset_manager_remarks_date ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'}`}>3</span>
                           <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold">Asset Manager remarks</div>
                              <div className="text-xs text-black min-w-[80px] text-right">{request.asset_manager_remarks_date ? fmtDate(request.asset_manager_remarks_date) : '-'}</div>
                           </div>
                        </li>
                        {/* 4. Asset manager&apos;s HOD approval */}
                        <li className="mb-8 ml-6">
                           <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${request.asset_manager_hod_approval_date ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'}`}>4</span>
                           <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold">Asset manager&apos;s HOD approval</div>
                              <div className="text-xs text-black min-w-[80px] text-right">{request.asset_manager_hod_approval_date ? fmtDate(request.asset_manager_hod_approval_date) : '-'}</div>
                           </div>
                        </li>
                        {/* 5. Division Head Approval */}
                        <li className="mb-8 ml-6">
                           <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${request.division_head_approval_date ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'}`}>5</span>
                           <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold">Division Head Approval</div>
                              <div className="text-xs text-black min-w-[80px] text-right">{request.division_head_approval_date ? fmtDate(request.division_head_approval_date) : '-'}</div>
                           </div>
                        </li>
                        {/* 6. CPD approval */}
                        <li className="ml-6">
                           <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${request.cpd_approval_date ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'}`}>6</span>
                           <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold">CPD approval</div>
                              <div className="text-xs text-black min-w-[80px] text-right">{request.cpd_approval_date ? fmtDate(request.cpd_approval_date) : '-'}</div>
                           </div>
                        </li>
                     </ol>
                  </div>
               </div>
            ) : null}
         />
      </div>
   );
};

export default PurchaseRequestRecord;
