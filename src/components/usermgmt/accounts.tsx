import React, { useEffect, useState, useMemo, useRef } from "react";
import { CustomDataGrid, ColumnDef, DataGridProps } from "@/components/ui/DataGrid";
import ActionSidebar from "@components/ui/action-aside";
import { authenticatedApi } from "@/config/api";
import { Plus, Trash2, MinusCircle, Check } from "lucide-react";
import { Button } from "@components/ui/button";
import { Checkbox } from "@components/ui/checkbox";
import { Card } from "@components/ui/card";
import { Switch } from "@components/ui/switch";
import { Input } from "@components/ui/input";
// Removed Select imports (no longer needed after removing individual invite form)
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
// Removed dropdown menu imports (no longer used after simplifying Invite button)
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format, formatDistanceToNow, formatDistance, isToday, isFuture, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { Loader2 } from "lucide-react";

interface User {
    id: number;
    username: string;
    email: string;
    fname: string;
    contact: string | null;
    user_type: number;
    last_login: string | null;
    last_nav: string | null;
    status: number;
    role: { id: number; name: string };
    usergroups: { id: number; name: string }[];
    time_spent: number;
}

interface UsersApiResponse {
    status: string;
    data: User[];
}

// Pending user type and API response
interface PendingUser {
    id: number;
    fname: string;
    email: string;
    contact: string | null;
    user_type: number;
    created_at: string;
    ip: string;
    user_agent: string;
    status: number;
}
interface PendingUsersApiResponse {
    status: string;
    message: string;
    data: PendingUser[];
}

const UserManagement = () => {
    const gridRef = useRef<any>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: "asc" | "desc" } | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    // New state for selected user ID
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    // New state for selected user IDs (array)
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    // State for showing sidebar and selected users array
    const [showSidebar, setShowSidebar] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    // State for selected row keys in the DataGrid
    const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string | number>>(new Set());
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);
    const [allGroups, setAllGroups] = useState<any[]>([]);
    const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [allRoles, setAllRoles] = useState<any[]>([]);
    const [selectedRole, setSelectedRole] = useState<number | null>(null);
    const [showPasswordDropdown, setShowPasswordDropdown] = useState(false);
    const [showSuspendDropdown, setShowSuspendDropdown] = useState(false);
    const [passwordValue, setPasswordValue] = useState("");
    const [suspendAction, setSuspendAction] = useState<"suspend" | "activate" | null>(null);
    const [modalOpen, setModalOpen] = useState<null | 'reset' | 'suspend' | 'role' | 'group' | 'approve'>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [toastState, setToastState] = useState<{ open: boolean, message: string, color: string } | null>(null);
    const [selectedUsersSearch, setSelectedUsersSearch] = useState("");
    const [summaryFilter, setSummaryFilter] = useState<null | 'active' | 'inactive' | 'pending' | 'suspended'>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    // Add state for pending users and loading
    const [pendingUsers, setPendingUsers] = useState<(PendingUser & { row_number: number })[]>([]);
    const [pendingLoading, setPendingLoading] = useState(false);
    // Invite User dialog state
    // Individual invite form & dialog removed; retain loading state for bulk invites only
    const [inviteLoading, setInviteLoading] = useState(false);
    // Bulk Invite dialog state
    const [showBulkInviteDialog, setShowBulkInviteDialog] = useState(false);
    const [bulkEmployees, setBulkEmployees] = useState<any[]>([]);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkError, setBulkError] = useState<string | null>(null);
    const [bulkSelectedIds, setBulkSelectedIds] = useState<number[]>([]);
    const [bulkSearch, setBulkSearch] = useState("");
    const [bulkInviteFeedback, setBulkInviteFeedback] = useState<string | null>(null);
    // New states for sidebars
    // Removed showInviteSidebar (individual invite sidebar eliminated)
    const [showBulkInviteSidebar, setShowBulkInviteSidebar] = useState(false);
    const [showInviteChooser, setShowInviteChooser] = useState(false);
    const [showPersonalInviteSidebar, setShowPersonalInviteSidebar] = useState(false);
    const [personalInvite, setPersonalInvite] = useState({
        type: 'employee',
        fullname: '',
        email: '',
        contact: '',
        ramco_id: '',
    });
    const [personalSuggestions, setPersonalSuggestions] = useState<any[]>([]);
    const [personalSearchLoading, setPersonalSearchLoading] = useState(false);
    const personalSearchTimer = useRef<NodeJS.Timeout | null>(null);
    // Delete users (active list) confirmation
    const [showDeleteUsersDialog, setShowDeleteUsersDialog] = useState(false);
    const [showDeleteUsersConfirmDialog, setShowDeleteUsersConfirmDialog] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await authenticatedApi.get<UsersApiResponse>("/api/users");
                if (response.data.status === "success") {
                    const rows = (response?.data?.data || []).map((row: any, idx: number) => ({ ...row, row_number: idx + 1 }));
                    setUsers(rows);
                }
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };

        fetchUsers();
    }, []);

    // Fetch all groups for dropdown (use only id & name)
    useEffect(() => {
        if (showGroupDropdown && allGroups.length === 0) {
            authenticatedApi.get("/api/admin/groups").then(res => {
                const data = res.data as any;
                // Use only id & name for each group
                if (data && Array.isArray(data.data)) {
                    setAllGroups(data.data.map((g: any) => ({ id: g.id, name: g.name })));
                }
            });
        }
    }, [showGroupDropdown, allGroups.length]);

    // Fetch all roles for dropdown
    useEffect(() => {
        if (showRoleDropdown && allRoles.length === 0) {
            authenticatedApi.get("/api/admin/roles").then(res => {
                const data = res.data as any;
                // Fix: roles are under data.data, not data.roles
                if (data && Array.isArray(data.data)) setAllRoles(data.data);
            });
        }
    }, [showRoleDropdown, allRoles.length]);

    // Also update sidebar-triggered fetch to use only id & name
    useEffect(() => {
        if (showSidebar && allGroups.length === 0) {
            authenticatedApi.get('/api/admin/groups')
                .then(res => {
                    const data = res.data as any;
                    if (data && Array.isArray(data.data)) {
                        setAllGroups(data.data.map((g: any) => ({ id: g.id, name: g.name })));
                    }
                })
                .catch(() => setAllGroups([]));
        }
    }, [showSidebar, allGroups.length]);

    // Fetch pending users when summaryFilter is 'pending'
    useEffect(() => {
        if (summaryFilter === 'pending') {
            setPendingLoading(true);
            authenticatedApi.get<PendingUsersApiResponse>("/api/users/pending")
                .then(res => {
                    if (res.data.status === 'success') {
                        setPendingUsers((res.data.data || []).map((row, idx) => ({ ...row, row_number: idx + 1 })));
                    } else {
                        setPendingUsers([]);
                    }
                    setPendingLoading(false);
                })
                .catch(() => {
                    setPendingUsers([]);
                    setPendingLoading(false);
                });
        }
    }, [summaryFilter]);

    // Initial fetch of pending users so the Pending card shows correct count without needing a click
    useEffect(() => {
        // Avoid refetch if already populated
        if (pendingUsers.length > 0) return;
        setPendingLoading(true);
        authenticatedApi.get<PendingUsersApiResponse>("/api/users/pending")
            .then(res => {
                if (res.data.status === 'success') {
                    setPendingUsers((res.data.data || []).map((row, idx) => ({ ...row, row_number: idx + 1 })));
                } else {
                    setPendingUsers([]);
                }
                setPendingLoading(false);
            })
            .catch(() => {
                setPendingUsers([]);
                setPendingLoading(false);
            });
         
    }, []);

    const sortedUsers = useMemo(() => {
        if (!sortConfig || !sortConfig.key) return users;

        const key = sortConfig.key;
        return [...users].sort((a, b) => {
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
    }, [users, sortConfig]);

    // Helper to get summary counts
    const summaryCounts = useMemo(() => {
        let active = 0, inactive = 0, pending = 0, suspended = 0;
        const now = new Date();
        users.forEach(u => {
            if (u.status === 1) {
                if (!u.last_login) {
                    // Active user, never logged in
                    inactive++;
                } else {
                    // Check if last_login is more than 3 months ago
                    const lastLoginDate = new Date(u.last_login);
                    const diffMonths = (now.getFullYear() - lastLoginDate.getFullYear()) * 12 + (now.getMonth() - lastLoginDate.getMonth());
                    if (diffMonths > 3) {
                        inactive++;
                    } else {
                        active++;
                    }
                }
            } else if (u.status === 2) {
                suspended++;
            } else {
                // status 0 or others: treat as inactive
                inactive++;
            }
        });
        // Always use pendingUsers count for the Pending Activation card
        return { active, inactive, pending: pendingUsers.length, suspended };
    }, [users, pendingUsers]);

    // Filtered users for grid, with summary filter
    const filteredUsers = useMemo(() => {
        let base = sortedUsers;
        if (summaryFilter) {
            setSummaryLoading(true);
            setTimeout(() => setSummaryLoading(false), 400); // Simulate loading ring
            if (summaryFilter === 'active') {
                base = base.filter(u => u.status === 1 && u.last_login && (() => {
                    // Only active users with last_login within 3 months
                    const lastLoginDate = new Date(u.last_login);
                    const now = new Date();
                    const diffMonths = (now.getFullYear() - lastLoginDate.getFullYear()) * 12 + (now.getMonth() - lastLoginDate.getMonth());
                    return diffMonths <= 3;
                })());
            } else if (summaryFilter === 'inactive') {
                base = base.filter(u => {
                    if (u.status === 1) {
                        if (!u.last_login) return true;
                        const lastLoginDate = new Date(u.last_login);
                        const now = new Date();
                        const diffMonths = (now.getFullYear() - lastLoginDate.getFullYear()) * 12 + (now.getMonth() - lastLoginDate.getMonth());
                        return diffMonths > 3;
                    } else if (u.status === 2) {
                        return false; // suspended
                    } else {
                        // status 0 or others: treat as inactive
                        return true;
                    }
                });
            } else if (summaryFilter === 'pending') {
                base = base.filter(u => u.status === 1 && !u.last_login);
            } else if (summaryFilter === 'suspended') {
                base = base.filter(u => u.status === 2);
            }
        }
        if (!searchTerm) return base;
        return base.filter((user) =>
            Object.values(user).some((value) =>
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [sortedUsers, searchTerm, summaryFilter]);

    // Add row_number to each user for the grid
    const filteredUsersWithRowNumber = useMemo(() =>
        filteredUsers.map((user, idx) => ({ ...user, row_number: idx + 1 })),
        [filteredUsers]
    );

    const handleSort = (key: keyof User) => {
        setSortConfig((prevConfig) => {
            if (prevConfig?.key === key && prevConfig.direction === "asc") {
                return { key, direction: "desc" };
            }
            return { key, direction: "asc" };
        });
    };

    const columns: ColumnDef<User & { row_number: number }>[] = [
        { key: "row_number", header: "#", render: row => row.row_number },
        { key: "username", header: "Username", sortable: true, filter: "input", colClass: 'capitalize' },
        { key: "email", header: "Email", sortable: true, filter: "input" },
        { key: "fname", header: "Full Name", sortable: true, filter: "input" },
        { key: "contact", header: "Contact", sortable: true, filter: "input" },
        {
            key: "role",
            header: "Assigned Role",
            sortable: true,
            filter: "singleSelect",
            render: (row) => row.role && typeof row.role === 'object' ? row.role.name : '-',
        },
        {
            key: "usergroups",
            header: "Assigned Groups",
            sortable: true,
            render: (row) =>
                row.usergroups && Array.isArray(row.usergroups) && row.usergroups.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {row.usergroups.map((g) => (
                            <span key={g.id} className="bg-sky-600 text-white text-[10px] truncate text-center rounded-full px-2 py-0.5">
                                {g.name}
                            </span>
                        ))}
                    </div>
                ) : (
                    <span className="text-gray-400">-</span>
                ),
        },
        {
            key: "user_type",
            header: "User Type",
            sortable: true,
            render: (row) => (row.user_type === 1 ? "Employee" : "Non-Employee"),
        },
        {
            key: "time_spent",
            header: "Time Spent",
            sortable: true,
            render: (row) => formatTimeSpent(row.time_spent),
        },
        {
            key: "last_login",
            header: "Last Login",
            sortable: true,
            render: (row) => (row.last_login ? formatTimeAgo(row.last_login) : "—"),
        },
        {
            key: "status",
            header: "Status",
            sortable: true,
            render: (row) => {
                const label = row.status === 1 ? 'Active' : row.status === 2 ? 'Suspended' : 'Inactive';
                const cls = row.status === 1
                    ? 'bg-green-200 text-green-800'
                    : row.status === 2
                        ? 'bg-red-200 text-red-800'
                        : 'bg-gray-200 text-gray-800';
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
                );
            },
        },
    ];

    // Columns for pending approval grid
    const pendingColumns: ColumnDef<PendingUser & { row_number: number }>[] = [
        { key: "row_number", header: "#", render: row => row.row_number },
        { key: "fname", header: "Full Name", sortable: true, filter: "input" },
        { key: "email", header: "Email", sortable: true, filter: "input" },
        { key: "contact", header: "Contact", sortable: true, filter: "input" },
        { key: "user_type", header: "User Type", sortable: true, render: row => row.user_type === 1 ? 'Employee' : 'Non-Employee' },
        { key: "created_at", header: "Registered At", sortable: true, render: row => formatTimeAgo(row.created_at) },
        {
            key: "status", header: "Status", sortable: true, render: row => (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.status === 1 ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'}`}>
                    {row.status === 1 ? 'Active' : 'Pending'}
                </span>
            )
        },
    ];

    // Utility function to format time ago using date-fns
    function formatTimeAgo(dateString: string) {
        if (!dateString) return "-";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "-";
        const now = new Date();
        // If date is in the future (ignoring time part), show formatted date
        if (date.setHours(0, 0, 0, 0) > now.setHours(0, 0, 0, 0)) {
            return format(date, 'dd/MM/yyyy');
        }
        // If date is today or in the past, use formatDistance
        return formatDistance(date, now, { addSuffix: true });
    }

    // Utility function to format time spent from seconds to days, hours, and minutes
    function formatTimeSpent(raw: number) {
        if (!raw || isNaN(raw) || raw <= 0) return '-';
        // Assume raw is in seconds, convert to minutes
        const totalMinutes = Math.floor(raw / 60);
        const d = Math.floor(totalMinutes / 1440); // 1440 minutes in a day
        const h = Math.floor((totalMinutes % 1440) / 60);
        const m = totalMinutes % 60;
        let result = '';
        if (d > 0) result += `${d}d `;
        if (h > 0 || d > 0) result += `${h}h `;
        result += `${m}m`;
        return result.trim();
    }

    // Determine selectable rows (ids)
    const selectableRowIds = useMemo(
        () => users.filter((user) => (user.role?.id ?? 0) !== 1).map((user) => user.id),
        [users]
    );

    // Determine if all selectable rows are selected
    const allRowsSelected = selectedUserIds.length > 0 && selectableRowIds.length > 0 && selectableRowIds.every(id => selectedUserIds.includes(id));

    // Determine if some but not all selectable rows are selected
    const someRowsSelectedButNotAll = selectedUserIds.length > 0 && !allRowsSelected;

    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedUserIds(selectableRowIds);
            const firstSelectedUser = users.find(user => selectableRowIds.includes(user.id)) || null;
            setSelectedUser(firstSelectedUser);
            setSelectedUserId(firstSelectedUser ? firstSelectedUser.id : null);
        } else {
            setSelectedUserIds([]);
            setSelectedUser(null);
            setSelectedUserId(null);
        }
    };

    const rowSelection = {
        enabled: true,
        getRowId: (row: User) => row.id,
        isSelectable: (row: User) => (row.role?.id ?? 0) !== 1,
        headerCheckboxRenderer: () => {
            return (
                <input
                    type="checkbox"
                    checked={allRowsSelected}
                    ref={(el) => {
                        if (el) el.indeterminate = someRowsSelectedButNotAll;
                    }}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="form-checkbox"
                />
            );
        },
        onSelectionChange: (selectedKeys: number[]) => {
            // Filter out excluded rows (e.g., role === 1)
            const validSelectedKeys = selectedKeys.filter(key => {
                const user = users.find(u => u.id === key);
                return user && (user.role?.id ?? 0) !== 1;
            });

            // Set selectedUserIds and alert
            setSelectedUserIds(validSelectedKeys);
            //console.log("Final valid selected user IDs:", validSelectedKeys);

            queueMicrotask(() => {
                //console.log("All selected keys:", selectedKeys);
                //console.log("Filtered valid selected keys (excluding role = 1):", validSelectedKeys);

                if (validSelectedKeys.length > 0) {
                    console.log("Trigger something - rows selected:", validSelectedKeys.length);
                } else {
                    //console.log("No row selected");
                }
            });

            const selectedUser = users.find(user => validSelectedKeys.includes(user.id));
            if (selectedUser) {
                setSelectedUser(selectedUser);
                setSelectedUserId(selectedUser.id);
            } else {
                setSelectedUser(null);
                setSelectedUserId(null);
            }
        }
    };

    // Pending grid selection state
    const [pendingSelectedRowKeys, setPendingSelectedRowKeys] = useState<Set<string | number>>(new Set());
    const [pendingSelectedUsers, setPendingSelectedUsers] = useState<(PendingUser & { row_number: number })[]>([]);
    const [showPendingSidebar, setShowPendingSidebar] = useState(false);
    // Pending sidebar checkbox selection & delete handling
    const [pendingSidebarCheckedIds, setPendingSidebarCheckedIds] = useState<number[]>([]);
    const [showDeletePendingDialog, setShowDeletePendingDialog] = useState(false);
    const [deletePendingLoading, setDeletePendingLoading] = useState(false);
    const [deletePendingError, setDeletePendingError] = useState<string | null>(null);

    const pendingRowSelection = {
        enabled: true,
        getRowId: (row: PendingUser & { row_number: number }) => row.id,
        isSelectable: (row: PendingUser & { row_number: number }) => true,
        headerCheckboxRenderer: () => {
            const allSelected = pendingUsers.length > 0 && pendingSelectedRowKeys.size === pendingUsers.length;
            const someSelected = pendingSelectedRowKeys.size > 0 && !allSelected;
            return (
                <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={e => {
                        if (e.target.checked) {
                            setPendingSelectedRowKeys(new Set(pendingUsers.map(u => u.id)));
                            setPendingSelectedUsers([...pendingUsers]);
                            setShowPendingSidebar(pendingUsers.length > 0);
                        } else {
                            setPendingSelectedRowKeys(new Set());
                            setPendingSelectedUsers([]);
                            setShowPendingSidebar(false);
                        }
                    }}
                    className="form-checkbox"
                />
            );
        },
        onSelectionChange: (selectedKeys: number[]) => {
            setPendingSelectedRowKeys(new Set(selectedKeys));
            const selected = pendingUsers.filter(u => selectedKeys.includes(u.id));
            setPendingSelectedUsers(selected);
            setShowPendingSidebar(selected.length > 0);
        }
    };

    const handlePendingRowSelected = (selectedKeys: (string | number)[], selectedData: (PendingUser & { row_number: number })[]) => {
        setPendingSelectedUsers(selectedData);
        setShowPendingSidebar(selectedData.length > 0);
    };

    // Keep sidebar checkbox list in sync with selected pending users
    useEffect(() => {
        setPendingSidebarCheckedIds(pendingSelectedUsers.map(u => u.id));
    }, [pendingSelectedUsers]);

    const handleDeletePendingUsers = async () => {
        // prefer explicit checked ids, otherwise delete currently selected pending users
        const idsToDelete = (pendingSidebarCheckedIds && pendingSidebarCheckedIds.length > 0) ? pendingSidebarCheckedIds : pendingSelectedUsers.map(u => u.id);
        if (!idsToDelete || idsToDelete.length === 0) return;
        setDeletePendingLoading(true);
        setDeletePendingError(null);
        try {
            const user_ids = idsToDelete.length === 1 ? idsToDelete[0] : idsToDelete;
            await authenticatedApi.post('/api/auth/delete-pending-user', { user_ids });
            toast.success('Pending user(s) deleted.');
            const deletedSet = new Set(Array.isArray(user_ids) ? user_ids : [user_ids]);
            setPendingSelectedUsers(prev => prev.filter(u => !deletedSet.has(u.id)));
            setPendingSelectedRowKeys(prev => {
                const next = new Set(Array.from(prev).filter(k => !deletedSet.has(Number(k))));
                return next;
            });
            setPendingSidebarCheckedIds([]);
            await refreshUsers();
            if (pendingSelectedUsers.length - (Array.isArray(user_ids) ? user_ids.length : 1) <= 0) {
                setShowPendingSidebar(false);
            }
            setShowDeletePendingDialog(false);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to delete pending user(s).';
            setDeletePendingError(msg);
            toast.error(msg);
        } finally {
            setDeletePendingLoading(false);
        }
    };

    // Utility to clear all pending user selections
    const clearPendingUserSelection = () => {
        setPendingSelectedRowKeys(new Set());
        setPendingSelectedUsers([]);
        setShowPendingSidebar(false);
    };

    const handleRowDoubleClick = (row: User) => {
        setSelectedUser(row);
        setSelectedUserId(row.id);
    };

    // Handler for row selection from CustomDataGrid
    const handleRowSelected = (selectedKeys: (string | number)[], selectedData: User[]) => {
        //console.log("onRowSelected keys:", selectedKeys);
        //console.log("onRowSelected data:", selectedData);
        setSelectedUsers(selectedData);
        setShowSidebar(selectedData.length > 0);
    };


    // Handler for delisting user from selectedUsers
    const handleDelistUser = (userId: number) => {
        // Deselect row from DataGrid if possible
        if (gridRef.current?.deselectRow) {
            gridRef.current.deselectRow(userId);
        }
        // Remove the user from all related states
        setSelectedUsers((users) => {
            const updated = users.filter((u) => u.id !== userId);
            // Also update selectedUserIds based on remaining users
            const remainingIds = updated.map((u) => u.id);
            setSelectedUserIds(remainingIds);
            // Update selectedRowKeys to remove the userId
            setSelectedRowKeys(prev => {
                const updatedSet = new Set(prev);
                updatedSet.delete(userId);
                return updatedSet;
            });
            // If no users left, close sidebar
            if (updated.length === 0) {
                setShowSidebar(false);
            }
            return updated;
        });

        // Deselect main user if needed
        if (selectedUserId === userId) {
            setSelectedUser(null);
            setSelectedUserId(null);
        }
    };

    // Utility to clear all user selections but keep sidebar open if requested
    const clearUserSelection = (keepSidebar = false) => {
        // Grab current selected row keys and user IDs before clearing
        const prevSelectedRowKeys = Array.from(selectedRowKeys);
        const prevSelectedUserIds = [...selectedUserIds];

        // Deselect all rows in the grid if possible
        if (gridRef.current?.deselectRows && typeof gridRef.current.deselectRows === 'function') {
            gridRef.current.deselectRows(prevSelectedUserIds);
        } else if (gridRef.current?.deselectRow) {
            prevSelectedUserIds.forEach((id) => {
                gridRef.current.deselectRow(id);
            });
        }
        // Explicitly clear selectedRowKeys state in the grid if method exists
        if (gridRef.current?.clearSelectedRows) {
            gridRef.current.clearSelectedRows();
        }
        // Remove any remaining highlight styles from DOM
        const highlightedRows = document.querySelectorAll('tr.bg-amber-200');
        highlightedRows.forEach(row => {
            row.classList.remove('bg-amber-200');
        });
        // Now clear all selection state
        setSelectedUsers([]);
        setSelectedUser(null);
        setSelectedUserId(null);
        setSelectedUserIds([]);
        setSelectedRowKeys(new Set());
        // Sidebar closing is now handled only by explicit user actions or delisting all users individually
    };

    // Utility to refresh users and pending users
    const refreshUsers = async () => {
        try {
            const response = await authenticatedApi.get<UsersApiResponse>("/api/users");
            if (response.data.status === "success") {
                const rows = (response?.data?.data || []).map((row: any, idx: number) => ({ ...row, row_number: idx + 1 }));
                setUsers(rows);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
        // Always refresh pending users so the summary card count stays updated
        setPendingLoading(true);
        try {
            const res = await authenticatedApi.get<PendingUsersApiResponse>("/api/users/pending");
            if (res.data.status === 'success') {
                setPendingUsers((res.data.data || []).map((row, idx) => ({ ...row, row_number: idx + 1 })));
            } else {
                setPendingUsers([]);
            }
        } catch {
            setPendingUsers([]);
        } finally {
            setPendingLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setModalLoading(true);
        setModalError(null);
        try {
            const res = await authenticatedApi.post('/api/auth/reset-password-multi', {
                user_ids: selectedUsers.map(u => u.id)
            });
            const data = res.data as any;
            const results = Array.isArray(data?.results) ? data.results : [];
            const message = typeof data?.message === 'string' ? data.message : '';
            setShowPasswordDropdown(false);
            setModalOpen(null); // Dismiss modal immediately
            setShowSidebar(false); // Close ActionSidebar
            if (results.length > 0) {
                toast.success(message || 'Password(s) reset and sent to user email.');
                clearUserSelection();
                await refreshUsers(); // Refresh grid
            } else {
                toast.error(message || 'Failed to reset password(s).');
            }
        } catch (err) {
            setModalError('Failed to reset password(s).');
            setShowPasswordDropdown(false);
            setModalOpen(null);
            setShowSidebar(false); // Close ActionSidebar
            toast.error('Failed to reset password(s).');
        } finally {
            setModalLoading(false);
        }
    };

    const handleApproveUser = async () => {
        setModalLoading(true);
        setModalError(null);
        try {
            // Use pendingSelectedUsers if in pending mode, else selectedUsers
            const userIds = summaryFilter === 'pending'
                ? pendingSelectedUsers.map(u => u.id)
                : selectedUsers.map(u => u.id);
            const res = await authenticatedApi.post('/api/auth/approve-pending-user', {
                user_ids: userIds
            });
            const data = res.data as any;
            setShowSuspendDropdown(false);
            setModalOpen(null);
            setShowSidebar(false); // Close ActionSidebar
            if (data?.status === 'success') {
                toast.success('User(s) approved and activated.');
                if (summaryFilter === 'pending') {
                    clearPendingUserSelection();
                } else {
                    clearUserSelection();
                }
                await refreshUsers(); // Refresh grid
            } else {
                toast.error('Failed to approve user(s).');
            }
        } catch (err) {
            setModalError('Failed to approve user(s).');
            setShowSuspendDropdown(false);
            setModalOpen(null);
            setShowSidebar(false); // Close ActionSidebar
            toast.error('Failed to approve user(s).');
        } finally {
            setModalLoading(false);
        }
    };

    // Suspend / Activate Users (for admin)
    const handleSuspendActivateUsers = async () => {
        if (!suspendAction) return;
        setModalLoading(true);
        setModalError(null);
        try {
            // Assumed backend payload. Adjust if needed.
            const res = await authenticatedApi.post('/api/users/suspend', {
                userIds: selectedUsers.map(u => u.id),
                action: suspendAction, // 'suspend' | 'activate'
            });
            const data = res.data as any;
            if (data?.status === 'Success' || data?.status === 'success') {
                toast.success(suspendAction === 'suspend' ? 'User account(s) suspended.' : 'User account(s) reactivated.');
                clearUserSelection();
                await refreshUsers();
                setModalOpen(null);
            } else {
                const msg = data?.message || 'Failed to update user status.';
                setModalError(msg);
                toast.error(msg);
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to update user status.';
            setModalError(msg);
            toast.error(msg);
        } finally {
            setModalLoading(false);
            setSuspendAction(null);
        }
    };

    const handleChangeRoles = async () => {
        setModalLoading(true);
        setModalError(null);
        try {
            const res = await authenticatedApi.post('/api/users/change-role', {
                userIds: selectedUsers.map(u => u.id),
                roleId: selectedRole
            });
            const data = res.data as any;
            setShowRoleDropdown(false);
            setModalOpen(null);
            setShowSidebar(false); // Close ActionSidebar
            if (data?.status === 'Success') {
                toast.success('User role(s) updated.');
                clearUserSelection();
                await refreshUsers(); // Refresh grid
            } else {
                toast.error('Failed to update user role(s).');
            }
        } catch (err) {
            setModalError('Failed to update user role(s).');
            setShowRoleDropdown(false);
            setModalOpen(null);
            setShowSidebar(false); // Close ActionSidebar
            toast.error('Failed to update user role(s).');
        } finally {
            setModalLoading(false);
        }
    };

    const handleChangeGroups = async () => {
        setModalLoading(true);
        setModalError(null);
        try {
            const res = await authenticatedApi.post('/api/users/change-groups', {
                userIds: selectedUsers.map(u => u.id),
                groupIds: selectedGroups
            });
            const data = res.data as any;
            setShowGroupDropdown(false);
            setModalOpen(null);
            setShowSidebar(false); // Close ActionSidebar
            if (data?.status === 'Success') {
                toast.success('User group(s) updated.');
                clearUserSelection();
                await refreshUsers(); // Refresh grid
            } else {
                toast.error('Failed to update user group(s).');
            }
        } catch (err) {
            setModalError('Failed to update user group(s).');
            setShowGroupDropdown(false);
            setModalOpen(null);
            setShowSidebar(false); // Close ActionSidebar
            toast.error('Failed to update user group(s).');
        } finally {
            setModalLoading(false);
        }
    };

    // Card click handler
    const handleSummaryCardClick = (type: 'active' | 'inactive' | 'pending' | 'suspended') => {
        if (summaryFilter === type) {
            setSummaryFilter(null);
        } else {
            setSummaryFilter(type);
        }
    };

    // Shared invite function
    const inviteUsers = async (users: any[], onSuccess?: (feedback?: string) => void) => {
        setInviteLoading(true);
        try {
            const res = await authenticatedApi.post('/api/auth/invite-users', { users });
            const status = (res.data && typeof res.data === 'object' && 'status' in res.data) ? (res.data as any).status : undefined;
            const message = (res.data && typeof res.data === 'object' && 'message' in res.data) ? (res.data as any).message : undefined;
            const results = (res.data && typeof res.data === 'object' && 'results' in res.data && Array.isArray((res.data as any).results))
                ? (res.data as any).results
                : [];
            let feedback = '';
            if (status === 'success') {
                if (results.length > 0) {
                    feedback = results.map((r: any) => {
                        if (r.status === 'duplicate') {
                            return `User with email ${r.email} already exists.`;
                        } else if (r.status === 'success') {
                            return `Invitation sent to ${r.email}.`;
                        } else {
                            return `Invite for ${r.email}: ${r.status}`;
                        }
                    }).join(' ');
                    // Show duplicates/info via toast
                    if (results.every((r: any) => r.status === 'success')) {
                        toast.success('Invitation(s) sent successfully.');
                    } else {
                        toast.info(feedback);
                    }
                    if (results.every((r: any) => r.status === 'success')) {
                        if (onSuccess) await onSuccess(feedback);
                        await refreshUsers();
                    } else {
                        if (onSuccess) await onSuccess(feedback);
                    }
                } else {
                    feedback = 'Invitation sent successfully.';
                    toast.success(feedback);
                    if (onSuccess) await onSuccess(feedback);
                    await refreshUsers();
                }
            } else {
                toast.error(message || 'Failed to send invitation.');
                if (onSuccess) await onSuccess(message || 'Failed to send invitation.');
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to send invitation.';
            toast.error(msg);
            if (onSuccess) await onSuccess(msg);
        } finally {
            setInviteLoading(false);
        }
    };
    // Removed handleInviteUser (individual invite no longer supported)

    // Handle Bulk Invite click
    const handleBulkInviteClick = () => {
        setShowBulkInviteSidebar(true);
        if (bulkEmployees.length === 0) fetchEmployees();
    };

    const handlePersonalInviteClick = () => {
        setShowPersonalInviteSidebar(true);
    };

    const handleSubmitPersonalInvite = async () => {
        const fullname = personalInvite.fullname.trim();
        const email = personalInvite.email.trim();
        const contact = personalInvite.contact.trim();
        if (!fullname || !email) {
            toast.error('Fullname and Personal Email are required.');
            return;
        }
        const user_type = personalInvite.type === 'employee' ? 1 : 2;
        const isEmployee = personalInvite.type === 'employee';
        const payload = [{
            fullname,
            email,
            contact,
            user_type,
            username: isEmployee && personalInvite.ramco_id ? personalInvite.ramco_id : email,
        }];
        await inviteUsers(payload, () => {
            setShowPersonalInviteSidebar(false);
            setPersonalInvite({ type: 'employee', fullname: '', email: '', contact: '', ramco_id: '' });
            setPersonalSuggestions([]);
        });
    };

    const handlePersonalSearch = (value: string) => {
        setPersonalInvite(prev => ({ ...prev, fullname: value }));
        if (personalInvite.type !== 'employee') {
            setPersonalSuggestions([]);
            return;
        }
        if (personalSearchTimer.current) clearTimeout(personalSearchTimer.current);
        if (!value || value.trim().length < 2) {
            setPersonalSuggestions([]);
            return;
        }
        personalSearchTimer.current = setTimeout(async () => {
            try {
                setPersonalSearchLoading(true);
                const res = await authenticatedApi.get('/api/assets/employees/search', { params: { q: value.trim() } });
                const payload = (res.data || {}) as any;
                const data = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.result) ? payload.result : [];
                if (Array.isArray(data)) {
                    setPersonalSuggestions(data);
                } else {
                    setPersonalSuggestions([]);
                }
            } catch {
                setPersonalSuggestions([]);
            } finally {
                setPersonalSearchLoading(false);
            }
        }, 250);
    };

    const handleSelectSuggestion = (item: any) => {
        const fullname = item.full_name || item.name || '';
        const email = item.email || '';
        const contact = item.contact || item.phone || '';
        const ramco_id = item.ramco_id || '';
        setPersonalInvite(prev => ({
            ...prev,
            type: 'employee',
            fullname,
            email,
            contact,
            ramco_id,
        }));
        setPersonalSuggestions([]);
    };

    const handleRemoveUsers = async () => {
        if (selectedUsers.length === 0) return;
        setModalLoading(true);
        setModalError(null);
        try {
            const ids = selectedUsers.map(u => u.id).join(',');
            await authenticatedApi.delete(`/api/users/${ids}`);
            toast.success('User(s) removed.');
            clearUserSelection();
            await refreshUsers();
            setShowSidebar(false);
            setShowDeleteUsersDialog(false);
            setShowDeleteUsersConfirmDialog(false);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to remove user(s).';
            setModalError(msg);
            toast.error(msg);
        } finally {
            setModalLoading(false);
        }
    };

    // Handle inviting selected employees
    const handleBulkInvite = async () => {
        if (bulkSelectedIds.length === 0) return;
        const selected = bulkEmployees.filter(e => bulkSelectedIds.includes(e.id));
        const users = selected.map(e => ({
            fullname: e.full_name,
            email: e.email,
            contact: e.contact,
            user_type: 1,
            username: e.ramco_id,
        }));
        await inviteUsers(users, async (feedback) => {
            setShowBulkInviteDialog(false);
            setBulkSelectedIds([]);
            setBulkInviteFeedback(feedback || null);
        });
    };

    // Fetch employees for bulk invite
    const fetchEmployees = async () => {
        setBulkLoading(true);
        setBulkError(null);
        try {
            const res = await authenticatedApi.get("/api/assets/employees");
            const data = res.data as { status: string; message?: string; data?: any[] };
            if (data.status === "success") {
                setBulkEmployees(data.data || []);
            } else {
                setBulkError(data.message || "Failed to fetch employees.");
            }
        } catch (err: any) {
            setBulkError(err?.response?.data?.message || "Failed to fetch employees.");
        } finally {
            setBulkLoading(false);
        }
    };

    // Fetch employees when Bulk Invite Sidebar opens
    useEffect(() => {
        if (showBulkInviteSidebar && bulkEmployees.length === 0) {
            fetchEmployees();
        }
         
    }, [showBulkInviteSidebar]);

    // Show feedback toast after dialog closes
    useEffect(() => {
        if (!showBulkInviteDialog && bulkInviteFeedback) {
            toast.info(bulkInviteFeedback);
            setBulkInviteFeedback(null);
        }
    }, [showBulkInviteDialog, bulkInviteFeedback]);

    return (
        <>
            {/* Summary Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card
                    className={`flex-1 p-4 cursor-pointer flex items-center gap-3 transition-all border relative ${summaryFilter === 'active' ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => handleSummaryCardClick('active')}
                >
                    {summaryFilter === 'active' && summaryLoading && (
                        <span style={{ position: 'absolute', top: 8, right: 12 }}>
                            <Loader2 className="animate-spin text-blue-500" size={20} />
                        </span>
                    )}
                    <span className="font-bold text-lg text-blue-600">{summaryCounts.active}</span>
                    <span className="text-gray-700 dark:text-gray-200">Active</span>
                </Card>
                <Card
                    className={`flex-1 p-4 cursor-pointer flex items-center gap-3 transition-all border relative ${summaryFilter === 'inactive' ? 'ring-2 ring-gray-400' : ''}`}
                    onClick={() => handleSummaryCardClick('inactive')}
                >
                    {summaryFilter === 'inactive' && summaryLoading && (
                        <span style={{ position: 'absolute', top: 8, right: 12 }}>
                            <Loader2 className="animate-spin text-gray-500" size={20} />
                        </span>
                    )}
                    <span className="font-bold text-lg text-gray-500">{summaryCounts.inactive}</span>
                    <span className="text-gray-700 dark:text-gray-200">Inactive</span>
                </Card>
                <Card
                    className={`flex-1 p-4 cursor-pointer flex items-center gap-3 transition-all border relative ${summaryFilter === 'pending' ? 'ring-2 ring-amber-500' : ''}`}
                    onClick={() => handleSummaryCardClick('pending')}
                >
                    {summaryFilter === 'pending' && summaryLoading && (
                        <span style={{ position: 'absolute', top: 8, right: 12 }}>
                            <Loader2 className="animate-spin text-amber-500" size={20} />
                        </span>
                    )}
                    <span className="font-bold text-lg text-amber-600">{summaryCounts.pending}</span>
                    <span className="text-gray-700 dark:text-gray-200">Pending Activation</span>
                </Card>
                <Card
                    className={`flex-1 p-4 cursor-pointer flex items-center gap-3 transition-all border relative ${summaryFilter === 'suspended' ? 'ring-2 ring-red-500' : ''}`}
                    onClick={() => handleSummaryCardClick('suspended')}
                >
                    {summaryFilter === 'suspended' && summaryLoading && (
                        <span style={{ position: 'absolute', top: 8, right: 12 }}>
                            <Loader2 className="animate-spin text-red-500" size={20} />
                        </span>
                    )}
                    <span className="font-bold text-lg text-red-600">{summaryCounts.suspended}</span>
                    <span className="text-gray-700 dark:text-gray-200">Suspended</span>
                </Card>
            </div>
            <div className="flex items-center justify-between my-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold mr-3">User Account Management</h1>
                    <Switch id="showPending" checked={summaryFilter === 'pending'} onCheckedChange={checked => setSummaryFilter(checked ? 'pending' : null)} />
                    <label htmlFor="showPending" className="text-sm text-gray-700 dark:text-gray-200 cursor-pointer select-none my-1">
                        Show pending approval
                    </label>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="default" type="button">
                            <Plus /> Invite
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleBulkInviteClick}>
                            From Employee Records
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handlePersonalInviteClick}>
                            Using Personal Email
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {(() => {
                const isPending = summaryFilter === 'pending';
                const gridData = isPending ? pendingUsers : filteredUsersWithRowNumber;
                const gridColumns = isPending ? pendingColumns : columns;
                const selection = isPending ? pendingRowSelection : rowSelection;
                const selectedKeys = isPending ? pendingSelectedRowKeys : selectedRowKeys;
                const setSelectedKeys = isPending ? setPendingSelectedRowKeys : setSelectedRowKeys;
                const onRowSel = isPending ? handlePendingRowSelected : handleRowSelected;
                return (
                    <CustomDataGrid<any>
                        key={isPending ? 'pending-grid' : 'active-grid'}
                        ref={gridRef}
                        data={gridData as any[]}
                        columns={gridColumns as any}
                        pageSize={10}
                        pagination={false}
                        inputFilter={false}
                        theme={'sm'}
                        rowSelection={selection as any}
                        onRowDoubleClick={isPending ? undefined : handleRowDoubleClick as any}
                        onRowSelected={onRowSel as any}
                        selectedRowKeys={selectedKeys as any}
                        setSelectedRowKeys={setSelectedKeys as any}
                    />
                );
            })()}
            {/* Pending mode sidebar */}
            {summaryFilter === 'pending' && showPendingSidebar && pendingSelectedUsers.length > 0 && (
                <ActionSidebar
                    title="User Maintenance"
                    size="sm"
                    content={
                        <div className="flex flex-col gap-2">
                            <div className="text-sm text-danger font-semibold mb-0.5">
                                You can choose any action below for the selected users.
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <AlertDialog open={showSuspendDropdown} onOpenChange={setShowSuspendDropdown}>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="min-w-30 border-green-600 hover:bg-green-200"
                                            onClick={() => setShowSuspendDropdown(true)}
                                        >
                                            Approve User
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Approve User(s)</AlertDialogTitle>
                                        </AlertDialogHeader>
                                        <div className="text-sm text-green-700 rounded-sm p-1 mb-2">
                                            Are you sure you want to approve and activate the selected user(s)?
                                        </div>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel asChild>
                                                <Button variant="secondary" size="sm">Close</Button>
                                            </AlertDialogCancel>
                                            <AlertDialogAction asChild>
                                                <Button variant="default" size="sm" onClick={() => { setShowSuspendDropdown(false); setModalOpen('approve'); }}>Apply</Button>
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <Button size="sm" variant="destructive" onClick={() => setShowDeletePendingDialog(true)} disabled={pendingSelectedUsers.length === 0}>Delete User</Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearPendingUserSelection}
                                >
                                    <Trash2 className="text-red-600 hover:text-white-light" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    className="form-input grow"
                                    placeholder="Search selected users..."
                                    value={selectedUsersSearch}
                                    onChange={e => setSelectedUsersSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                        checked={pendingSelectedUsers.length > 0 && pendingSidebarCheckedIds.length === pendingSelectedUsers.length}
                                        onCheckedChange={(checked: boolean) => {
                                            if (checked) {
                                                setPendingSidebarCheckedIds(pendingSelectedUsers.map(u => u.id));
                                            } else {
                                                setPendingSidebarCheckedIds([]);
                                            }
                                        }}
                                        ref={el => {
                                            const some = pendingSidebarCheckedIds.length > 0 && pendingSidebarCheckedIds.length < pendingSelectedUsers.length;
                                            if (el && 'indeterminate' in el) (el as HTMLInputElement).indeterminate = some;
                                        }}
                                    />
                                    <span className="text-sm">Select all</span>
                                </label>
                                <div className="text-sm mb-1.5">{pendingSidebarCheckedIds.length} selected</div>
                            </div>
                            <ul className="mt-1 text-sm max-h-72 overflow-y-auto divide-y">
                                {pendingSelectedUsers
                                    .filter(user => !selectedUsersSearch || user.fname.toLowerCase().includes(selectedUsersSearch.toLowerCase()) || user.email.toLowerCase().includes(selectedUsersSearch.toLowerCase()))
                                    .map((user) => (
                                        <li className="flex items-start justify-between py-2" key={user.id}>
                                            <div className="flex items-start gap-2">
                                                <Checkbox
                                                    checked={pendingSidebarCheckedIds.includes(user.id)}
                                                    onCheckedChange={(checked: boolean) => {
                                                        setPendingSidebarCheckedIds(prev => {
                                                            if (checked) return [...prev, user.id];
                                                            return prev.filter(id => id !== user.id);
                                                        });
                                                    }}
                                                />
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{user.fname}</span>
                                                    <span className="text-xs text-gray-400">{user.email}</span>
                                                </div>
                                            </div>
                                            <MinusCircle className="text-red-500 hover:text-red-600 cursor-pointer ml-2 w-5 h-5" onClick={() => {
                                                setPendingSelectedUsers(prev => prev.filter(u => u.id !== user.id));
                                                setPendingSelectedRowKeys(prev => {
                                                    const updated = new Set(prev);
                                                    updated.delete(user.id);
                                                    return updated;
                                                });
                                                setPendingSidebarCheckedIds(prev => prev.filter(id => id !== user.id));
                                                if (pendingSelectedUsers.length <= 1) setShowPendingSidebar(false);
                                            }} />
                                        </li>
                                    ))}
                                {pendingSelectedUsers.length === 0 && <li className="text-gray-400 italic">No users selected</li>}
                            </ul>

                        </div>
                    }
                    onClose={clearPendingUserSelection}
                />
            )}
            {showSidebar && selectedUsers.length > 0 && summaryFilter !== 'pending' && (
                <ActionSidebar
                    title="User Maintenance"
                    size="sm"
                    content={
                        <div className="flex flex-col gap-2">
                            {/* Admin note */}
                            <div className="text-sm text-danger font-semibold mb-0.5">
                                You can choose any action below for the selected users.
                            </div>
                            {/* Button group above search */}
                            <div className="flex flex-wrap gap-2">
                                {/* Reset Password Dialog */}
                                <AlertDialog open={showPasswordDropdown} onOpenChange={setShowPasswordDropdown}>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="min-w-30 border-amber-600 hover:bg-amber-300"
                                            onClick={() => setShowPasswordDropdown(true)}
                                        >
                                            Reset Password
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Reset Password</AlertDialogTitle>
                                        </AlertDialogHeader>
                                        <div className="text-sm text-red-600 rounded-sm p-1 mb-2">
                                            A new password will be generated and sent to the user&apos;s email. This action cannot be undone.<br />
                                            Are you sure you want to reset the password for the selected user(s)?
                                        </div>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel asChild>
                                                <Button variant="secondary" size="sm">Close</Button>
                                            </AlertDialogCancel>
                                            <AlertDialogAction asChild>
                                                <Button variant="default" size="sm" onClick={() => { setShowPasswordDropdown(false); setModalOpen('reset'); }}>Apply</Button>
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                {/* Suspend / Activate Buttons */}
                                {(() => {
                                    const hasActive = selectedUsers.some(u => u.status === 1 || u.status === 0);
                                    const hasSuspended = selectedUsers.some(u => u.status === 2);
                                    return (
                                        <>
                                            {hasActive && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="min-w-30 border-red-600 hover:bg-red-300"
                                                    onClick={() => { setSuspendAction('suspend'); setModalOpen('suspend'); }}
                                                >
                                                    Suspend
                                                </Button>
                                            )}
                                            {hasSuspended && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="min-w-30 border-green-600 hover:bg-green-300"
                                                    onClick={() => { setSuspendAction('activate'); setModalOpen('suspend'); }}
                                                >
                                                    Activate
                                                </Button>
                                            )}
                                        </>
                                    );
                                })()}
                                {/* Change Roles Dialog */}
                                <AlertDialog open={showRoleDropdown} onOpenChange={setShowRoleDropdown}>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="min-w-30 border-sky-600 hover:bg-sky-300"
                                            onClick={() => setShowRoleDropdown(true)}
                                        >
                                            Change Roles
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Select Role</AlertDialogTitle>
                                        </AlertDialogHeader>
                                        <ul>
                                            {allRoles.map((role: any) => (
                                                <li key={role.id} className="flex items-center gap-2 py-1">
                                                    <input
                                                        type="radio"
                                                        name="role-select"
                                                        checked={selectedRole === role.id}
                                                        onChange={() => setSelectedRole(role.id)}
                                                        className="form-radio border-slate-400 dark:border-slate-600"
                                                    />
                                                    <span className="text-xs">{role.name}</span>
                                                </li>
                                            ))}
                                            {allRoles.length === 0 && <li className="text-gray-400 italic">No roles found</li>}
                                        </ul>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel asChild>
                                                <Button variant="secondary" size="sm">Close</Button>
                                            </AlertDialogCancel>
                                            <AlertDialogAction asChild>
                                                <Button variant="default" size="sm" onClick={() => { setShowRoleDropdown(false); setModalOpen('role'); }}>Apply</Button>
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                {/* Change Groups Dialog */}
                                <AlertDialog open={showGroupDropdown} onOpenChange={setShowGroupDropdown}>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="min-w-30 border-sky-600 hover:bg-sky-300"
                                            onClick={() => setShowGroupDropdown(true)}
                                        >
                                            Change Groups
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Select Groups</AlertDialogTitle>
                                        </AlertDialogHeader>
                                        <ul>
                                            {allGroups.map((group: any) => (
                                                <li key={group.id} className="flex items-center gap-2 py-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedGroups.includes(group.id)}
                                                        onChange={e => {
                                                            if (e.target.checked) {
                                                                setSelectedGroups(prev => [...prev, group.id]);
                                                            } else {
                                                                setSelectedGroups(prev => prev.filter(id => id !== group.id));
                                                            }
                                                        }}
                                                        className="form-checkbox border-slate-400 dark:border-slate-600"
                                                    />
                                                    <span className="text-xs">{group.name}</span>
                                                </li>
                                            ))}
                                            {allGroups.length === 0 && <li className="text-gray-400 italic">No groups found</li>}
                                        </ul>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel asChild>
                                                <Button variant="secondary" size="sm">Close</Button>
                                            </AlertDialogCancel>
                                            <AlertDialogAction asChild>
                                                <Button variant="default" size="sm" onClick={() => { setShowGroupDropdown(false); setModalOpen('group'); }}>Apply</Button>
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                {/* Remove Users with double confirmation */}
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="min-w-30"
                                    onClick={() => { setShowDeleteUsersDialog(true); setModalError(null); }}
                                >
                                    Remove Users
                                </Button>
                            </div>
                            {/* Search and user list */}
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    className="form-input grow"
                                    placeholder="Search selected users..."
                                    value={selectedUsersSearch}
                                    onChange={e => setSelectedUsersSearch(e.target.value)}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => clearUserSelection(true)}
                                >
                                    <Trash2 className="text-red-600 hover:text-white-light" />
                                </Button>
                            </div>
                            <ul className="mt-1 text-sm max-h-72 overflow-y-auto divide-y">
                                {selectedUsers
                                    .filter(user =>
                                        !selectedUsersSearch ||
                                        user.fname.toLowerCase().includes(selectedUsersSearch.toLowerCase()) ||
                                        user.username.toLowerCase().includes(selectedUsersSearch.toLowerCase())
                                    )
                                    .map((user) => (
                                        <li
                                            className="flex flex-col gap-1 px-3 py-1.5 mb-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                            key={user.id}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex flex-col">
                                                    <span className="capitalize font-semibold text-base text-gray-800 dark:text-gray-100">{user.fname}</span>
                                                    <span className="font-semibold text-xs dark:text-gray-400">Username: <span>{user.username}</span></span>
                                                    <span className="font-semibold text-xs">Role: <span>{user.role && user.role.name ? user.role.name : '-'}</span></span>
                                                    <span className="font-semibold text-xs">Groups: <span>{user.usergroups && user.usergroups.length > 0 ? user.usergroups.map((g: any) => g.name).join(', ') : '-'}</span></span>
                                                </div>
                                                <MinusCircle
                                                    className="text-red-500 hover:text-red-600 cursor-pointer ml-2 w-5 h-5"
                                                    onClick={() => handleDelistUser(user.id)}
                                                />
                                            </div>
                                        </li>
                                    ))}
                                {selectedUsers.length === 0 && <li className="text-gray-400 italic">No users selected</li>}
                            </ul>
                        </div>
                    }
                    onClose={() => {
                        const rowElement = document.querySelector(`tr.bg-amber-200`);
                        if (rowElement) {
                            rowElement.classList.add('animate-ping-fast');
                            setTimeout(() => {
                                rowElement.classList.remove('animate-ping-fast');
                                setSelectedUser(null);
                                setSelectedUserId(null);
                                setShowSidebar(false);
                                setSelectedUsers([]);
                            }, 400);
                        } else {
                            setSelectedUser(null);
                            setSelectedUserId(null);
                            setShowSidebar(false);
                            setSelectedUsers([]);
                        }
                    }}
                />
            )}
            {/* Personal Email Invite Sidebar */}
            {showPersonalInviteSidebar && (
                <ActionSidebar
                    title="Invite via Personal Email"
                    size="sm"
                    onClose={() => {
                        setShowPersonalInviteSidebar(false);
                        setPersonalInvite({ type: 'employee', fullname: '', email: '', contact: '', ramco_id: '' });
                    }}
                    content={
                        <div className="space-y-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium">User Type</label>
                                <div className="flex gap-4 items-center">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="radio"
                                            name="personal-invite-type"
                                            value="employee"
                                            checked={personalInvite.type === 'employee'}
                                            onChange={() => setPersonalInvite(prev => ({ ...prev, type: 'employee', ramco_id: '' }))}
                                            className="h-4 w-4"
                                        />
                                        <span>Employee</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="radio"
                                            name="personal-invite-type"
                                            value="non-employee"
                                            checked={personalInvite.type === 'non-employee'}
                                            onChange={() => setPersonalInvite(prev => ({ ...prev, type: 'non-employee', ramco_id: '', fullname: '', email: '', contact: '' }))}
                                            className="h-4 w-4"
                                        />
                                        <span>Non-employee</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium">Fullname</label>
                                <Input
                                    value={personalInvite.fullname}
                                    onChange={e => handlePersonalSearch(e.target.value)}
                                    placeholder="Enter full name"
                                />
                                {personalInvite.type === 'employee' && (
                                    <>
                                        {(personalSearchLoading && personalInvite.fullname.trim().length >= 2) && (
                                            <div className="text-xs text-gray-500">Searching...</div>
                                        )}
                                        {personalSuggestions.length > 0 && (
                                            <div className="border rounded bg-white shadow max-h-48 overflow-y-auto mt-1">
                                                {personalSuggestions.map((item: any) => (
                                                    <div
                                                        key={item.id || item.email || item.full_name}
                                                        className="px-3 py-2 hover:bg-slate-100 cursor-pointer"
                                                        onClick={() => handleSelectSuggestion(item)}
                                                    >
                                                        <div className="text-sm font-semibold">{item.full_name || item.name}</div>
                                                        <div className="text-xs text-gray-600">{item.email}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            {personalInvite.ramco_id && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium">Username (RAMCO ID)</label>
                                    <Input value={personalInvite.ramco_id} readOnly />
                                </div>
                            )}
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium">Personal Email</label>
                                <Input
                                    type="email"
                                    value={personalInvite.email}
                                    onChange={e => setPersonalInvite(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium">Contact No</label>
                                <Input
                                    value={personalInvite.contact}
                                    onChange={e => setPersonalInvite(prev => ({ ...prev, contact: e.target.value }))}
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" type="button" onClick={() => {
                                    setShowPersonalInviteSidebar(false);
                                    setPersonalInvite({ type: 'employee', fullname: '', email: '', contact: '', ramco_id: '' });
                                }}>
                                    Cancel
                                </Button>
                                <Button type="button" variant="default" onClick={handleSubmitPersonalInvite} disabled={inviteLoading}>
                                    {inviteLoading ? 'Sending...' : 'Send Invite'}
                                </Button>
                            </div>
                        </div>
                    }
                />
            )}
            {/* Bulk Invite Employees Sidebar */}
            {showBulkInviteSidebar && (
                <ActionSidebar
                    title="Bulk Invite Employees"
                    size="sm"
                    onClose={() => {
                        setShowBulkInviteSidebar(false);
                        setBulkSelectedIds([]);
                        setBulkSearch("");
                        setBulkError(null);
                    }}
                    content={
                        <div className="flex flex-col gap-3">
                            <div>
                                <Input
                                    placeholder="Search employees by name, email, or ID..."
                                    value={bulkSearch}
                                    onChange={e => setBulkSearch(e.target.value)}
                                />
                            </div>
                            {bulkError && <div className="text-xs text-red-600">{bulkError}</div>}
                            <div className="max-h-150 overflow-y-auto border rounded p-2 bg-slate-50 dark:bg-slate-800">
                                {bulkLoading ? (
                                    <div className="text-center py-8">Loading...</div>
                                ) : (
                                    <ul className="divide-y">
                                        {bulkEmployees
                                            .filter(e => {
                                                if (e.employment_status === 'resigned') return false;
                                                const exists = users.some(u =>
                                                    (u.username && u.username.toLowerCase() === String(e.ramco_id).toLowerCase()) ||
                                                    (u.email && u.email.toLowerCase() === String(e.email).toLowerCase())
                                                );
                                                if (exists) return false;
                                                return e.email &&
                                                    (!bulkSearch ||
                                                        e.full_name.toLowerCase().includes(bulkSearch.toLowerCase()) ||
                                                        e.email.toLowerCase().includes(bulkSearch.toLowerCase()) ||
                                                        e.ramco_id.toLowerCase().includes(bulkSearch.toLowerCase())
                                                    );
                                            })
                                            .map(e => (
                                                <li key={e.id} className="flex items-center gap-4 py-2">
                                                    <Checkbox
                                                        checked={bulkSelectedIds.includes(e.id)}
                                                        onCheckedChange={(checked: boolean) => {
                                                            if (checked) {
                                                                setBulkSelectedIds(prev => [...prev, e.id]);
                                                            } else {
                                                                setBulkSelectedIds(prev => prev.filter(id => id !== e.id));
                                                            }
                                                        }}
                                                    />
                                                    <span className="flex flex-col text-xs">
                                                        <span className="font-semibold text-sm">{e.full_name}</span>
                                                        <span className="text-xs text-gray-800">RAMCO ID: {e.ramco_id}</span>
                                                        <span className="text-xs text-gray-800">Email: {e.email}</span>
                                                        <span className="text-xs text-gray-800">Contact: {e.contact}</span>
                                                    </span>
                                                </li>
                                            ))}
                                        {bulkEmployees.filter(e => {
                                            if (e.employment_status === 'resigned') return false;
                                            const exists = users.some(u =>
                                                (u.username && u.username.toLowerCase() === String(e.ramco_id).toLowerCase()) ||
                                                (u.email && u.email.toLowerCase() === String(e.email).toLowerCase())
                                            );
                                            if (exists) return false;
                                            return e.email &&
                                                (!bulkSearch ||
                                                    e.full_name.toLowerCase().includes(bulkSearch.toLowerCase()) ||
                                                    e.email.toLowerCase().includes(bulkSearch.toLowerCase()) ||
                                                    e.ramco_id.toLowerCase().includes(bulkSearch.toLowerCase())
                                                );
                                        }).length === 0 && (
                                                <li className="text-gray-400 italic py-4 text-center">No employees found</li>
                                            )}
                                    </ul>
                                )}
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Button variant="outline" type="button" onClick={() => setShowBulkInviteSidebar(false)}>
                                    Close
                                </Button>
                                <Button
                                    type="button"
                                    variant="default"
                                    disabled={inviteLoading || bulkSelectedIds.length === 0}
                                    onClick={handleBulkInvite}
                                >
                                    {inviteLoading ? 'Inviting...' : `Invite Selected (${bulkSelectedIds.length})`}
                                </Button>
                            </div>
                        </div>
                    }
                />
            )}
            {/* Remove Users double confirmation */}
            <AlertDialog open={showDeleteUsersDialog} onOpenChange={(open) => { setShowDeleteUsersDialog(open); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm removal</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogDescription className="text-sm text-red-600">
                        You are about to remove {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''}.
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                            <Button variant="secondary" size="sm" onClick={() => setShowDeleteUsersDialog(false)}>Cancel</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button variant="destructive" size="sm" onClick={() => { setShowDeleteUsersDialog(false); setShowDeleteUsersConfirmDialog(true); }}>
                                Continue
                            </Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={showDeleteUsersConfirmDialog} onOpenChange={(open) => setShowDeleteUsersConfirmDialog(open)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Final confirmation</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogDescription className="text-sm text-red-600">
                        This action permanently removes the selected user(s) and cannot be undone.
                    </AlertDialogDescription>
                    {modalError && <div className="text-xs text-red-600 mb-2">{modalError}</div>}
                    <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                            <Button variant="secondary" size="sm" onClick={() => { setShowDeleteUsersConfirmDialog(false); setShowDeleteUsersDialog(false); }}>Cancel</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button variant="destructive" size="sm" onClick={handleRemoveUsers} disabled={modalLoading}>
                                {modalLoading ? 'Removing...' : 'Yes, remove'}
                            </Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* Confirmation Modal for all actions */}
            {modalOpen && (
                <AlertDialog open={!!modalOpen} onOpenChange={open => { if (!open) setModalOpen(null); }}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {modalOpen === 'reset' ? 'Confirm Password Reset' :
                                    modalOpen === 'approve' ? 'Confirm User Approval' :
                                        modalOpen === 'role' ? 'Confirm Role Change' :
                                            modalOpen === 'group' ? 'Confirm Group Change' :
                                                modalOpen === 'suspend' ? (suspendAction === 'suspend' ? 'Confirm Suspend User(s)' : 'Confirm Activate User(s)') : ''}
                            </AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogDescription>
                            {modalOpen === 'reset' && (
                                <>
                                    <div className="text-sm mb-4">A new password will be generated and sent to the user&apos;s email. This action cannot be undone.<br />Are you sure you want to reset the password for the selected user(s)?</div>
                                    {modalError && <div className="text-xs text-red-600 mb-2">{modalError}</div>}
                                </>
                            )}
                            {modalOpen === 'approve' && (
                                <>
                                    <div className="text-sm mb-4">Are you sure you want to approve and activate the selected user(s)?</div>
                                    {modalError && <div className="text-xs text-red-600 mb-2">{modalError}</div>}
                                </>
                            )}
                            {modalOpen === 'role' && (
                                <>
                                    <div className="text-sm mb-4">Are you sure you want to change the role for the selected user(s)?</div>
                                    {modalError && <div className="text-xs text-red-600 mb-2">{modalError}</div>}
                                </>
                            )}
                            {modalOpen === 'group' && (
                                <>
                                    <div className="text-sm mb-4">Are you sure you want to change the group(s) for the selected user(s)?</div>
                                    {modalError && <div className="text-xs text-red-600 mb-2">{modalError}</div>}
                                </>
                            )}
                            {modalOpen === 'suspend' && (
                                <>
                                    <div className="text-sm mb-4">
                                        {suspendAction === 'suspend'
                                            ? 'Suspending will immediately block login access for the selected account(s). You can reactivate them later.'
                                            : 'Activating will restore login access for the selected suspended account(s).'}
                                        <br />Are you sure you want to proceed?
                                    </div>
                                    {modalError && <div className="text-xs text-red-600 mb-2">{modalError}</div>}
                                </>
                            )}
                        </AlertDialogDescription>
                        <AlertDialogFooter>
                            <AlertDialogCancel asChild>
                                <button className="btn py-2 px-4 bg-slate-500 text-white border-0 rounded-full" disabled={modalLoading}>Cancel</button>
                            </AlertDialogCancel>
                            <AlertDialogAction asChild>
                                <button className="btn py-2 px-4 bg-blue-500 text-white border-0 rounded-full"
                                    onClick={() => {
                                        if (modalOpen === 'reset') handleResetPassword();
                                        if (modalOpen === 'approve') handleApproveUser();
                                        if (modalOpen === 'role') handleChangeRoles();
                                        if (modalOpen === 'group') handleChangeGroups();
                                        if (modalOpen === 'suspend') handleSuspendActivateUsers();
                                    }}
                                    disabled={modalLoading}
                                >
                                    Confirm
                                </button>
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            {/* Delete Pending Users Confirmation Dialog */}
            {showDeletePendingDialog && (
                <AlertDialog open={showDeletePendingDialog} onOpenChange={setShowDeletePendingDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Pending User{pendingSidebarCheckedIds.length > 1 ? 's' : ''}</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogDescription>
                            <div className="text-sm mb-4">
                                This action will permanently remove the selected pending user{pendingSidebarCheckedIds.length > 1 ? 's' : ''} from the system and cannot be undone.<br />
                                {pendingSidebarCheckedIds.length === 0 ? 'No users currently selected.' : `You are about to delete ${pendingSidebarCheckedIds.length} user${pendingSidebarCheckedIds.length > 1 ? 's' : ''}.`}
                            </div>
                            {deletePendingError && <div className="text-xs text-red-600 mb-2">{deletePendingError}</div>}
                        </AlertDialogDescription>
                        <AlertDialogFooter>
                            <AlertDialogCancel asChild>
                                <button
                                    className="btn py-2 px-4 bg-slate-500 text-white border-0 rounded-full"
                                    disabled={deletePendingLoading}
                                >Cancel</button>
                            </AlertDialogCancel>
                            <AlertDialogAction asChild>
                                <button
                                    className="btn py-2 px-4 bg-red-600 hover:bg-red-700 text-white border-0 rounded-full"
                                    onClick={handleDeletePendingUsers}
                                    disabled={deletePendingLoading || pendingSidebarCheckedIds.length === 0}
                                >
                                    {deletePendingLoading ? 'Deleting...' : 'Delete'}
                                </button>
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
};


export default UserManagement;
