"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid, type ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";

interface LocationRow {
    id: string;
    code: string;
    name: string;
    address: string;
    contact: string;
    pic: string;
    workDept: string;
    zone: string;
    status: string;
}

const toDisplayString = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "Active" : "Inactive";
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
    return String(value);
};

const toStatusString = (value: unknown): string => {
    if (typeof value === "boolean") return value ? "Active" : "Inactive";
    if (typeof value === "number") return value === 1 ? "Active" : value === 0 ? "Inactive" : String(value);
    if (typeof value === "string") {
        const lowered = value.toLowerCase();
        if (["1", "active", "true"].includes(lowered)) return "Active";
        if (["0", "inactive", "false"].includes(lowered)) return "Inactive";
    }
    return toDisplayString(value);
};

const normalizeLocation = (raw: Record<string, unknown>): LocationRow => {
    const id =
        raw.id ??
        raw.loc_id ??
        raw.location_id ??
        raw.locationId ??
        raw.locationid ??
        "";

    return {
        id: toDisplayString(id),
        code: toDisplayString(
            raw.code ??
            raw.location_code ??
            raw.loc_code ??
            raw.code_name ??
            raw.codeid,
        ),
        name: toDisplayString(
            raw.name ??
            raw.location_name ??
            raw.loc_name ??
            raw.label ??
            raw.description,
        ),
        address: toDisplayString(
            raw.loc_add ??
            raw.address ??
            raw.location_address ??
            raw.description ??
            raw.details,
        ),
        contact: toDisplayString(raw.loc_ctc ?? raw.contact ?? raw.phone ?? raw.tel),
        pic: toDisplayString(
            raw.loc_pic ??
            raw.pic ??
            raw.person_in_charge ??
            raw.manager,
        ),
        workDept: toDisplayString(raw.wk_dept ?? raw.department ?? raw.dept),
        zone: toDisplayString(raw.zone ?? raw.area ?? raw.region),
        status: toStatusString(
            raw.loc_stat ?? raw.status ?? raw.active ?? raw.is_active,
        ),
    };
};

const OrgLocations: React.FC = () => {
    const [data, setData] = useState<LocationRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const res = await authenticatedApi.get<any>("/api/assets/locations");
            const payload = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : Array.isArray(res.data?.locations)
                        ? res.data.locations
                        : [];

            interface RawLocation {
                [key: string]: unknown;
            }

            const normalized: LocationRow[] = (payload as RawLocation[])
                .map((entry: RawLocation) => normalizeLocation(entry))
                .filter((row: LocationRow) => Boolean(row.id || row.name || row.code));

            setData(normalized);
        } catch (error) {
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    const columns: ColumnDef<LocationRow>[] = [
        { key: "id", header: "ID" },
        { key: "code", header: "Code" },
        { key: "name", header: "Name", filter: "input" },
        { key: "address", header: "Address" },
        { key: "contact", header: "Contact" },
        { key: "pic", header: "PIC" },
        { key: "workDept", header: "Work Dept" },
        { key: "zone", header: "Zone" },
        { key: "status", header: "Status" },
    ];

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Locations</h2>
            </div>
            {loading ? <p>Loading...</p> : <CustomDataGrid columns={columns} data={data} />}
        </div>
    );
};

export default OrgLocations;
