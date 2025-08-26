import React, { useEffect } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';

type AssetType = { id: number; name: string };
type Employee = { ramco_id: string; full_name: string; position?: { name: string } };
type ManagerEntry = { id: number; ramco_id: string; manager_id: number; is_active?: string; employee?: Employee };

/**
 * AssetManager
 * - Accordion per asset type
 * - Each accordion body lists assigned managers (team members)
 * - Form to register / update / delete members
 *
 * Assumptions (because backend endpoints for managers were not specified):
 * - GET /api/assets/types -> { data: AssetType[] }
 * - GET /api/assets/employees?status=active -> { data: Employee[] }
 * - GET /api/assets/managers?manager_id={id} -> { data: ManagerEntry[] }
 * - POST /api/assets/managers -> payload { ramco_id, manager_id }
 * - PUT /api/assets/managers/{id} -> payload { ramco_id, manager_id }
 * - DELETE /api/assets/managers/{id}
 *
 * If your backend uses different routes, update the URLs below accordingly.
 */
const AssetManager: React.FC = () => {
    const [types, setTypes] = React.useState<AssetType[]>([]);
    const [employees, setEmployees] = React.useState<Employee[]>([]);
    const [managersByType, setManagersByType] = React.useState<Record<number, ManagerEntry[]>>({});
    const [loading, setLoading] = React.useState(false);

    // Form state
    const [selectedTypeId, setSelectedTypeId] = React.useState<number | null>(null);
    const [selectedEmployeeRamco, setSelectedEmployeeRamco] = React.useState<string>('');
    const [editingEntry, setEditingEntry] = React.useState<ManagerEntry | null>(null);

    useEffect(() => {
        async function fetchInitial() {
            setLoading(true);
            try {
                const resArr: any = await Promise.all([
                    authenticatedApi.get('/api/assets/types'),
                    authenticatedApi.get('/api/assets/employees?status=active'),
                ]);
                const typesRes: any = resArr[0];
                const empRes: any = resArr[1];
                setTypes(typesRes.data?.data || []);
                setEmployees(empRes.data?.data || []);

                // Try to fetch all managers in one call and group by manager_id (which represents type_id)
                try {
                    const allRes: any = await authenticatedApi.get('/api/assets/managers');
                    const allManagers: ManagerEntry[] = allRes.data?.data || [];
                    const grouped: Record<number, ManagerEntry[]> = {};
                    allManagers.forEach((m: ManagerEntry) => {
                        const key = Number(m.manager_id);
                        if (!grouped[key]) grouped[key] = [];
                        grouped[key].push(m);
                    });
                    setManagersByType(grouped);
                } catch (err) {
                    // Fallback: fetch per type
                    const managersMap: Record<number, ManagerEntry[]> = {};
                    await Promise.all((typesRes.data?.data || []).map(async (t: AssetType) => {
                        try {
                            const mres: any = await authenticatedApi.get(`/api/assets/managers?manager_id=${t.id}`);
                            managersMap[t.id] = mres.data?.data || [];
                        } catch (e) {
                            managersMap[t.id] = [];
                        }
                    }));
                    setManagersByType(managersMap);
                }
            } catch (err) {
                console.error(err);
                toast.error('Failed to load asset manager data');
            } finally {
                setLoading(false);
            }
        }
        fetchInitial();
    }, []);

    const [loadingByType, setLoadingByType] = React.useState<Record<number, boolean>>({});

    async function fetchManagersForType(typeId: number) {
        // Use cache if present
        if (managersByType[typeId]) return;
        setLoadingByType(prev => ({ ...prev, [typeId]: true }));
        try {
            const res: any = await authenticatedApi.get(`/api/assets/managers?manager_id=${typeId}`);
            setManagersByType(prev => ({ ...prev, [typeId]: res.data?.data || [] }));
        } catch (err) {
            console.error(err);
            toast.error('Failed to load managers for type');
        } finally {
            setLoadingByType(prev => ({ ...prev, [typeId]: false }));
        }
    }

    async function handleCreateOrUpdate(e?: React.FormEvent) {
        if (e) e.preventDefault();
        if (!selectedTypeId || !selectedEmployeeRamco) {
            toast.error('Please select an asset type and an employee');
            return;
        }
        try {
            if (editingEntry) {
                // Update
                await authenticatedApi.put(`/api/assets/managers/${editingEntry.id}`, {
                    ramco_id: selectedEmployeeRamco,
                    manager_id: selectedTypeId,
                });
                toast.success('Manager updated');
            } else {
                // Create
                await authenticatedApi.post('/api/assets/managers', {
                    ramco_id: selectedEmployeeRamco,
                    manager_id: selectedTypeId,
                });
                toast.success('Manager added');
            }
            // refresh list for the type
            await fetchManagersForType(selectedTypeId);
            // reset form
            setSelectedEmployeeRamco('');
            setEditingEntry(null);
        } catch (err) {
            console.error(err);
            toast.error('Failed to save manager');
        }
    }

    async function handleDelete(entry: ManagerEntry) {
        if (!confirm(`Delete manager ${entry.employee?.full_name || entry.ramco_id}?`)) return;
        try {
            await authenticatedApi.delete(`/api/assets/managers/${entry.id}`);
            toast.success('Manager deleted');
            await fetchManagersForType(entry.manager_id);
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete manager');
        }
    }

    function startEdit(entry: ManagerEntry) {
        setEditingEntry(entry);
    setSelectedTypeId(entry.manager_id);
    setSelectedEmployeeRamco(entry.employee?.ramco_id || entry.ramco_id || '');
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <h3 className="text-lg font-semibold">Asset Manager / Team Members</h3>
            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                        <Accordion type="single" collapsible>
                            {types.map((t) => {
                                const all = managersByType[t.id] || [];
                                const members = all.filter(m => Number(m.manager_id) === t.id);
                                const membersCount = members.length;
                                return (
                                    <AccordionItem key={t.id} value={`type-${t.id}`} className="data-[state=open]:bg-slate-300 data-[state=open]:text-black rounded-md">
                                        <AccordionTrigger onClick={() => fetchManagersForType(t.id)} className="bg-transparent px-3 py-2">
                                            <div className="flex items-center justify-between w-full">
                                                <span>{t.name}</span>
                                                <span className="inline-flex items-center bg-gray-100 text-gray-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                                    {membersCount}
                                                </span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-2 px-2 py-3">
                                                {loadingByType[t.id] ? (
                                                    <div className="text-sm text-gray-500">Loading...</div>
                                                ) : membersCount === 0 ? (
                                                    <div className="text-sm text-gray-500">No members assigned for this type.</div>
                                                ) : (
                                                    members.map((m) => (
                                                        <div key={m.id} className="flex items-center justify-between bg-slate-200 dark:bg-gray-800 rounded p-2 border">
                                                            <div>
                                                                <div className="font-medium">{m.employee?.full_name || m.ramco_id}</div>
                                                                <div className="text-xs text-gray-600">{m.employee?.ramco_id || m.ramco_id}</div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Button size="sm" variant="ghost" onClick={() => startEdit(m)}>Edit</Button>
                                                                <Button size="sm" variant="destructive" onClick={() => handleDelete(m)}>Delete</Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    </div>

                    <div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded border">
                            <form onSubmit={handleCreateOrUpdate} className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Asset Type</label>
                                    <Select onValueChange={(val: any) => setSelectedTypeId(Number(val))} value={selectedTypeId ? String(selectedTypeId) : undefined}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select asset type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {types.map((t) => (
                                                <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Employee (manager)</label>
                                    <Combobox
                                        options={employees.map((emp) => ({ value: emp.ramco_id, label: `${emp.full_name} (${emp.ramco_id})` })) as ComboboxOption[]}
                                        placeholder="Search employees..."
                                        value={selectedEmployeeRamco}
                                        onValueChange={(v: string) => setSelectedEmployeeRamco(v)}
                                        className="w-full"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button type="submit">{editingEntry ? 'Update' : 'Add'} Member</Button>
                                    {editingEntry && (
                                        <Button variant="outline" onClick={() => { setEditingEntry(null); setSelectedEmployeeRamco(''); setSelectedTypeId(null); }}>Cancel</Button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetManager;
