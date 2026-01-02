import React, { useEffect, useState, useMemo, useRef } from "react";
import { CustomDataGrid, ColumnDef, DataGridProps } from "@/components/ui/DataGrid";
import { authenticatedApi } from "@/config/api";
import { Plus, Pencil, PlusCircle, Trash2, MinusCircle } from "lucide-react";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import ActionSidebar from "@components/ui/action-aside";
import { toast } from "sonner";
import { Tabs, TabList, Tab, TabPanel } from 'react-tabs';
import FGroupForm from "./f-group";

interface Group {
    id: number;
    name: string;
    desc: string;
    usercount: number;
    status?: number; // 1: active, 2: disabled
}

interface GroupsApiResponse {
    success: boolean;
    data: Group[];
}

const GroupManagement = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Group; direction: "asc" | "desc" } | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [editGroup, setEditGroup] = useState<Group & { users?: any[]; navTree?: any[] } | null>(null);
    const userListRef = useRef<{ [key: number]: HTMLLIElement | null }>({});
    const navListRef = useRef<{ [key: number]: HTMLLIElement | null }>({});

    const handleRemoveUser = (userId: number) => {
        if (!editGroup) return;
        const el = userListRef.current[userId];
        if (el) {
            el.classList.add("animate-blinkFast", "bg-red-500", "text-white");
            setTimeout(() => {
                el.classList.remove("animate-blinkFast", "bg-red-500", "text-white");
                el.classList.add("animate-fadeOut");
                setTimeout(() => {
                    const updated = (editGroup.users || []).filter((user) => user.id !== userId);
                    setEditGroup({
                        ...editGroup,
                        users: updated,
                    });
                    if (updated.length === 0) setAssignedUserError(true);
                }, 300); // fadeOut duration
            }, 300); // blinkFast duration
        } else {
            const updated = (editGroup.users || []).filter((user) => user.id !== userId);
            setEditGroup({
                ...editGroup,
                users: updated,
            });
            if (updated.length === 0) setAssignedUserError(true);
        }
    };

    const handleRemoveNav = (navId: number) => {
        if (!editGroup) return;
        const el = navListRef.current[navId];
        if (el) {
            el.classList.add("animate-blinkFast", "bg-red-500", "text-white");
            setTimeout(() => {
                el.classList.remove("animate-blinkFast", "bg-red-500", "text-white");
                el.classList.add("animate-fadeOut");
                setTimeout(() => {
                    setEditGroup({
                        ...editGroup,
                        navTree: (editGroup.navTree || []).filter((nav) => nav.navId !== navId),
                    });
                }, 300); // fadeOut duration
            }, 300); // blinkFast duration
        } else {
            setEditGroup({
                ...editGroup,
                navTree: (editGroup.navTree || []).filter((nav) => nav.navId !== navId),
            });
        }
    };

    // Fetch groups function for reuse
    const fetchGroups = React.useCallback(async () => {
        try {
            const response = await authenticatedApi.get<GroupsApiResponse>("/api/admin/groups");
            if (response.data.success) {
                setGroups(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching groups:", error);
        }
    }, []);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const sortedGroups = useMemo(() => {
        if (!sortConfig || !sortConfig.key) return groups;
        const key = sortConfig.key;
        return [...groups].sort((a, b) => {
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
    }, [groups, sortConfig]);

    const filteredGroups = useMemo(() => {
        if (!searchTerm) return sortedGroups;
        return sortedGroups.filter((group) =>
            Object.values(group).some((value) =>
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [sortedGroups, searchTerm]);

    const handleSort = (key: keyof Group) => {
        setSortConfig((prevConfig) => {
            if (prevConfig?.key === key && prevConfig.direction === "asc") {
                return { key, direction: "desc" };
            }
            return { key, direction: "asc" };
        });
    };

    const columns: ColumnDef<(Group & { users?: any[]; navTree?: any[] }) | any>[] = [
        { key: "id", header: "ID", sortable: true },
        { key: "name", header: "Name", sortable: true, filter: "input" },
        { key: "desc", header: "Description", sortable: false },
        {
            key: "usercount",
            header: "Assigned Data",
            sortable: true,
            colClassParams: (row) =>
                (row.users && row.users.length > 0) || (row.navTree && row.navTree.length > 0)
                    ? "text-blue-600"
                    : "",
            render: (row) =>
                `Users: ${row.users ? row.users.length : 0}, Navigation: ${row.navTree ? row.navTree.length : 0}`,
        },
        // Add edit column with a unique string key (cast as any to avoid TS error)
        {
            key: "_edit" as any,
            header: "Actions",
            colClass: "text-center",
            sortable: false,
            render: (row: any) => (
                <Pencil
                    className="w-5 h-5 text-amber-500 hover:text-amber-600 cursor-pointer"
                    onClick={() => setEditGroup(row)}
                />
            ),
        },
    ];

    const rowSelection = {
        enabled: true,
        getRowId: (row: Group) => row.id,
        onSelect: (selectedKeys: (string | number)[], selectedData: Group[]) => {
            //console.log("Selected Row Keys:", selectedKeys);
            //console.log("Selected Rows Data:", selectedData);
        },
    };

    const rowClass = (row: Group) => {
        const isOdd = row.id % 2 === 1;
        return isOdd ? "bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-900";
    };

    const rowExpandable = {
        enabled: true,
        render: (row: Group & { users?: any[]; navTree?: any[] }) => (
            <div className="flex flex-row gap-6 w-full text-sm max-h-50 overflow-y-auto">
                {/* Users List */}
                <div className="w-1/2">
                    <div className="font-semibold underline underline-offset-4 mb-1">Assigned Users</div>
                    {row.users && row.users.length > 0 ? (
                        <ul className="list-disc pl-5 text-xs">
                            {row.users.map((user) => (
                                <li key={user.id} className="mb-0.5 text-xs">
                                    <span className="text-xs">{user.username}</span> - <span className="capitalize"> {user.name}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-gray-500 italic text-xs">No users</div>
                    )}
                </div>
                {/* NavTree List */}
                <div className="w-1/2">
                    <div className="font-semibold mb-1">Assigned Navigation</div>
                    {row.navTree && row.navTree.length > 0 ? (
                        <ul className="list-disc pl-5 text-xs">
                            {row.navTree.map((nav) => (
                                <li key={nav.navId} className="mb-0">
                                    <span className="text-xs">{nav.title}</span>
                                    {nav.path && (
                                        <span className="ml-2 text-xs text-blue-600 underline">{nav.path}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-gray-500 italic text-xs">No navTree</div>
                    )}
                </div>
            </div>
        ),
    };

    // Sidebar state
    const [assignSidebarOpen, setAssignSidebarOpen] = useState<false | "users" | "nav">(false);
    const [assignTab, setAssignTab] = useState<"users" | "nav">("users");
    const [userSearch, setUserSearch] = useState("");
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [assignedUserError, setAssignedUserError] = useState(false);

    // Add state to track newly assigned user/nav IDs
    const [newlyAssignedUserIds, setNewlyAssignedUserIds] = useState<number[]>([]);
    const [newlyAssignedNavIds, setNewlyAssignedNavIds] = useState<number[]>([]);

    // Add state for controlled components
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [editStatus, setEditStatus] = useState(1); // 1: active, 2: disabled

    // Sync editName/editDesc/editStatus with editGroup
    useEffect(() => {
        if (editGroup) {
            setEditName(editGroup.name || "");
            setEditDesc(editGroup.desc || "");
            setEditStatus(editGroup.status || 1);
        }
    }, [editGroup]);

    useEffect(() => {
        if (editGroup?.users && editGroup.users.length > 0) {
            setAssignedUserError(false);
        }
    }, [editGroup?.users?.length]);

    // Fetch both users and nav when sidebar opens (either tab)
    useEffect(() => {
        if (assignSidebarOpen === "users" || assignSidebarOpen === "nav") {
            setLoadingUsers(true);
            authenticatedApi.get("/api/users").then(res => {
                const data = res.data as any;
                setAllUsers(data.data || []);
                setLoadingUsers(false);
            }).catch(() => setLoadingUsers(false));
        }
    }, [assignSidebarOpen]);

    // Filtered lists (exclude already assigned)
    const availableUsers = useMemo(() => {
        if (!editGroup) return [];
        const assignedIds = new Set((editGroup.users || []).map(u => u.id));
        // fix: support both user.name and user.fname
        return allUsers.filter(u => !assignedIds.has(u.id) && (!userSearch || u.username?.toLowerCase().includes(userSearch.toLowerCase()) || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.fname?.toLowerCase().includes(userSearch.toLowerCase())));
    }, [allUsers, editGroup, userSearch]);

    // Assign handlers with highlight logic
    const handleAssignUser = (user: any) => {
        if (!editGroup) return;
        setEditGroup({ ...editGroup, users: [...(editGroup.users || []), user] });
        setNewlyAssignedUserIds(ids => [...ids, user.id]);
        setAssignedUserError(false);
        setTimeout(() => {
            setNewlyAssignedUserIds(ids => ids.filter(id => id !== user.id));
        }, 1200);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editGroup) return;
        if (!editGroup.users || editGroup.users.length === 0) {
            setAssignedUserError(true);
            toast.error('Please assign at least one user before saving.');
            return;
        }
        const payload = {
            id: editGroup.id,
            name: editName,
            desc: editDesc,
            status: editStatus,
            userIds: (editGroup.users || []).map(u => u.id),
            navIds: (editGroup.navTree || []).map(n => n.navId),
        };
        try {
            if (!editGroup.id) {
                await authenticatedApi.post(`/api/admin/groups`, payload);
                toast.success('Group created successfully!');
            } else {
                await authenticatedApi.put(`/api/admin/groups/${editGroup.id}`, payload);
                toast.success('Group updated successfully!');
            }
            setEditGroup(null);
        } catch (err) {
            toast.error('Failed to save group');
        }
    };

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-lg font-bold">Group Management</h1>
                {!editGroup && (
                    <Button
                        variant={'default'}
                        onClick={() => setEditGroup({ id: 0, name: '', desc: '', usercount: 0, users: [], navTree: [], status: 1 })}
                        type="button"
                    >
                        <Plus className="w-6 h-6" /> Group
                    </Button>
                )}
            </div>
            {editGroup ? (
                <FGroupForm
                    group={editGroup}
                    setGroup={setEditGroup}
                    onSaved={() => {
                        setEditGroup(null);
                        fetchGroups(); // reload grid after save
                    }}
                    editName={editName}
                    setEditName={setEditName}
                    editDesc={editDesc}
                    setEditDesc={setEditDesc}
                    editStatus={editStatus}
                    setEditStatus={setEditStatus}
                    onSubmit={handleEditSubmit}
                    onCancel={() => setEditGroup(null)}
                    onAssignUsers={() => { setAssignSidebarOpen("users"); setAssignTab("users"); }}
                    onAssignNav={() => { setAssignSidebarOpen("nav"); setAssignTab("nav"); }}
                    onRemoveUser={handleRemoveUser}
                    onRemoveNav={handleRemoveNav}
                    newlyAssignedUserIds={newlyAssignedUserIds}
                    newlyAssignedNavIds={newlyAssignedNavIds}
                    assignedUserError={assignedUserError}
                />
            ) : (
                <CustomDataGrid
                    key={groups.length + '-' + groups.map(g => g.id).join('-')}
                    theme={'sm'}
                    data={filteredGroups}
                    columns={columns}
                    pageSize={10}
                    pagination={false}
                    inputFilter={false}
                    rowExpandable={rowExpandable}
                    onRowDoubleClick={undefined}
                    rowClass={rowClass}
                //rowSelection={rowSelection}
                />
            )}
            {assignSidebarOpen === "users" && (
                <ActionSidebar
                    title="Assign Users"
                    size={'sm'}
                    content={
                        <>
                            <Input className="w-full mb-2" placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                            {loadingUsers ? <div>Loading...</div> : (
                                <ul className="mt-1 text-sm overflow-y-auto divide-y">
                                    {availableUsers.map(user => (
                                        <li key={user.id} className="flex flex-col gap-1 px-3 py-1.5 mb-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex flex-col">
                                                    <span className="capitalize font-semibold text-base text-gray-800 dark:text-gray-100">{user.fname}</span>
                                                    <span className="font-semibold text-xs dark:text-gray-400">Username: <span>{user.username}</span></span>
                                                    <span className="font-semibold text-xs">Role: <span>{user.role && user.role.name ? user.role.name : '-'}</span></span>
                                                    <span className="font-semibold text-xs">Groups: <span>{user.usergroups && user.usergroups.length > 0 ? user.usergroups.map((g: any) => g.name).join(', ') : '-'}</span></span>
                                                </div>
                                                <PlusCircle className="w-6 h-6 text-green-600" onClick={() => handleAssignUser(user)} />
                                            </div>
                                        </li>
                                    ))}
                                    {availableUsers.length === 0 && <li className="text-gray-400 italic">No users found</li>}
                                </ul>
                            )}
                        </>
                    }
                    onClose={() => setAssignSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default GroupManagement;
