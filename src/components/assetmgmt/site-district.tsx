import React, { useEffect, useState } from "react";
import { CustomDataGrid } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, Pencil } from "lucide-react";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Zone {
    id: number;
    name: string;
    code: string;
}

interface District {
    id: number;
    name: string;
    code: string;
    zone: Zone;
}

const SiteDistrict: React.FC = () => {
    const [data, setData] = useState<District[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<District & { zone_id: number }>>({ name: "", code: "", zone_id: 0 });
    const [zones, setZones] = useState<Zone[]>([]);

    const fetchData = async () => {
        try {
            const [districtsRes, zonesRes] = await Promise.all([
                authenticatedApi.get<{ data: District[] }>("/api/assets/districts"),
                authenticatedApi.get<{ data: Zone[] }>("/api/assets/zones"),
            ]);
            setData(districtsRes.data.data || []);
            setZones(zonesRes.data.data || []);
        } catch (error) {
            setData([]);
            setZones([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        try {
            const payload = {
                name: formData.name,
                code: formData.code,
                zone_id: formData.zone_id,
            };
            if (formData.id) {
                await authenticatedApi.put(`/api/assets/districts/${formData.id}`, payload);
            } else {
                await authenticatedApi.post("/api/assets/districts", payload);
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({ name: "", code: "", zone_id: 0 });
        } catch (error) { }
    };

    const columns = [
        { key: "id" as keyof District, header: "ID" },
        { key: "name" as keyof District, header: "Name" },
        { key: "code" as keyof District, header: "Code" },
        {
            key: "zone.name" as any,
            header: "Zone",
            render: (row: District) => row.zone ? `${row.zone.name} (${row.zone.code})` : <span className="text-gray-500">N/A</span>,
        },
        {
            key: "actions" as keyof District,
            header: "Actions",
            render: (row: District) => (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                        setFormData({ ...row, zone_id: row.zone?.id || 0 });
                        setIsModalOpen(true);
                    }}
                    className="bg-yellow-500 hover:bg-yellow-600"
                >
                    <Pencil size={20} />
                </Button>
            ),
        },
    ];

    return (
        <div className="p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Districts</h2>
                <Button onClick={() => setIsModalOpen(true)} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <Plus size={22} />
                </Button>
            </div>
            {loading ? <p>Loading...</p> : <CustomDataGrid columns={columns} data={data} />}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Update District" : "Create District"}</DialogTitle>
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
                        <div className="mb-4">
                            <Label htmlFor="code" className="block text-sm font-medium text-gray-700">Code</Label>
                            <Input
                                id="code"
                                value={formData.code || ""}
                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="zone" className="block text-sm font-medium text-gray-700">Zone</Label>
                            <select
                                id="zone"
                                className="w-full border rounded px-2 py-2"
                                value={formData.zone_id || ""}
                                onChange={e => setFormData({ ...formData, zone_id: Number(e.target.value) })}
                            >
                                <option value="" disabled>Select a zone</option>
                                {zones.map(zone => (
                                    <option key={zone.id} value={zone.id}>{zone.name} ({zone.code})</option>
                                ))}
                            </select>
                        </div>
                        <Button type="submit" className="mt-4">Submit</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SiteDistrict;