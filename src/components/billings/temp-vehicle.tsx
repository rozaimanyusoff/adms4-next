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

interface Vehicle {
  vehicle_id: number;
  vehicle_regno: string;
  vtrans_type: string;
  vfuel_type: string;
  cc_id: string;
  dept_id: number;
  loc_id: number;
  classification: string;
  record_status: string;
  purpose: string;
  condition_status: string;
  costcenter?: { id: number; name: string };
  owner?: { ramco_id: string; full_name: string };
  brand?: { id: number; name: string };
  model?: { id: number; name: string };
  category?: { id: number; name: string };
  department?: { id: number; name: string };
  fleetcard?: { id: number; card_no: string };
  brand_id?: string;
  model_id?: string;
  category_id?: string;
}

const TempVehicle: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [hideDisposed, setHideDisposed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [models, setModels] = useState<{ id: number; name: string; brand_id?: number }[]>([]);
  const [departments, setDepartments] = useState<{ id: number; code: string }[]>([]);
  const [costcenters, setCostcenters] = useState<{ id: number; name: string }[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [owners, setOwners] = useState<{ ramco_id: string; full_name: string }[]>([]);
  const [ownerSearchResults, setOwnerSearchResults] = useState<{ ramco_id: string; full_name: string }[]>([]);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    authenticatedApi.get<{ data: Vehicle[] }>('/api/bills/temp-vehicle')
      .then(res => {
        const data = res?.data?.data || [];
        setVehicles(data);
      });
    // Fetch dropdown data
    authenticatedApi.get<{ data: { id: number; name: string }[] }>('/api/assets/categories?type=2')
      .then(res => setCategories(res.data?.data || []));
    authenticatedApi.get<{ data: { id: number; name: string }[] }>('/api/assets/brands?type=2')
      .then(res => setBrands(res.data?.data || []));
    authenticatedApi.get<{ data: { id: number; name: string }[] }>('/api/assets/models?type=2')
      .then(res => setModels(res.data?.data || []));
    authenticatedApi.get<{ data: { id: number; code: string }[] }>('/api/assets/departments')
      .then(res => setDepartments(res.data?.data || []));
    authenticatedApi.get<{ data: { id: number; name: string }[] }>('/api/assets/costcenters')
      .then(res => setCostcenters(res.data?.data || []));
    authenticatedApi.get<{ data: { ramco_id: number; full_name: string }[] }>('/api/assets/employees?status=active')
      .then(res => setOwners((res.data?.data || []).map(o => ({
        ramco_id: String(o.ramco_id),
        full_name: o.full_name
      }))));
  }, []);

  const columns: ColumnDef<Vehicle>[] = ([
    { key: 'vehicle_id', header: 'ID' },
    { key: 'vehicle_regno', header: 'Reg No', filter: 'input' },
    { key: 'category', header: 'Category', render: (row: Vehicle) => row.category?.name || '', filter: 'singleSelect' },
    { key: 'brand', header: 'Brand', render: (row: Vehicle) => row.brand?.name || '', filter: 'singleSelect' },
    { key: 'model', header: 'Model', render: (row: Vehicle) => row.model?.name || '', filter: 'singleSelect' },
    { key: 'vtrans_type', header: 'Transmission', filter: 'singleSelect',colClass: 'capitalize' },
    { key: 'vfuel_type', header: 'Fuel Type', filter: 'singleSelect',colClass: 'capitalize' },
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

  // Filtered vehicles based on switch
  const filteredVehicles = hideDisposed
    ? vehicles.filter(v => v.record_status !== 'disposed' && v.record_status !== 'archived')
    : vehicles;

  const validateFields = () => {
    const errors: Record<string, string> = {};

    if (!selectedVehicle?.vehicle_regno) {
      errors.vehicle_regno = 'Registration number is required';
    }
    if (!selectedVehicle?.category) {
      errors.category = 'Category is required';
    }
    if (!selectedVehicle?.brand) {
      errors.brand = 'Brand is required';
    }
    if (!selectedVehicle?.model) {
      errors.model = 'Model is required';
    }
    if (!selectedVehicle?.vfuel_type) {
      errors.vfuel_type = 'Fuel type is required';
    }
    if (!selectedVehicle?.vtrans_type) {
      errors.vtrans_type = 'Transmission type is required';
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
      const payload = { ...selectedVehicle };
      // Map nested objects to their IDs for API
      if (payload.costcenter) {
        (payload as any).cc_id = String(payload.costcenter.id);
        delete payload.costcenter;
      }
      if (payload.brand) payload.brand_id = String(payload.brand.id);
      if (payload.model) payload.model_id = String(payload.model.id);
      if (payload.category) payload.category_id = String(payload.category.id);
      if (payload.department) payload.dept_id = payload.department.id;
      if (payload.owner) {
        (payload as any).ramco_id = payload.owner.ramco_id;
        delete payload.owner;
      }

      // Remove nested objects
      delete payload.brand;
      delete payload.model;
      delete payload.category;
      delete payload.department;

      if (payload.vehicle_id && payload.vehicle_id !== 0) {
        // Update existing vehicle
        await authenticatedApi.put(`/api/bills/temp-vehicle/${payload.vehicle_id}`, payload);
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
      <div className="flex justify-between items-center gap-4 mb-4">
        <h2 className="text-lg font-bold">Vehicle Record Maintenance</h2>
        <div className="flex items-center gap-2">
          <Switch checked={hideDisposed} onCheckedChange={setHideDisposed} id="hide-disposed-switch" />
          <Label htmlFor="hide-disposed-switch" className="text-xs">Hide Disposed/Archived</Label>
          <Button size="icon" variant="default"
            title="Register New Vehicle"
            onClick={() => {
              setSelectedVehicle({
                vehicle_id: 0,
                vehicle_regno: '',
                vtrans_type: '',
                vfuel_type: '',
                cc_id: '',
                dept_id: 0,
                loc_id: 0,
                classification: '',
                record_status: '',
                purpose: '',
                condition_status: '',
                category: undefined,
                costcenter: undefined,
                department: undefined,
              });
              setSidebarOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <CustomDataGrid
        data={filteredVehicles}
        columns={columns}
        pagination={false}
        inputFilter={false}
        onRowDoubleClick={row => {
          setSelectedVehicle(row);
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
                  <Label>Reg No {validationErrors.vehicle_regno && <span className="text-red-500">{validationErrors.vehicle_regno}</span>}</Label>
                  <Input
                    value={selectedVehicle.vehicle_regno}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.includes(' ')) {
                          toast.error('Registration number cannot contain spaces');
                          return;
                      }
                      setSelectedVehicle({ ...selectedVehicle, vehicle_regno: value });
                      if (value) {
                        setValidationErrors(prev => ({ ...prev, vehicle_regno: '' }));
                      }
                    }}
                    className='uppercase placeholder:normal-case'
                    placeholder="Enter Registration Number (without spaces)"
                    disabled={selectedVehicle.vehicle_id !== 0}
                  />
                </div>
                <div>
                  <Label>Category {validationErrors.category && <span className="text-red-500">{validationErrors.category}</span>}</Label>
                  <Select 
                    value={selectedVehicle.category?.id ? String(selectedVehicle.category.id) : ''}
                    onValueChange={val => {
                      const category = categories.find(c => String(c.id) === val);
                      setSelectedVehicle({ ...selectedVehicle, category });
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
                    value={selectedVehicle.brand?.id ? String(selectedVehicle.brand.id) : ''}
                    onValueChange={val => {
                      const brand = brands.find(b => String(b.id) === val);
                      setSelectedVehicle({
                        ...selectedVehicle,
                        brand,
                        model: undefined // Reset model when brand changes
                      });
                      if (brand) {
                        setValidationErrors(prev => ({ ...prev, brand: '' }));
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(b => (
                        <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Model {validationErrors.model && <span className="text-red-500">{validationErrors.model}</span>}</Label>
                  <Select value={selectedVehicle.model?.id ? String(selectedVehicle.model.id) : ''}
                    onValueChange={val => {
                      const model = models.find(m => String(m.id) === val);
                      setSelectedVehicle({ ...selectedVehicle, model });
                      if (model) {
                        setValidationErrors(prev => ({ ...prev, model: '' }));
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models
                        .filter(m => !selectedVehicle.brand?.id || m.brand_id === selectedVehicle.brand.id)
                        .map(m => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fuel Type {validationErrors.vfuel_type && <span className="text-red-500">{validationErrors.vfuel_type}</span>}</Label>
                  <Select value={selectedVehicle.vfuel_type || ''} onValueChange={val => {
                    setSelectedVehicle({ ...selectedVehicle, vfuel_type: val });
                    if (val) {
                      setValidationErrors(prev => ({ ...prev, vfuel_type: '' }));
                    }
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Fuel Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {['petrol','diesel'].map(type => (
                        <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Transmission {validationErrors.vtrans_type && <span className="text-red-500">{validationErrors.vtrans_type}</span>}</Label>
                  <Select value={selectedVehicle.vtrans_type || ''} onValueChange={val => {
                    setSelectedVehicle({ ...selectedVehicle, vtrans_type: val });
                    if (val) {
                      setValidationErrors(prev => ({ ...prev, vtrans_type: '' }));
                    }
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Transmission" />
                    </SelectTrigger>
                    <SelectContent>
                      {['auto','manual'].map(type => (
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
                      {['asset','consumable','personal','rental'].map(type => (
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
                      {['pool','project','staff cost'].map(purpose => (
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
                      {['active','disposed','archived','maintenance'].map(status => (
                        <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end mt-4">
                  <Button variant="default" onClick={handleSubmit}>
                    Submit
                  </Button>
                </div>
              </div>
            )
          }
        />
      )}
    </div>
  );
};

export default TempVehicle;
