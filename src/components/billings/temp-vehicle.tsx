import React, { useEffect, useMemo, useState } from 'react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import ActionSidebar from '@/components/ui/action-aside';
import { Plus, Replace, ArrowBigLeft, ArrowBigRight, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { authenticatedApi } from "@/config/api";

interface Model {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  brands?: Brand[];
}

interface Vehicle {
  // new backend asset fields
  id?: number; // asset id
  register_number?: string; // vehicle registration in new API
  transmission?: string;
  fuel_type?: string;
  purchase_date?: string | null;
  purchase_year?: number;
  disposed_date?: string | null;
  costcenter?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
  location?: { id: number; name: string } | null;
  types?: { id: number; name: string } | null; // asset type (e.g., Motor Vehicles)
  categories?: { id: number; name: string } | null; // backend category object
  brands?: { id: number; name: string } | null; // backend brand object
  owner?: { ramco_id: string; full_name: string } | null;
  models?: { id: number; name: string } | null;
  fleetcard?: { id: number; card_no: string } | null;

  // UI/state helpers and legacy compatibility ids
  brand_id?: string;
  model_id?: string;
  category_id?: string;

  // other metadata fields
  classification?: string;
  record_status?: string;
  purpose?: string;
  condition_status?: string;
  age?: string;
}

const TempVehicle: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [hideDisposed, setHideDisposed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([]); // Brands available for selected category
  const [availableModels, setAvailableModels] = useState<Model[]>([]); // Models available for selected brand
  const [departments, setDepartments] = useState<{ id: number; code: string }[]>([]);
  const [costcenters, setCostcenters] = useState<{ id: number; name: string }[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [owners, setOwners] = useState<{ ramco_id: string; full_name: string }[]>([]);
  const [ownerSearchResults, setOwnerSearchResults] = useState<{ ramco_id: string; full_name: string }[]>([]);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    // Fetch vehicles (map backend asset shape to local Vehicle shape)
    authenticatedApi.get<{ data: any[] }>('/api/assets?type=2,10') // Assuming type 2,10 for vehicles
      .then(res => {
        const data = res?.data?.data || [];
        const mapped: Vehicle[] = data.map((item: any) => {
          // map backend asset -> UI Vehicle using new fields
          const vehicle: Vehicle = {
            id: item.id ?? undefined,
            register_number: item.register_number ?? item.reg_no ?? undefined,
            transmission: item.transmission ?? undefined,
            fuel_type: item.fuel_type ?? undefined,
            purchase_date: item.purchase_date ?? null,
            purchase_year: item.purchase_year ?? undefined,
            disposed_date: item.disposed_date ?? null,
            costcenter: item.costcenter ? { id: item.costcenter.id, name: item.costcenter.name } : undefined,
            department: item.department ? { id: item.department.id, name: item.department.name } : undefined,
            location: item.location ? { id: item.location.id, name: item.location.name } : undefined,
            types: item.types ? { id: item.types.id, name: item.types.name } : undefined,
            categories: item.categories ? { id: item.categories.id, name: item.categories.name } : undefined,
            brands: item.brands ? { id: Number(item.brands.id), name: item.brands.name } : undefined,
            owner: item.owner ? { ramco_id: String(item.owner.ramco_id), full_name: item.owner.full_name } : undefined,
            models: item.models ? { id: Number(item.models.id), name: item.models.name } : undefined,
            fleetcard: item.fleetcard ? { id: item.fleetcard.id, card_no: item.fleetcard.card_no } : undefined,
            brand_id: item.brands ? String(item.brands.id) : undefined,
            model_id: item.models ? String(item.models.id) : undefined,
            category_id: item.categories ? String(item.categories.id) : undefined,
            classification: item.classification ?? (item.types?.name ?? undefined),
            record_status: item.record_status ?? item.status ?? undefined,
            purpose: item.purpose ?? undefined,
            condition_status: item.condition_status ?? undefined,
            age: item.age ?? undefined,
          };
          return vehicle;
        });
        setVehicles(mapped);
      });

    // Fetch other dropdown data
    authenticatedApi.get<{ data: { id: number; code: string }[] }>('/api/assets/departments')
      .then(res => setDepartments(res.data?.data || []));
    authenticatedApi.get<{ data: { id: number; name: string }[] }>('/api/assets/costcenters')
      .then(res => setCostcenters(res.data?.data || []));
    authenticatedApi.get<{ data: { ramco_id: number; full_name: string }[] }>('/api/assets/employees?status=active')
      .then(res => setOwners((res.data?.data || []).map(o => ({
        ramco_id: String(o.ramco_id),
        full_name: o.full_name
      }))));

    // Fetch categories and brands with models, then combine the data
    Promise.all([
      authenticatedApi.get<{ data: any[] }>('/api/assets/categories?type=2,10'), // Using any[] to handle simple brand objects
      authenticatedApi.get<{ data: Brand[] }>('/api/assets/brands?type=2')
    ]).then(([categoriesRes, brandsRes]) => {
      const categoriesData = categoriesRes.data?.data || [];
      const brands = brandsRes.data?.data || [];

      // Combine the data: replace category brands with full brand data including models
      const updatedCategories = categoriesData.map((category: any) => ({
        ...category,
        brands: (category.brands || []).map((categoryBrand: any) => {
          // Try to match by both ID (with type conversion) and name
          const fullBrand = brands.find(b =>
            String(b.id) === String(categoryBrand.id) ||
            b.name === categoryBrand.name
          );
          return fullBrand || {
            id: String(categoryBrand.id) || '',
            name: categoryBrand.name || '',
            categories: []
          };
        }).filter((brand: Brand) => brand.id) // Filter out any invalid brands
      }));

      setCategories(updatedCategories as Category[]);
    }).catch(error => {
      console.error('Error fetching categories and brands:', error);
      // Fallback: just use categories endpoint with empty models
      authenticatedApi.get<{ data: any[] }>('/api/assets/categories?type=2,10')
        .then(res => {
          const categoriesData = res.data?.data || [];
          const fallbackCategories = categoriesData.map((category: any) => ({
            ...category,
            brands: (category.brands || []).map((brand: any) => ({
              id: brand.id || '',
              name: brand.name || '',
              categories: []
            }))
          }));
          setCategories(fallbackCategories as Category[]);
        });
    });
  }, []);

  // Update available brands when category changes
  useEffect(() => {
    if (selectedVehicle?.categories) {
      const selectedCategory = categories.find(c => c.id === selectedVehicle.categories?.id);
      if (selectedCategory) {
        setAvailableBrands(selectedCategory.brands || []);
      }
    } else {
      setAvailableBrands([]);
    }
  }, [selectedVehicle?.categories, categories]);

  // Update available models when brand changes - fetch from API
  useEffect(() => {
    if (selectedVehicle?.brands) {
  const selectedBrand = availableBrands.find(b => String(b.id) === String(selectedVehicle.brands?.id));
      if (selectedBrand) {
        // Fetch models for the selected brand
        authenticatedApi.get<{ data: Model[] }>(`/api/assets/models?brand=${selectedBrand.id}`)
          .then(res => {
            const models = res.data?.data || [];
            setAvailableModels(models);
          })
          .catch(error => {
            console.error('Error fetching models for brand:', selectedBrand.id, error);
            setAvailableModels([]);
          });
      }
    } else {
      setAvailableModels([]);
    }
  }, [selectedVehicle?.brands, availableBrands]);

  const columns: ColumnDef<Vehicle>[] = ([
    { key: 'id', header: 'ID' },
    { key: 'register_number', header: 'Reg No', filter: 'input' },
    { key: 'categories', header: 'Category', render: (row: Vehicle) => row.categories?.name || '', filter: 'singleSelect' },
    { key: 'brands', header: 'Brand', render: (row: Vehicle) => row.brands?.name || '', filter: 'singleSelect' },
    { key: 'models', header: 'Model', render: (row: Vehicle) => row.models?.name || '', filter: 'singleSelect' },
    {
      key: 'purchase_date',
      header: 'Date Purchased',
      render: (row: Vehicle) => {
        if (!row.purchase_date) return '';
        const date = new Date(row.purchase_date as string);
        if (date.getFullYear() < 2005) return '';
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    },
    {
      key: 'age',
      header: 'Age',
      render: (row: Vehicle) => {
        if (!row.purchase_date) return '';
        const purchaseDate = new Date(row.purchase_date as string);
        if (purchaseDate.getFullYear() < 2005) return '';
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - purchaseDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const years = Math.floor(diffDays / 365);

        return String(years);
      }
    },
    { key: 'transmission', header: 'Transmission', filter: 'singleSelect', colClass: 'capitalize' },
    { key: 'fuel_type', header: 'Fuel Type', filter: 'singleSelect', colClass: 'capitalize' },
    /* { key: 'fleetcard', header: 'Fleet Card ID', render: (row: Vehicle) => row.fleetcard?.id || '', filter: 'input' }, */
    { key: 'fleetcard', header: 'Fleet Card', render: (row: Vehicle) => row.fleetcard?.card_no || '', filter: 'input' },
    { key: 'costcenter', header: 'Cost Center', render: (row: Vehicle) => row.costcenter?.name || '', filter: 'singleSelect' },
    { key: 'department', header: 'Department', render: (row: Vehicle) => row.department?.name || '', filter: 'singleSelect' },
    { key: 'owner', header: 'Owner', render: (row: Vehicle) => row.owner?.full_name || '', filter: 'input' },
    { key: 'classification', header: 'Classification', filter: 'singleSelect', colClass: 'capitalize' },
    { key: 'condition_status', header: 'Condition Status', filter: 'singleSelect', colClass: 'capitalize' },
    { key: 'record_status', header: 'Record Status', filter: 'singleSelect', colClass: 'capitalize' },
    //purpose
    { key: 'purpose', header: 'Purpose', filter: 'singleSelect', colClass: 'capitalize' },
  ]);

  // Filtered vehicles based on switch and classification filter
  const filteredVehicles = useMemo(() => {
    let result = hideDisposed
      ? vehicles.filter(v => v.record_status !== 'disposed' && v.record_status !== 'archived')
      : vehicles;

    if (classificationFilter) {
      result = result.filter(v => v.classification === classificationFilter);
    }

    return result;
  }, [vehicles, hideDisposed, classificationFilter]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const stats = {
      asset: { total: 0, active: 0, disposed: 0, archived: 0, maintenance: 0 },
      consumable: { total: 0, active: 0, disposed: 0, archived: 0, maintenance: 0 },
      personal: { total: 0, active: 0, disposed: 0, archived: 0, maintenance: 0 },
      rental: { total: 0, active: 0, disposed: 0, archived: 0, maintenance: 0 },
    };

    vehicles.forEach(vehicle => {
      const classification = vehicle.classification as keyof typeof stats;
      const status = vehicle.record_status;

      if (stats[classification]) {
        stats[classification].total++;
        if (status === 'active') stats[classification].active++;
        else if (status === 'disposed') stats[classification].disposed++;
        else if (status === 'archived') stats[classification].archived++;
        else if (status === 'maintenance') stats[classification].maintenance++;
      }
    });

    return stats;
  }, [vehicles]);

  const handleClassificationFilter = (classification: string) => {
    if (classificationFilter === classification) {
      // Reset filter if clicking the same card
      setClassificationFilter(null);
    } else {
      // Set new filter
      setClassificationFilter(classification);
    }
  };

  const validateFields = () => {
    const errors: Record<string, string> = {};

    if (!selectedVehicle?.register_number) {
      errors.register_number = 'Registration number is required';
    }
    if (!selectedVehicle?.categories) {
      errors.category = 'Category is required';
    }
    if (!selectedVehicle?.brands) {
      errors.brand = 'Brand is required';
    }
    if (!selectedVehicle?.models) {
      errors.model = 'Model is required';
    }
    if (!selectedVehicle?.fuel_type) {
      errors.fuel_type = 'Fuel type is required';
    }
    if (!selectedVehicle?.transmission) {
      errors.transmission = 'Transmission type is required';
    }
    if (!selectedVehicle?.costcenter) {
      errors.costcenter = 'Cost center is required';
    }
    if (!selectedVehicle?.department) {
      errors.department = 'Department is required';
    }
    if (!selectedVehicle?.classification) {
      errors.classification = 'Classification is required';
    }
    if (!selectedVehicle?.purpose) {
      errors.purpose = 'Purpose is required';
    }
    if (!selectedVehicle?.record_status) {
      errors.record_status = 'Record status is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!selectedVehicle) return;

    if (!validateFields()) {
      toast.error('Please fix validation errors');
      return;
    }

    try {
      const payload = { ...selectedVehicle } as any;
      // Map nested objects to their IDs for API
      if (payload.costcenter) {
        payload.cc_id = String(payload.costcenter.id);
        delete payload.costcenter;
      }
  if (payload.brands) payload.brand_id = String(payload.brands.id);
  if (payload.models) payload.model_id = String(payload.models.id);
  if (payload.categories) payload.category_id = String(payload.categories.id);
      if (payload.department) payload.dept_id = payload.department?.id;
      if (payload.owner) {
        payload.ramco_id = payload.owner.ramco_id;
        delete payload.owner;
      }

  // Remove nested objects
  delete payload.brands;
  delete payload.models;
  delete payload.categories;
  delete payload.department;

      if (payload.id && payload.id !== 0) {
        // Update existing vehicle
        await authenticatedApi.put(`/api/bills/temp-vehicle/${payload.id}`, payload);
        toast.success('Vehicle updated successfully');
      } else {
        // Create new vehicle
        await authenticatedApi.post('/api/bills/temp-vehicle', payload);
        toast.success('Vehicle created successfully');
      }

      setSidebarOpen(false);
      // Refresh vehicle list
      const res = await authenticatedApi.get<{ data: Vehicle[] }>('/api/bills/temp-vehicle');
      setVehicles(res?.data?.data || []);
    } catch (error) {
      toast.error('Failed to save vehicle');
    }
  };

  const handleOwnerSearch = async (query: string) => {
    setOwnerSearchQuery(query);
    if (query.length > 2) {
      try {
        const res = await authenticatedApi.get<{ data: { ramco_id: string; full_name: string }[] }>(`/api/assets/employees/search?q=${query}`);
        setOwnerSearchResults(res.data?.data || []);
      } catch (error) {
        console.error('Failed to fetch owner search results', error);
      }
    } else {
      setOwnerSearchResults([]);
    }
  };

  return (
    <div className="mt-4">
      {/* Classification Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {(['asset', 'consumable', 'personal', 'rental'] as const).map((classification, index) => {
          const stats = summaryStats[classification];
          const isActive = classificationFilter === classification;

          // Modern gradient backgrounds for each card
          const cardBackgrounds = [
            'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900', // Asset
            'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900', // Consumable
            'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900', // Personal
            'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900', // Rental
          ];

          const cardBorders = [
            'border-blue-200 dark:border-blue-800', // Asset
            'border-green-200 dark:border-green-800', // Consumable
            'border-purple-200 dark:border-purple-800', // Personal
            'border-orange-200 dark:border-orange-800', // Rental
          ];

          const activeBorders = [
            'border-blue-400 dark:border-blue-500', // Asset
            'border-green-400 dark:border-green-500', // Consumable
            'border-purple-400 dark:border-purple-500', // Personal
            'border-orange-400 dark:border-orange-500', // Rental
          ];

          const activeBackgrounds = [
            'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800', // Asset
            'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800', // Consumable
            'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800', // Personal
            'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800', // Rental
          ];

          const titleColors = [
            'text-blue-700 dark:text-blue-300', // Asset
            'text-green-700 dark:text-green-300', // Consumable
            'text-purple-700 dark:text-purple-300', // Personal
            'text-orange-700 dark:text-orange-300', // Rental
          ];

          return (
            <div
              key={classification}
              onClick={() => handleClassificationFilter(classification)}
              className={`
                p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105
                ${isActive
                  ? `${activeBackgrounds[index]} ${activeBorders[index]} shadow-lg`
                  : `${cardBackgrounds[index]} ${cardBorders[index]} hover:${activeBorders[index]}`
                }
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-lg font-semibold capitalize ${isActive ? titleColors[index] : titleColors[index]}`}>
                  {classification}
                </h3>
                <span className={`text-2xl font-bold ${isActive ? titleColors[index] : titleColors[index]}`}>
                  {stats.total}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Active:</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">{stats.active}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Maintenance:</span>
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">{stats.maintenance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Disposed:</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">{stats.disposed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Archived:</span>
                  <span className="text-gray-500 dark:text-gray-500 font-medium">{stats.archived}</span>
                </div>
              </div>
              {isActive && (
                <div className={`mt-2 pt-2 border-t ${activeBorders[index]}`}>
                  <span className={`text-xs font-medium ${titleColors[index]}`}>Click to reset filter</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center gap-4 mb-4">
        <h2 className="text-lg font-bold">Vehicle Record Maintenance</h2>
        <div className="flex items-center gap-2">
          <Switch checked={hideDisposed} onCheckedChange={setHideDisposed} id="hide-disposed-switch" />
          <Label htmlFor="hide-disposed-switch" className="text-xs">Hide Disposed/Archived</Label>
          {/* <Button size="icon" variant="default"
            title="Register New Vehicle"
            onClick={() => {
              setSelectedVehicle({
                id: 0,
                register_number: '',
                transmission: '',
                fuel_type: '',
                classification: '',
                record_status: '',
                purpose: '',
                condition_status: '',
                categories: undefined,
                costcenter: undefined,
                department: undefined,
              });
              setSidebarOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
          </Button> */}
        </div>
      </div>
      <CustomDataGrid
        data={filteredVehicles}
        columns={columns}
        pagination={false}
        inputFilter={false}
        onRowDoubleClick={row => {
          // convert backend object shapes for selection if needed
          const sel = {
            ...row,
            register_number: row.register_number,
            id: row.id
          } as Vehicle;
          setSelectedVehicle(sel);
          setSidebarOpen(true);
        }}
        dataExport={true}
      />
      {sidebarOpen && (
        <ActionSidebar
          onClose={() => setSidebarOpen(false)}
          size={'sm'}
          title="Vehicle Details"
          content={
            selectedVehicle && (
              <div className="space-y-4 p-4">
                <div>
                  <Label>Reg No {validationErrors.register_number && <span className="text-red-500">{validationErrors.register_number}</span>}</Label>
                  <Input
                    value={selectedVehicle.register_number}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.includes(' ')) {
                        toast.error('Registration number cannot contain spaces');
                        return;
                      }
                      setSelectedVehicle({ ...selectedVehicle, register_number: value });
                      if (value) {
                        setValidationErrors(prev => ({ ...prev, register_number: '' }));
                      }
                    }}
                    className='uppercase placeholder:normal-case'
                    placeholder="Enter Registration Number (without spaces)"
                    disabled={selectedVehicle.id !== 0}
                  />
                </div>
                <div>
                  <Label>Category {validationErrors.category && <span className="text-red-500">{validationErrors.category}</span>}</Label>
                  <Select
                    value={selectedVehicle.categories?.id ? String(selectedVehicle.categories.id) : ''}
                    onValueChange={val => {
                      const category = categories.find(c => String(c.id) === val);
                      setSelectedVehicle({
                        ...selectedVehicle,
                        categories: category ? { id: Number(category.id), name: category.name } : undefined,
                        brands: undefined, // Reset brand when category changes
                        models: undefined // Reset model when category changes
                      });
                      if (category) {
                        setValidationErrors(prev => ({ ...prev, category: '' }));
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Brand {validationErrors.brand && <span className="text-red-500">{validationErrors.brand}</span>}</Label>
                  <Select
                    value={selectedVehicle.brands?.id ? String(selectedVehicle.brands.id) : ''}
                    onValueChange={val => {
                      const brand = availableBrands.find(b => String(b.id) === val);
                      setSelectedVehicle({
                        ...selectedVehicle,
                        brands: brand ? { id: Number(brand.id), name: brand.name } : undefined,
                        models: undefined // Reset model when brand changes
                      });
                      if (brand) {
                        setValidationErrors(prev => ({ ...prev, brand: '' }));
                      }
                    }}
                    disabled={!selectedVehicle.categories} // Disable if no category selected
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={selectedVehicle.categories ? "Select Brand" : "Select Category First"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBrands.map(b => (
                        <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Model {validationErrors.models && <span className="text-red-500">{validationErrors.models}</span>}</Label>
                  <Select
                    value={selectedVehicle.models?.id ? String(selectedVehicle.models.id) : ''}
                    onValueChange={val => {
                      const model = availableModels.find(m => String(m.id) === val);
                      setSelectedVehicle({ ...selectedVehicle, models: model ? { id: Number(model.id), name: model.name } : undefined });
                      if (model) {
                        setValidationErrors(prev => ({ ...prev, models: '' }));
                      }
                    }}
                    disabled={!selectedVehicle.brands} // Disable if no brand selected
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={selectedVehicle.brands ? "Select Model" : "Select Brand First"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fuel Type {validationErrors.fuel_type && <span className="text-red-500">{validationErrors.fuel_type}</span>}</Label>
                  <Select value={selectedVehicle.fuel_type || ''} onValueChange={val => {
                    setSelectedVehicle({ ...selectedVehicle, fuel_type: val });
                    if (val) {
                      setValidationErrors(prev => ({ ...prev, fuel_type: '' }));
                    }
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Fuel Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {['petrol', 'diesel'].map(type => (
                        <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Transmission {validationErrors.transmission && <span className="text-red-500">{validationErrors.transmission}</span>}</Label>
                  <Select value={selectedVehicle.transmission || ''} onValueChange={val => {
                    setSelectedVehicle({ ...selectedVehicle, transmission: val });
                    if (val) {
                      setValidationErrors(prev => ({ ...prev, transmission: '' }));
                    }
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Transmission" />
                    </SelectTrigger>
                    <SelectContent>
                      {['auto', 'manual'].map(type => (
                        <SelectItem key={type} value={type}>{type.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cost Center {validationErrors.costcenter && <span className="text-red-500">{validationErrors.costcenter}</span>}</Label>
                  <Select
                    value={selectedVehicle.costcenter?.id ? String(selectedVehicle.costcenter.id) : ''}
                    onValueChange={val => {
                      const costcenter = costcenters.find(cc => String(cc.id) === val);
                      setSelectedVehicle({ ...selectedVehicle, costcenter });
                      if (costcenter) {
                        setValidationErrors(prev => ({ ...prev, costcenter: '' }));
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Cost Center" />
                    </SelectTrigger>
                    <SelectContent>
                      {costcenters.map(cc => (
                        <SelectItem key={cc.id} value={String(cc.id)}>{cc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department {validationErrors.department && <span className="text-red-500">{validationErrors.department}</span>}</Label>
                  <Select
                    value={selectedVehicle.department?.id ? String(selectedVehicle.department.id) : ''}
                    onValueChange={val => {
                      const department = departments.find(d => String(d.id) === val);
                      setSelectedVehicle({
                        ...selectedVehicle,
                        department: department ? { id: department.id, name: department.code } : undefined
                      });
                      if (department) {
                        setValidationErrors(prev => ({ ...prev, department: '' }));
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* classifocation: [asset, consumable, personal, rental] */}
                <div>
                  <Label>Classification {validationErrors.classification && <span className="text-red-500">{validationErrors.classification}</span>}</Label>
                  <Select value={selectedVehicle.classification || ''} onValueChange={val => {
                    setSelectedVehicle({ ...selectedVehicle, classification: val });
                    if (val) {
                      setValidationErrors(prev => ({ ...prev, classification: '' }));
                    }
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Classification" />
                    </SelectTrigger>
                    <SelectContent>
                      {['asset', 'consumable', 'personal', 'rental'].map(type => (
                        <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Owner: show name on field but hidden payload is ramco_id */}
                <div>
                  <Label>Owner {validationErrors.owner && <span className="text-red-500">{validationErrors.owner}</span>}</Label>
                  <Input
                    value={selectedVehicle.owner?.full_name || ''}
                    onChange={(e) => {
                      const fullName = e.target.value;
                      setSelectedVehicle({ ...selectedVehicle, owner: { ramco_id: selectedVehicle.owner?.ramco_id || '', full_name: fullName } });
                      if (fullName) {
                        setValidationErrors(prev => ({ ...prev, owner: '' }));
                      }
                    }}
                    onKeyUp={(e) => handleOwnerSearch((e.target as HTMLInputElement).value)}
                    placeholder="Enter Owner Name"
                    className="w-full"
                  />
                  {ownerSearchResults.length > 0 && (
                    <div className="absolute bg-white border border-gray-300 rounded shadow-md w-full">
                      {ownerSearchResults.map((result) => (
                        <div
                          key={result.ramco_id}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setSelectedVehicle({ ...selectedVehicle, owner: result });
                            setOwnerSearchResults([]); // Clear results after selection
                          }}
                        >
                          {result.full_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* purpose: [pool, project, staff cost] */}
                <div>
                  <Label>Purpose {validationErrors.purpose && <span className="text-red-500">{validationErrors.purpose}</span>}</Label>
                  <Select
                    value={selectedVehicle.purpose || ''}
                    onValueChange={val => {
                      setSelectedVehicle({ ...selectedVehicle, purpose: val });
                      if (val) {
                        setValidationErrors(prev => ({ ...prev, purpose: '' }));
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      {['pool', 'project', 'staff cost'].map(purpose => (
                        <SelectItem key={purpose} value={purpose}>{purpose.charAt(0).toUpperCase() + purpose.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Record Status {validationErrors.record_status && <span className="text-red-500">{validationErrors.record_status}</span>}</Label>
                  <Select value={selectedVehicle.record_status || ''} onValueChange={val => {
                    setSelectedVehicle({ ...selectedVehicle, record_status: val });
                    if (val) {
                      setValidationErrors(prev => ({ ...prev, record_status: '' }));
                    }
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {['active', 'disposed', 'archived', 'maintenance'].map(status => (
                        <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* <div className="flex justify-end mt-4">
                  <Button variant="default" onClick={handleSubmit}>
                    Submit
                  </Button>
                </div> */}
              </div>
            )
          }
        />
      )}
    </div>
  );
};

export default TempVehicle;
