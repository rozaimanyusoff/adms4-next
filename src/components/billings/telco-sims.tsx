import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { CustomDataGrid, ColumnDef } from "@/components/ui/DataGrid";
import { Plus } from "lucide-react";
import { toast } from 'sonner';

interface SimCard {
    id: number;
    sub_no_id: number;
    sim_sn: string;
    sub_no: string;
    account_sub: string;
    no_acc: string;
}

const TelcoSims: React.FC = () => {
    const [sims, setSims] = useState<SimCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const [editSim, setEditSim] = useState<SimCard | null>(null);
    const [form, setForm] = useState<Omit<SimCard, 'id'> & { id?: number }>({
        sim_sn: '',
        sub_no: '',
        sub_no_id: 0,
        account_sub: '',
        no_acc: '',
    });
    const [formLoading, setFormLoading] = useState(false);

    // Fetch SIMs
    const fetchSims = async () => {
        setLoading(true);
        try {
            const res = await authenticatedApi.get('/api/telco/sims');
            const response = res.data as { status: string; message: string; data: SimCard[] };
            setSims(response.data || []);
        } catch (err) {
            toast.error('Failed to fetch SIM cards');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSims();
    }, []);

    // DataGrid columns
    const columns: ColumnDef<SimCard>[] = [
        { key: 'id', header: 'ID', sortable: false },
        { key: 'sim_sn', header: 'SIM Serial', sortable: true, filter: 'input' },
        { key: 'sub_no', header: 'Phone Number', sortable: true, filter: 'input' },
        { key: 'account_sub', header: 'Account Sub', sortable: true, filter: 'input' },
        { key: 'no_acc', header: 'Account No', sortable: true, filter: 'input' },
    ];

    // Handle open create
    const handleCreate = () => {
        setEditSim(null);
        setForm({ sim_sn: '', sub_no: '', sub_no_id: 0, account_sub: '', no_acc: '' });
        setShowDialog(true);
    };

    // Handle open edit
    const handleEdit = (sim: SimCard) => {
        setEditSim(sim);
        setForm(sim);
        setShowDialog(true);
    };

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const method = editSim ? 'PUT' : 'POST';
            const url = editSim ? `/api/telco/sims/${editSim.id}` : '/api/telco/sims';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.status === 'success') {
                toast.success(editSim ? 'SIM updated' : 'SIM created');
                setShowDialog(false);
                fetchSims();
            } else {
                toast.error(data.message || 'Failed to save SIM');
            }
        } catch (err) {
            toast.error('Failed to save SIM');
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">SIM Cards</h2>
                <Button onClick={handleCreate} variant="default"><Plus /></Button>
            </div>
            <CustomDataGrid
                data={sims}
                columns={columns}
                pageSize={10}
                pagination={true}
                inputFilter={false}
                theme="sm"
                onRowDoubleClick={handleEdit}
                dataExport={true}
            />
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editSim ? 'Update SIM Card' : 'Create SIM Card'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
                        <div>
                            <label htmlFor="sim_sn" className="block text-sm font-medium mb-1">SIM Serial Number</label>
                            <Input
                                id="sim_sn"
                                value={form.sim_sn}
                                onChange={e => setForm(f => ({ ...f, sim_sn: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="sub_no" className="block text-sm font-medium mb-1">Phone Number</label>
                            <Input
                                id="sub_no"
                                value={form.sub_no}
                                onChange={e => setForm(f => ({ ...f, sub_no: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="account_sub" className="block text-sm font-medium mb-1">Account Sub</label>
                            <Input
                                id="account_sub"
                                value={form.account_sub}
                                onChange={e => setForm(f => ({ ...f, account_sub: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="no_acc" className="block text-sm font-medium mb-1">Account No</label>
                            <Input
                                id="no_acc"
                                value={form.no_acc}
                                onChange={e => setForm(f => ({ ...f, no_acc: e.target.value }))}
                                required
                            />
                        </div>
                        {/* sub_no_id is hidden, but you can add a field if needed */}
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" variant="default" disabled={formLoading}>
                                {formLoading ? 'Saving...' : (editSim ? 'Update' : 'Create')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TelcoSims;
