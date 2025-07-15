import React, { useEffect, useState } from 'react';
import { AuthContext } from '@store/AuthContext';
import { authenticatedApi } from '@/config/api';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@headlessui/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import ActionSidebar from '@components/ui/action-aside';
import { Switch } from '@/components/ui/switch';

interface AccountData {
    id: number;
    account_master: string;
    description?: string;
    total_subs?: number;
    plan?: number;
    provider?: string;
}

const TelcoAccounts: React.FC = () => {
    const user = React.useContext(AuthContext);
    const [accounts, setAccounts] = useState<AccountData[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [newAccount, setNewAccount] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newProvider, setNewProvider] = useState('');
    const [editAccount, setEditAccount] = useState<AccountData | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [newPlan, setNewPlan] = useState('');
    const [editPlan, setEditPlan] = useState('');
    const [editProvider, setEditProvider] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [subsLoading, setSubsLoading] = useState(false);
    const [subsAccount, setSubsAccount] = useState<AccountData | null>(null);
    const [subsList, setSubsList] = useState<any[]>([]);
    const [subsSearch, setSubsSearch] = useState('');
    const [updateMode, setUpdateMode] = useState(false);
    const [draggedSub, setDraggedSub] = useState<any>(null);
    const [dragOverAccountId, setDragOverAccountId] = useState<number | null>(null);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await authenticatedApi.get('/api/telco/accounts');
            const response = res.data as { status: string; message: string; data: AccountData[] };
            setAccounts(response.data);
        } catch (err) {
            toast.error('Failed to fetch account data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAccount.trim() || isNaN(Number(newPlan)) || !newProvider) return;
        try {
            await authenticatedApi.post('/api/telco/accounts', {
                account_master: newAccount,
                description: newDescription,
                plan: Number(newPlan),
                provider: newProvider
            });
            toast.success('Account created');
            setNewAccount('');
            setNewDescription('');
            setNewPlan('');
            setNewProvider('');
            setShowCreate(false);
            fetchAccounts();
        } catch (err) {
            toast.error('Failed to create account');
        }
    };

    const handleEditAccount = (account: AccountData) => {
        setEditAccount(account);
        setEditValue(account.account_master);
        setEditDescription(account.description || '');
        setEditPlan(account['plan'] ? String(account['plan']) : '');
        setEditProvider(account.provider || '');
        setShowCreate(false);
    };

    const handleUpdateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editAccount || !editValue.trim() || isNaN(Number(editPlan)) || !editProvider) return;
        try {
            await authenticatedApi.put(`/api/telco/accounts/${editAccount.id}`, {
                account_master: editValue,
                description: editDescription,
                plan: Number(editPlan),
                provider: editProvider
            });
            toast.success('Account updated');
            setEditAccount(null);
            fetchAccounts();
        } catch (err) {
            toast.error('Failed to update account');
        }
    };

    const handleShowSubscribers = async (account: AccountData) => {
        setSubsLoading(true);
        setSidebarOpen(true);
        setSubsAccount(account);
        try {
            const res = await authenticatedApi.get(`/api/telco/accounts/${account.id}/subs`);
            const data = res.data as { status: string; message: string; data: { subs: any[] } };
            setSubsList(data.data.subs || []);
        } catch (err) {
            toast.error('Failed to fetch subscribers');
            setSubsList([]);
        } finally {
            setSubsLoading(false);
        }
    };

    const columns: ColumnDef<AccountData>[] = [
        { key: 'id', header: '#', sortable: false },
        {
            key: 'account_master', header: 'Account', sortable: true, filter: 'input', render: (row: AccountData) => (
                <span className="cursor-pointer text-blue-600 hover:underline" onClick={() => handleEditAccount(row)}>{row.account_master}</span>
            )
        },
        { key: 'provider', header: 'Provider', sortable: true },
        { key: 'description', header: 'Description', sortable: false, render: (row: AccountData) => row.description || '-' },
        { key: 'plan', header: 'Plan (RM)', sortable: true },
        {
            key: 'total_subs',
            header: 'Subscribers',
            sortable: true,
            render: (row: AccountData) => (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span
                                className="inline-flex items-center px-4 py-0.5 rounded-full text-xs font-semibold bg-blue-500 text-white cursor-pointer hover:bg-indigo-600 shadow"
                                onClick={() => handleShowSubscribers(row)}
                            >
                                {row.total_subs || 0}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            Click to view subscribers list
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        }
    ];

    // Helper to get username from AuthContext
    const username = user?.authData?.user.username || '';

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Telco Account & Subscribers</h2>
                <Button variant="default" onClick={() => setShowCreate(true)}><Plus size={20} /></Button>
            </div>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Account</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateAccount} className="flex flex-col gap-4">
                        <Input
                            value={newAccount}
                            onChange={e => setNewAccount(e.target.value)}
                            placeholder="New account number"
                            required
                        />
                        <Select value={newProvider} onValueChange={setNewProvider} required>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Provider" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Provider</SelectLabel>
                                    <SelectItem value="Celcom">Celcom</SelectItem>
                                    <SelectItem value="TM">TM</SelectItem>
                                    <SelectItem value="Time">Time</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <Textarea
                            value={newDescription}
                            onChange={e => setNewDescription(e.target.value)}
                            placeholder="Description (optional)"
                            className="min-h-[80px] border text-sm rounded-lg p-2 shadow"
                        />
                        <Input
                            type="text"
                            value={newPlan}
                            onChange={e => setNewPlan(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="0.00"
                        />
                        <DialogFooter className="flex gap-2">
                            <Button type="submit" variant="default">Create</Button>
                            <Button type="button" variant="destructive" onClick={() => setShowCreate(false)}>Cancel</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={!!editAccount} onOpenChange={v => { if (!v) setEditAccount(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Account</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateAccount} className="flex flex-col gap-4">
                        <Input
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            placeholder="Account name"
                            required
                        />
                        <Select value={editProvider} onValueChange={setEditProvider} required>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Provider" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Provider</SelectLabel>
                                    <SelectItem value="Celcom">Celcom</SelectItem>
                                    <SelectItem value="TM">TM</SelectItem>
                                    <SelectItem value="Time">Time</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <Textarea
                            value={editDescription}
                            onChange={e => setEditDescription(e.target.value)}
                            placeholder="Describe accounts"
                            className="min-h-[80px] text-sm border rounded-lg p-2 shadow"
                        />
                        <Input
                            type="text"
                            value={editPlan}
                            onChange={e => setEditPlan(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="0.00"
                        />
                        <DialogFooter className="flex gap-2">
                            <Button type="submit" variant="default">Update</Button>
                            <Button type="button" variant="destructive" onClick={() => setEditAccount(null)}>Cancel</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <CustomDataGrid
                data={accounts}
                columns={columns}
                pageSize={10}
                pagination={true}
                inputFilter={false}
                theme="sm"
                dataExport={true}
                onRowDoubleClick={handleEditAccount}
            />
            {sidebarOpen && (
                <ActionSidebar
                    title={subsAccount ? `Subscribers for ${subsAccount.account_master}` : 'Subscribers'}
                    onClose={() => setSidebarOpen(false)}
                    size={updateMode ? 'md' : 'sm'}
                    content={subsLoading ? (
                        <div className="p-4 text-center">Loading...</div>
                    ) : (
                        <div className="p-4">
                            <div className="flex items-center gap-4 mb-3">
                                <Input
                                    type="text"
                                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    placeholder="Search sub no or account sub..."
                                    value={subsSearch}
                                    onChange={e => setSubsSearch(e.target.value)}
                                />
                                <div className="flex items-center gap-1">
                                    <Switch checked={updateMode} onCheckedChange={setUpdateMode} id="update-mode-switch" />
                                    <label htmlFor="update-mode-switch" className="text-xs">Update</label>
                                </div>
                            </div>
                            <div className={updateMode ? 'flex gap-6' : ''}>
                                <div className={updateMode ? 'w-1/2' : ''}>
                                    {subsList.length === 0 ? (
                                        <div>No subscribers found.</div>
                                    ) : (
                                        <ul className="divide-y divide-gray-200">
                                            {subsList
                                                .filter(sub =>
                                                    sub.sub_no.toLowerCase().includes(subsSearch.toLowerCase()) ||
                                                    sub.account_sub.toLowerCase().includes(subsSearch.toLowerCase())
                                                )
                                                .map((sub, idx) => (
                                                    <li
                                                        key={sub.id}
                                                        className="py-2 flex flex-col cursor-move px-4"
                                                        draggable={updateMode}
                                                        onDragStart={() => setDraggedSub(sub)}
                                                    >
                                                        <span className={`font-semibold text-sm${sub.status === 'inactive' ? ' text-red-600' : ''}`}>{sub.sub_no}</span>
                                                        <span className="text-xs text-gray-700">Account Sub: {sub.account_sub}</span>
                                                        <span className="text-xs text-gray-700">SIM No: {sub.sim_no}</span>
                                                    </li>
                                                ))}
                                        </ul>
                                    )}
                                </div>
                                {updateMode && (
                                    <div className="w-1/2 border-l pl-4">
                                        <div className="font-semibold mb-2 text-sm text-gray-700">Move to Account:</div>
                                        <ul className="divide-y divide-gray-200">
                                            {accounts.filter(acc => acc.id !== subsAccount?.id).map(acc => (
                                                <li
                                                    key={acc.id}
                                                    className="py-2 px-2 rounded cursor-pointer border border-transparent"
                                                    onDragOver={e => { e.preventDefault(); setDragOverAccountId(acc.id); }}
                                                    onDragLeave={() => setDragOverAccountId(null)}
                                                    onDrop={async () => {
                                                        setDragOverAccountId(null);
                                                        if (draggedSub) {
                                                            try {
                                                                await authenticatedApi.patch(
                                                                    `/api/telco/subs/${draggedSub.id}/move`,
                                                                    {
                                                                        account_id: acc.id,
                                                                        old_account_id: subsAccount?.id,
                                                                        updated_by: username
                                                                    }
                                                                );
                                                                toast.success('Subscriber moved');
                                                                setDraggedSub(null);
                                                                handleShowSubscribers(subsAccount!);
                                                                fetchAccounts(); // Reload the grid after moving subscriber
                                                            } catch {
                                                                toast.error('Failed to move subscriber');
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <div className={`flex flex-col border-2 border-indigo-500 rounded py-4 px-2 shadow-lg max-w-3/4 bg-indigo-200 hover:bg-amber-300 ${dragOverAccountId === acc.id ? 'bg-amber-200' : ''}`}>
                                                        <span className="font-semibold">{acc.account_master}</span>
                                                        <span className="block text-xs text-gray-500">{acc.description || '-'}</span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                />
            )}
        </div>
    );
};

export default TelcoAccounts;
