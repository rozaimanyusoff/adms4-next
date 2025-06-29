import React, { useEffect, useState, useMemo, useRef } from "react";
import { CustomDataGrid, ColumnDef, DataGridProps } from "@/components/ui/DataGrid";
import { authenticatedApi } from "@/config/api";
import { Plus, Pencil, Trash2, MinusCircle } from "lucide-react";
import { Button } from "@components/ui/button";
import FRoleForm from "./f-role";
import { toast } from "sonner";

interface Role {
    id: number;
    name: string;
    description: string;
    permissions: {
        view: boolean;
        create: boolean;
        update: boolean;
        delete: boolean;
    };
    users: { id: number; name: string }[];
}

interface RolesApiResponse {
    success: boolean;
    data: Role[];
}

const RoleManagement = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Role; direction: "asc" | "desc" } | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [editRole, setEditRole] = useState<Role | null>(null);
    const [formName, setFormName] = useState("");
    const [formDesc, setFormDesc] = useState("");
    const [formPerms, setFormPerms] = useState({ view: true, create: false, update: false, delete: false });
    const [formUsers, setFormUsers] = useState<number[]>([]); // user IDs
    const [formUserObjs, setFormUserObjs] = useState<any[]>([]); // user objects for display
    const [saving, setSaving] = useState(false);
    const [assignSidebarOpen, setAssignSidebarOpen] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [userSearch, setUserSearch] = useState("");
    const userListRef = useRef<{ [key: number]: HTMLLIElement | null }>({});
    const [newlyAssignedUserIds, setNewlyAssignedUserIds] = useState<number[]>([]);

    useEffect(() => {
        authenticatedApi.get<RolesApiResponse>("/api/roles").then(res => {
            if (res.data.success) setRoles(res.data.data);
        });
    }, []);

    useEffect(() => {
        if (editRole) {
            setFormName(editRole.name || "");
            setFormDesc(editRole.description || "");
            setFormPerms(editRole.permissions || { view: true, create: false, update: false, delete: false });
            setFormUsers(editRole.users ? editRole.users.map(u => u.id) : []);
            setFormUserObjs(editRole.users || []);
        } else {
            setFormName("");
            setFormDesc("");
            setFormPerms({ view: true, create: false, update: false, delete: false });
            setFormUsers([]);
            setFormUserObjs([]);
        }
    }, [editRole]);

    useEffect(() => {
        if (assignSidebarOpen) {
            authenticatedApi.get("/api/users").then(res => {
                const data = (res.data as any)?.data || [];
                setAllUsers(data);
            });
        }
    }, [assignSidebarOpen]);

    useEffect(() => {
        if (allUsers.length > 0) {
            setFormUserObjs(allUsers.filter(u => formUsers.includes(u.id)));
        }
    }, [formUsers, allUsers]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload = {
            name: formName,
            description: formDesc,
            permissions: formPerms,
            userIds: formUsers,
        };
        try {
            if (editRole && editRole.id) {
                await authenticatedApi.put(`/api/roles/${editRole.id}`, payload);
                toast.success('Role updated successfully!');
            } else {
                await authenticatedApi.post(`/api/roles`, payload);
                toast.success('Role created successfully!');
            }
            setEditRole(null);
            const res = await authenticatedApi.get<RolesApiResponse>("/api/roles");
            if (res.data.success) setRoles(res.data.data);
        } catch (err) {
            toast.error('Failed to save role');
        } finally {
            setSaving(false);
        }
    };

    const handleAssignUsers = () => {
        setAssignSidebarOpen(true);
    };
    const handleRemoveUser = (userId: number) => {
        const el = userListRef.current[userId];
        if (el) {
            el.classList.add("animate-blinkFast", "bg-red-500", "text-white");
            setTimeout(() => {
                el.classList.remove("animate-blinkFast", "bg-red-500", "text-white");
                el.classList.add("animate-fadeOut");
                setTimeout(() => {
                    setFormUsers(ids => ids.filter(id => id !== userId));
                    setFormUserObjs(users => users.filter(u => u.id !== userId));
                }, 300);
            }, 300);
        } else {
            setFormUsers(ids => ids.filter(id => id !== userId));
            setFormUserObjs(users => users.filter(u => u.id !== userId));
        }
    };

    const handleAssignUser = (user: any) => {
        setFormUsers(ids => ids.includes(user.id) ? ids : [...ids, user.id]);
        setFormUserObjs(users => users.some(u => u.id === user.id) ? users : [...users, user]);
        setNewlyAssignedUserIds(ids => [...ids, user.id]);
        setTimeout(() => setNewlyAssignedUserIds(ids => ids.filter(id => id !== user.id)), 1200);
    };

    const sortedRoles = useMemo(() => {
        if (!sortConfig || !sortConfig.key) return roles;
        const key = sortConfig.key;
        return [...roles].sort((a, b) => {
            const aValue = a?.[key];
            const bValue = b?.[key];
            if (aValue == null || bValue == null) return 0;
            if (aValue < bValue) {
                return sortConfig.direction === "asc" ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === "asc" ? 1 : -1;
            }
            return 0;
        });
    }, [roles, sortConfig]);

    const filteredRoles = useMemo(() => {
        if (!searchTerm) return sortedRoles;
        return sortedRoles.filter((role) =>
            Object.values(role).some((value) =>
                typeof value === "string"
                    ? value.toLowerCase().includes(searchTerm.toLowerCase())
                    : false
            )
        );
    }, [sortedRoles, searchTerm]);

    const handleSort = (key: keyof Role) => {
        setSortConfig((prevConfig) => {
            if (prevConfig?.key === key && prevConfig.direction === "asc") {
                return { key, direction: "desc" };
            }
            return { key, direction: "asc" };
        });
    };

    const columns: ColumnDef<Role>[] = [
        { key: "id", header: "ID", sortable: true },
        { key: "name", header: "Name", sortable: true, filter: "input" },
        { key: "description", header: "Description", sortable: false },
        {
            key: "permissions",
            header: "Permissions",
            sortable: false,
            colClass: "text-center",
            render: (row) => (
                <div className="flex flex-row gap-2 text-xs">
                    <span className={
                        `px-2 py-0.5 rounded-full font-semibold ` +
                        (row.permissions.view ? "bg-green-600 dark:bg-green-700 text-white" : "bg-gray-400 dark:bg-gray-500 text-white")
                    }>
                        View
                    </span>
                    <span className={
                        `px-2 py-0.5 rounded-full font-semibold ` +
                        (row.permissions.create ? "bg-green-600 dark:bg-green-700 text-white" : "bg-gray-400 dark:bg-gray-500 text-white")
                    }>
                        Create
                    </span>
                    <span className={
                        `px-2 py-0.5 rounded-full font-semibold ` +
                        (row.permissions.update ? "bg-green-600 dark:bg-green-700 text-white" : "bg-gray-400 dark:bg-gray-500 text-white")
                    }>
                        Update
                    </span>
                    <span className={
                        `px-2 py-0.5 rounded-full font-semibold ` +
                        (row.permissions.delete ? "bg-green-600 dark:bg-green-700 text-white" : "bg-gray-400 dark:bg-gray-500 text-white")
                    }>
                        Delete
                    </span>
                </div>
            ),
        },
        {
            key: "users",
            header: "Assigned Users",
            sortable: false,
            render: (row) => {
                const count = row.users ? row.users.length : 0;
                return (
                    <span className={count > 0 ? "text-blue-600 font-semibold" : "text-gray-400 italic text-xs"}>
                        {count} Users
                    </span>
                );
            },
        },
        {
            key: "action" as any,
            header: "Action",
            sortable: false,
            render: (row) => (
                <button
                    className="px-2 py-0.5 text-xs bg-amber-500 dark:bg-amber-700 hover:bg-amber-600 text-gray-700 dark:text-dark-light hover:text-white rounded-full"
                    onClick={() => setEditRole(row)}
                >
                    Update
                </button>
            ),
        },
    ];

    const gridTheme: DataGridProps<Role>["theme"] = {
        layouts: {
            gridSize: "sm",
        },
    };

    return (
        <div className="mt-4">

                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-lg font-bold">Role Management</h1>
                    {!editRole && (
                        <Button
                            variant="default"
                            type="button"
                            onClick={() => setEditRole({ id: 0, name: '', description: '', permissions: { view: true, create: false, update: false, delete: false }, users: [] })}
                        >
                            <Plus /> Role
                        </Button>
                    )}
                </div>
                {editRole ? (
                    <FRoleForm
                        role={{ ...editRole, users: formUserObjs }}
                        setRole={setEditRole}
                        onSaved={async () => {
                            setEditRole(null);
                            const res = await authenticatedApi.get<RolesApiResponse>("/api/roles");
                            if (res.data.success) setRoles(res.data.data);
                        }}
                        formName={formName}
                        setFormName={setFormName}
                        formDesc={formDesc}
                        setFormDesc={setFormDesc}
                        formPerms={formPerms}
                        setFormPerms={setFormPerms}
                        formUsers={formUsers}
                        setFormUsers={setFormUsers}
                        saving={saving}
                        onSubmit={handleFormSubmit}
                        onCancel={() => setEditRole(null)}
                        assignSidebarOpen={assignSidebarOpen}
                        setAssignSidebarOpen={setAssignSidebarOpen}
                        allUsers={allUsers}
                        setAllUsers={setAllUsers}
                        userSearch={userSearch}
                        setUserSearch={setUserSearch}
                        onAssignUsers={handleAssignUsers}
                        onRemoveUser={handleRemoveUser}
                        userListRef={userListRef}
                        newlyAssignedUserIds={newlyAssignedUserIds}
                    />
                ) : (
                    <CustomDataGrid
                        key={roles.length + '-' + roles.map(r => r.id).join('-')}
                        data={filteredRoles}
                        columns={columns.map(col =>
                            (col.key as string) === "action" ? {
                                ...col,
                                render: (row: Role) => (
                                    <Pencil className="w-5 h-5 text-amber-500 hover:text-amber-600" onClick={() => setEditRole(row)} />
                                )
                            } : col
                        )}
                        pageSize={10}
                        pagination={true}
                        inputFilter={false}
                        theme={gridTheme}
                    />
                )}

        </div>
    );
};

export default RoleManagement;
