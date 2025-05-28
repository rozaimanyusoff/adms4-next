"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid } from "@components/layouts/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faEdit } from "@fortawesome/free-solid-svg-icons";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Team {
    id: number;
    name: string;
}

const OrgTeam: React.FC = () => {
    const [data, setData] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Team>>({ name: "" });

    const fetchData = async () => {
        try {
            const res = await authenticatedApi.get<any>("/api/stock/teams");
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
                await authenticatedApi.put(`/api/stock/teams/${formData.id}`, formData);
            } else {
                await authenticatedApi.post("/api/stock/teams", formData);
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({ name: "" });
        } catch (error) { }
    };

    const columns = [
        { key: "id" as keyof Team, header: "ID" },
        { key: "name" as keyof Team, header: "Name" },
        {
            key: "actions" as keyof Team,
            header: "Actions",
            render: (row: Team) => (
                <Button
                    onClick={() => { setFormData(row); setIsModalOpen(true); }}
                    className="bg-yellow-500 hover:bg-yellow-600"
                >
                    <FontAwesomeIcon icon={faEdit} />
                </Button>
            ),
        },
    ];

    return (
        <div className="p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Teams</h2>
                <Button onClick={() => setIsModalOpen(true)} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <FontAwesomeIcon icon={faPlus} size="xl" />
                </Button>
            </div>
            {loading ? <p>Loading...</p> : <CustomDataGrid columns={columns} data={data} />}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Update Team" : "Create Team"}</DialogTitle>
                        <DialogDescription>Fill in the details below:</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={e => { e.preventDefault(); handleSubmit(); }}
                    >
                        <div className="mb-4">
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
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

export default OrgTeam;
