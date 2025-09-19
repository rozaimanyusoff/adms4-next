import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash, Edit } from 'lucide-react';

type Assessment = {
    assess_id: number;
    a_date: string | null;
    a_ncr: number;
    a_rate: string | number;
    a_upload?: string | null;
    a_upload2?: string | null;
    a_upload3?: string | null;
    a_upload4?: string | null;
    a_remark?: string | null;
    a_dt?: string | null;
    asset?: any;
    assessment_location?: any;
};

const AssessmentRecord: React.FC = () => {
    const [data, setData] = useState<Assessment[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Assessment | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    const [form, setForm] = useState<Partial<Assessment>>({
        a_date: new Date().toISOString(),
        a_ncr: 0,
        a_rate: '',
        a_remark: '',
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await authenticatedApi.get('/api/compliance/assessments');
            const list = (res as any).data?.data || (res as any).data || [];
            setData(list as Assessment[]);
        } catch (err) {
            toast.error('Failed to load assessments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const columns: ColumnDef<Assessment>[] = [
        { key: 'assess_id' as any, header: 'ID', sortable: true },
        { key: 'a_date' as any, header: 'Assessment Date', sortable: true, render: (row) => row.a_date ? new Date(row.a_date).toLocaleString() : '-' },
        { key: 'a_rate' as any, header: 'Rate', sortable: true },
        { key: 'a_ncr' as any, header: 'NCR', sortable: true },
        { key: 'asset_reg' as any, header: 'Asset', filter: 'singleSelect', render: (row) => row.asset?.register_number || '-' },
        { key: 'asset_owner' as any, header: 'Owner', filter: 'singleSelect', render: (row) => row.asset?.owner?.full_name || '-' },
        { key: 'assessment_location' as any, header: 'Location', filter: 'singleSelect', render: (row) => row.assessment_location?.code || '-' },
        {
            key: 'actions' as any, header: 'Actions', render: (row) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(row as Assessment)}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(row as Assessment)}><Trash className="h-4 w-4" /></Button>
                </div>
            )
        },
    ];

    const handleCreate = () => {
        setEditing(null);
        setForm({ a_date: new Date().toISOString(), a_ncr: 0, a_rate: '', a_remark: '' });
        setOpen(true);
    };

    const handleEdit = (row: Assessment) => {
        setEditing(row);
        setForm({ ...row });
        setOpen(true);
    };

    const handleDelete = async (row: Assessment) => {
        if (!confirm('Delete this assessment?')) return;
        try {
            await authenticatedApi.delete(`/api/compliance/assessments/${row.assess_id}`);
            toast.success('Deleted');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            if (editing) {
                await authenticatedApi.put(`/api/compliance/assessments/${editing.assess_id}`, form);
                toast.success('Updated');
            } else {
                await authenticatedApi.post('/api/compliance/assessments', form);
                toast.success('Created');
            }
            setOpen(false);
            fetchData();
        } catch (err) {
            toast.error('Failed to save');
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Assessment Records</h2>
                <div className="flex items-center gap-2">
                    <Button variant="default" onClick={handleCreate}><Plus className="h-4 w-4" /></Button>
                </div>
            </div>

            <CustomDataGrid
                data={data}
                columns={columns}
                inputFilter={false}
                pageSize={10}
                pagination={false}
                onRowDoubleClick={handleEdit}
                dataExport
            />

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Assessment' : 'Create Assessment'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
                        <div>
                            <Label className="text-sm">Assessment Date</Label>
                            <Input type="datetime-local" value={form.a_date ? new Date(form.a_date).toISOString().slice(0, 16) : ''} onChange={(e) => setForm(f => ({ ...f, a_date: e.target.value }))} />
                        </div>
                        <div>
                            <Label className="text-sm">Rate</Label>
                            <Input value={String(form.a_rate ?? '')} onChange={(e) => setForm(f => ({ ...f, a_rate: e.target.value }))} />
                        </div>
                        <div>
                            <Label className="text-sm">NCR</Label>
                            <Input type="number" value={String(form.a_ncr ?? 0)} onChange={(e) => setForm(f => ({ ...f, a_ncr: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <Label className="text-sm">Remark</Label>
                            <Textarea value={String(form.a_remark ?? '')} onChange={(e) => setForm(f => ({ ...f, a_remark: e.target.value }))} rows={3} />
                        </div>

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={formLoading}>{formLoading ? 'Saving...' : (editing ? 'Update' : 'Create')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AssessmentRecord;
