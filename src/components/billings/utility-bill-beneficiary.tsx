import React, { useEffect, useMemo, useState, useRef } from 'react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import ActionSidebar from '@/components/ui/action-aside';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { SingleSelect } from '@/components/ui/combobox';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';

interface Beneficiary {
  id?: number;
  name: string;
  category?: string;
  logo?: string | null;
  created_at?: string;
  // backend may return an object { ramco_id, full_name } or a simple ramco_id string
  entry_by?: { ramco_id: string; full_name: string } | string | null;
  entry_position?: string | null;
  contact_name?: string | null;
  contact_no?: string | null;
  address?: string | null;
  file_reference?: string | null;
}

const CATEGORY_OPTIONS: { id: number; label: string }[] = [
  { id: 1, label: 'Rental' },
  { id: 2, label: 'Printing' },
  { id: 3, label: 'Services' },
  { id: 4, label: 'Telco' },
  { id: 5, label: 'Utilities' },
];

const BeneficiaryManager: React.FC = () => {
  const [rows, setRows] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editing, setEditing] = useState<Beneficiary | null>(null);
  const [saving, setSaving] = useState(false);

  // form state
  const [form, setForm] = useState<Beneficiary>({ name: '', category: undefined, logo: null, contact_name: '', contact_no: '', address: '', file_reference: '', entry_by: undefined, entry_position: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [employeeOptions, setEmployeeOptions] = useState<{ ramco_id: string; full_name: string }[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [preparedName, setPreparedName] = useState<string>('');
  const employeeWrapRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const dropZoneRef = React.useRef<HTMLDivElement | null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res: any = await authenticatedApi.get('/api/bills/util/beneficiaries');
      const data = res.data?.data || [];
      setRows(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load beneficiaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const openCreate = () => {
    setEditing(null);
  setForm({ name: '', category: undefined, logo: null, contact_name: '', contact_no: '', address: '', file_reference: '', entry_by: undefined, entry_position: '' });
    setLogoFile(null);
    setPreparedName('');
    setSidebarOpen(true);
  };

  const openEdit = async (id?: number) => {
    if (!id) return;
    setLoading(true);
    try {
      const res: any = await authenticatedApi.get(`/api/bills/util/beneficiaries/${id}`);
      const data = res.data?.data || null;
      if (data) {
        setEditing(data);
        setForm({
          id: data.id,
          name: data.name || '',
          category: data.category || undefined,
          logo: data.logo || null,
          contact_name: data.contact_name || '',
          contact_no: data.contact_no || '',
          address: data.address || '',
          file_reference: data.file_reference || '',
          // store ramco_id string in form for payload
          entry_by: data.entry_by ? (typeof data.entry_by === 'object' ? String(data.entry_by.ramco_id) : String(data.entry_by)) : undefined,
          entry_position: data.entry_position || '',
        });
        setLogoFile(null);
        // if there's an existing entry_by (ramco id), fetch name for display
        if (data?.entry_by) {
          try {
            const query = typeof data.entry_by === 'object' ? data.entry_by.ramco_id : data.entry_by;
            const r: any = await authenticatedApi.get(`/api/assets/employees/search?q=${query}&status=active&dept=9`);
            const list = (r.data?.data || r.data || []);
            const found = Array.isArray(list) ? list.find((x: any) => String(x.ramco_id) === String(query)) : null;
            if (found) setPreparedName(found.full_name);
            else if (typeof data.entry_by === 'object') setPreparedName(data.entry_by.full_name || '');
          } catch (err) {
            // ignore
          }
        }
        setSidebarOpen(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load beneficiary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => {
        URL.revokeObjectURL(url);
        setLogoPreview(null);
      };
    } else {
      setLogoPreview(null);
    }
  }, [logoFile]);

  // load active employees for combobox
  const fetchEmployees = async () => {
    setEmployeeLoading(true);
    try {
      const res: any = await authenticatedApi.get('/api/assets/employees?status=active&dept=9');
      const list = res.data?.data || res.data || [];
      const arr = Array.isArray(list) ? list : [];
      setEmployeeOptions(arr);
      return arr;
    } catch (err) {
      console.error('fetch employees', err);
      setEmployeeOptions([]);
      return [];
    } finally {
      setEmployeeLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  // click outside to close employee dropdown
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (employeeWrapRef.current && !employeeWrapRef.current.contains(e.target as Node)) {
        // dropdown behavior removed; no action required
      }
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const validate = () => {
    const missing: string[] = [];
    if (!form.name || !String(form.name).trim()) missing.push('Name');
    if (!form.category) missing.push('Category');
    if (!form.address || !String(form.address).trim()) missing.push('Product Description');
    if (missing.length) {
      toast.error(`${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} required`);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let payload: any;
      if (logoFile) {
        payload = new FormData();
        payload.append('name', form.name || '');
        payload.append('category', String(form.category || ''));
        payload.append('contact_name', form.contact_name || '');
        payload.append('contact_no', form.contact_no || '');
        // description (product description)
        payload.append('description', form.address || '');
        payload.append('address', form.address || '');
        payload.append('file_reference', form.file_reference || '');
        payload.append('entry_by', form.entry_by || '');
        payload.append('entry_position', form.entry_position || '');
        payload.append('logo', logoFile);
      } else {
        payload = {
          name: form.name,
          category: form.category,
          // description (product description)
          description: form.address,
          contact_name: form.contact_name,
          contact_no: form.contact_no,
          address: form.address,
          file_reference: form.file_reference,
          entry_by: form.entry_by,
          entry_position: form.entry_position,
        };
      }

      if (form.id) {
        // update
        if (payload instanceof FormData) {
          await authenticatedApi.put(`/api/bills/util/beneficiaries/${form.id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        } else {
          await authenticatedApi.put(`/api/bills/util/beneficiaries/${form.id}`, payload);
        }
        toast.success('Beneficiary updated');
      } else {
        // create
        if (payload instanceof FormData) {
          await authenticatedApi.post('/api/bills/util/beneficiaries', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        } else {
          await authenticatedApi.post('/api/bills/util/beneficiaries', payload);
        }
        toast.success('Beneficiary created');
      }

      setSidebarOpen(false);
      fetchList();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save beneficiary');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<any>[] = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name', filter: 'input' },
    { key: 'category', header: 'Category', filter: 'singleSelect' },
    { key: 'description', header: 'Product Description', filter: 'input' },
    { key: 'contact', header: 'Contact', filter: 'input' },
    { key: 'entry_by', header: 'Bill Manager', filter: 'input', render: (r: any) => (r.entry_by && typeof r.entry_by === 'object') ? r.entry_by.full_name : (r.entry_by || '') },
    { key: 'entry_position', header: 'Position' },
    { key: 'file_reference', header: 'File Reference', filter: 'input' },

    {
      key: 'bfcy_logo', header: 'Logo', render: (r: any) => {
        const src = r?.bfcy_logo || r?.logo || r?.bfcy_pic || r?.bfcy_pic_url;
        const alt = r?.bfcy_name || r?.acc_no || 'logo';
        return src ? (<img src={src} alt={alt} className="w-8 h-8 object-contain rounded" />) : null;
      }
    },
    // actions are handled via row double-click
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Beneficiaries</h3>
        <div className="flex items-center gap-2">
          <Button onClick={openCreate}><Plus size={16} /> New</Button>
        </div>
      </div>

      <CustomDataGrid
        columns={columns as any}
        data={rows}
        pagination={false}
        inputFilter={false}
        theme="sm"
        onRowDoubleClick={(row: any) => {
          const id = row?.id;
          if (!id) return;
          Promise.resolve().then(() => openEdit(id));
        }}
        dataExport={true}
      />

      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded mt-3">
        💡 <strong>Actions:</strong> Double-click any row to edit a beneficiary
      </div>

      {sidebarOpen && (
        <ActionSidebar
          title={editing ? 'Edit Beneficiary' : 'New Beneficiary'}
          onClose={() => setSidebarOpen(false)}
          size="sm"
          content={
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name <span className="text-red-500">*</span></label>
                <Input value={form.name || ''} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category <span className="text-red-500">*</span></label>
                <Select value={form.category ? String(form.category) : ''} onValueChange={val => setForm(prev => ({ ...prev, category: val || undefined }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Category</SelectLabel>
                      {CATEGORY_OPTIONS.map(c => (<SelectItem key={c.id} value={c.label.toLowerCase()}>{c.label}</SelectItem>))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Product Description <span className="text-red-500">*</span></label>
                <Input value={(form.address as string) || ''} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Account / File Reference</label>
                <Input value={(form.file_reference as string) || ''} onChange={e => setForm(prev => ({ ...prev, file_reference: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Beneficiary Contact Name</label>
                <Input value={(form.contact_name as string) || ''} onChange={e => setForm(prev => ({ ...prev, contact_name: e.target.value }))} />
              </div>
              <div ref={employeeWrapRef} className="relative">
                <label className="block text-sm font-medium mb-1">Managed By (RTSB)</label>
                {/* SingleSelect expects options: { value, label } */}
                <SingleSelect
                  options={employeeOptions.map(e => ({ value: String(e.ramco_id), label: e.full_name }))}
                  value={form.entry_by ? String(form.entry_by) : (preparedName ? '' : '')}
                  onValueChange={(val: string) => {
                    // val is ramco_id string
                    setForm(prev => ({ ...prev, entry_by: val } as any));
                    const found = employeeOptions.find(x => String(x.ramco_id) === String(val));
                    if (found) setPreparedName(found.full_name);
                  }}
                  placeholder={preparedName || 'Select or search employee...'}
                  emptyMessage="No matches"
                  searchPlaceholder="Search employee..."
                  clearable
                  className="w-full"
                />
                {/* keep legacy dropdown behavior for showing results while typing */}
                {(!employeeOptions.length && employeeLoading) && (
                  <div className="absolute z-40 left-0 right-0 bg-white border mt-1 max-h-48 overflow-auto shadow-md">
                    <div className="p-2">Searching...</div>
                  </div>
                )}
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium mb-1">Position (RTSB)</label>
                <Input value={(form.entry_position as string) || ''} onChange={e => setForm(prev => ({ ...prev, entry_position: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">RTSB File Reference</label>
                <Input value={(form.file_reference as string) || ''} onChange={e => setForm(prev => ({ ...prev, file_reference: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Upload Logo</label>

                <div
                  ref={dropZoneRef}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer?.files && e.dataTransfer.files[0];
                    if (f) setLogoFile(f);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-dashed border-2 border-gray-200 rounded p-4 cursor-pointer text-center bg-gray-50"
                >
                  {!logoFile ? (
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-sm text-gray-600">Drag & drop a logo here, or click to select</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG — max size enforced by server</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 justify-center">
                      { }
                      {logoPreview ? <img src={logoPreview} alt="logo preview" className="w-16 h-16 object-contain" /> : null}
                      <div className="text-left">
                        <div className="text-sm font-medium">{logoFile.name}</div>
                        <div className="text-xs text-gray-500">{Math.round(logoFile.size / 1024)} KB</div>
                      </div>
                      <div>
                        <Button variant="ghost" className='text-red-500 hover:bg-red-500 hover:text-white' onClick={(ev) => { ev.stopPropagation(); setLogoFile(null); setLogoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>Remove</Button>
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                      setLogoFile(f);
                    }}
                  />
                </div>

                {/* existing preview for remote logo when no local file selected */}
                {!logoFile && form.logo && (
                   
                  <img src={form.logo as string} alt="logo" className="w-16 h-16 object-contain mt-2" />
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : (form.id ? 'Save' : 'Create')}</Button>
                <Button variant="outline" onClick={() => setSidebarOpen(false)}>Cancel</Button>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
};

export default BeneficiaryManager;
