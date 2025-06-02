"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, Pencil } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Label } from "@/components/ui/label";

interface Site {
    id: number;
    asset?: {
        id: number;
        serial_no: string;
        type?: { id: number; name: string };
        category?: { id: number; name: string };
        brand?: { id: number; name: string };
        model?: any;
    };
    module?: { id: number, name: string} | null;
    district_id?: { id: number; name: string } | null;
    site_category?: string;
    site_code?: string;
    site_name?: string;
    dmafull?: string | null;
    geocode?: { lat: string; lon: string } | null;
    address?: string | null;
    site_status?: string;
    // ...other fields as needed
}

const normalizeFormData = (site?: Partial<Site>) => {
    // Always ensure geocode is an object with lat/lon as strings
    let geocode = { lat: "", lon: "" };
    if (site && typeof site.geocode === "object" && site.geocode !== null) {
        geocode = {
            lat: site.geocode.lat?.toString() ?? "",
            lon: site.geocode.lon?.toString() ?? "",
        };
    }
    return {
        ...site,
        geocode,
    };
};

const SiteSites: React.FC = () => {
    const [data, setData] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Site>>(normalizeFormData({ site_code: "", site_name: "", site_category: "", geocode: { lat: "", lon: "" } }));

    const fetchData = async () => {
        try {
            const res = await authenticatedApi.get<any>("/api/assets/sites");
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
            // Always send geocode as object with lat/lon
            const payload = {
                ...formData,
                geocode: {
                    lat: formData.geocode?.lat ?? "",
                    lon: formData.geocode?.lon ?? "",
                },
            };
            if (formData.id) {
                await authenticatedApi.put(`/api/assets/sites/${formData.id}`, payload);
            } else {
                await authenticatedApi.post("/api/assets/sites", payload);
            }
            fetchData();
            setIsModalOpen(false);
            setFormData(normalizeFormData({ site_code: "", site_name: "", site_category: "", geocode: { lat: "", lon: "" } }));
        } catch (error) { }
    };

    // Map data for grid display
    const mappedData = data.map(site => ({
        ...site,
        module: site.module?.name || "-",
        asset_serial: site.asset?.serial_no || "-",
        asset_type: site.asset?.type?.name || "-",
        asset_category: site.asset?.category?.name || "-",
        asset_brand: site.asset?.brand?.name || "-",
        district: site.district_id?.name || "-",
        lat: site.geocode?.lat || "-",
        lon: site.geocode?.lon || "-",
    }));

    const columns: ColumnDef<any>[] = [
        { key: "id", header: "ID" },
        { key: "module", header: "Module", sortable: true },
        { key: "site_code", header: "Site Code" },
        { key: "site_name", header: "Site Name" },
        { key: "district", header: "District" },
        { key: "site_category", header: "Category" },
        { key: "site_status", header: "Status" },
        { key: "asset_serial", header: "Asset Serial" },
        { key: "asset_category", header: "Asset Category" },
        { key: "asset_brand", header: "Asset Brand" },
        {
            key: "geolocation",
            header: "Geolocation",
            render: (row: any) =>
                row.geocode && row.geocode.lat && row.geocode.lon
                    ? `${row.geocode.lat}, ${row.geocode.lon}`
                    : "-",
        },
        {
            key: "actions",
            header: "Actions",
            render: (row: any) => (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                        setFormData({
                            ...row,
                        });
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
                <h2 className="text-xl font-bold mb-4">Sites</h2>
                <Button onClick={() => setIsModalOpen(true)} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <Plus size={22} />
                </Button>
            </div>
            {loading ? <p>Loading...</p> : <CustomDataGrid columns={columns} data={mappedData} />}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Update Site" : "Create Site"}</DialogTitle>
                        <DialogDescription>Fill in the details below:</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={e => { e.preventDefault(); handleSubmit(); }}
                    >
                        <div className="mb-4">
                            <Label htmlFor="site_code" className="block text-sm font-medium text-gray-700">Site Code</Label>
                            <Input
                                id="site_code"
                                value={formData.site_code || ""}
                                onChange={e => setFormData(f => ({ ...f, site_code: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="site_name" className="block text-sm font-medium text-gray-700">Site Name</Label>
                            <Input
                                id="site_name"
                                value={formData.site_name || ""}
                                onChange={e => setFormData(f => ({ ...f, site_name: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="site_category" className="block text-sm font-medium text-gray-700">Category</Label>
                            <Input
                                id="site_category"
                                value={formData.site_category || ""}
                                onChange={e => setFormData(f => ({ ...f, site_category: e.target.value }))}
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="site_status" className="block text-sm font-medium text-gray-700">Status</Label>
                            <Input
                                id="site_status"
                                value={formData.site_status || ""}
                                onChange={e => setFormData(f => ({ ...f, site_status: e.target.value }))}
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="geolocation" className="block text-sm font-medium text-gray-700">Geolocation (lat, lon)</Label>
                            <Input
                                id="geolocation"
                                value={formData.geocode ? `${formData.geocode.lat || ""}, ${formData.geocode.lon || ""}` : ""}
                                onChange={e => {
                                    const [lat, lon] = e.target.value.split(",").map(s => s.trim());
                                    setFormData(f => ({
                                        ...f,
                                        geocode: { lat: lat || "", lon: lon || "" },
                                    }));
                                }}
                                placeholder="e.g. 3.12345, 101.12345"
                            />
                        </div>
                        <Button type="submit" className="mt-4">Submit</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SiteSites;
