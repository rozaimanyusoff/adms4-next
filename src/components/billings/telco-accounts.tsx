import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@headlessui/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface AccountData {
    id: number;
    account_master: string;
    description?: string;
}

const TelcoAccounts: React.FC = () => {
    const [accounts, setAccounts] = useState<AccountData[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [newAccount, setNewAccount] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [editAccount, setEditAccount] = useState<AccountData | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editDescription, setEditDescription] = useState('');

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
        if (!newAccount.trim()) return;
        try {
            await authenticatedApi.post('/api/telco/accounts', { account_master: newAccount, description: newDescription });
            toast.success('Account created');
            setNewAccount('');
            setNewDescription('');
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
        setShowCreate(false);
    };

    const handleUpdateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editAccount || !editValue.trim()) return;
        try {
            await authenticatedApi.put(`/api/telco/accounts/${editAccount.id}`, { account_master: editValue, description: editDescription });
            toast.success('Account updated');
            setEditAccount(null);
            fetchAccounts();
        } catch (err) {
            toast.error('Failed to update account');
        }
    };

    const columns: ColumnDef<AccountData>[] = [
        { key: 'id', header: '#', sortable: false },
        { key: 'account_master', header: 'Account', sortable: true, filter: 'input', render: (row: AccountData) => (
            <span className="cursor-pointer text-blue-600 hover:underline" onClick={() => handleEditAccount(row)}>{row.account_master}</span>
        ) },
        { key: 'description', header: 'Description', sortable: false, render: (row: AccountData) => row.description || '-' },
    ];

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
                            placeholder="New account name"
                            required
                        />
                        <Textarea
                            value={newDescription}
                            onChange={e => setNewDescription(e.target.value)}
                            placeholder="Description (optional)"
                            className="min-h-[80px]"
                        />
                        <DialogFooter className="flex gap-2">
                            <Button type="submit" variant="default">Create</Button>
                            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
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
                        <Textarea
                            value={editDescription}
                            onChange={e => setEditDescription(e.target.value)}
                            placeholder="Description (optional)"
                            className="min-h-[80px]"
                        />
                        <DialogFooter className="flex gap-2">
                            <Button type="submit" variant="default">Update</Button>
                            <Button type="button" variant="ghost" onClick={() => setEditAccount(null)}>Cancel</Button>
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
        </div>
    );
};

export default TelcoAccounts;
