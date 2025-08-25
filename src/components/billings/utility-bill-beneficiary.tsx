import React, { useEffect, useMemo, useState, useRef } from 'react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import ActionSidebar from '@/components/ui/action-aside';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';

interface Beneficiary {
  bfcy_id?: number;
  bfcy_name: string;
  bfcy_desc?: string;
  cat_id?: number;
  bfcy_fileno?: string;
  bfcy_cat?: string;
  bfcy_pic?: string;
  bfcy_ctc?: string;
  bfcy_logo?: string;
  // backend may return an object { ramco_id, full_name } or a simple ramco_id string
  entry_by?: { ramco_id: string; full_name: string } | string | null;
  entry_position?: string;
  acc_no?: string;
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
  const [form, setForm] = useState<Beneficiary>({ bfcy_name: '', bfcy_desc: '', cat_id: undefined, bfcy_fileno: '', bfcy_pic: '', bfcy_ctc: '', bfcy_logo: '', acc_no: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [employeeOptions, setEmployeeOptions] = useState<{ ramco_id: string; full_name: string }[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
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
    setForm({ bfcy_name: '', bfcy_desc: '', cat_id: undefined, bfcy_fileno: '', bfcy_pic: '', bfcy_ctc: '', bfcy_logo: '', acc_no: '', entry_by: undefined });
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
          bfcy_id: data.bfcy_id,
          bfcy_name: data.bfcy_name || '',
          bfcy_desc: data.bfcy_desc || '',
          cat_id: data.cat_id || undefined,
          bfcy_fileno: data.bfcy_fileno || '',
          bfcy_pic: data.bfcy_pic || '',
          bfcy_ctc: data.bfcy_ctc || '',
          bfcy_logo: data.bfcy_logo || '',
          // store ramco_id string in form for payload
          entry_by: data.entry_by ? (typeof data.entry_by === 'object' ? String(data.entry_by.ramco_id) : String(data.entry_by)) : undefined,
          entry_position: data.entry_position || '',
          acc_no: data.acc_no || ''
        });
        setLogoFile(null);
        // if there's an existing entry_by (ramco id), fetch name for display
        if (data?.entry_by) {
          try {
            const query = typeof data.entry_by === 'object' ? data.entry_by.ramco_id : data.entry_by;
            const r: any = await authenticatedApi.get(`/api/assets/employees/search?q=${query}`);
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

  // debounce employee search
  useEffect(() => {
    if (!employeeQuery || employeeQuery.trim().length < 2) {
      setEmployeeOptions([]);
      setEmployeeLoading(false);
      return;
    }

    setEmployeeLoading(true);
    const id = setTimeout(async () => {
      try {
        const res: any = await authenticatedApi.get(`/api/assets/employees/search?q=${encodeURIComponent(employeeQuery)}`);
        // API may return data array directly or inside data.data
        const list = res.data?.data || res.data || [];
        setEmployeeOptions(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('employee search', err);
        setEmployeeOptions([]);
      } finally {
        setEmployeeLoading(false);
        setShowEmployeeDropdown(true);
      }
    }, 300);

    return () => clearTimeout(id);
  }, [employeeQuery]);

  // click outside to close employee dropdown
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (employeeWrapRef.current && !employeeWrapRef.current.contains(e.target as Node)) {
        setShowEmployeeDropdown(false);
      }
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const validate = () => {
    if (!form.bfcy_name || !form.bfcy_name.trim()) {
      toast.error('Name is required');
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
        payload.append('bfcy_name', form.bfcy_name || '');
        payload.append('bfcy_desc', form.bfcy_desc || '');
        if (form.cat_id) payload.append('cat_id', String(form.cat_id));
        payload.append('bfcy_fileno', form.bfcy_fileno || '');
        payload.append('bfcy_pic', form.bfcy_pic || '');
        payload.append('bfcy_ctc', form.bfcy_ctc || '');
        payload.append('acc_no', form.acc_no || '');
        payload.append('entry_by', form.entry_by || '');
        payload.append('entry_position', form.entry_position || '');
        payload.append('bfcy_logo', logoFile);
      } else {
        payload = {
          bfcy_name: form.bfcy_name,
          bfcy_desc: form.bfcy_desc,
          cat_id: form.cat_id,
          bfcy_fileno: form.bfcy_fileno,
          bfcy_pic: form.bfcy_pic,
          bfcy_ctc: form.bfcy_ctc,
          acc_no: form.acc_no,
          entry_by: form.entry_by,
          entry_position: form.entry_position,
        };
      }

      if (form.bfcy_id) {
        // update
        if (payload instanceof FormData) {
          await authenticatedApi.put(`/api/bills/util/beneficiaries/${form.bfcy_id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        } else {
          await authenticatedApi.put(`/api/bills/util/beneficiaries/${form.bfcy_id}`, payload);
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
    { key: 'bfcy_id', header: 'ID' },
    { key: 'bfcy_name', header: 'Name', filter: 'input' },
    { key: 'bfcy_cat', header: 'Category', render: (r: any) => r.bfcy_cat || (CATEGORY_OPTIONS.find((c) => c.id === r.cat_id)?.label || ''), filter: 'singleSelect' },
    { key: 'bfcy_desc', header: 'Description', filter: 'input' },
        { key: 'bfcy_ctc', header: 'Contact', filter: 'input' },
    { key: 'entry_by', header: 'Bill Manager', filter: 'input', render: (r: any) => (r.entry_by && typeof r.entry_by === 'object') ? r.entry_by.full_name : (r.entry_by || '') },
    { key: 'entry_position', header: 'Position' },
    { key: 'bfcy_fileno', header: 'File Reference', filter: 'input' },

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

      <CustomDataGrid columns={columns as any} data={rows} pagination={false} inputFilter={false} theme="sm" onRowDoubleClick={(row: any) => openEdit(row?.bfcy_id)} dataExport={true} />

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
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input value={form.bfcy_name} onChange={e => setForm(prev => ({ ...prev, bfcy_name: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <Select value={form.cat_id ? String(form.cat_id) : ''} onValueChange={val => setForm(prev => ({ ...prev, cat_id: val ? Number(val) : undefined }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Category</SelectLabel>
                      {CATEGORY_OPTIONS.map(c => (<SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Product Description</label>
                <Input value={form.bfcy_desc} onChange={e => setForm(prev => ({ ...prev, bfcy_desc: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Account No</label>
                <Input value={form.acc_no} onChange={e => setForm(prev => ({ ...prev, acc_no: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Beneficiary Contact</label>
                <Input value={form.bfcy_ctc} onChange={e => setForm(prev => ({ ...prev, bfcy_ctc: e.target.value }))} />
              </div>
              <div ref={employeeWrapRef} className="relative">
                <label className="block text-sm font-medium mb-1">Managed By (RTSB)</label>
                <Input
                  value={preparedName || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPreparedName(v);
                    setForm(prev => ({ ...prev, entry_by: undefined }));
                    setEmployeeQuery(v);
                  }}
                  onFocus={() => { if (employeeOptions.length) setShowEmployeeDropdown(true); }}
                  placeholder="Type employee name..."
                />

                {showEmployeeDropdown && (
                  <div className="absolute z-40 left-0 right-0 bg-white border mt-1 max-h-48 overflow-auto shadow-md">
                    {employeeLoading ? (
                      <div className="p-2">Searching...</div>
                    ) : employeeOptions.length ? (
                      employeeOptions.map(opt => (
                        <div key={opt.ramco_id} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => {
                          setForm(prev => ({ ...prev, entry_by: String(opt.ramco_id) } as any));
                          setPreparedName(opt.full_name);
                          setShowEmployeeDropdown(false);
                        }}>
                          {opt.full_name}
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-gray-500">No matches</div>
                    )}
                  </div>
                )}
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium mb-1">Position (RTSB)</label>
                <Input value={form.entry_position} onChange={e => setForm(prev => ({ ...prev, entry_position: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">RTSB File Reference</label>
                <Input value={form.bfcy_fileno} onChange={e => setForm(prev => ({ ...prev, bfcy_fileno: e.target.value }))} />
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                {!logoFile && form.bfcy_logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.bfcy_logo} alt="logo" className="w-16 h-16 object-contain mt-2" />
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : (form.bfcy_id ? 'Save' : 'Create')}</Button>
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
