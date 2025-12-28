'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SingleSelect, type ComboboxOption } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { AuthContext } from '@/store/AuthContext';
import { Package, ArrowLeft, Save, FileText, Home, ChevronRight, Copy, Trash2, CheckCircle, Info, Search, RefreshCcw, Link2 } from 'lucide-react';
import ActionSidebar from '@/components/ui/action-aside';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


interface PurchaseData {
  id: number;
  request_id?: number;
  items: string;
  items_details?: string;
  request_type: string;
  costcenter?: { id: number; name: string } | string;
  requestor?: { ramco_id: string; full_name: string } | string;
  type?: { id: number; name: string; icon?: string } | string;
  type_detail?: { id: number; name: string } | string;
  supplier?: { id: number; name: string } | string;
  brand?: { id: number; name: string } | string;
  qty: number;
  unit_price: string;
  total_price?: string;
  pr_no?: string;
  pr_date?: string;
  do_no?: string;
  do_date?: string;
  inv_no?: string;
  inv_date?: string;
  deliveries?: Array<{
    id: number;
    do_no?: string;
    do_date?: string;
    inv_no?: string;
    inv_date?: string;
    grn_no?: string;
    grn_date?: string;
    upload_url?: string;
  }>;
}

interface AssetFormData {
  register_number: string;
  model: string;
  brand: string;
  category: string;
  costcenter: string;
  description: string;
  location: string;
  condition: string;
  classification: string;
  warranty_period: string; // years
  notes: string;
}

interface AssetItem extends AssetFormData {
  id: string;
  registered?: boolean;
  customBrand?: boolean;
  customModel?: boolean;
  registry_id?: number | string;
  model_id?: number | null;
}

interface ModelOption {
  id: number;
  name: string;
  brand?: string;
}

interface BrandOption {
  id: number;
  name: string;
  icon?: string;
}

interface CostCenterOption {
  id: number;
  name: string;
  code?: string;
}

interface LocationOption {
  id: number;
  name: string;
  building?: string;
}

interface CategoryOption {
  id: number;
  name: string;
}

const PurchaseAssetRegistration: React.FC = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const purchaseId = params?.pr as string;
  const typeId = searchParams?.get('type') || '';
  const editMode = searchParams?.get('edit') === 'true';

  const [purchase, setPurchase] = useState<PurchaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assetItems, setAssetItems] = useState<AssetItem[]>([]);
  const [visibleAssetCount, setVisibleAssetCount] = useState(2); // Initially show only 2 forms
  const [sameModel, setSameModel] = useState(true);
  const [brandOptions, setBrandOptions] = useState<BrandOption[]>([]);
  const [modelOptionsCache, setModelOptionsCache] = useState<Record<string, ModelOption[]>>({});
  const [costCenterOptions, setCostCenterOptions] = useState<CostCenterOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [creatingModel, setCreatingModel] = useState(false);
  const [bulkBrandCustom, setBulkBrandCustom] = useState(false);
  const [bulkModelCustom, setBulkModelCustom] = useState(false);
  const [loadingCostCenters, setLoadingCostCenters] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [modelMatchLoadingKey, setModelMatchLoadingKey] = useState<string | null>(null);
  const [modelMatchResults, setModelMatchResults] = useState<Record<string, string[]>>({});
  const [modelTooltipOpenKey, setModelTooltipOpenKey] = useState<string | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successSummary, setSuccessSummary] = useState('');
  const [bulkFormData, setBulkFormData] = useState<Omit<AssetFormData, 'register_number'>>({
    model: '',
    brand: '',
    category: '',
    costcenter: '',
    description: '',
    location: '',
    condition: 'new',
    classification: 'Asset',
    warranty_period: '',
    notes: ''
  });

  // Action Sidebar: existing assets and target mapping
  const [assetSearch, setAssetSearch] = useState('');
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [existingAssets, setExistingAssets] = useState<any[]>([]);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  // Tabs: active pane
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  // Registry assets loaded from backend (if any)
  const [registryAssets, setRegistryAssets] = useState<any[] | null>(null);
  // Registry across all purchases for this type (for de-dup in mapping list)
  const [registryAll, setRegistryAll] = useState<any[] | null>(null);
  const [loadingRegistryAll, setLoadingRegistryAll] = useState(false);
  const auth = React.useContext(AuthContext);

  useEffect(() => {
    if (purchaseId) {
      fetchPurchaseData();
    }
  }, [purchaseId]);

  useEffect(() => {
    if (purchase && purchase.qty > 0 && !(registryAssets && registryAssets.length > 0)) {
      initializeAssetItems();
      setVisibleAssetCount(Math.min(purchase.qty, 2));
    }
  }, [purchase, sameModel, registryAssets]);

  useEffect(() => {
    if (typeId) {
      fetchBrandOptions();
      fetchCategoryOptions();
    }
    fetchCostCenterOptions();
    fetchLocationOptions();
  }, [typeId]);

  useEffect(() => {
    if (!brandOptions.length) return;
    const names = new Set<string>();
    if (bulkFormData.brand && !bulkBrandCustom) names.add(bulkFormData.brand);
    assetItems.forEach(a => {
      if (a.brand && !a.customBrand) names.add(a.brand);
    });
    names.forEach(name => {
      loadModelsForBrand(name);
    });
  }, [brandOptions, bulkFormData.brand, bulkBrandCustom, assetItems]);

  useEffect(() => {
    if (!brandOptions.length) return;
    if (bulkFormData.brand && !brandOptions.some(b => b.name === bulkFormData.brand)) {
      setBulkBrandCustom(true);
      setBulkModelCustom(true);
    }
    setAssetItems(prev => prev.map(item => {
      const brandMissing = !!(item.brand && !brandOptions.some(b => b.name === item.brand));
      if (!brandMissing || item.customBrand) return item;
      return { ...item, customBrand: true, customModel: true };
    }));
  }, [brandOptions, bulkFormData.brand]);

  useEffect(() => {
    const bulkModels = modelOptionsCache[bulkFormData.brand] || [];
    if (bulkModels.length && bulkFormData.model && !bulkModels.some(m => m.name === bulkFormData.model)) {
      setBulkModelCustom(true);
    }
    setAssetItems(prev => prev.map(item => {
      const options = modelOptionsCache[item.brand] || [];
      if (!options.length || item.customModel) return item;
      if (item.model && !options.some(o => o.name === item.model)) {
        return { ...item, customModel: true };
      }
      return item;
    }));
  }, [modelOptionsCache, bulkFormData.brand, bulkFormData.model]);

  // Fetch registry assets for this purchase id
  useEffect(() => {
    if (!purchaseId) return;
    const load = async () => {
      try {
        const res = await authenticatedApi.get(`/api/purchases/registry?pr=${purchaseId}`);
        const data = (res as any).data?.data || (res as any).data || [];
        setRegistryAssets(Array.isArray(data) && data.length > 0 ? data : []);
      } catch (e) {
        console.warn('Failed to load purchase registry', e);
        setRegistryAssets([]);
      }
    };
    load();
  }, [purchaseId]);

  // Map registry assets to UI items once options are available
  useEffect(() => {
    if (!purchase) return;
    if (!registryAssets || registryAssets.length === 0) return;

    const mapIdToName = <T extends { id: number; name: string }>(options: T[], id?: number | null): string => {
      if (!id) return '';
      const found = options.find(o => Number(o.id) === Number(id));
      return found ? found.name : '';
    };

    let items: AssetItem[] = registryAssets.map((a: any, idx: number) => ({
      id: `asset_${idx + 1}`,
      register_number: a.register_number || '',
      model: a.model || '',
      brand: mapIdToName(brandOptions as any, a.brand_id) || (typeof (purchase as any).brand === 'string' ? (purchase as any).brand : ((purchase as any).brand?.name || '')),
      category: mapIdToName(categoryOptions as any, a.category_id) || (typeof (purchase as any).category === 'string' ? (purchase as any).category : ((purchase as any).category?.name || '')),
      costcenter: mapIdToName(costCenterOptions as any, a.costcenter_id) || (() => { const cc: any = (purchase as any).costcenter ?? (purchase as any).request?.costcenter; return typeof cc === 'string' ? cc : (cc?.name || ''); })(),
      description: a.description || (purchase as any).items || (purchase as any).description || '',
      location: mapIdToName(locationOptions as any, a.location_id) || getDefaultLocationName() || '',
      condition: a.item_condition || 'new',
      classification: a.classification || 'Asset',
      warranty_period: '',
      notes: '',
      registered: !editMode,
      registry_id: a.id,
      model_id: (a as any)?.model_id ?? (typeof (a as any).model === 'object' ? (a as any).model?.id : undefined),
      customBrand: false,
      customModel: false
    }));

    // Append blank items if purchase quantity is larger than registry count
    const remaining = Math.max(0, (purchase.qty || 0) - items.length);
    if (remaining > 0) {
      const defaultModel = (
        (purchase as any).items || (purchase as any).description ||
        (typeof (purchase as any).category === 'string' ? (purchase as any).category : (purchase as any).category?.name) ||
        (typeof (purchase as any).brand === 'string' ? (purchase as any).brand : (purchase as any).brand?.name || '')
      );
      const defaultCategory = (() => {
        const cat: any = (purchase as any).category;
        return typeof cat === 'string' ? cat : (cat?.name || '');
      })();
      const purchaseCostcenter = (() => {
        const cc: any = (purchase as any).costcenter ?? (purchase as any).request?.costcenter;
        if (typeof cc === 'string') return cc;
        return cc?.name || '';
      })();
      for (let i = 0; i < remaining; i++) {
        items.push({
          id: `asset_${items.length + 1}`,
          register_number: '',
          model: defaultModel,
          brand: typeof (purchase as any).brand === 'string' ? (purchase as any).brand : ((purchase as any).brand?.name || ''),
          category: defaultCategory,
          costcenter: purchaseCostcenter,
          description: (purchase as any).items || (purchase as any).description || '',
          location: '',
          condition: 'new',
          classification: 'Asset',
          warranty_period: '',
      notes: '',
        registered: false,
        customBrand: false,
        customModel: false
      });
    }
    }

    if (items.length > 0) {
      setAssetItems(items);
      setVisibleAssetCount(Math.min(items.length, 2));
      setActiveTab(items[0].id);
      // Also set bulk defaults based on first item
      const first = items[0];
      setBulkFormData(prev => ({
        ...prev,
        model: first.model,
        brand: first.brand,
        category: first.category,
        costcenter: first.costcenter,
        description: first.description,
        location: first.location,
        condition: first.condition,
        classification: first.classification,
      }));
    }
  }, [registryAssets, brandOptions, categoryOptions, costCenterOptions, locationOptions, purchase]);

  // After locations load, set default location for bulk and any asset missing location
  useEffect(() => {
    const def = getDefaultLocationName();
    if (!def) return;
    setBulkFormData(prev => prev.location ? prev : { ...prev, location: def });
    setAssetItems(prev => prev.map(it => it.location ? it : { ...it, location: def }));
  }, [locationOptions]);

  // Fetch existing active assets when sidebar opens or dependencies change
  useEffect(() => {
    if (showSidebar) {
      fetchExistingAssets();
    }
  }, [typeId, showSidebar, purchase]);

  // Fetch registry across all purchases by type when sidebar opens (used to filter duplicates)
  useEffect(() => {
    if (!showSidebar) return;
    const tId = typeId
      || (purchase && typeof (purchase as any).type_detail === 'object' ? String((purchase as any).type_detail.id || '') : '')
      || (purchase && typeof (purchase as any).type === 'object' ? String((purchase as any).type.id || '') : '');
    if (!tId) {
      setRegistryAll([]);
      return;
    }
    const loadAll = async () => {
      setLoadingRegistryAll(true);
      try {
        const res = await authenticatedApi.get(`/api/purchases/registry/all?type=${tId}`);
        const data = (res as any).data?.data || (res as any).data || [];
        setRegistryAll(Array.isArray(data) ? data : []);
      } catch (e) {
        console.warn('Failed to load registry/all', e);
        setRegistryAll([]);
      } finally {
        setLoadingRegistryAll(false);
      }
    };
    loadAll();
  }, [showSidebar, typeId, purchase]);

  const fetchPurchaseData = async () => {
    setLoading(true);
    try {
      const response = await authenticatedApi.get(`/api/purchases/${purchaseId}`);
      const data = (response as any).data?.data || (response as any).data;
      // Normalize API differences: map costcenter_detail(s) -> costcenter
      const normalized: any = { ...data };
      // Newer payloads may nest request info
      if (normalized.request) {
        // request type
        if (!normalized.request_type && normalized.request.request_type) {
          normalized.request_type = normalized.request.request_type;
        }
        // requestor
        if (!normalized.requestor && normalized.request.requested_by) {
          normalized.requestor = normalized.request.requested_by;
        }
        // cost center
        if (!normalized.costcenter && normalized.request.costcenter) {
          normalized.costcenter = normalized.request.costcenter;
        }
        // request id
        if (!normalized.request_id && normalized.request.id) {
          normalized.request_id = normalized.request.id;
        }
        // pr meta
        if (!normalized.pr_no && normalized.request.pr_no) normalized.pr_no = normalized.request.pr_no;
        if (!normalized.pr_date && normalized.request.pr_date) normalized.pr_date = normalized.request.pr_date;
      }
      // Legacy variants
      if (!normalized.costcenter) {
        const cc = normalized.costcenter_detail ?? normalized.costcenter_details;
        if (cc) normalized.costcenter = cc;
      }
      // Item/description mapping
      if (!normalized.items && normalized.description) {
        normalized.items = normalized.description;
      }
      setPurchase(normalized);
    } catch (error) {
      toast.error('Failed to load purchase data');
      console.error('Error loading purchase:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAssets = async () => {
    setLoadingAssets(true);
    try {
      const qs = new URLSearchParams({ status: 'active' });
      // Prefer query param typeId; fallback to purchase.type_detail.id or purchase.type.id
      const tId = typeId
        || (purchase && typeof (purchase as any).type_detail === 'object' ? String((purchase as any).type_detail.id || '') : '')
        || (purchase && typeof (purchase as any).type === 'object' ? String((purchase as any).type.id || '') : '');
      if (tId) qs.set('manager', String(tId));
      // If brand id available on purchase, include it to filter
      const bId = (purchase && typeof (purchase as any).brand === 'object' && (purchase as any).brand?.id) ? String((purchase as any).brand.id) : '';
      if (bId) qs.set('brand', bId);
      const response = await authenticatedApi.get(`/api/assets?${qs.toString()}`);
      const data = (response as any).data?.data || (response as any).data || [];
      setExistingAssets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load existing assets:', error);
      setExistingAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  };

  const mapRegisterNumberToActive = (registerNo: string) => {
    if (!assetItems || assetItems.length === 0) return;
    const rn = String(registerNo || '').toUpperCase().trim();
    if (!rn) {
      toast.error('Invalid register number');
      return;
    }
    // Prevent duplicates: already registered in system or already used in current form
    const registrySet = new Set(
      (registryAll || []).map((r: any) => String(r.register_number || '').toUpperCase().trim()).filter(Boolean)
    );
    const usedSet = new Set(
      (assetItems || []).map((i: any) => String(i.register_number || '').toUpperCase().trim()).filter(Boolean)
    );
    if (registrySet.has(rn)) {
      toast.error('Register number already registered');
      return;
    }
    if (usedSet.has(rn)) {
      toast.error('Register number already used in this form');
      return;
    }
    const targetId = activeAssetId || assetItems.find(a => !a.register_number)?.id || assetItems[0]?.id || null;
    if (!targetId) {
      toast.error('No asset form available to map');
      return;
    }
    setAssetItems(prev => prev.map(item => item.id === targetId ? { ...item, register_number: rn } : item));
    requestAnimationFrame(() => scrollToAsset(targetId));
    toast.success('Register number mapped');
    setShowSidebar(false);
  };

  const fetchBrandOptions = async () => {
    if (!typeId) return;

    setLoadingBrands(true);
    try {
      const response = await authenticatedApi.get(`/api/assets/brands?type=${typeId}`);
      const data = (response as any).data?.data || (response as any).data || [];
      setBrandOptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load brand options:', error);
      setBrandOptions([]);
    } finally {
      setLoadingBrands(false);
    }
  };

  const getBrandIdByName = (name: string): number | undefined => {
    const found = brandOptions.find(b => b.name === name);
    return found?.id;
  };

  const getCategoryIdByName = (name: string): number | undefined => {
    const found = categoryOptions.find(c => c.name === name);
    return found?.id;
  };

  const getModelIdByName = (brandName: string, modelName: string): number | undefined => {
    const models = modelOptionsCache[brandName] || [];
    const found = models.find(m => m.name === modelName);
    return found?.id;
  };

  // Helper: surface similar brands/models to reduce duplicates when adding new entries
  const findBrandMatches = (term: string): string[] => {
    const t = (term || '').trim().toLowerCase();
    if (t.length < 2) return [];
    return brandOptions
      .filter(b => (b.name || '').toLowerCase().includes(t))
      .map(b => b.name)
      .slice(0, 5);
  };

  const findModelMatches = (brandName: string, term: string): string[] => {
    const t = (term || '').trim().toLowerCase();
    if (t.length < 2) return [];
    const models = modelOptionsCache[brandName] || [];
    return models
      .filter(m => (m.name || '').toLowerCase().includes(t))
      .map(m => m.name)
      .slice(0, 5);
  };

  const loadModelsForBrand = async (brandName: string, forceReload = false) => {
    const name = (brandName || '').trim();
    if (!name) return;
    if (!forceReload && modelOptionsCache[name]) return;
    const brandId = getBrandIdByName(name);
    if (!brandId) {
      setModelOptionsCache(prev => ({ ...prev, [name]: [] }));
      return;
    }
    try {
      const res = await authenticatedApi.get<{ data: ModelOption[] }>(`/api/assets/models?brand=${brandId}`);
      const data = (res as any).data?.data || res.data?.data || [];
      setModelOptionsCache(prev => ({ ...prev, [name]: Array.isArray(data) ? data : [] }));
    } catch (e) {
      console.error('Failed to load models for brand', brandId, e);
      setModelOptionsCache(prev => ({ ...prev, [name]: [] }));
    }
  };

  const fetchCostCenterOptions = async () => {
    setLoadingCostCenters(true);
    try {
      const response = await authenticatedApi.get('/api/assets/costcenters');
      const data = (response as any).data?.data || (response as any).data || [];
      setCostCenterOptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load cost center options:', error);
      setCostCenterOptions([]);
    } finally {
      setLoadingCostCenters(false);
    }
  };

  const fetchLocationOptions = async () => {
    setLoadingLocations(true);
    try {
      const response = await authenticatedApi.get('/api/assets/locations');
      const data = (response as any).data?.data || (response as any).data || [];
      setLocationOptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load location options:', error);
      setLocationOptions([]);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchCategoryOptions = async () => {
    if (!typeId) return;
    setLoadingCategories(true);
    try {
      const response = await authenticatedApi.get(`/api/assets/categories?type=${typeId}`);
      const data = (response as any).data?.data || (response as any).data || [];
      setCategoryOptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load category options:', error);
      setCategoryOptions([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Default location name resolved from options for id=2
  const getDefaultLocationName = (): string => {
    const loc = locationOptions.find((l: any) => Number(l.id) === 2);
    return loc ? loc.name : '';
  };

  const initializeAssetItems = () => {
    if (!purchase) return;

    const items: AssetItem[] = [];
    // Prefer item/description text for model; fall back to category name; last resort brand name
    const defaultModel = (
      (purchase as any).items || (purchase as any).description ||
      (typeof (purchase as any).category === 'string' ? (purchase as any).category : (purchase as any).category?.name) ||
      (typeof purchase.brand === 'string' ? purchase.brand : (purchase.brand?.name || ''))
    );
    const defaultCategory = (() => {
      const cat: any = (purchase as any).category;
      return typeof cat === 'string' ? cat : (cat?.name || '');
    })();
    const purchaseCostcenter = (() => {
      const cc: any = (purchase as any).costcenter ?? (purchase as any).costcenter_detail ?? (purchase as any).costcenter_details;
      if (typeof cc === 'string') return cc;
      return cc?.name || '';
    })();

    // Pre-fill bulk form data
    setBulkFormData({
      model: defaultModel,
      brand: typeof purchase.brand === 'string' ? purchase.brand : (purchase.brand?.name || ''),
      category: defaultCategory,
      costcenter: purchaseCostcenter,
      description: (purchase as any).items || (purchase as any).description || '',
      location: getDefaultLocationName() || '',
      condition: 'new',
      classification: 'Asset',
      warranty_period: '',
      notes: ''
    });

    for (let i = 0; i < purchase.qty; i++) {
      items.push({
        id: `asset_${i + 1}`,
        register_number: '',
        model: defaultModel,
        brand: typeof purchase.brand === 'string' ? purchase.brand : (purchase.brand?.name || ''),
        category: defaultCategory,
        costcenter: purchaseCostcenter,
        description: (purchase as any).items || (purchase as any).description || '',
        location: getDefaultLocationName() || '',
        condition: 'new',
        classification: 'Asset',
        warranty_period: '',
        notes: '',
        registered: false,
        customBrand: false,
        customModel: false
      });
    }
    setAssetItems(items);
    // Ensure first tab active on load
    if (items.length > 0) setActiveTab(items[0].id);
  };

  const handleAssetChange = (id: string, field: keyof AssetFormData, value: string) => {
    let next = value;
    if (field === 'register_number') {
      next = (value || '').toUpperCase();
    } else if (field === 'warranty_period') {
      next = (value || '').replace(/\D+/g, '');
    }
    setAssetItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: next } : item
    ));
  };

  const addMoreAssets = () => {
    if (purchase && visibleAssetCount < purchase.qty) {
      setVisibleAssetCount(prev => Math.min(prev + 1, purchase.qty));
    }
  };

  // Complete for overview: only register number must be present
  const isAssetOverviewComplete = (asset: AssetItem): boolean => {
    const isSoftware = asset.category?.toLowerCase() === 'software';
    return isSoftware || !!asset.register_number?.trim();
  };

  // Complete for card ring/collapse: all fields except description
  const isAssetFormComplete = (asset: AssetItem): boolean => {
    return !!(
      asset.register_number &&
      asset.warranty_period !== undefined &&
      asset.condition &&
      asset.brand &&
      asset.model &&
      asset.category &&
      asset.classification &&
      asset.costcenter &&
      asset.location
    );
  };

  // Helper function to check if a field is filled
  const isFieldFilled = (value: string): boolean => {
    return value.trim() !== '';
  };

  // Field rings disabled per requirement
  const getFieldRingClass = (_value: string): string => '';

  // Toggle collapse state for an asset
  // Collapse disabled per requirement

  // Scroll to specific asset form
  const scrollToAsset = (assetId: string) => {
    // Switch to corresponding tab first
    setActiveTab(assetId);
    const element = document.getElementById(`asset-card-${assetId}`);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  const handleBulkChange = (field: keyof Omit<AssetFormData, 'register_number'>, value: string) => {
    setBulkFormData(prev => ({ ...prev, [field]: value }));

    if (sameModel) {
      setAssetItems(prev => prev.map(item => ({ ...item, [field]: value })));
    }
  };

  const handleBulkBrandSelect = (value: string) => {
    if (!value) {
      setBulkBrandCustom(false);
      setBulkModelCustom(false);
      setBulkFormData(prev => ({ ...prev, brand: '' }));
      if (sameModel) {
        setAssetItems(prev => prev.map(item => ({ ...item, brand: '', customBrand: false, model: '', model_id: undefined, customModel: false })));
      }
      return;
    }
    if (value === '__add_new_brand') {
      setBulkBrandCustom(true);
      setBulkFormData(prev => ({ ...prev, brand: '' }));
      setBulkModelCustom(true);
      if (sameModel) {
        setAssetItems(prev => prev.map(item => ({ ...item, brand: '', customBrand: true, model: '', model_id: undefined, customModel: true })));
      }
      return;
    }
    setBulkBrandCustom(false);
    setBulkModelCustom(false);
    setBulkFormData(prev => ({ ...prev, brand: value }));
    loadModelsForBrand(value);
    if (sameModel) {
      setAssetItems(prev => prev.map(item => ({ ...item, brand: value, customBrand: false, model: '', model_id: undefined, customModel: false })));
    }
  };

  const handleBulkBrandInput = (value: string) => {
    const val = value;
    const isEmpty = val.trim() === '';
    setBulkBrandCustom(!isEmpty);
    setBulkModelCustom(!isEmpty);
    setBulkFormData(prev => ({ ...prev, brand: val, model: isEmpty ? '' : prev.model }));
    if (sameModel) {
      setAssetItems(prev => prev.map(item => ({
        ...item,
        brand: val,
        customBrand: !isEmpty,
        model: '',
        model_id: undefined,
        customModel: !isEmpty
      })));
    }
  };

  const handleBulkModelSelect = (value: string) => {
    if (!value) {
      setBulkModelCustom(false);
      setBulkFormData(prev => ({ ...prev, model: '' }));
      if (sameModel) {
        setAssetItems(prev => prev.map(item => ({ ...item, model: '', model_id: undefined, customModel: false })));
      }
      return;
    }
    if (value === '__add_new_model') {
      setBulkModelCustom(true);
      setBulkFormData(prev => ({ ...prev, model: '' }));
      if (sameModel) {
        setAssetItems(prev => prev.map(item => ({ ...item, model: '', model_id: undefined, customModel: true })));
      }
      return;
    }
    setBulkModelCustom(false);
    setBulkFormData(prev => ({ ...prev, model: value }));
    if (sameModel) {
      setAssetItems(prev => prev.map(item => ({
        ...item,
        model: value,
        model_id: getModelIdByName(item.brand, value) ?? item.model_id,
        customModel: false
      })));
    }
  };

  const handleBulkModelInput = (value: string) => {
    const val = value;
    const isEmpty = val.trim() === '';
    setBulkModelCustom(!isEmpty);
    setBulkFormData(prev => ({ ...prev, model: val }));
    if (sameModel) {
      setAssetItems(prev => prev.map(item => ({ ...item, model: val, customModel: !isEmpty })));
    }
  };

  const handleAssetBrandSelect = (id: string, value: string) => {
    if (!value) {
      setAssetItems(prev => prev.map(item => item.id === id ? { ...item, brand: '', customBrand: false, model: '', customModel: false } : item));
      return;
    }
    if (value === '__add_new_brand') {
      setAssetItems(prev => prev.map(item => item.id === id ? { ...item, brand: '', customBrand: true, model: '', customModel: true } : item));
      setActiveAssetId(id);
      return;
    }
    loadModelsForBrand(value);
    setAssetItems(prev => prev.map(item => item.id === id ? { ...item, brand: value, customBrand: false, model: '', customModel: false } : item));
  };

  const handleAssetBrandInput = (id: string, value: string) => {
    const isEmpty = value.trim() === '';
    setAssetItems(prev => prev.map(item => item.id === id ? { ...item, brand: value, customBrand: !isEmpty, model: '', model_id: undefined, customModel: !isEmpty } : item));
  };

  const handleAssetModelSelect = (id: string, value: string) => {
    if (!value) {
      setAssetItems(prev => prev.map(item => item.id === id ? { ...item, model: '', model_id: undefined, customModel: false } : item));
      return;
    }
    if (value === '__add_new_model') {
      setAssetItems(prev => prev.map(item => item.id === id ? { ...item, model: '', model_id: undefined, customModel: true } : item));
      return;
    }
    setAssetItems(prev => prev.map(item => item.id === id ? {
      ...item,
      model: value,
      model_id: getModelIdByName(item.brand, value) ?? item.model_id,
      customModel: false
    } : item));
  };

  const createBrand = async (name: string, scope: 'bulk' | 'asset', assetId?: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      toast.error('Enter brand name');
      return;
    }
    if (!typeId) {
      toast.error('Type is required before adding a brand');
      return;
    }
    setCreatingBrand(true);
    try {
      await authenticatedApi.post('/api/assets/brands', { name: trimmed, type_id: Number(typeId) });
      // Refresh brands to obtain ids
      await fetchBrandOptions();
      toast.success('Brand added');
      // Update form selection
      if (scope === 'bulk') {
        setBulkBrandCustom(false);
        setBulkModelCustom(false);
        setBulkFormData(prev => ({ ...prev, brand: trimmed, model: '' }));
        if (sameModel) {
          setAssetItems(prev => prev.map(item => ({ ...item, brand: trimmed, customBrand: false, model: '', customModel: false })));
        }
      } else if (scope === 'asset' && assetId) {
        setAssetItems(prev => prev.map(item => item.id === assetId ? { ...item, brand: trimmed, customBrand: false, model: '', customModel: false } : item));
      }
      // Preload models for new brand
      setModelOptionsCache(prev => { const next = { ...prev }; delete next[trimmed]; return next; });
      loadModelsForBrand(trimmed, true);
    } catch (e) {
      toast.error('Failed to add brand');
      console.error('Create brand error', e);
    } finally {
      setCreatingBrand(false);
    }
  };

  const createModel = async (modelName: string, brandName: string, categoryName: string, scope: 'bulk' | 'asset', assetId?: string) => {
    const trimmed = (modelName || '').trim();
    if (!trimmed) {
      toast.error('Enter model name');
      return;
    }
    const brandId = getBrandIdByName(brandName);
    if (!brandId) {
      toast.error('Save/select a brand first');
      return;
    }
    const payload: any = { name: trimmed, brand_id: brandId };
    const catId = getCategoryIdByName(categoryName);
    if (catId) payload.category_id = catId;
    if (typeId) payload.type_id = Number(typeId);

    setCreatingModel(true);
    try {
      await authenticatedApi.post('/api/assets/models', payload);
      toast.success('Model added');
      // refresh models for this brand
      setModelOptionsCache(prev => { const next = { ...prev }; delete next[brandName]; return next; });
      await loadModelsForBrand(brandName, true);
      if (scope === 'bulk') {
        setBulkModelCustom(false);
        setBulkFormData(prev => ({ ...prev, model: trimmed }));
        if (sameModel) {
          setAssetItems(prev => prev.map(item => ({ ...item, model: trimmed, customModel: false })));
        }
      } else if (scope === 'asset' && assetId) {
        setAssetItems(prev => prev.map(item => item.id === assetId ? { ...item, model: trimmed, customModel: false } : item));
      }
    } catch (e) {
      toast.error('Failed to add model');
      console.error('Create model error', e);
    } finally {
      setCreatingModel(false);
    }
  };

  const selectBulkModelSuggestion = (name: string) => {
    setBulkModelCustom(false);
    setBulkFormData(prev => ({ ...prev, model: name }));
    if (sameModel) {
      setAssetItems(prev => prev.map(item => ({
        ...item,
        model: name,
        model_id: getModelIdByName(item.brand, name) ?? item.model_id,
        customModel: false
      })));
    }
  };

  const selectAssetModelSuggestion = (assetId: string, name: string) => {
    setAssetItems(prev => prev.map(item => item.id === assetId ? {
      ...item,
      model: name,
      model_id: getModelIdByName(item.brand, name) ?? item.model_id,
      customModel: false
    } : item));
  };

  const fetchModelMatches = async (modelName: string, key: string) => {
    const name = (modelName || '').trim();
    if (!name) {
      toast.error('Enter a model name to match');
      return;
    }
    setModelMatchLoadingKey(key);
    setModelTooltipOpenKey(key);
    try {
      const res = await authenticatedApi.post('/api/purchases/match-models', {
        model_name: name,
        similarity_threshold: 90
      });
      const data = (res as any).data;
      const payload = data?.data || data;
      const matches = Array.isArray(payload?.matches)
        ? payload.matches
        : Array.isArray(payload)
          ? payload
          : [];
      const arr: string[] = matches.map((m: any) => (typeof m === 'string' ? m : (m?.name || m?.model_name || JSON.stringify(m))));
      setModelMatchResults(prev => ({ ...prev, [key]: arr }));
    } catch (e) {
      console.error('Failed to match models', e);
      toast.error('Failed to get matched models');
    } finally {
      setModelMatchLoadingKey(null);
    }
  };

  const handleAssetModelInput = (id: string, value: string) => {
    const isEmpty = value.trim() === '';
    setAssetItems(prev => prev.map(item => item.id === id ? { ...item, model: value, customModel: !isEmpty } : item));
  };

  const copyToAll = (field: keyof Omit<AssetFormData, 'register_number'>) => {
    const value = bulkFormData[field];
    setAssetItems(prev => prev.map(item => {
      const next: any = { ...item, [field]: value };
      if (field === 'brand') {
        next.customBrand = bulkBrandCustom;
        next.model = '';
        next.customModel = bulkBrandCustom ? true : false;
      }
      if (field === 'model') {
        next.customModel = bulkModelCustom;
      }
      return next;
    }));
    toast.success(`${field} copied to all assets`);
  };

  const generateRegisterNumbers = () => {
    const baseNumber = bulkFormData.description.replace(/\s+/g, '').substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);

    setAssetItems(prev => prev.map((item, index) => ({
      ...item,
      register_number: `${baseNumber}${timestamp}${(index + 1).toString().padStart(3, '0')}`
    })));
    toast.success('Register numbers generated');
  };

  const removeAsset = (id: string) => {
    if (assetItems.length <= 1) {
      toast.error('Cannot remove the last asset');
      return;
    }
    setAssetItems(prev => prev.filter(item => item.id !== id));
    setVisibleAssetCount(prev => Math.max(prev - 1, 1));
  };

  /**
   * Submit registered assets
   * Endpoint: POST `/api/purchases/registry`
   * Payload: {
   *   purchaseId: number,          // parent purchase id (integer)
   *   assets: Array<{
   *     register_number: string,
   *     classification: string,
   *     type_id: string,
   *     category_id: number | null,
   *     brand_id: number | null,
   *     model: string,
   *     costcenter_id: number | null,
   *     location_id: number | null,
   *     item_condition: string, // renamed from `condition` to avoid SQL reserved word
   *     description: string,
   *   }>
   * }
   */
  const handleSave = async () => {
    const invalidAssets = assetItems.filter(item => {
      const isSoftware = (item.category || '').toLowerCase() === 'software';
      const missingRegister = !isSoftware && !item.register_number?.trim();
      const missingDesc = !item.description?.trim();
      return missingRegister || missingDesc;
    });
    if (invalidAssets.length > 0) {
      toast.error('Please fill in required fields for all assets');
      return;
    }

    setSaving(true);
    try {
      // Helper mappers from names to IDs
      const brandIdByName = (name: string) => brandOptions.find(b => b.name === name)?.id;
      const costCenterIdByName = (name: string) => costCenterOptions.find(c => c.name === name)?.id;
      const locationIdByName = (name: string) => locationOptions.find(l => l.name === name)?.id;
      const categoryIdByName = (name: string) => categoryOptions.find(c => c.name === name)?.id;

      // Ensure numeric IDs in payload
      const resolvedTypeId: number | null = (() => {
        if (typeId) return Number(typeId);
        const t: any = (purchase as any)?.type_detail || (purchase as any)?.type;
        return (t && typeof t === 'object' && typeof t.id !== 'undefined') ? Number(t.id) : null;
      })();

      const buildPayload = (item: AssetItem) => ({
        register_number: (item.register_number || '').toUpperCase(),
        classification: item.classification,
        type_id: resolvedTypeId,
        category_id: categoryIdByName(item.category) ?? null,
        brand_id: ((): number | null => {
          const id = brandIdByName(item.brand);
          return typeof id === 'number' ? id : (typeof id === 'string' ? Number(id) : null);
        })(),
        model_id: getModelIdByName(item.brand, item.model) ?? item.model_id ?? null,
        model: item.model,
        warranty_period: item.warranty_period ? Number(item.warranty_period) : null,
        costcenter_id: costCenterIdByName(item.costcenter) ?? null,
        location_id: locationIdByName(item.location) ?? null,
        item_condition: item.condition,
        description: item.description,
      });

      const itemsToProcess = assetItems.filter(a => !a.registered);
      const toUpdate = itemsToProcess.filter(i => i.registry_id);
      const toCreate = itemsToProcess.filter(i => !i.registry_id);

      // Include link to parent purchase/pr for backend association (integer purchaseId)
      let updatedCount = 0;
      let createdCount = 0;

      if (toUpdate.length) {
        await Promise.all(toUpdate.map(async (item) => {
          await authenticatedApi.put(`/api/purchases/registry/${item.registry_id}`, buildPayload(item));
        }));
        updatedCount = toUpdate.length;
        toast.success('Assets updated');
      }

      if (toCreate.length) {
        const requestBody: any = {
          assets: toCreate.map(buildPayload),
          purchase_id: Number(purchaseId),
          request_id: (() => {
            const rid = (purchase as any)?.request_id ?? (purchase as any)?.request?.id;
            return typeof rid === 'number' ? rid : (rid ? Number(rid) : undefined);
          })(),
          created_by: (auth?.authData?.user?.username) || (() => {
            try { return JSON.parse(localStorage.getItem('authData') || '{}')?.user?.username || ''; } catch { return ''; }
          })(),
        };
        await authenticatedApi.post('/api/purchases/registry', requestBody);
        createdCount = toCreate.length;
        toast.success(`${toCreate.length} assets registered successfully`);
      }

      const parts = [];
      if (updatedCount) parts.push(`${updatedCount} asset${updatedCount > 1 ? 's' : ''} updated`);
      if (createdCount) parts.push(`${createdCount} asset${createdCount > 1 ? 's' : ''} registered`);
      setSuccessSummary(parts.join(' | ') || 'Assets saved');
      setSuccessDialogOpen(true);
    } catch (error) {
      toast.error('Failed to register assets');
      console.error('Error registering assets:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Navbar */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Asset Registration</h1>
                  <p className="text-sm text-gray-500">From Purchase Request</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="outline">Loading...</Badge>
                <Button variant="destructive" onClick={() => window.close()}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4 animate-pulse" />
            <p className="text-gray-600">Loading purchase data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Navbar */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Asset Registration</h1>
                  <p className="text-sm text-gray-500">From Purchase Request</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="destructive">Error</Badge>
                <Button variant="outline" onClick={() => window.close()}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <p className="text-red-600 mb-4">Purchase record not found</p>
            <Button variant="outline" onClick={() => window.close()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Close Window
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navbar */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className=" mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Asset Registration</h1>
                <div className="flex items-center text-sm text-gray-500">
                  <Home className="h-4 w-4 mr-1" />
                  <span>Purchase</span>
                  <ChevronRight className="h-4 w-4 mx-1" />
                  <span>Asset Registration</span>
                  <ChevronRight className="h-4 w-4 mx-1" />
                  <span>PR #{(purchase as any).pr_no || purchase.id}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {purchase.type && (
                <Badge variant="outline" className="flex items-center space-x-1">
                  {typeof purchase.type === 'object' && purchase.type.icon && (
                    <span className="w-4 h-4">{purchase.type.icon}</span>
                  )}
                  <span>Type: {typeof purchase.type === 'string' ? purchase.type : purchase.type.name}</span>
                </Badge>
              )}
              <Button variant="outline" className='bg-red-600 text-white border-0' onClick={() => window.close()} disabled={saving}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Close
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="min-w-7xl mx-auto p-6 space-y-6">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Purchase Information (Read-only) */}
          <Card className="lg:col-span-1 bg-linear-to-b from-sky-100 to-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Purchase Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-600">Request Type</Label>
                {(() => {
                  const rt = (purchase.request_type || '').toUpperCase();
                  const color = rt === 'CAPEX' ? 'bg-green-600' : rt === 'OPEX' ? 'bg-blue-600' : 'bg-amber-600';
                  return (
                    <div className="mt-1">
                      <Badge className={`${color} text-white`}>{purchase.request_type}</Badge>
                    </div>
                  );
                })()}
              </div>
              {/* Request Number and Date */}
              <div>
                <Label className="text-sm font-medium text-gray-600">Request Number</Label>
                <p className="font-medium text-sm">
                  {((purchase as any).pr_no || (purchase as any).request?.pr_no || 'N/A')}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Request Date</Label>
                <p className="font-medium text-sm">
                  {(() => {
                    const d = (purchase as any).pr_date || (purchase as any).request?.pr_date;
                    return d ? new Date(d).toLocaleDateString() : 'N/A';
                  })()}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Requestor</Label>
                <p className="font-medium text-sm">
                  {typeof purchase.requestor === 'string' ? purchase.requestor : (purchase.requestor?.full_name || 'N/A')}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Cost Center</Label>
                <p className="font-medium text-sm">
                  {(() => {
                    const cc: any = (purchase as any).costcenter ?? (purchase as any).costcenter_detail ?? (purchase as any).costcenter_details;
                    return typeof cc === 'string' ? cc : (cc?.name || 'N/A');
                  })()}
                </p>
              </div>
              <Separator className="my-2" />
              <div>
                <Label className="text-sm font-medium text-gray-600">Item Type</Label>
                <p className="font-medium text-sm">
                  {(() => {
                    const td = purchase.type_detail as any;
                    const t = purchase.type as any;
                    if (td) {
                      return typeof td === 'string' ? td : (td?.name || 'N/A');
                    }
                    if (t) {
                      return typeof t === 'string' ? t : (t?.name || 'N/A');
                    }
                    return 'N/A';
                  })()}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Item Description</Label>
                <p className="font-medium text-sm">{purchase.items}</p>
              </div>
              {purchase.items_details && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Item Details</Label>
                  <p className="font-medium text-sm text-gray-800 whitespace-pre-wrap">{purchase.items_details}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium text-gray-600">Quantity</Label>
                <p className="font-medium text-sm text-blue-600">{purchase.qty} items</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Unit Price</Label>
                <p className="font-medium text-sm">RM {parseFloat(purchase.unit_price || '0').toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Total Price</Label>
                <p className="font-medium text-sm">RM {(
                  purchase.total_price ? parseFloat(purchase.total_price) : (purchase.qty || 0) * parseFloat(purchase.unit_price || '0')
                ).toFixed(2)}</p>
              </div>
              <Separator className="my-2" />
              <div>
                <Label className="text-sm font-medium text-gray-600">Supplier</Label>
                <p className="font-medium text-sm">
                  {typeof purchase.supplier === 'string' ? purchase.supplier : (purchase.supplier?.name || 'N/A')}
                </p>
              </div>
              {(purchase.do_no || purchase.do_date) && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">DO</Label>
                  <p className="font-medium text-sm">
                    {purchase.do_no ? `No: ${purchase.do_no}` : ''}
                    {purchase.do_no && purchase.do_date ? ' • ' : ''}
                    {purchase.do_date ? `Date: ${new Date(purchase.do_date).toLocaleDateString()}` : ''}
                  </p>
                </div>
              )}
              {(purchase.inv_no || purchase.inv_date) && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Invoice</Label>
                  <p className="font-medium text-sm">
                    {purchase.inv_no ? `No: ${purchase.inv_no}` : ''}
                    {purchase.inv_no && purchase.inv_date ? ' • ' : ''}
                    {purchase.inv_date ? `Date: ${new Date(purchase.inv_date).toLocaleDateString()}` : ''}
                  </p>
                </div>
              )}
              {Array.isArray((purchase as any).deliveries) && (purchase as any).deliveries.length > 0 && (
                <>
                  <Separator className="my-2" />
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Deliveries</Label>
                    <div className="mt-2 grid grid-cols-1 gap-3">
                      {((purchase as any).deliveries as any[]).map((d: any, idx: number) => {
                        const isImg = typeof d.upload_url === 'string' && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(d.upload_url);
                        const fmt = (x?: string) => x ? new Date(x).toLocaleDateString('en-GB') : '';
                        return (
                          <div key={d.id || idx} className="flex items-center gap-3 rounded-md border p-3 bg-transparent border-blue-400">
                            <a
                              href={d.upload_url ? String(d.upload_url) : undefined}
                              target={d.upload_url ? "_blank" : undefined}
                              rel={d.upload_url ? "noreferrer" : undefined}
                              className="shrink-0"
                              title={d.upload_url ? 'Open file in new tab' : undefined}
                            >
                              {d.upload_url ? (
                                isImg ? (
                                  <img src={String(d.upload_url)} alt={`Delivery ${idx + 1}`} className="h-12 w-12 object-cover rounded border" />
                                ) : (
                                  <div className="h-12 w-12 rounded border flex items-center justify-center bg-gray-50">
                                    <FileText className="h-6 w-6 text-gray-500" />
                                  </div>
                                )
                              ) : (
                                <div className="h-12 w-12 rounded border flex items-center justify-center bg-gray-50">
                                  <FileText className="h-6 w-6 text-gray-500" />
                                </div>
                              )}
                            </a>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium">Delivery {idx + 1}</div>
                              <div className="text-xs text-gray-700 space-y-1">
                                {(d.do_no || d.do_date) && (
                                  <div className='flex justify-between text-xs text-blue-500'>DO: {d.do_no || '—'} {d.do_date && (<span>{fmt(d.do_date)}</span>)}</div>
                                )}
                                {(d.inv_no || d.inv_date) && (
                                  <div className='flex justify-between text-xs text-blue-500'>INV: {d.inv_no || '—'} {d.inv_date && (<span>{fmt(d.inv_date)}</span>)}</div>
                                )}
                                {(d.grn_no || d.grn_date) && (
                                  <div className='flex justify-between text-xs text-blue-500'>GRN: {d.grn_no || '—'} {d.grn_date && (<span>{fmt(d.grn_date)}</span>)}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Asset Registration Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bulk Options - no Card wrapper */}
            {purchase.qty > 1 && (
              <div className="rounded-md space-y-4 p-4 bg-white">
                <div className="text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Package className="mr-2 h-5 w-5" />
                    Bulk Configuration
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="same-model"
                        checked={sameModel}
                        onCheckedChange={setSameModel}
                      />
                      <Label htmlFor="same-model" className="text-sm">Same model for all</Label>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateRegisterNumbers}
                      disabled={!bulkFormData.description}
                    >
                      Generate Register Numbers
                    </Button>
                  </div>
                </div>
                {purchase.qty > 1 && (<>
                  {/* Row 1: Condition (justify-end) */}
                  <div className="flex justify-end">
                    <div className="w-full md:w-1/3">
                      <div className="flex items-center space-x-1 justify-between">
                        <Label htmlFor="bulk-condition">Condition</Label>
                        <Button variant="ghost" size="sm" onClick={() => copyToAll('condition')} className="h-5 w-5 p-0">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <SingleSelect
                        options={[{ value: 'new', label: 'New' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }]}
                        value={bulkFormData.condition}
                        onValueChange={(value) => handleBulkChange('condition', value)}
                        placeholder="Select condition"
                        className="h-10"
                      />
                    </div>
                  </div>

                  {/* Row 2: Category, Brand, Model */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center space-x-1">
                          <Label htmlFor="bulk-category">Category</Label>
                          <Button variant="ghost" size="sm" onClick={() => copyToAll('category')} className="h-5 w-5 p-0">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {categoryOptions.length > 0 ? (
                          <SingleSelect options={categoryOptions.map(option => ({ value: option.name, label: option.name }))} value={bulkFormData.category} onValueChange={(value) => handleBulkChange('category', value)} placeholder={loadingCategories ? 'Loading categories...' : 'Select category'} searchPlaceholder="Search categories..." disabled={loadingCategories} clearable className="h-10" />
                        ) : (
                          <Input id="bulk-category" value={bulkFormData.category} onChange={(e) => handleBulkChange('category', e.target.value)} placeholder={loadingCategories ? 'Loading categories...' : 'Enter category'} disabled={loadingCategories} className="h-10" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <Label htmlFor="bulk-brand">Brand</Label>
                          <Button variant="ghost" size="sm" onClick={() => copyToAll('brand')} className="h-5 w-5 p-0">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {brandOptions.length > 0 && !bulkBrandCustom ? (
                          <SingleSelect
                            options={[
                              ...brandOptions.map(option => ({ value: option.name, label: `${option.icon ? `${option.icon} ` : ''}${option.name}` })),
                              { value: '__add_new_brand', label: 'Add new brand...' }
                            ]}
                            value={bulkFormData.brand}
                            onValueChange={handleBulkBrandSelect}
                            placeholder={loadingBrands ? 'Loading brands...' : 'Select brand'}
                            searchPlaceholder="Search brands..."
                            disabled={loadingBrands}
                            clearable
                            className="h-10"
                          />
                        ) : (
                          <Input
                            id="bulk-brand"
                            value={bulkFormData.brand}
                            onChange={(e) => handleBulkBrandInput(e.target.value)}
                            placeholder={loadingBrands ? 'Loading brands...' : 'Enter brand'}
                            disabled={loadingBrands}
                            className="h-10"
                          />
                        )}
                        {bulkBrandCustom && bulkFormData.brand.trim() && (() => {
                          const matches = findBrandMatches(bulkFormData.brand);
                          if (!matches.length) return null;
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-blue-600 mt-1 inline-flex items-center gap-1 cursor-help">
                                  <Info className="h-3.5 w-3.5" />
                                  View similar brands
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs max-w-xs">
                                  {matches.join(', ')}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })()}
                        {bulkBrandCustom && bulkFormData.brand.trim() && (
                          <div className="mt-2 flex justify-end">
                            <Button size="sm" variant="outline" disabled={creatingBrand} onClick={() => createBrand(bulkFormData.brand, 'bulk')}>
                              {creatingBrand ? 'Saving...' : 'Save brand'}
                            </Button>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <Label htmlFor="bulk-model">Model</Label>
                          <Button variant="ghost" size="sm" onClick={() => copyToAll('model')} className="h-5 w-5 p-0">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {(!bulkBrandCustom && !bulkModelCustom && (modelOptionsCache[bulkFormData.brand]?.length || 0) > 0) ? (
                          <SingleSelect
                            options={[
                              ...(modelOptionsCache[bulkFormData.brand] || []).map(option => ({ value: option.name, label: option.name })),
                              { value: '__add_new_model', label: 'Add new model...' }
                            ]}
                            value={bulkFormData.model}
                            onValueChange={handleBulkModelSelect}
                            placeholder="Select model"
                            searchPlaceholder="Search models..."
                            clearable
                            className="h-10"
                          />
                        ) : (
                          <Input
                            id="bulk-model"
                            value={bulkFormData.model}
                            onChange={(e) => handleBulkModelInput(e.target.value)}
                            placeholder="Enter model"
                            className="h-10"
                          />
                        )}
                        {bulkModelCustom && bulkFormData.model.trim() && bulkFormData.brand && (
                          <div className="mt-2 space-y-1">
                            <Tooltip
                              open={modelTooltipOpenKey === 'bulk'}
                              onOpenChange={(open) => { if (!open && modelTooltipOpenKey === 'bulk') setModelTooltipOpenKey(null); }}
                            >
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="text-xs text-blue-600 inline-flex items-center gap-1 cursor-pointer"
                                  disabled={modelMatchLoadingKey === 'bulk'}
                                  onClick={() => fetchModelMatches(bulkFormData.model, 'bulk')}
                                >
                                  <Info className="h-3.5 w-3.5" />
                                  {modelMatchLoadingKey === 'bulk' ? 'Fetching...' : 'View similar models'}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs max-w-xs space-y-1">
                                  {modelMatchLoadingKey === 'bulk' && <div>Fetching...</div>}
                                  {modelMatchLoadingKey !== 'bulk' && (modelMatchResults['bulk']?.length
                                    ? modelMatchResults['bulk'].map(m => (
                                        <div key={m} className="flex items-center justify-between gap-2">
                                          <span>{m}</span>
                                          <button className="text-yellow-300 hover:underline" onClick={() => selectBulkModelSuggestion(m)}>Choose</button>
                                        </div>
                                      ))
                                    : <div>No matches yet</div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                            <div className="flex justify-end">
                              <Button size="sm" variant="outline" disabled={creatingModel} onClick={() => createModel(bulkFormData.model, bulkFormData.brand, bulkFormData.category, 'bulk')}>
                                {creatingModel ? 'Saving...' : 'Save model'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Row 3: Classification, Cost Center, Location */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center space-x-1">
                          <Label htmlFor="bulk-classification">Classification</Label>
                          <Button variant="ghost" size="sm" onClick={() => copyToAll('classification')} className="h-5 w-5 p-0">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <SingleSelect
                          options={[
                            { value: 'Asset', label: 'Asset' },
                            { value: 'Consumable', label: 'Consumable' },
                            { value: 'Rental', label: 'Rental' },
                            { value: 'Non-Asset', label: 'Non-Asset' },
                          ]}
                          value={bulkFormData.classification}
                          onValueChange={(value) => handleBulkChange('classification', value)}
                          placeholder="Select classification"
                          className="h-10"
                        />
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <Label htmlFor="bulk-costcenter">Cost Center</Label>
                          <Button variant="ghost" size="sm" onClick={() => copyToAll('costcenter')} className="h-5 w-5 p-0">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {costCenterOptions.length > 0 ? (
                          <SingleSelect options={costCenterOptions.map(option => ({ value: option.name, label: `${option.name}${option.code ? ` (${option.code})` : ''}` }))} value={bulkFormData.costcenter} onValueChange={(value) => handleBulkChange('costcenter', value)} placeholder={loadingCostCenters ? 'Loading cost centers...' : 'Select cost center'} searchPlaceholder="Search cost centers..." disabled={loadingCostCenters} clearable className="h-10" />
                        ) : (
                          <Input id="bulk-costcenter" value={bulkFormData.costcenter} onChange={(e) => handleBulkChange('costcenter', e.target.value)} placeholder={loadingCostCenters ? 'Loading cost centers...' : 'Enter cost center'} disabled={loadingCostCenters} className="h-10" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <Label htmlFor="bulk-location">Location</Label>
                          <Button variant="ghost" size="sm" onClick={() => copyToAll('location')} className="h-5 w-5 p-0">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {locationOptions.length > 0 ? (
                          <SingleSelect options={locationOptions.map(option => ({ value: option.name, label: `${option.name}${option.building ? ` (${option.building})` : ''}` }))} value={bulkFormData.location} onValueChange={(value) => handleBulkChange('location', value)} placeholder={loadingLocations ? 'Loading locations...' : 'Select location'} searchPlaceholder="Search locations..." disabled={loadingLocations} clearable className="h-10" />
                        ) : (
                          <Input id="bulk-location" value={bulkFormData.location} onChange={(e) => handleBulkChange('location', e.target.value)} placeholder={loadingLocations ? 'Loading locations...' : 'Enter location'} disabled={loadingLocations} className="h-10" />
                        )}
                      </div>
                    </div>

                    {/* Row 4: Description */}
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="bulk-description">Description *</Label>
                        <Button variant="ghost" size="sm" onClick={() => copyToAll('description')} className="h-6 w-6 p-0">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <Textarea id="bulk-description" value={bulkFormData.description} onChange={(e) => handleBulkChange('description', e.target.value)} placeholder="Enter asset description" rows={2} />
                    </div>
                </>)}
              </div>
            )}

            <Separator className="my-2" />

            {/* Individual Asset Forms - Tabs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Individual Assets ({assetItems.length})</h3>
              </div>

              <Tabs className="w-full" value={activeTab} onValueChange={(v) => setActiveTab(v)}>
                <TabsList className="max-w-full w-full overflow-x-auto">
                  {assetItems.map((asset, index) => {
                    const label = asset.register_number?.trim() ? asset.register_number : `Asset #${index + 1}`;
                    const isComplete = isAssetFormComplete(asset);
                    return (
                      <TabsTrigger key={asset.id} value={asset.id} className="mr-1">
                        <span className="truncate max-w-45">{label}</span>
                        {isComplete ? (
                          <CheckCircle className="ml-1 text-green-500 data-[state=active]:text-white" />
                        ) : (
                          <span
                            className="ml-2 inline-block w-2 h-2 rounded-full bg-red-500"
                            title="Incomplete"
                            aria-label="Incomplete"
                          />
                        )}
                        {asset.registered && (
                          <Badge className="ml-2 bg-green-600 hover:bg-green-600">Registered</Badge>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {assetItems.map((asset, index) => {
                  const isComplete = isAssetFormComplete(asset);
                  const modelOptionsForAsset = modelOptionsCache[asset.brand] || [];
                  return (
                    <TabsContent key={`content-${asset.id}`} value={asset.id}>
                      <Card id={`asset-card-${asset.id}`} className={`relative transition-all duration-200 ${isComplete ? 'ring-0' : 'ring-2 ring-red-300 border-red-300'}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <CardTitle className="text-base">{asset.register_number?.trim() || `Asset #${index + 1}`}</CardTitle>
                              {isComplete && (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                            {assetItems.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAsset(asset.id)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                title="Remove this asset"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {/* Row 1: Register Number, Warranty (years), Condition */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`register_number_${asset.id}`}>Register Number *</Label>
                              <button
                                type="button"
                                className="text-blue-600 hover:underline text-xs"
                                onClick={() => {
                                  setActiveAssetId(asset.id);
                                  setShowSidebar(true);
                                  fetchExistingAssets();
                                }}
                              >
                                Map existing assets
                              </button>
                              {((asset.category || '').toLowerCase() === 'software') && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center text-amber-600 cursor-help">
                                      <Info className="h-3.5 w-3.5" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Register number not required for Software category
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <Input
                              id={`register_number_${asset.id}`}
                              value={asset.register_number}
                              onFocus={() => setActiveAssetId(asset.id)}
                              onChange={(e) => handleAssetChange(asset.id, 'register_number', e.target.value)}
                              placeholder="e.g., AST001234"
                              required
                              className={`uppercase h-10 ${getFieldRingClass(asset.register_number)} placeholder:normal-case`}
                            />
                            {((asset.category || '').toLowerCase() === 'software') && (
                              <p className="mt-1 text-xs text-amber-600">Not required for Software category</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`warranty_period_${asset.id}`}>Warranty Period (years)</Label>
                            <Input
                              id={`warranty_period_${asset.id}`}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={asset.warranty_period}
                              onChange={(e) => handleAssetChange(asset.id, 'warranty_period', e.target.value)}
                              placeholder="e.g., 3"
                              className={`h-10 ${getFieldRingClass(asset.warranty_period)}`}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`condition_${asset.id}`}>Condition</Label>
                            <SingleSelect
                              options={[
                                { value: 'new', label: 'New' },
                                { value: 'good', label: 'Good' },
                                { value: 'fair', label: 'Fair' },
                                { value: 'poor', label: 'Poor' }
                              ]}
                              value={asset.condition}
                              onValueChange={(value) => handleAssetChange(asset.id, 'condition', value)}
                              placeholder="Select condition"
                              className={`h-10 ${getFieldRingClass(asset.condition)}`}
                            />
                          </div>
                        </div>

                        {/* Row 2: Category, Brand, Model */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor={`category_${asset.id}`}>Category</Label>
                            {categoryOptions.length > 0 ? (
                              <SingleSelect
                                options={categoryOptions.map(option => ({ value: option.name, label: option.name }))}
                                value={asset.category}
                                onValueChange={(value) => handleAssetChange(asset.id, 'category', value)}
                                placeholder="Select category"
                                searchPlaceholder="Search categories..."
                                disabled={loadingCategories}
                                clearable
                                className={`h-10 ${getFieldRingClass(asset.category)}`}
                              />
                            ) : (
                              <Input
                                id={`category_${asset.id}`}
                                value={asset.category}
                                onChange={(e) => handleAssetChange(asset.id, 'category', e.target.value)}
                                placeholder="Enter category"
                                disabled={loadingCategories}
                                className={`h-10 ${getFieldRingClass(asset.category)}`}
                              />
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`brand_${asset.id}`}>Brand</Label>
                            {brandOptions.length > 0 && !asset.customBrand ? (
                              <SingleSelect
                                options={[
                                  ...brandOptions.map(option => ({
                                    value: option.name,
                                    label: `${option.icon ? `${option.icon} ` : ''}${option.name}`
                                  })),
                                  { value: '__add_new_brand', label: 'Add new brand...' }
                                ]}
                                value={asset.brand}
                                onValueChange={(value) => handleAssetBrandSelect(asset.id, value)}
                                placeholder="Select brand"
                                searchPlaceholder="Search brands..."
                                disabled={loadingBrands}
                                clearable
                                className={`h-10 ${getFieldRingClass(asset.brand)}`}
                              />
                            ) : (
                              <Input
                                id={`brand_${asset.id}`}
                                value={asset.brand}
                                onChange={(e) => handleAssetBrandInput(asset.id, e.target.value)}
                                placeholder="Enter brand"
                                disabled={loadingBrands}
                                className={`h-10 ${getFieldRingClass(asset.brand)}`}
                              />
                            )}
                            {asset.customBrand && asset.brand.trim() && (() => {
                              const matches = findBrandMatches(asset.brand);
                              if (!matches.length) return null;
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs text-blue-600 mt-1 inline-flex items-center gap-1 cursor-help">
                                      <Info className="h-3.5 w-3.5" />
                                      View similar brands
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs max-w-xs">
                                      {matches.join(', ')}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })()}
                            {asset.customBrand && asset.brand.trim() && (
                              <div className="mt-2 flex justify-end">
                                <Button size="sm" variant="outline" disabled={creatingBrand} onClick={() => createBrand(asset.brand, 'asset', asset.id)}>
                                  {creatingBrand ? 'Saving...' : 'Save brand'}
                                </Button>
                              </div>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`model_${asset.id}`}>Model</Label>
                            {(!asset.customBrand && !asset.customModel && modelOptionsForAsset.length > 0) ? (
                              <SingleSelect
                                options={[
                                  ...modelOptionsForAsset.map(option => ({ value: option.name, label: option.name })),
                                  { value: '__add_new_model', label: 'Add new model...' }
                                ]}
                                value={asset.model}
                                onValueChange={(value) => handleAssetModelSelect(asset.id, value)}
                                placeholder="Select model"
                                searchPlaceholder="Search models..."
                                clearable
                                className={`h-10 ${getFieldRingClass(asset.model)}`}
                              />
                            ) : (
                              <Input
                                id={`model_${asset.id}`}
                                value={asset.model}
                                onChange={(e) => handleAssetModelInput(asset.id, e.target.value)}
                                placeholder="Enter model"
                                className={`h-10 ${getFieldRingClass(asset.model)}`}
                              />
                            )}
                            {asset.model.trim() && asset.brand && (() => {
                              return (
                                <Tooltip
                                  open={modelTooltipOpenKey === `asset-${asset.id}`}
                                  onOpenChange={(open) => { if (!open && modelTooltipOpenKey === `asset-${asset.id}`) setModelTooltipOpenKey(null); }}
                                >
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="text-xs text-blue-600 mt-1 inline-flex items-center gap-1 cursor-pointer"
                                      disabled={modelMatchLoadingKey === `asset-${asset.id}`}
                                      onClick={() => fetchModelMatches(asset.model, `asset-${asset.id}`)}
                                    >
                                      <Info className="h-3.5 w-3.5" />
                                      {modelMatchLoadingKey === `asset-${asset.id}` ? 'Fetching...' : 'View similar models'}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs max-w-xs space-y-1">
                                      {modelMatchLoadingKey === `asset-${asset.id}` && <div>Fetching...</div>}
                                      {modelMatchLoadingKey !== `asset-${asset.id}` && (modelMatchResults[`asset-${asset.id}`]?.length
                                        ? modelMatchResults[`asset-${asset.id}`].map(m => (
                                            <div key={m} className="flex items-center justify-between gap-2">
                                              <span>{m}</span>
                                              <button className="text-yellow-300 hover:underline" onClick={() => selectAssetModelSuggestion(asset.id, m)}>Choose</button>
                                            </div>
                                          ))
                                        : <div>No matches yet</div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })()}
                            {asset.customModel && asset.model.trim() && asset.brand && (
                              <div className="mt-2 flex justify-end">
                                <Button size="sm" variant="outline" disabled={creatingModel} onClick={() => createModel(asset.model, asset.brand, asset.category, 'asset', asset.id)}>
                                  {creatingModel ? 'Saving...' : 'Save model'}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Row 3: Classification, Cost Center, Location */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor={`classification_${asset.id}`}>Classification</Label>
                            <SingleSelect
                              options={[
                                { value: 'Asset', label: 'Asset' },
                                { value: 'Consumable', label: 'Consumable' },
                                { value: 'Rental', label: 'Rental' },
                                { value: 'Non-Asset', label: 'Non-Asset' },
                              ]}
                              value={asset.classification}
                              onValueChange={(value) => handleAssetChange(asset.id, 'classification', value)}
                              placeholder="Select classification"
                              className={`h-10 ${getFieldRingClass(asset.classification)}`}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`costcenter_${asset.id}`}>Cost Center</Label>
                            {costCenterOptions.length > 0 ? (
                              <SingleSelect
                                options={costCenterOptions.map(option => ({
                                  value: option.name,
                                  label: `${option.name}${option.code ? ` (${option.code})` : ''}`
                                }))}
                                value={asset.costcenter}
                                onValueChange={(value) => handleAssetChange(asset.id, 'costcenter', value)}
                                placeholder="Select cost center"
                                searchPlaceholder="Search cost centers..."
                                disabled={loadingCostCenters}
                                clearable
                                className={`h-10 ${getFieldRingClass(asset.costcenter)}`}
                              />
                            ) : (
                              <Input
                                id={`costcenter_${asset.id}`}
                                value={asset.costcenter}
                                onChange={(e) => handleAssetChange(asset.id, 'costcenter', e.target.value)}
                                placeholder="Enter cost center"
                                disabled={loadingCostCenters}
                                className={`h-10 ${getFieldRingClass(asset.costcenter)}`}
                              />
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`location_${asset.id}`}>Location</Label>
                            {locationOptions.length > 0 ? (
                              <SingleSelect
                                options={locationOptions.map(option => ({
                                  value: option.name,
                                  label: `${option.name}${option.building ? ` (${option.building})` : ''}`
                                }))}
                                value={asset.location}
                                onValueChange={(value) => handleAssetChange(asset.id, 'location', value)}
                                placeholder="Select location"
                                searchPlaceholder="Search locations..."
                                disabled={loadingLocations}
                                clearable
                                className={`h-10 ${getFieldRingClass(asset.location)}`}
                              />
                            ) : (
                              <Input
                                id={`location_${asset.id}`}
                                value={asset.location}
                                onChange={(e) => handleAssetChange(asset.id, 'location', e.target.value)}
                                placeholder="Enter location"
                                disabled={loadingLocations}
                                className={`h-10 ${getFieldRingClass(asset.location)}`}
                              />
                            )}
                          </div>
                        </div>

                        {/* Row 4: Description (full width) */}
                        <div>
                          <Label htmlFor={`description_${asset.id}`}>Description *</Label>
                          <Textarea
                            id={`description_${asset.id}`}
                            value={asset.description}
                            onChange={(e) => handleAssetChange(asset.id, 'description', e.target.value)}
                            placeholder="Enter asset description"
                            rows={2}
                            required
                              className={`${getFieldRingClass(asset.description)}`}
                          />
                        </div>

                        {/* Notes removed per requirement */}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          </div>

          {/* Right Pane - Register Number Overview */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="sticky top-4">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <div className="flex items-center">
                          <Package className="mr-2 h-5 w-5" />
                          Asset Registration Status
                        </div>
                        <div className="text-sm font-normal text-gray-500 flex items-center gap-2">
                          {assetItems.filter(asset => isAssetOverviewComplete(asset)).length}/{assetItems.length}
                          {purchase && registryAssets && registryAssets.length >= (purchase.qty || 0) && assetItems.every(a => a.registered) && (
                            <Badge className="bg-green-600 hover:bg-green-600">Completed</Badge>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
              <CardContent className="space-y-3">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-green-50 p-2 rounded text-center">
                    <div className="text-lg font-semibold text-green-600">
                      {assetItems.filter(asset => isAssetOverviewComplete(asset)).length}
                    </div>
                    <div className="text-xs text-green-700">Completed</div>
                  </div>
                  <div className="bg-orange-50 p-2 rounded text-center">
                    <div className="text-lg font-semibold text-orange-600">
                      {assetItems.filter(asset => !isAssetOverviewComplete(asset)).length}
                    </div>
                    <div className="text-xs text-orange-700">Pending</div>
                  </div>
                </div>


                {/* Register Number List (simplified) */}
                <div className="space-y-2 max-h-100 auto-hide-scroll">
                  <Label className="text-sm font-medium text-gray-600">Register Numbers</Label>
                  <ul className="space-y-1">
                    {assetItems.map((asset, index) => {
                      const isComplete = isAssetOverviewComplete(asset);
                      return (
                        <li
                          key={asset.id}
                          className="flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50"
                          onClick={() => scrollToAsset(asset.id)}
                          title={isComplete ? 'Complete' : 'Pending'}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-gray-500 shrink-0">#{index + 1}</span>
                            <span className={`text-sm font-medium truncate ${asset.register_number ? '' : 'text-gray-400 italic font-normal'}`}>
                              {asset.register_number || 'Not entered'}
                            </span>
                          </div>
                          <Badge variant={isComplete ? 'default' : 'secondary'} className={isComplete ? 'bg-green-600 hover:bg-green-600' : ''}>
                            {isComplete ? 'Complete' : 'Pending'}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                </div>


                <Separator className="my-3" />
                <div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        disabled={(() => {
                          if (saving) return true;
                          const newItems = assetItems.filter(a => !a.registered);
                          if (newItems.length === 0) return true; // nothing new to submit
                          return newItems.some(item => {
                            const isSoftware = (item.category || '').toLowerCase() === 'software';
                            const missingRegister = !isSoftware && !item.register_number?.trim();
                            const missingDesc = !item.description?.trim();
                            const missingBrand = !item.brand?.trim();
                            const missingModel = !item.model?.trim();
                            return missingRegister || missingDesc || missingBrand || missingModel;
                          });
                        })()}
                        className={`w-full text-white ${editMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? (editMode ? 'Updating...' : 'Submitting...') : (editMode ? 'Update' : 'Submit')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Asset Registration</AlertDialogTitle>
                        <AlertDialogDescription>
                          Please confirm the following details are correct for all assets:
                          Register Number, Category, Classification, and Cost Center.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="max-h-[50vh] overflow-auto border rounded">
                        <table className="min-w-full text-xs">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="text-left px-2 py-1 border">#</th>
                              <th className="text-left px-2 py-1 border">Register No</th>
                              <th className="text-left px-2 py-1 border">Category</th>
                              <th className="text-left px-2 py-1 border">Classification</th>
                              <th className="text-left px-2 py-1 border">Cost Center</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assetItems.map((a, idx) => (
                              <tr key={a.id} className="odd:bg-white even:bg-gray-50">
                                <td className="px-2 py-1 border">{idx + 1}</td>
                                <td className="px-2 py-1 border">{a.register_number || '-'}</td>
                                <td className="px-2 py-1 border">{a.category || '-'}</td>
                                <td className="px-2 py-1 border">{a.classification || '-'}</td>
                                <td className="px-2 py-1 border">{a.costcenter || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Review Again</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSave} disabled={saving}>
                          {editMode ? 'Confirm & Update' : 'Confirm & Submit'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>

            {/* Guidance */}
            <div className="p-2 rounded-md bg-amber-50 border border-amber-200 space-y-1 text-xs text-amber-800">
              <div className="font-semibold text-amber-900">Quick guide</div>
              <div>1) Select <span className="font-semibold">Brand</span> first.</div>
              <div>2) Choose an existing Model from the list, or pick <span className="font-semibold">Add new model…</span> to create one.</div>
              <div>3) If adding new, use <span className="font-semibold">View similar models</span> to avoid duplicates, then hit <span className="font-semibold">Save model</span>.</div>
            </div>
          </div>
        </div>
      </div>
      {/* Action Sidebar for mapping existing assets */}
      <ActionSidebar
        size="sm"
        title="Map Existing Asset"
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        content={(
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Search by register number or brand..."
                  className="pl-8 h-9 uppercase"
                />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchExistingAssets} disabled={loadingAssets}>
                <RefreshCcw className={`h-4 w-4 ${loadingAssets ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              {(() => {
                const idx = activeAssetId ? assetItems.findIndex(a => a.id === activeAssetId) : -1;
                return idx >= 0 ? `Targeting Asset #${idx + 1}` : 'Tip: Click a Register Number field to target a form.';
              })()}
            </div>
            <div className="max-h-[70vh] overflow-auto space-y-2">
              {loadingAssets && (
                <div className="text-sm text-gray-500">Loading assets…</div>
              )}
              {!loadingAssets && (() => {
                const query = assetSearch.trim().toLowerCase();
                // Build sets for quick duplicate checks
                const registrySet = new Set(
                  (registryAll || []).map((r: any) => String(r.register_number || '').toUpperCase().trim()).filter(Boolean)
                );
                const usedSet = new Set(
                  (assetItems || []).map((i: any) => String(i.register_number || '').toUpperCase().trim()).filter(Boolean)
                );
                const filtered = existingAssets.filter((a: any) => {
                  const reg = (a.register_number || '').toLowerCase();
                  const brand = (a.brands?.name || a.brand?.name || a.brand || '').toLowerCase();
                  // Apply text query first
                  const matchesQuery = (!query || reg.includes(query) || brand.includes(query));
                  if (!matchesQuery) return false;
                  // Exclude if asset already linked to a purchase
                  if (a.purchase_id) return false;
                  // Exclude if already registered in system (registryAll)
                  const rn = String(a.register_number || '').toUpperCase().trim();
                  if (rn && registrySet.has(rn)) return false;
                  // Exclude if already used in current form entries
                  if (rn && usedSet.has(rn)) return false;
                  return true;
                });
                if (filtered.length === 0) {
                  return <div className="text-sm text-gray-500">No active assets found.</div>;
                }
                return (
                  <ul className="space-y-2">
                    {filtered.map((a: any) => {
                      const brand = a.brands?.name || a.brand?.name || a.brand || '-';
                      const model = a.models?.name || a.model?.name || a.model || '-';
                      const pdate = a.purchase_date ? new Date(a.purchase_date).toLocaleDateString() : '-';
                      const btnDisabled = loadingRegistryAll || !a.register_number;
                      return (
                        <li key={a.id} className="flex items-center justify-between rounded-md border p-2 bg-white">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{a.register_number || '—'}</div>
                            <div className="text-xs text-gray-500 truncate">{brand} • {model} • {pdate}</div>
                          </div>
                          <div className="shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => mapRegisterNumberToActive(a.register_number)}
                              disabled={btnDisabled}
                              title={loadingRegistryAll ? 'Checking registry…' : 'Map register number to selected form'}
                            >
                              <Link2 className="h-4 w-4 mr-1" /> Map
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
              {loadingRegistryAll && (
                <div className="text-[11px] text-gray-500 mt-1">Checking registry to avoid duplicates…</div>
              )}
            </div>
          </div>
        )}
      />
      {/* Success dialog */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assets saved</AlertDialogTitle>
            <AlertDialogDescription>
              {successSummary || 'Your changes have been saved.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSuccessDialogOpen(false)}>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  setSuccessDialogOpen(false);
                }
              }}
            >
              Close window
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PurchaseAssetRegistration;
