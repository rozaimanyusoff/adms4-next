import React, { useEffect, useState } from "react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, Pencil } from "lucide-react";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Department {
    id: number;
    name: string;
    code: string;
}

const OrgDept: React.FC = () => {
    const [data, setData] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Department>>({ name: "" });

    const fetchData = async () => {
        try {
            const res = await authenticatedApi.get<any>("/api/assets/departments");
            setData(Array.isArray(res.data) ? res.data : (res.data && res.data.data ? res.data.data : []));
        } catch (error) {
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        try {
            if (formData.id) {
                await authenticatedApi.put(`/api/assets/departments/${formData.id}`, formData);
            } else {
                await authenticatedApi.post("/api/assets/departments", formData);
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({ name: "" });
        } catch (error) { }
    };

    const columns: ColumnDef<Department>[] = [
        { key: "id", header: "ID" },
        { key: "name", header: "Name", filter: 'input' },
        { key: "code", header: "Code" },
        {
            key: "actions" as keyof Department,
            header: "Actions",
            render: (row: Department) => (
                <Pencil
                    size={20}
                    className="inline-flex items-center justify-center rounded hover:bg-yellow-100 cursor-pointer text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    tabIndex={0}
                    role="button"
                    aria-label="Edit Department"
                    onClick={() => { setFormData(row); setIsModalOpen(true); }}
                    onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") { setFormData(row); setIsModalOpen(true); }
                    }}
                />
            ),
        },
    ];

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Departments</h2>
                <Button onClick={() => setIsModalOpen(true)} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <Plus size={22} />
                </Button>
            </div>
            {loading ? <p>Loading...</p> : <CustomDataGrid columns={columns} data={data} inputFilter={false} />}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Update Department" : "Create Department"}</DialogTitle>
                        <DialogDescription>Fill in the details below:</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={e => { e.preventDefault(); handleSubmit(); }}
                    >
                        <div className="mb-4">
                            <Label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</Label>
                            <Input
                                id="name"
                                value={formData.name || ""}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <Button type="submit" className="mt-4">Submit</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default OrgDept;