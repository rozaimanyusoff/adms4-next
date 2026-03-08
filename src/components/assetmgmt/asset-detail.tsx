'use client';
import React, { useEffect, useMemo, useState } from "react";
import { AuthContext } from "@store/AuthContext";
import { authenticatedApi } from "@/config/api";
import {
   ChevronLeft, ChevronRight, ChevronDown, Search, X, Monitor, Car, Wrench, Calendar,
   MapPin, Building, Users, ShoppingCart, FileText,
   AlertTriangle, CheckCircle, Activity,
   Package, ClipboardCheck, UserCheck, Pencil, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const formatTimestamp = () => {
   const d = new Date();
   const pad = (n: number) => n.toString().padStart(2, '0');
   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Type-specific sub-components
import VehicleSpecs from "./type-specs/vehicle-specs";
import EquipmentSpecs from "./type-specs/equipment-specs";
import MachinerySpecs from "./type-specs/machinery-specs";
import OfficeEquipmentSpecs from "./type-specs/office-equipment-specs";
import AssetDetailSpecComputer from "./asset-detail-spec-computer";
import AssetDetailSpecVehicle from "./asset-detail-spec-vehicle";
import AssetDetailPurchasing from "./asset-detail-purchasing";
import AssetDetailOwnership from "./asset-detail-ownership";
import AssetDetailMaintenance from "./asset-detail-maintenance";
import AssetDetailAssessment from "./asset-detail-assessment";
import AssetDetailDisposal from "./asset-detail-disposal";

interface AssetDetailProps {
   id: string;
}

const AssetDetail: React.FC<AssetDetailProps> = ({ id }) => {
   const router = useRouter();
   const [asset, setAsset] = useState<any>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [items, setItems] = useState<any[]>([]);
   const [currentIdx, setCurrentIdx] = useState<number>(-1);
   const [searchValue, setSearchValue] = useState("");
   const [searchResults, setSearchResults] = useState<any[]>([]);
   const [showDropdown, setShowDropdown] = useState(false);
   const [activeTab, setActiveTab] = useState("purchasing");

   // Lifecycle data
   const [purchaseData, setPurchaseData] = useState<any>(null);
   const [ownerHistory, setOwnerHistory] = useState<any[]>([]);
   const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
   const [assessmentRecords, setAssessmentRecords] = useState<any[]>([]);
   // Fetch all asset ids for navigation
   useEffect(() => {
      const fetchItems = async () => {
         try {
            const res = await authenticatedApi.get("/api/assets") as any;
            const arr = res.data?.data || [];
            setItems(arr);
            const idx = arr.findIndex((i: any) => String(i.id) === String(id));
            setCurrentIdx(idx);
         } catch (e) { }
      };
      fetchItems();
   }, [id]);

   // Fetch main asset data and lifecycle information
   useEffect(() => {
      const fetchAssetData = async () => {
         setLoading(true);
         setError(null);
         try {
            // Main asset data
            const assetRes = await authenticatedApi.get(`/api/assets/${id}`) as any;
            const assetData = assetRes.data?.data || null;
            setAsset(assetData);
            if (assetData?.purchase_details) {
               setPurchaseData(assetData.purchase_details);
            }

            if (assetData) {
               // Fetch lifecycle data in parallel
               await Promise.all([
                  fetchOwnerHistory(assetData),
                  fetchMaintenanceRecords(assetData),
                  fetchAssessmentRecords(assetData)
               ]);
            }
         } catch (e) {
            setError("Failed to fetch asset data.");
            setAsset(null);
         } finally {
            setLoading(false);
         }
      };
      fetchAssetData();
   }, [id]);

   // Load persisted tab on mount
   useEffect(() => {
      if (typeof window !== "undefined") {
         const stored = localStorage.getItem("asset-detail-tab");
         if (stored) setActiveTab(stored);
      }
   }, []);

   const fetchOwnerHistory = async (asset: any) => {
      try {
         // Owner history is already in asset.owner array
         setOwnerHistory(asset.owner || []);
      } catch (e) {
         console.error("Failed to fetch owner history:", e);
      }
   };

   const fetchMaintenanceRecords = async (asset: any) => {
      try {
         const res = await authenticatedApi.get(`/api/bills/mtn/vehicle/${asset.id}`).catch(() => ({ data: { data: [] } }));
         if (res && res.data?.data) {
            const records = Array.isArray(res.data.data) ? res.data.data : (res.data.data as any).records || [];
            setMaintenanceRecords(records);
         }
      } catch (e) {
         console.error("Failed to fetch maintenance records:", e);
      }
   };

   const fetchAssessmentRecords = async (asset: any) => {
      try {
         const res = await authenticatedApi.get(`/api/compliance/assessments?asset_id=${asset.id}`).catch(() => ({ data: { data: [] } }));
         if (res && res.data?.data) {
            setAssessmentRecords(res.data.data || []);
         }
      } catch (e) {
         console.error("Failed to fetch assessment records:", e);
      }
   };

   // Autocomplete search
   useEffect(() => {
      let cancelled = false;
      if (searchValue.length < 2) {
         setSearchResults([]);
         setShowDropdown(false);
         return;
      }

      const fetchSearch = async () => {
         try {
            const res = await authenticatedApi.get('/api/assets', { params: { q: searchValue } }) as any;
            const data = res.data?.data || res.data || [];
            if (!cancelled) {
               setSearchResults(data);
               setShowDropdown(Array.isArray(data) && data.length > 0);
            }
         } catch (e) {
            if (!cancelled) {
               setSearchResults([]);
               setShowDropdown(false);
            }
         }
      };

      fetchSearch();
      return () => {
         cancelled = true;
      };
   }, [searchValue]);

   // Helper functions
   const getAssetTypeId = () => {
      const rawTypeId = asset?.type?.id ?? asset?.types?.id ?? asset?.type_id ?? asset?.typeId;
      return rawTypeId !== undefined && rawTypeId !== null ? Number(rawTypeId) : undefined;
   };

   const getAssetType = () => {
      const typeId = getAssetTypeId();
      if (typeId === 1) return 'computer';
      if (typeId === 2) return 'vehicle';

      const typeName = (asset?.type?.name ?? asset?.types?.name ?? '').toLowerCase();
      if (typeName.includes('computer') || typeName.includes('laptop')) return 'computer';
      if (typeName.includes('motor') || typeName.includes('vehicle')) return 'vehicle';
      if (typeName.includes('equipment') || typeName.includes('instrument')) return 'equipment';
      if (typeName.includes('machinery')) return 'machinery';
      if (typeName.includes('office')) return 'office-equipment';
      return 'general';
   };

   const getAssetIcon = () => {
      const type = getAssetType();
      switch (type) {
         case 'vehicle': return <Car className="w-12 h-12 text-blue-500" />;
         case 'computer': return <Monitor className="w-12 h-12 text-purple-500" />;
         default: return <Package className="w-12 h-12 text-gray-500" />;
      }
   };

   const renderTypeSpecificSpecs = () => {
      const type = getAssetType();
      const props = { asset, onUpdate: () => fetchAssetData() };

      switch (type) {
         case 'vehicle':
            return <VehicleSpecs {...props} />;
         case 'equipment':
            return <EquipmentSpecs {...props} />;
         case 'machinery':
            return <MachinerySpecs {...props} />;
         case 'office-equipment':
            return <OfficeEquipmentSpecs {...props} />;
         default:
            return <div className="text-center py-8 text-gray-500">No specific specifications available for this asset type.</div>;
      }
   };

   const renderSpecsTab = () => {
      const typeId = getAssetTypeId();
      if (typeId === 1) {
         return <AssetDetailSpecComputer asset={asset} onUpdate={() => fetchAssetData()} />;
      }
      if (typeId === 2) {
         return <AssetDetailSpecVehicle asset={asset} onUpdate={() => fetchAssetData()} />;
      }
      return <SpecsSection asset={asset} renderTypeSpecificSpecs={renderTypeSpecificSpecs} />;
   };

   const formatCurrency = (amount?: number | null) => {
      if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return '-';
      return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(Number(amount));
   };

   const formatDate = (dateString?: string | null) => {
      if (!dateString) return '-';
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('en-MY');
   };

   const currentOwner = asset?.owner && asset.owner.length > 0 ? asset.owner[asset.owner.length - 1] : null;

   if (loading) return (
      <div className="w-full min-h-screen bg-background">
         <NavigationBar
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            searchResults={searchResults}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            currentIdx={currentIdx}
            items={items}
            setCurrentIdx={setCurrentIdx}
            router={router}
            assetIcon={<Monitor className="w-5 h-5 text-white" />}
            asset={null}
         />
         <div className="flex justify-center items-center py-20">
            <div className="text-center">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
               <p className="text-muted-foreground">Loading asset details...</p>
            </div>
         </div>
      </div>
   );

   if (!asset || error || !id || id === 'null' || id === 'undefined') return (
      <div className="w-full min-h-screen bg-background">
         <NavigationBar
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            searchResults={searchResults}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            currentIdx={currentIdx}
            items={items}
            setCurrentIdx={setCurrentIdx}
            router={router}
            assetIcon={<Monitor className="w-5 h-5 text-white" />}
            asset={null}
         />
         <div className="p-4 md:p-8 text-red-500">{error || 'Invalid asset selected.'}</div>
      </div>
   );

   return (
      <div className="relative w-full min-h-screen bg-slate-100 dark:bg-slate-950">
         <div className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-100" style={{ backgroundImage: "linear-gradient(rgba(56,189,248,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.08) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
         <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_30%)]" />
         {/* Navigation Bar */}
         <NavigationBar
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            searchResults={searchResults}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            currentIdx={currentIdx}
            items={items}
            setCurrentIdx={setCurrentIdx}
            router={router}
            assetIcon={getAssetIcon()}
            asset={asset}
         />

         <div className="relative z-10 max-w-7xl mx-auto px-2 sm:px-6 py-5 space-y-5">
            {/* Asset Header Overview */}
            <AssetHeader
               asset={asset}
               currentOwner={currentOwner}
               formatDate={formatDate}
            />

            <LifecycleRibbon activeTab={activeTab} onSelectTab={setActiveTab} />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
               {/* Lifecycle Details */}
               <div className="xl:col-span-2 rounded-2xl border border-cyan-500/25 bg-white/90 dark:bg-linear-to-br dark:from-[#102a53] dark:to-[#0c2244] text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-xl dark:shadow-cyan-950/30 overflow-hidden backdrop-blur-sm">
                  <div className="p-2 sm:p-6">
                     <Tabs
                        value={activeTab}
                        onValueChange={(val) => {
                           setActiveTab(val);
                           if (typeof window !== "undefined") {
                              localStorage.setItem("asset-detail-tab", val);
                           }
                        }}
                        className="w-full"
                     >
                        <TabsContent value="purchasing" className="mt-0">
                           <AssetDetailPurchasing asset={asset} purchaseData={purchaseData} formatCurrency={formatCurrency} formatDate={formatDate} />
                        </TabsContent>

                        <TabsContent value="specs" className="mt-0">
                           {renderSpecsTab()}
                        </TabsContent>

                        <TabsContent value="ownership" className="mt-0">
                           <AssetDetailOwnership asset={asset} ownerHistory={ownerHistory} formatDate={formatDate} />
                        </TabsContent>

                        <TabsContent value="maintenance" className="mt-0">
                           <AssetDetailMaintenance maintenanceRecords={maintenanceRecords} formatCurrency={formatCurrency} formatDate={formatDate} />
                        </TabsContent>

                        <TabsContent value="assessment" className="mt-0">
                           <AssetDetailAssessment assessmentRecords={assessmentRecords} formatDate={formatDate} />
                        </TabsContent>

                        <TabsContent value="disposal" className="mt-0">
                           <AssetDetailDisposal asset={asset} />
                        </TabsContent>
                     </Tabs>
                  </div>
               </div>

               {/* Quick Actions - separate sibling card */}
               <Card className="h-fit border-cyan-500/30 bg-white/90 dark:bg-[#0e274f]/70 shadow-lg dark:shadow-cyan-950/30">
                  <CardHeader className="pb-3">
                     <CardTitle className="text-sm tracking-wide uppercase text-muted-foreground">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                     <Button variant="outline" className="w-full justify-between border-cyan-500/30 text-slate-800 dark:text-slate-100 hover:bg-cyan-500/10 h-11 bg-slate-50 dark:bg-[#0c2144]/80" onClick={() => setActiveTab('ownership')}>
                        <span className="inline-flex items-center gap-2">
                           <UserCheck className="w-4 h-4 text-cyan-500" />
                           Initiate Handover
                        </span>
                        <ChevronRight className="w-4 h-4" />
                     </Button>
                     <Button variant="outline" className="w-full justify-between border-cyan-500/30 text-slate-800 dark:text-slate-100 hover:bg-cyan-500/10 h-11 bg-slate-50 dark:bg-[#0c2144]/80" onClick={() => setActiveTab('maintenance')}>
                        <span className="inline-flex items-center gap-2">
                           <Wrench className="w-4 h-4 text-cyan-500" />
                           Log Maintenance
                        </span>
                        <ChevronRight className="w-4 h-4" />
                     </Button>
                     <Button variant="outline" className="w-full justify-between border-cyan-500/30 text-slate-800 dark:text-slate-100 hover:bg-cyan-500/10 h-11 bg-slate-50 dark:bg-[#0c2144]/80" onClick={() => setActiveTab('assessment')}>
                        <span className="inline-flex items-center gap-2">
                           <ClipboardCheck className="w-4 h-4 text-cyan-500" />
                           Start Assessment
                        </span>
                        <ChevronRight className="w-4 h-4" />
                     </Button>
                     <Button variant="destructive" className="w-full justify-between h-11" onClick={() => setActiveTab('disposal')}>
                        <span className="inline-flex items-center gap-2">
                           <AlertTriangle className="w-4 h-4" />
                           Initiate Disposal
                        </span>
                        <ChevronRight className="w-4 h-4" />
                     </Button>
                  </CardContent>
               </Card>
            </div>
         </div>
      </div>
   );

   function fetchAssetData() {
      // Re-fetch all data
      const fetch = async () => {
         try {
            const assetRes = await authenticatedApi.get(`/api/assets/${id}`) as any;
            const assetData = assetRes.data?.data || null;
            setAsset(assetData);
            setPurchaseData(assetData?.purchase_details || null);
            if (assetData) {
               await Promise.all([
                  fetchOwnerHistory(assetData),
                  fetchMaintenanceRecords(assetData),
                  fetchAssessmentRecords(assetData)
               ]);
            }
         } catch (e) {
            console.error("Failed to refresh asset data:", e);
         }
      };
      fetch();
   }
};

// Sub-components for cleaner code organization

const NavigationBar = ({ searchValue, setSearchValue, searchResults, showDropdown, setShowDropdown, currentIdx, items, setCurrentIdx, router, assetIcon, asset }: any) => (
   <div className="sticky top-0 z-50 border-b border-cyan-500/20 backdrop-blur-xl bg-white/95 dark:bg-[#041734]/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
         {/* Mobile Layout */}
         <div className="sm:hidden space-y-3">
            {/* Title row with close button */}
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-linear-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                     {React.cloneElement(assetIcon, { className: "w-5 h-5 text-white" })}
                  </div>
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100">AssetCore</span>
               </div>
               <Button
                  variant="default"
                  size="icon"
                  className="h-9 w-9 rounded-lg bg-red-500 text-white hover:bg-red-400"
                  title="Close"
                  onClick={() => window.close()}
               >
                  <X size={18} />
               </Button>
            </div>

            {/* Search and navigation buttons row */}
            <div className="flex items-center gap-2">
               <div className="relative flex-1">
                  <Input
                     type="text"
                     placeholder="Search assets..."
                     className="w-full h-9 pl-10 pr-3 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-[#0d2347] border-cyan-500/30 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                     value={searchValue}
                     onChange={e => setSearchValue(e.target.value)}
                     onFocus={() => setShowDropdown(searchResults.length > 0)}
                     onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                  {showDropdown && (
                     <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-cyan-500/30 rounded-lg shadow-xl max-h-64 overflow-auto">
                        {searchResults.map((item: any) => (
                           <li
                              key={item.id}
                              className="px-3 py-2 hover:bg-cyan-500/10 cursor-pointer border-b border-slate-200 dark:border-slate-700 last:border-0 transition-colors"
                              onMouseDown={() => {
                                 setCurrentIdx(items.findIndex((i: any) => i.id === item.id));
                                 router.push(`/assetdata/assets/${item.id}`);
                                 setSearchValue("");
                                 setShowDropdown(false);
                              }}
                           >
                              <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">{item.register_number}</div>
                              <div className="text-xs text-muted-foreground">
                                 {(item.types?.name || item.type?.name || '-')} · {item.serial_number || item.serial || '-'}
                              </div>
                           </li>
                        ))}
                     </ul>
                  )}
               </div>

               <div className="flex items-center gap-1">
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className="h-9 w-9 rounded-lg border border-cyan-500/25 text-slate-700 dark:text-slate-200 hover:bg-cyan-500/10"
                     onClick={() => {
                        if (currentIdx > 0) {
                           const prevAsset = items[currentIdx - 1];
                           if (prevAsset && prevAsset.id) router.push(`/assetdata/assets/${prevAsset.id}`);
                        }
                     }}
                     disabled={currentIdx <= 0}
                     title="Previous Asset"
                  >
                     <ChevronLeft size={18} />
                  </Button>
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className="h-9 w-9 rounded-lg border border-cyan-500/25 text-slate-700 dark:text-slate-200 hover:bg-cyan-500/10"
                     onClick={() => {
                        if (currentIdx >= 0 && currentIdx < items.length - 1) {
                           const nextAsset = items[currentIdx + 1];
                           if (nextAsset && nextAsset.id) router.push(`/assetdata/assets/${nextAsset.id}`);
                        }
                     }}
                     disabled={currentIdx === -1 || currentIdx === items.length - 1}
                     title="Next Asset"
                  >
                     <ChevronRight size={18} />
                  </Button>
               </div>
            </div>
         </div>

         {/* Desktop Layout */}
         <div className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
               <div className="w-9 h-9 bg-linear-to-br from-[#14d6c4] to-[#0fb2e9] rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  {React.cloneElement(assetIcon, { className: "w-5 h-5 text-white" })}
               </div>
               <span className="text-[29px] font-semibold text-slate-900 dark:text-slate-100">AssetCore</span>
               <div className="h-6 w-px bg-cyan-500/30" />
               <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span>Assets</span>
                  <span className="text-slate-400 dark:text-slate-600">›</span>
                  <span>{asset?.type?.name || asset?.types?.name || 'Asset'}</span>
                  <span className="text-slate-400 dark:text-slate-600">›</span>
                  <span className="text-slate-900 dark:text-slate-100 font-semibold">{asset?.register_number || 'Details'}</span>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <Input
                     type="text"
                     placeholder="Search assets..."
                     className="w-48 lg:w-64 h-9 pl-10 pr-3 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-[#0d2347] border-cyan-500/30 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                     value={searchValue}
                     onChange={e => setSearchValue(e.target.value)}
                     onFocus={() => setShowDropdown(searchResults.length > 0)}
                     onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  />
                  {showDropdown && (
                     <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-cyan-500/30 rounded-lg shadow-xl max-h-64 overflow-auto">
                        {searchResults.map((item: any) => (
                           <li
                              key={item.id}
                              className="px-3 py-2 hover:bg-cyan-500/10 cursor-pointer border-b border-slate-200 dark:border-slate-700 last:border-0 transition-colors"
                              onMouseDown={() => {
                                 setCurrentIdx(items.findIndex((i: any) => i.id === item.id));
                                 router.push(`/assetdata/assets/${item.id}`);
                                 setSearchValue("");
                                 setShowDropdown(false);
                              }}
                           >
                              <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">{item.register_number}</div>
                              <div className="text-xs text-muted-foreground">
                                 {(item.types?.name || item.type?.name || '-')} · {item.serial_number || item.serial || '-'}
                              </div>
                           </li>
                        ))}
                     </ul>
                  )}
               </div>

               <div className="flex items-center gap-1">
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className="h-9 w-9 rounded-lg border border-cyan-500/25 text-slate-700 dark:text-slate-200 hover:bg-cyan-500/10"
                     onClick={() => {
                        if (currentIdx > 0) {
                           const prevAsset = items[currentIdx - 1];
                           if (prevAsset && prevAsset.id) router.push(`/assetdata/assets/${prevAsset.id}`);
                        }
                     }}
                     disabled={currentIdx <= 0}
                     title="Previous Asset"
                  >
                     <ChevronLeft size={18} />
                  </Button>
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className="h-9 w-9 rounded-lg border border-cyan-500/25 text-slate-700 dark:text-slate-200 hover:bg-cyan-500/10"
                     onClick={() => {
                        if (currentIdx >= 0 && currentIdx < items.length - 1) {
                           const nextAsset = items[currentIdx + 1];
                           if (nextAsset && nextAsset.id) router.push(`/assetdata/assets/${nextAsset.id}`);
                        }
                     }}
                     disabled={currentIdx === -1 || currentIdx === items.length - 1}
                     title="Next Asset"
                  >
                     <ChevronRight size={18} />
                  </Button>
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className="h-9 w-9 rounded-lg bg-red-500 hover:bg-red-400 text-white border border-red-400/50"
                     title="Close"
                     onClick={() => window.close()}
                  >
                     <X size={18} />
                  </Button>
               </div>
            </div>
         </div>
      </div>
   </div>
);

const LifecycleRibbon = ({ activeTab, onSelectTab }: { activeTab: string; onSelectTab: (tab: string) => void }) => {
   const currentStep = (() => {
      if (activeTab === 'purchasing') return 1;
      if (activeTab === 'ownership') return 2;
      if (activeTab === 'maintenance') return 3;
      if (activeTab === 'assessment') return 4;
      if (activeTab === 'disposal') return 5;
      return 1;
   })();

   const steps = [
      { id: 1, title: 'Acquiring', subtitle: 'Purchase & registration', tab: 'purchasing' },
      { id: 2, title: 'Reassignment', subtitle: 'Ownership handover', tab: 'ownership' },
      { id: 3, title: 'Maintenance', subtitle: 'Expenses & repairs', tab: 'maintenance' },
      { id: 4, title: 'Assessment', subtitle: 'Condition review', tab: 'assessment' },
      { id: 5, title: 'Disposal', subtitle: 'Decommission', tab: 'disposal' },
   ];

   return (
      <div className="rounded-xl border border-cyan-500/25 bg-white/90 dark:bg-[#0e274f]/80 overflow-hidden">
         <div className="hidden md:flex" role="tablist" aria-label="Asset lifecycle">
            {steps.map((step, idx) => {
               const isCurrent = step.id === currentStep;
               const isDone = step.id < currentStep;
               const tone = isCurrent
                  ? 'from-cyan-300 to-teal-300 text-teal-950 dark:from-[#1be8cf] dark:to-[#09c8b0] dark:text-[#06383f]'
                  : isDone
                     ? 'from-emerald-100 to-teal-100 text-emerald-800 dark:from-[#14c6a8]/40 dark:to-[#11bfa2]/30 dark:text-emerald-200'
                     : step.id === 5
                        ? 'from-rose-100 to-rose-50 text-rose-700 dark:from-[#3c1e35] dark:to-[#30192b] dark:text-rose-300'
                        : 'from-slate-100 to-slate-50 text-slate-700 dark:from-[#173660] dark:to-[#143055] dark:text-slate-300';
               return (
                  <button
                     type="button"
                     key={step.id}
                     role="tab"
                     aria-selected={isCurrent}
                     tabIndex={isCurrent ? 0 : -1}
                     onClick={() => onSelectTab(step.tab)}
                     className={`relative flex-1 bg-linear-to-r ${tone} px-5 py-3 lifecycle-chevron ${idx === 0 ? 'lifecycle-chevron-first' : ''} ${idx === steps.length - 1 ? 'lifecycle-chevron-last' : ''}`}
                  >
                     <div className="flex items-start gap-2">
                        <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${isCurrent
                              ? 'bg-teal-950/10 text-teal-900 dark:bg-[#06383f]/40 dark:text-[#06383f]'
                              : isDone
                                 ? 'bg-emerald-900/50 text-emerald-100'
                                 : 'bg-slate-300/40 text-slate-700 dark:bg-slate-300/20 dark:text-slate-200'
                           }`}>
                           {step.id}
                        </div>
                        <div>
                           <div className={`text-sm font-semibold ${isCurrent ? 'text-[#06383f]' : ''}`}>{step.title}</div>
                           <div className={`text-xs ${isCurrent ? 'text-teal-800 dark:text-[#0a5a63]/90' : 'text-slate-500 dark:text-slate-400'}`}>{step.subtitle}</div>
                        </div>
                     </div>
                  </button>
               );
            })}
         </div>
         <div className="md:hidden grid grid-cols-1">
            {steps.map((step) => {
               const isCurrent = step.id === currentStep;
               return (
                  <button
                     key={step.id}
                     type="button"
                     role="tab"
                     aria-selected={isCurrent}
                     onClick={() => onSelectTab(step.tab)}
                     className={`text-left px-4 py-2 border-b border-cyan-500/20 ${isCurrent ? 'bg-cyan-500/20' : ''}`}
                  >
                     <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{step.title}</div>
                     <div className="text-xs text-slate-500 dark:text-slate-400">{step.subtitle}</div>
                  </button>
               );
            })}
         </div>
         <style jsx>{`
            .lifecycle-chevron {
               clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%, 14px 50%);
               margin-right: -10px;
            }
            .lifecycle-chevron-first {
               clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%);
            }
            .lifecycle-chevron-last {
               clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%);
               margin-right: 0;
            }
         `}</style>
      </div>
   );
};

const AssetHeader = ({ asset, currentOwner, formatDate }: any) => {
   const auth = React.useContext(AuthContext);
   const router = useRouter();
   const [editingStatus, setEditingStatus] = useState(false);
   const [warningOpen, setWarningOpen] = useState(false);
   const [confirmOpen, setConfirmOpen] = useState(false);
   const [saving, setSaving] = useState(false);
   const [showSpecs, setShowSpecs] = useState(true);
   const [classification, setClassification] = useState<string>(() => (asset?.classification ?? '').toLowerCase());
   const [recordStatus, setRecordStatus] = useState<string>(() => (asset?.record_status ?? asset?.status ?? '').toLowerCase());
   const [conditionStatus, setConditionStatus] = useState<string>(() => (asset?.condition_status ?? '').toLowerCase());
   const user = auth?.authData?.user;
   const [managerList, setManagerList] = useState<any[]>([]);

   useEffect(() => {
      if (!user?.username) {
         setManagerList([]);
         return;
      }
      let cancelled = false;
      const load = async () => {
         try {
            const res = await authenticatedApi.get("/api/assets/managers") as any;
            if (!cancelled) {
               setManagerList(res.data?.data || res.data || []);
            }
         } catch {
            if (!cancelled) setManagerList([]);
         }
      };
      load();
      return () => { cancelled = true; };
   }, [user?.username]);

   const isManager = useMemo(() => {
      if (!user?.username || !Array.isArray(managerList)) return false;
      return managerList.some((m: any) => {
         const ramcoId = m?.employee?.ramco_id || m?.ramco_id;
         return ramcoId && String(ramcoId) === String(user.username);
      });
   }, [managerList, user?.username]);

   const recordStatusOptions = useMemo(() => {
      const cls = (classification || '').toLowerCase();
      if (cls === 'asset') return ['active', 'disposed'];
      if (['rental', 'non-asset', 'personal'].includes(cls)) return ['active', 'archived'];
      return ['active'];
   }, [classification]);

   const conditionOptions = useMemo(() => {
      const cls = (classification || '').toLowerCase();
      const status = (recordStatus || '').toLowerCase();

      if (status === 'archived' && ['non-asset', 'personal', 'rental'].includes(cls)) {
         return ['returned', 'retired', 'transferred'];
      }

      if (status === 'disposed') {
         return ['disposed'];
      }

      if (status === 'active') {
         return ['in-use'];
      }

      return ['in-use'];
   }, [recordStatus, classification]);

   useEffect(() => {
      const currentClassification = (asset?.classification ?? '').toLowerCase();
      const currentRecord = (asset?.record_status ?? asset?.status ?? '').toLowerCase();
      const currentCondition = (asset?.condition_status ?? '').toLowerCase();
      setClassification(currentClassification);
      setRecordStatus(currentRecord);
      setConditionStatus(currentCondition);
   }, [asset?.record_status, asset?.status, asset?.condition_status, asset?.classification]);

   useEffect(() => {
      if (recordStatusOptions.length && !recordStatusOptions.includes(recordStatus)) {
         setRecordStatus(recordStatusOptions[0]);
      }
   }, [recordStatusOptions, recordStatus]);

   useEffect(() => {
      if (conditionOptions.length && !conditionOptions.includes(conditionStatus)) {
         setConditionStatus(conditionOptions[0]);
      }
   }, [conditionOptions, conditionStatus]);

   const getCurrentUsername = () => {
      const fromAuth = (auth?.authData?.user as any)?.username || (auth?.authData?.user as any)?.ramco_id;
      if (fromAuth) return String(fromAuth);
      if (typeof window !== "undefined") {
         return localStorage.getItem("username") || "";
      }
      return "";
   };

   const recordStatusRaw = (recordStatus || asset?.record_status || asset?.status || '').toLowerCase();
   const displayStatus = (recordStatus || asset?.record_status || asset?.status || 'Unknown') as string;
   const displayClassification = (classification || asset?.classification || 'Unknown') as string;
   const isActive = recordStatusRaw === 'active';

   const specBrand = asset?.brand?.name || asset?.brands?.name || asset?.brand || '-';
   const specModel = asset?.model?.name || asset?.models?.name || asset?.model || '-';
   const specSerial = asset?.serial || asset?.serial_number || '-';
   const specs = [
      { label: 'Brand / Model', value: [specBrand, specModel].filter(v => v && v !== '-').join(' ') || '-' },
      { label: 'Serial Number', value: specSerial || '-' },
      { label: 'Processor', value: asset?.processor || asset?.cpu || asset?.spec?.processor || '-' },
      { label: 'Memory (RAM)', value: asset?.ram || asset?.memory || asset?.spec?.ram || '-' },
      { label: 'Storage', value: asset?.storage || asset?.disk || asset?.spec?.storage || '-' },
      { label: 'Display', value: asset?.display || asset?.screen || asset?.spec?.display || '-' },
      { label: 'Operating System', value: asset?.operating_system || asset?.os || asset?.spec?.operating_system || '-' },
      { label: 'Color', value: asset?.color || asset?.spec?.color || '-' },
   ];

   const startEditing = () => setWarningOpen(true);
   const confirmStartEditing = () => {
      setEditingStatus(true);
      setWarningOpen(false);
   };

   const requestSave = () => setConfirmOpen(true);

   const handleSave = async () => {
      if (!asset?.id) return;
      setSaving(true);
      try {
         await authenticatedApi.put(`/api/assets/${asset.id}/update-status`, {
            classification: classification || asset?.classification || '',
            record_status: recordStatus,
            condition_status: conditionStatus,
            updated_by: getCurrentUsername(),
            updated_at: formatTimestamp()
         });
         toast.success("Asset status updated");
         setConfirmOpen(false);
         setEditingStatus(false);
      } catch (e: any) {
         toast.error(e?.response?.data?.message || e?.message || "Failed to update status");
      } finally {
         setSaving(false);
      }
   };

   const notifyParentAndClose = () => {
      if (typeof window === "undefined") {
         router.back();
         return;
      }

      try {
         localStorage.setItem("asset-record-refresh", Date.now().toString());
         if (window.opener && !window.opener.closed) {
            window.opener.location.reload();
            window.close();
            return;
         }
         // Same-tab flow: go back then hard reload to ensure grid re-fetches
         const fallback = document.referrer || "/";
         window.location.href = fallback;
      } catch (e) {
         window.location.href = document.referrer || "/";
      }
   };

   return (
      <>
         <AlertDialog open={warningOpen} onOpenChange={setWarningOpen}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Update statuses?</AlertDialogTitle>
                  <AlertDialogDescription>
                     You&apos;re about to edit the classification and statuses for this asset. Continue?
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmStartEditing}>Continue</AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>

         <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Save status changes?</AlertDialogTitle>
                  <AlertDialogDescription>
                     Classification, record status, and condition status will be updated.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSave} disabled={saving}>
                     {saving ? 'Saving...' : 'Save'}
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>

         <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-100/90 to-white dark:from-slate-900/80 dark:to-slate-900/60 border border-cyan-500/25 shadow-2xl shadow-cyan-950/20">
            <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-cyan-500/20 to-blue-500/10 rounded-full blur-3xl z-0" />

            <div className="relative z-10 p-6 lg:p-8 backdrop-blur-sm">
               <div className="flex flex-col lg:flex-row gap-6 items-start">
                  <div className="flex-1 space-y-5">
                     <div>
                        <div className="flex items-center gap-3 mb-2">
                           <Badge className="text-sm px-2 py-0.5 font-medium bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {(asset?.type?.name ?? asset?.types?.name) || 'Unknown Type'}
                           </Badge>
                           <Badge className="text-sm px-2 py-0.5 capitalize font-medium bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {displayClassification}
                           </Badge>
                           <div className="flex items-center gap-1.5">
                              <Badge
                                 variant={isActive ? 'outline' : 'destructive'}
                                 className={`text-sm px-2 py-0.5 flex items-center gap-1 ${isActive ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
                              >
                                 {isActive ? (
                                    <>
                                       <CheckCircle className="w-3 h-3" />
                                       <span className="capitalize">{displayStatus || 'Active'}</span>
                                    </>
                                 ) : (
                                    <>
                                       <AlertTriangle className="w-3 h-3" />
                                       <span className="capitalize">{displayStatus || 'Unknown'}</span>
                                    </>
                                 )}
                              </Badge>
                              {isManager && (
                                 <TooltipProvider delayDuration={150}>
                                    <Tooltip>
                                       <TooltipTrigger asChild>
                                          <div
                                             className="h-7 w-7 flex items-center justify-center hover:bg-cyan-500/10 rounded-lg"
                                             title={editingStatus ? "Save statuses" : "Update asset status"}
                                             onClick={() => (editingStatus ? requestSave() : startEditing())}
                                          >
                                             {editingStatus ? (
                                                <Save className="w-5 h-5 text-emerald-600" />
                                             ) : (
                                                <Pencil className="w-5 h-5 text-yellow-600" />
                                             )}
                                          </div>
                                       </TooltipTrigger>
                                       <TooltipContent side="top">
                                          {editingStatus ? "Save statuses" : "Update asset status"}
                                       </TooltipContent>
                                    </Tooltip>
                                 </TooltipProvider>
                              )}
                           </div>
                        </div>
                        {editingStatus && (
                           <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl space-y-6">
                              <div className="flex flex-col gap-1">
                                 <p className="text-xs text-muted-foreground">Classification</p>
                                 <Select value={classification} onValueChange={(val) => setClassification(val)}>
                                    <SelectTrigger className="h-9 capitalize w-full bg-white/70 dark:bg-slate-900/70 border-cyan-500/30">
                                       <SelectValue placeholder="Select classification" />
                                    </SelectTrigger>
                                    <SelectContent>
                                       {['rental', 'personal', 'non-asset', 'asset'].map((option) => (
                                          <SelectItem key={option} value={option} className="capitalize">
                                             {option}
                                          </SelectItem>
                                       ))}
                                    </SelectContent>
                                 </Select>
                              </div>
                              <div className="flex flex-col gap-1">
                                 <p className="text-xs text-muted-foreground">Record Status</p>
                                 <Select value={recordStatus} onValueChange={(val) => setRecordStatus(val)}>
                                    <SelectTrigger className="h-9 capitalize w-full bg-white/70 dark:bg-slate-900/70 border-cyan-500/30">
                                       <SelectValue placeholder="Select record status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                       {recordStatusOptions.map((option) => (
                                          <SelectItem key={option} value={option} className="capitalize">
                                             {option}
                                          </SelectItem>
                                       ))}
                                    </SelectContent>
                                 </Select>
                              </div>
                              <div className="flex flex-col gap-1">
                                 <p className="text-xs text-muted-foreground">Condition Status</p>
                                 <Select value={conditionStatus} onValueChange={(val) => setConditionStatus(val)}>
                                    <SelectTrigger className="h-9 capitalize w-full bg-white/70 dark:bg-slate-900/70 border-cyan-500/30">
                                       <SelectValue placeholder="Select condition status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                       {conditionOptions.map((option) => (
                                          <SelectItem key={option} value={option} className="capitalize">
                                             {option}
                                          </SelectItem>
                                       ))}
                                    </SelectContent>
                                 </Select>
                              </div>
                           </div>
                        )}
                        <div className="flex justify-between items-end gap-4">
                           <h1 className="text-2xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100">Register No. {asset?.register_number}</h1>
                           <div className="text-right">
                              <div className="text-xs uppercase tracking-wide text-muted-foreground">Asset Age</div>
                              <div className="text-2xl lg:text-4xl font-bold text-amber-500">
                                 {asset?.age ? `${asset.age}` : '-'}
                              </div>
                              <div className="text-xs text-muted-foreground">years in service</div>
                           </div>
                        </div>

                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <InfoCard icon={Calendar} label="Purchase Year" value={asset?.purchase_year || '-'} color="blue" />
                        <InfoCard icon={Building} label="Cost Center" value={asset?.costcenter?.name || '-'} color="purple" />
                        <InfoCard icon={MapPin} label="Location" value={asset?.location?.name || '-'} color="red" />
                        <InfoCard icon={Users} label="Owner" value={currentOwner?.name ?? currentOwner?.employee?.name ?? '-'} color="green" />
                     </div>

                     <div className="rounded-xl border border-cyan-500/20 bg-slate-50/60 dark:bg-slate-900/40 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20">
                           <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-full border border-cyan-500/40 inline-flex items-center justify-center text-cyan-500 text-[10px] font-bold">•</div>
                              <span className="text-sm font-semibold tracking-wide uppercase text-slate-700 dark:text-slate-200">Specifications</span>
                              <Badge variant="outline" className="text-[11px] border-cyan-500/30 text-muted-foreground">{specs.length} items</Badge>
                           </div>
                           <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-muted-foreground hover:text-cyan-500"
                              onClick={() => setShowSpecs(prev => !prev)}
                           >
                              {showSpecs ? 'Hide specs' : 'Show specs'}
                              <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${showSpecs ? 'rotate-180' : ''}`} />
                           </Button>
                        </div>
                        {showSpecs && (
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                              {specs.map((spec) => (
                                 <div key={spec.label} className="px-4 py-3 border-r border-b border-cyan-500/20 last:border-r-0">
                                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{spec.label}</div>
                                    <div className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">{spec.value}</div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </>
   );
};

const InfoCard = ({ icon: Icon, label, value, color }: any) => {
   const colorClasses: any = {
      blue: "bg-cyan-500/15 text-cyan-400",
      purple: "bg-blue-500/15 text-blue-400",
      red: "bg-rose-500/15 text-rose-400",
      green: "bg-emerald-500/15 text-emerald-400"
   };

   return (
      <div className="rounded-xl p-3 border border-cyan-500/20 bg-slate-50/80 dark:bg-slate-900/50 hover:border-cyan-400/40 transition-colors">
         <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
               <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">{label}</p>
               <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{value}</p>
            </div>
         </div>
      </div>
   );
};

const DataRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
   <div className="flex justify-between items-center border-b border-gray-100 last:border-0">
      <span className="text-sm">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
   </div>
);

const SpecsSection = ({ asset, renderTypeSpecificSpecs }: any) => (
   <div className="space-y-4">
      <Card className="bg-stone-50/50">
         <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
               <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-purple-600" />
               </div>
               Basic Information
            </CardTitle>
         </CardHeader>
         <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               <div>
                  <p className="text-xs text-gray-500 mb-1">Brand</p>
                  <p className="text-sm font-semibold text-gray-900">{asset?.brand?.name || asset?.brands?.name || '-'}</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 mb-1">Model</p>
                  <p className="text-sm font-semibold text-gray-900">{asset?.model?.name || asset?.models?.name || '-'}</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 mb-1">Category</p>
                  <p className="text-sm font-semibold text-gray-900">{asset?.category?.name || asset?.categories?.name || '-'}</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 mb-1">Serial Number</p>
                  <p className="text-sm font-semibold text-gray-900">{asset?.serial || asset?.serial_number || '-'}</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 mb-1">Asset Tag</p>
                  <p className="text-sm font-semibold text-gray-900">{asset?.tag || asset?.asset_tag || '-'}</p>
               </div>
            </div>
         </CardContent>
      </Card>

      {renderTypeSpecificSpecs()}
   </div>
);

export default AssetDetail;
