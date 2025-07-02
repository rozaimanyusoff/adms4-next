import React, { useEffect, useState } from "react";
import { CustomDataGrid, ColumnDef } from "@/components/ui/DataGrid";
import { Button } from "@/components/ui/button";

// Dummy employee data type
interface Employee {
    id: string;
    name: string;
    email: string;
    department: string;
    position: string;
    invited?: boolean;
}

// TODO: Replace with real API call
const fetchEmployees = async (): Promise<Employee[]> => {
    return [
        { id: "1", name: "Alice Smith", email: "alice@company.com", department: "HR", position: "Manager" },
        { id: "2", name: "Bob Lee", email: "bob@company.com", department: "IT", position: "Developer" },
        { id: "3", name: "Carol Tan", email: "carol@company.com", department: "Finance", position: "Accountant" },
    ];
};

export default function EmployeeList() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchEmployees().then((data) => {
            setEmployees(data);
            setLoading(false);
        });
    }, []);

    const handleInvite = (id: string) => {
        setInvitedIds((prev) => new Set(prev).add(id));
        // TODO: Call invite API here
    };

    const columns: ColumnDef<Employee>[] = [
        { key: "name", header: "Name", sortable: true },
        { key: "email", header: "Email", sortable: true },
        { key: "department", header: "Department", sortable: true },
        { key: "position", header: "Position", sortable: true },
        {
            key: "invite" as any, // Fix type error for custom column
            header: "Invite",
            render: (row) => (
                <Button
                    size="sm"
                    disabled={invitedIds.has(row.id)}
                    onClick={() => handleInvite(row.id)}
                >
                    {invitedIds.has(row.id) ? "Invited" : "Invite"}
                </Button>
            ),
            colClass: "text-center",
        },
    ];

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Employee List</h2>
            {loading ? (
                <div>Loading...</div>
            ) : (
                <CustomDataGrid
                    data={employees}
                    columns={columns}
                    pageSize={10}
                    inputFilter
                    pagination
                />
            )}
        </div>
    );
}
