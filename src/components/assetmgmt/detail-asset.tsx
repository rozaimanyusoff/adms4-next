'use client';
import React, { useEffect, useState } from "react";
import { authenticatedApi } from "@/config/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";

interface DetailAssetProps {
  id: string;
}

const DetailAsset: React.FC<DetailAssetProps> = ({ id }) => {
  const router = useRouter();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]); // List of asset items for navigation
  const [currentIdx, setCurrentIdx] = useState<number>(-1);
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch all asset ids for navigation on mount
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await authenticatedApi.get("/api/assets") as any;
        const arr = res.data?.data || [];
        setItems(arr);
        const idx = arr.findIndex((i: any) => String(i.id) === String(id));
        setCurrentIdx(idx);
      } catch (e) {}
    };
    fetchItems();
  }, [id]);

  useEffect(() => {
    const fetchAsset = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authenticatedApi.get(`/api/assets/${id}`) as any;
        setAsset(res.data?.data || null);
      } catch (e) {
        setError("Failed to fetch asset data.");
        setAsset(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAsset();
  }, [id]);

  // Autocomplete search for serial number
  useEffect(() => {
    if (searchValue.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const results = items.filter((item: any) => {
      const serialMatch = item.serial_number && item.serial_number.toLowerCase().includes(searchValue.toLowerCase());
      const brandMatch = item.brands?.name && item.brands.name.toLowerCase().includes(searchValue.toLowerCase());
      const modelMatch = item.models?.name && item.models.name.toLowerCase().includes(searchValue.toLowerCase());
      return serialMatch || brandMatch || modelMatch;
    });
    setSearchResults(results);
    setShowDropdown(results.length > 0);
  }, [searchValue, items]);

  if (loading) return (
    <div className="w-full">
      {/* Navbar always visible */}
      <div className="flex items-center justify-between bg-gradient-to-b from-gray-200 to-gray-100 rounded shadow px-4 py-3 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold">Asset Detail</span>
        </div>
        <div className="flex items-center gap-2 relative">
          <div className="w-64 relative">
            <Input
              type="text"
              placeholder="Search serial number..."
              className="w-64"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onFocus={() => setShowDropdown(searchResults.length > 0)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            />
            {showDropdown && (
              <ul className="absolute z-10 w-full bg-stone-200 border border-gray-200 rounded shadow-lg max-h-48 overflow-auto mt-1">
                {searchResults.map((item) => (
                  <li
                    key={item.id}
                    className="px-3 py-2 hover:bg-blue-100 cursor-pointer text-sm"
                    onMouseDown={() => {
                      setCurrentIdx(items.findIndex((i: any) => i.id === item.id));
                      setSearchValue("");
                      setShowDropdown(false);
                    }}
                  >
                    <div className="font-medium">{item.serial_number}</div>
                    <div className="text-xs text-gray-500">{item.brands?.name || '-'} | {item.models?.name || '-'}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full border border-gray-300 dark:border-neutral-700"
            onClick={() => {
              if (currentIdx > 0) {
                const prevAsset = items[currentIdx - 1];
                if (prevAsset && prevAsset.id) router.push(`/assetdata/assets/${prevAsset.id}`);
              }
            }}
            disabled={currentIdx <= 0}
            title="Previous Asset"
          >
            <ChevronLeft size={20} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full border border-gray-300 dark:border-neutral-700"
            onClick={() => {
              if (currentIdx >= 0 && currentIdx < items.length - 1) {
                const nextAsset = items[currentIdx + 1];
                if (nextAsset && nextAsset.id) router.push(`/assetdata/assets/${nextAsset.id}`);
              }
            }}
            disabled={currentIdx === -1 || currentIdx === items.length - 1}
            title="Next Asset"
          >
            <ChevronRight size={20} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full bg-red-500 hover:bg-red-600 text-white dark:border-neutral-700"
            title="Close"
            onClick={() => window.close()}
          >
            <span className="sr-only">Close</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </div>
      <div className="p-8 text-gray-400">Loading asset...</div>
    </div>
  );
  if (!asset || error || !id || id === 'null' || id === 'undefined') return (
    <div className="w-full">
      {/* Navbar always visible */}
      <div className="flex items-center justify-between bg-gradient-to-b from-gray-200 to-gray-100 rounded shadow px-4 py-3 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold">Asset Detail</span>
        </div>
        <div className="flex items-center gap-2 relative">
          <div className="w-64 relative">
            <Input
              type="text"
              placeholder="Search serial number..."
              className="w-64"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onFocus={() => setShowDropdown(searchResults.length > 0)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            />
            {showDropdown && (
              <ul className="absolute z-10 w-full bg-stone-200 border border-gray-200 rounded shadow-lg max-h-48 overflow-auto mt-1">
                {searchResults.map((item) => (
                  <li
                    key={item.id}
                    className="px-3 py-2 hover:bg-blue-100 cursor-pointer text-sm"
                    onMouseDown={() => {
                      setCurrentIdx(items.findIndex((i: any) => i.id === item.id));
                      setSearchValue("");
                      setShowDropdown(false);
                    }}
                  >
                    <div className="font-medium">{item.serial_number}</div>
                    <div className="text-xs text-gray-500">{item.brands?.name || '-'} | {item.models?.name || '-'}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full border border-gray-300 dark:border-neutral-700"
            onClick={() => {
              if (currentIdx > 0) {
                const prevAsset = items[currentIdx - 1];
                if (prevAsset && prevAsset.id) router.push(`/assetdata/assets/${prevAsset.id}`);
              }
            }}
            disabled={currentIdx <= 0}
            title="Previous Asset"
          >
            <ChevronLeft size={20} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full border border-gray-300 dark:border-neutral-700"
            onClick={() => {
              if (currentIdx >= 0 && currentIdx < items.length - 1) {
                const nextAsset = items[currentIdx + 1];
                if (nextAsset && nextAsset.id) router.push(`/assetdata/assets/${nextAsset.id}`);
              }
            }}
            disabled={currentIdx === -1 || currentIdx === items.length - 1}
            title="Next Asset"
          >
            <ChevronRight size={20} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full bg-red-500 hover:bg-red-600 text-white dark:border-neutral-700"
            title="Close"
            onClick={() => window.close()}
          >
            <span className="sr-only">Close</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </div>
      <div className="p-8 text-red-500">{error || 'Invalid asset selected. Please use navigation or search.'}</div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Navbar */}
      <div className="flex items-center justify-between bg-gradient-to-b from-gray-200 to-gray-100 rounded shadow px-4 py-3 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold">Asset Detail</span>
        </div>
        <div className="flex items-center gap-2 relative">
          <div className="w-64 relative">
            <Input
              type="text"
              placeholder="Search serial number..."
              className="w-64"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onFocus={() => setShowDropdown(searchResults.length > 0)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            />
            {showDropdown && (
              <ul className="absolute z-10 w-full bg-stone-200 border border-gray-200 rounded shadow-lg max-h-48 overflow-auto mt-1">
                {searchResults.map((item) => (
                  <li
                    key={item.id}
                    className="px-3 py-2 hover:bg-blue-100 cursor-pointer text-sm"
                    onMouseDown={() => {
                      setCurrentIdx(items.findIndex((i: any) => i.id === item.id));
                      setSearchValue("");
                      setShowDropdown(false);
                    }}
                  >
                    <div className="font-medium">{item.serial_number}</div>
                    <div className="text-xs text-gray-500">{item.brands?.name || '-'} | {item.models?.name || '-'}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full border border-gray-300 dark:border-neutral-700"
            onClick={() => {
              if (currentIdx > 0) {
                const prevAsset = items[currentIdx - 1];
                if (prevAsset) router.push(`/assetdata/assets/${prevAsset.id}`);
              }
            }}
            disabled={currentIdx <= 0}
            title="Previous Asset"
          >
            <ChevronLeft size={20} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full border border-gray-300 dark:border-neutral-700"
            onClick={() => {
              if (currentIdx >= 0 && currentIdx < items.length - 1) {
                const nextAsset = items[currentIdx + 1];
                if (nextAsset) router.push(`/assetdata/assets/${nextAsset.id}`);
              }
            }}
            disabled={currentIdx === -1 || currentIdx === items.length - 1}
            title="Next Asset"
          >
            <ChevronRight size={20} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full bg-red-500 hover:bg-red-600 text-white dark:border-neutral-700"
            title="Close"
            onClick={() => window.close()}
          >
            <span className="sr-only">Close</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </div>
      {/* Main Content */}
      <div className="w-full px-4">
        <div className="bg-white rounded shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Asset Info */}
            <div>
              <h2 className="text-xl font-bold mb-4">Asset Info</h2>
              <div className="space-y-2">
                <div><span className="font-semibold">ID:</span> {asset.id}</div>
                <div><span className="font-semibold">Item Code:</span> {asset.asset_code}</div>
                {/* <div><span className="font-semibold">Item Code:</span> {asset.item_code}</div> */}
                <div><span className="font-semibold">Serial Number:</span> {asset.serial_number}</div>
                <div><span className="font-semibold">Finance Tag:</span> {asset.finance_tag || '-'}</div>
                <div><span className="font-semibold">PC Hostname:</span> {asset.pc_hostname || '-'}</div>
                <div><span className="font-semibold">DOP:</span> {asset.dop || '-'}</div>
                <div><span className="font-semibold">Year:</span> {asset.year || '-'}</div>
                <div><span className="font-semibold">Unit Price:</span> {asset.unit_price || '-'}</div>
                <div><span className="font-semibold">Depreciation Length:</span> {asset.depreciation_length || '-'}</div>
                <div><span className="font-semibold">Depreciation Rate:</span> {asset.depreciation_rate || '-'}</div>
                <div><span className="font-semibold">Cost Center:</span> {asset.cost_center || '-'}</div>
                <div><span className="font-semibold">Type:</span> {asset.types?.name || asset.type_code || '-'}</div>
                <div><span className="font-semibold">Category:</span> {asset.categories?.name || asset.category_code || '-'}</div>
                <div><span className="font-semibold">Brand:</span> {asset.brands?.name || asset.brand_code || '-'}</div>
                <div><span className="font-semibold">Model:</span> {asset.models?.name || asset.model_code || '-'}</div>
                <div><span className="font-semibold">Classification:</span> {asset.classification || '-'}</div>
                <div><span className="font-semibold">Status:</span> {asset.status || '-'}</div>
                <div><span className="font-semibold">Asses:</span> {asset.asses || '-'}</div>
                <div><span className="font-semibold">Comment:</span> {asset.comment || '-'}</div>
              </div>
            </div>
            {/* Owner Info */}
            <div>
              <h2 className="text-xl font-bold mb-4">Owner Info</h2>
              {asset.owner && asset.owner.length > 0 ? (
                <div className="space-y-2">
                  <div><span className="font-semibold">Name:</span> {asset.owner[0].name}</div>
                  <div><span className="font-semibold">Department:</span> {asset.owner[0].department || '-'}</div>
                  <div><span className="font-semibold">District:</span> {asset.owner[0].district || '-'}</div>
                  <div><span className="font-semibold">Cost Center:</span> {asset.owner[0].cost_center || '-'}</div>
                  <div><span className="font-semibold">Effective Date:</span> {asset.owner[0].effective_date ? new Date(asset.owner[0].effective_date).toLocaleDateString() : '-'}</div>
                  <div><span className="font-semibold">Ramco ID:</span> {asset.owner[0].ramco_id || '-'}</div>
                </div>
              ) : (
                <div className="text-gray-400">No owner data</div>
              )}
            </div>
            {/* Specs Info */}
            <div>
              <h2 className="text-xl font-bold mb-4">Specs</h2>
              {Array.isArray(asset.specs) && asset.specs.length > 0 && asset.specs[0] ? (
                <div className="space-y-2">
                  <div><span className="font-semibold">CPU:</span> {asset.specs[0].cpu || '-'}</div>
                  <div><span className="font-semibold">CPU Gen:</span> {asset.specs[0].cpu_generation || '-'}</div>
                  <div><span className="font-semibold">Memory (GB):</span> {asset.specs[0].memory_size || '-'}</div>
                  <div><span className="font-semibold">Storage (GB):</span> {asset.specs[0].storage_size || '-'}</div>
                  <div><span className="font-semibold">OS:</span> {asset.specs[0].os || '-'}</div>
                  <div><span className="font-semibold">Screen Size:</span> {asset.specs[0].screen_size || '-'}</div>
                  <div><span className="font-semibold">Installed Software:</span>
                    {Array.isArray(asset.specs[0].installed_software) && asset.specs[0].installed_software.length > 0 ? (
                      <ul className="list-disc list-inside ml-2">
                        {asset.specs[0].installed_software.map((sw: any) => (
                          <li key={sw.id}>
                            {sw.name} <span className="text-xs text-gray-400">({sw.installed_at ? new Date(sw.installed_at).toLocaleDateString() : '-'})</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400">No specs data</div>
              )}
            </div>
          </div>
          {/* Tabs for Movement, Maintenance, Assessment */}
          <div className="w-full">
            <Tabs defaultValue="movement" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="movement">Movement</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                <TabsTrigger value="assessment">Assessment</TabsTrigger>
              </TabsList>
              <TabsContent value="movement">
                {asset.movement && asset.movement.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {asset.movement.map((move: any, idx: number) => (
                      <li key={move.id || idx} className="py-2">
                        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                          <span className="font-semibold">{move.date ? new Date(move.date).toLocaleDateString() : '-'}</span>
                          <span>From: <span className="font-medium">{move.from || '-'}</span></span>
                          <span>To: <span className="font-medium">{move.to || '-'}</span></span>
                          <span>By: <span className="font-medium">{move.by || '-'}</span></span>
                          {move.remarks && <span>Remarks: {move.remarks}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-400">No movement records.</div>
                )}
              </TabsContent>
              <TabsContent value="maintenance">
                <div className="text-gray-500">Maintenance info goes here.</div>
              </TabsContent>
              <TabsContent value="assessment">
                <div className="text-gray-500">Assessment info goes here.</div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailAsset;
