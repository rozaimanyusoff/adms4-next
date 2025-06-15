'use client';
import React, { useEffect, useState } from "react";
import { authenticatedApi } from "@/config/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  // Utility: pick a random color from a palette
  const cardColors = [
    'bg-pink-100', 'bg-blue-100', 'bg-green-100', 'bg-yellow-100', 'bg-purple-100', 'bg-orange-100', 'bg-teal-100', 'bg-red-100', 'bg-indigo-100', 'bg-fuchsia-100',
    'bg-pink-200', 'bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-purple-200', 'bg-orange-200', 'bg-teal-200', 'bg-red-200', 'bg-indigo-200', 'bg-fuchsia-200',
  ];
  function getRandomCardColor(idx: number) {
    return cardColors[idx % cardColors.length];
  }

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
                    <div className="text-xs text-gray-500">{item.types?.name || '-'}</div>
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
              placeholder="Search registered number..."
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
          {/* Asset Info */}
          <section className={`rounded-lg shadow p-6 mb-6 ${getRandomCardColor(0)}`}>
            <h2 className="text-xl font-bold border-b pb-2 mb-4 flex items-center gap-2">
              {/* Optionally add an icon here */}
              Asset Info
            </h2>
            {/* Asset Image Box */}
            <div className="flex justify-center mb-4">
              <div className="w-48 h-48 bg-white border border-gray-300 rounded flex items-center justify-center overflow-hidden">
                {asset.image_url ? (
                  <img
                    src={asset.image_url}
                    alt="Asset Image"
                    className="object-contain w-full h-full"
                  />
                ) : (
                  <span className="text-gray-400 text-sm">No Image</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-y-2">
              {/* <div className="flex"><span className="w-40 font-semibold">ID:</span> <span>{asset.id}</span></div> */}
              <div className="flex"><span className="w-40 font-semibold">Item Code:</span> <span>{asset.asset_code}</span></div>
              <div className="flex"><span className="w-40 font-semibold">Registered Number:</span> <span>{asset.serial_number}</span></div>
              <div className="flex"><span className="w-40 font-semibold">Finance Tag:</span> <span>{asset.finance_tag || '-'}</span></div>
              {/* <div className="flex"><span className="w-40 font-semibold">DOP:</span> <span>{asset.dop || '-'}</span></div> */}
              <div className="flex"><span className="w-40 font-semibold">Year:</span> <span>{asset.year || '-'}</span></div>
              <div className="flex"><span className="w-40 font-semibold">Unit Price:</span> <span>{asset.unit_price || '-'}</span></div>
              <div className="flex"><span className="w-40 font-semibold">Depreciation Length:</span> <span>{asset.depreciation_length || '-'} years</span></div>
              <div className="flex"><span className="w-40 font-semibold">Depreciation Rate:</span> <span>{asset.depreciation_rate || '-'}%</span></div>
              <div className="flex"><span className="w-40 font-semibold">Netbook Value:</span> <span>{(() => {
                const price = parseFloat(asset.unit_price);
                const rate = parseFloat(asset.depreciation_rate);
                const years = parseFloat(asset.depreciation_length);
                if (isNaN(price) || isNaN(rate) || isNaN(years) || price <= 0 || rate <= 0 || years <= 0) return '-';
                // Straight-line depreciation
                const annualDep = price * (rate / 100);
                const netbook = price - (annualDep * years);
                return netbook > 0 ? netbook.toLocaleString(undefined, { style: 'currency', currency: 'MYR' }) : '0';
              })()}</span></div>
              <div className="flex"><span className="w-40 font-semibold">Cost Center:</span> <span>{asset.cost_center || '-'}</span></div>
              <div className="flex"><span className="w-40 font-semibold">Type:</span> <span>{asset.types?.name || '-'}</span></div>
              <div className="flex"><span className="w-40 font-semibold">Classification:</span> <span>{asset.classification || '-'}</span></div>
              <div className="flex"><span className="w-40 font-semibold">Status:</span> <span>{asset.status || '-'}</span></div>
              <div className="flex"><span className="w-40 font-semibold">Disposed Date:</span> <span>{
                asset.status === 'active' ||
                !asset.disposed_date ||
                asset.disposed_date === '0000-00-00' ||
                asset.disposed_date === '0000-00-00T00:00:00.000Z' ||
                asset.disposed_date === '1899-11-29T17:04:35.000Z'
                  ? '-'
                  : (() => {
                      const d = new Date(asset.disposed_date);
                      return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
                    })()
              }</span></div>
            </div>
          </section>
{/* Specs Info */}
          <section className={`rounded-lg shadow p-6 mb-6 ${getRandomCardColor(2)}`}>
            <h2 className="text-xl font-bold border-b pb-2 mb-4 flex items-center gap-2">
              {/* Optionally add an icon here */}
              Specs
            </h2>
            {asset.specs ? (
              <div className="grid grid-cols-1 gap-y-2">
                <div className="flex"><span className="w-40 font-semibold">Category:</span> <span>{asset.specs?.categories?.name || asset.categories?.name || '-'}</span></div>
                <div className="flex"><span className="w-40 font-semibold">Brand:</span> <span>{asset.specs?.brands?.name || asset.brands?.name || '-'}</span></div>
                <div className="flex"><span className="w-40 font-semibold">Model:</span> <span>{asset.specs?.models?.name || asset.models?.name || '-'}</span></div>
                {asset.specs.cpu && <div className="flex"><span className="w-40 font-semibold">CPU:</span> <span>{asset.specs.cpu}</span></div>}
                {asset.specs.cpu_generation && <div className="flex"><span className="w-40 font-semibold">CPU Gen:</span> <span>{asset.specs.cpu_generation}</span></div>}
                {asset.specs.memory_size && <div className="flex"><span className="w-40 font-semibold">Memory (GB):</span> <span>{asset.specs.memory_size}</span></div>}
                {asset.specs.storage_size && <div className="flex"><span className="w-40 font-semibold">Storage (GB):</span> <span>{asset.specs.storage_size}</span></div>}
                {asset.specs.os && <div className="flex"><span className="w-40 font-semibold">OS:</span> <span>{asset.specs.os}</span></div>}
                {asset.specs.screen_size && <div className="flex"><span className="w-40 font-semibold">Screen Size:</span> <span>{asset.specs.screen_size}</span></div>}
                {asset.specs.transmission && <div className="flex"><span className="w-40 font-semibold">Transmission:</span> <span>{asset.specs.transmission}</span></div>}
                {asset.specs.fuel_type && <div className="flex"><span className="w-40 font-semibold">Fuel Type:</span> <span>{asset.specs.fuel_type}</span></div>}
                {asset.specs.cubic_meter && <div className="flex"><span className="w-40 font-semibold">Cubic Meter:</span> <span>{asset.specs.cubic_meter}</span></div>}
                {asset.specs.chassis_no && <div className="flex"><span className="w-40 font-semibold">Chassis No:</span> <span>{asset.specs.chassis_no}</span></div>}
                {asset.specs.engine_no && <div className="flex"><span className="w-40 font-semibold">Engine No:</span> <span>{asset.specs.engine_no}</span></div>}
                {/* Installed Software: Only for Computers */}
                {asset.types?.type_id === 1 && (
                  <div className="flex"><span className="w-40 font-semibold">Installed Software:</span>
                    <span>
                      {Array.isArray(asset.specs.installed_software) && asset.specs.installed_software.length > 0 ? (
                        <ul className="list-disc list-inside ml-2">
                          {asset.specs.installed_software.map((sw: any) => (
                            <li key={sw.id}>
                              {sw.name} <span className="text-xs text-gray-400">({sw.installed_at ? new Date(sw.installed_at).toLocaleDateString() : '-'})</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span>-</span>
                      )}
                    </span>
                  </div>
                )}
                {/* Additional software fields */}
                {asset.specs.microsoft_office && <div className="flex"><span className="w-40 font-semibold">Microsoft Office:</span> <span>{asset.specs.microsoft_office}</span></div>}
                {asset.specs.additional_software && <div className="flex"><span className="w-40 font-semibold">Additional Software:</span> <span>{asset.specs.additional_software}</span></div>}
                {asset.specs.antivirus && <div className="flex"><span className="w-40 font-semibold">Antivirus:</span> <span>{asset.specs.antivirus}</span></div>}
              </div>
            ) : (
              <div className="text-gray-400">No specs data</div>
            )}
          </section>

          {/* Owner Info */}
          <section className={`rounded-lg shadow p-6 mb-6 ${getRandomCardColor(1)}`}>
            <h2 className="text-xl font-bold border-b pb-2 mb-4 flex items-center gap-2">
              {/* Optionally add an icon here */}
              Owner Info
            </h2>
            {asset.owner && asset.owner.length > 0 ? (
              <>
                {/* Current Owner */}
                <div className="mb-6">
                  <div className="font-semibold text-blue-700">Current Owner</div>
                  <div className="grid grid-cols-1 gap-y-2 mt-2">
                    <div className="flex"><span className="w-40 font-semibold">Name:</span> <span>{asset.owner[asset.owner.length - 1].name}</span></div>
                    <div className="flex"><span className="w-40 font-semibold">Department:</span> <span>{asset.owner[asset.owner.length - 1].department || '-'}</span></div>
                    <div className="flex"><span className="w-40 font-semibold">District:</span> <span>{asset.owner[asset.owner.length - 1].district || '-'}</span></div>
                    <div className="flex"><span className="w-40 font-semibold">Cost Center:</span> <span>{asset.owner[asset.owner.length - 1].cost_center || '-'}</span></div>
                    <div className="flex"><span className="w-40 font-semibold">Effective Date:</span> <span>{asset.owner[asset.owner.length - 1].effective_date ? new Date(asset.owner[asset.owner.length - 1].effective_date).toLocaleDateString() : '-'}</span></div>
                    <div className="flex"><span className="w-40 font-semibold">Ramco ID:</span> <span>{asset.owner[asset.owner.length - 1].ramco_id || '-'}</span></div>
                  </div>
                </div>
                {/* Timeline for Historical Owners */}
                {asset.owner.length > 1 && (
                  <div>
                    <div className="font-semibold text-gray-600 mb-2">Historical Owners</div>
                    <ol className="relative border-l border-gray-300 ml-4 max-h-64 overflow-y-hidden hover:overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                      {asset.owner
                        .slice(0, -1)
                        .slice()
                        .reverse()
                        .map((o: any, idx: number) => (
                          <li key={o.id || idx} className="mb-6 ml-4">
                            <div className="absolute w-3 h-3 bg-gray-300 rounded-full -left-1.5 border border-white"></div>
                            <div className="text-sm text-gray-700 font-semibold">{o.effective_date ? new Date(o.effective_date).toLocaleDateString() : '-'}</div>
                            <div className="text-sm">Name: <span className="font-medium">{o.name || '-'}</span></div>
                            <div className="text-sm">Department: <span className="font-medium">{o.department || '-'}</span></div>
                            <div className="text-sm">District: <span className="font-medium">{o.district || '-'}</span></div>
                            <div className="text-sm">Cost Center: <span className="font-medium">{o.cost_center || '-'}</span></div>
                            <div className="text-sm">Ramco ID: <span className="font-medium">{o.ramco_id || '-'}</span></div>
                          </li>
                        ))}
                    </ol>
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-400">No owner data</div>
            )}
          </section>
          
        </div>
      </div>
    </div>
  );
};

export default DetailAsset;
