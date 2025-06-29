import React, { useEffect, useState, useMemo, useRef } from "react";
import { CustomDataGrid, ColumnDef, DataGridProps } from "@/components/ui/DataGrid";
import ActionSidebar from "@components/ui/action-aside";
import { authenticatedApi } from "@/config/api";
import { Plus, Trash2, MinusCircle } from "lucide-react";
import { Button } from "@components/ui/button";
import { Card } from "@components/ui/card";
import { Switch } from "@components/ui/switch";
import { Input } from "@components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
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
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [inviteForm, setInviteForm] = useState({ fullname: '', email: '', contact: '', user_type: 1 });
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);

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
            authenticatedApi.get("/api/groups").then(res => {
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
            authenticatedApi.get("/api/roles").then(res => {
                const data = res.data as any;
                // Fix: roles are under data.data, not data.roles
                if (data && Array.isArray(data.data)) setAllRoles(data.data);
            });
        }
    }, [showRoleDropdown, allRoles.length]);

    // Also update sidebar-triggered fetch to use only id & name
    useEffect(() => {
        if (showSidebar && allGroups.length === 0) {
            authenticatedApi.get('/api/groups')
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
        // For the Pending Activation card, use pendingUsers count if summaryFilter is 'pending', else fallback to users logic
        const pendingActivation = summaryFilter === 'pending' ? pendingUsers.length : pending;
        return { active, inactive, pending: pendingActivation, suspended };
    }, [users, pendingUsers, summaryFilter]);

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
                            <span key={g.id} className="bg-sky-600 text-white text-xs rounded-full px-2 py-0.5">
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
            render: (row) => (
                <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold
            ${row.status === 1 ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}
                >
                    {row.status === 1 ? "Active" : "Inactive"}
                </span>
            ),
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
    const selectableRowIds = useMemo(() => users.filter(user => user.role.id !== 1).map(user => user.id), [users]);

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
        isSelectable: (row: User) => row.role.id !== 1,
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
                return user && user.role.id !== 1;
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
        if (summaryFilter === 'pending') {
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
            if (data?.status === 'Success') {
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

    const handleInviteUser = async () => {
        setInviteLoading(true);
        setInviteError(null);
        try {
            const res = await authenticatedApi.post('/api/auth/invite-users', {
                users: [
                    {
                        fullname: inviteForm.fullname,
                        email: inviteForm.email,
                        contact: inviteForm.contact,
                        user_type: inviteForm.user_type,
                    }
                ]
            });
            const status = (res.data && typeof res.data === 'object' && 'status' in res.data) ? (res.data as any).status : undefined;
            const message = (res.data && typeof res.data === 'object' && 'message' in res.data) ? (res.data as any).message : undefined;
            const results = (res.data && typeof res.data === 'object' && 'results' in res.data && Array.isArray((res.data as any).results))
                ? (res.data as any).results
                : [];
            if (status === 'success') {
                if (results.length > 0) {
                    // Show feedback for each result
                    const feedback = results.map((r: any) => {
                        if (r.status === 'duplicate') {
                            return `User with email ${r.email} already exists.`;
                        } else if (r.status === 'success') {
                            return `Invitation sent to ${r.email}.`;
                        } else {
                            return `Invite for ${r.email}: ${r.status}`;
                        }
                    }).join(' ');
                    setInviteError(feedback); // Show as error for duplicate, or info for success
                    if (results.every((r: any) => r.status === 'success')) {
                        toast.success('Invitation sent successfully.');
                        setShowInviteDialog(false);
                        setInviteForm({ fullname: '', email: '', contact: '', user_type: 1 });
                        await refreshUsers();
                    }
                } else {
                    toast.success('Invitation sent successfully.');
                    setShowInviteDialog(false);
                    setInviteForm({ fullname: '', email: '', contact: '', user_type: 1 });
                    await refreshUsers();
                }
            } else {
                setInviteError(message || 'Failed to send invitation.');
            }
        } catch (err: any) {
            setInviteError(err?.response?.data?.message || 'Failed to send invitation.');
        } finally {
            setInviteLoading(false);
        }
    };

    return (
        <div className="mt-4">
            {/* Summary Cards Row */}
            <div className="flex gap-4 mb-4">
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
                        <DropdownMenuItem onClick={() => setShowInviteDialog(true)}>
                            Individual
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info('Bulk invite coming soon!')}>
                            Bulk
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {/* Render the appropriate grid: default or pending approval */}
            {summaryFilter === 'pending' ? (
                <>
                    <div className="mt-2">
                        <CustomDataGrid
                            data={pendingUsers}
                            columns={pendingColumns}
                            pageSize={10}
                            pagination={true}
                            inputFilter={false}
                            theme={'sm'}
                            rowSelection={pendingRowSelection}
                            onRowSelected={handlePendingRowSelected}
                            selectedRowKeys={pendingSelectedRowKeys}
                            setSelectedRowKeys={setPendingSelectedRowKeys}
                        />
                    </div>
                    {showPendingSidebar && pendingSelectedUsers.length > 0 && (
                        <ActionSidebar
                            title="User Maintenance"
                            size="sm"
                            content={
                                <div className="flex flex-col gap-2">
                                    <div className="text-sm text-danger font-semibold mb-0.5">
                                        You can choose any action below for the selected users.
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {/* Approve User Dialog ONLY for pending users */}
                                        <AlertDialog open={showSuspendDropdown} onOpenChange={setShowSuspendDropdown}>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="min-w-[120px] border-green-600 hover:bg-green-200"
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
                                    </div>
                                    {/* Search and user list for pending users */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <input
                                            className="form-input flex-grow"
                                            placeholder="Search selected users..."
                                            value={selectedUsersSearch}
                                            onChange={e => setSelectedUsersSearch(e.target.value)}
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={clearPendingUserSelection}
                                        >
                                            <Trash2 className="text-red-600 hover:text-white-light" />
                                        </Button>
                                    </div>
                                    <ul className="mt-1 text-sm max-h-72 overflow-y-auto divide-y">
                                        {pendingSelectedUsers
                                            .filter(user =>
                                                !selectedUsersSearch ||
                                                user.fname.toLowerCase().includes(selectedUsersSearch.toLowerCase())
                                            )
                                            .map((user) => (
                                                <li className="flex items-center capitalize justify-between px-2 py-2" key={user.id}>
                                                    <span>{user.fname} <span className="text-xs text-gray-400 ml-1">({user.email})</span></span>
                                                    <MinusCircle className="text-red-500 hover:text-red-600 cursor-pointer ml-2 w-5 h-5" onClick={() => {
                                                        setPendingSelectedUsers(prev => prev.filter(u => u.id !== user.id));
                                                        setPendingSelectedRowKeys(prev => {
                                                            const updated = new Set(prev);
                                                            updated.delete(user.id);
                                                            return updated;
                                                        });
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
                </>
            ) : (
                <CustomDataGrid<User & { row_number: number }>
                    ref={gridRef}
                    data={filteredUsersWithRowNumber}
                    columns={columns}
                    pageSize={10}
                    pagination={true}
                    inputFilter={false}
                    theme={'sm'}
                    // Update onRowDoubleClick to set both selectedUser and selectedUserId
                    rowSelection={rowSelection}
                    onRowDoubleClick={handleRowDoubleClick}
                    onRowSelected={handleRowSelected}
                    // Pass selectedRowKeys and setSelectedRowKeys to sync selection
                    selectedRowKeys={selectedRowKeys}
                    setSelectedRowKeys={setSelectedRowKeys}
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
                                            className="min-w-[120px] border-amber-600 hover:bg-amber-300"
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
                                            A new password will be generated and sent to the user's email. This action cannot be undone.<br />
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
                                {/* Change Roles Dialog */}
                                <AlertDialog open={showRoleDropdown} onOpenChange={setShowRoleDropdown}>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="min-w-[120px] border-sky-600 hover:bg-sky-300"
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
                                            className="min-w-[120px] border-sky-600 hover:bg-sky-300"
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
                            </div>
                            {/* Search and user list */}
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    className="form-input flex-grow"
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
            {/* Confirmation Modal for all actions */}
            {modalOpen && (
                <AlertDialog open={!!modalOpen} onOpenChange={open => { if (!open) setModalOpen(null); }}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {modalOpen === 'reset' ? 'Confirm Password Reset' :
                                    modalOpen === 'approve' ? 'Confirm User Approval' :
                                        modalOpen === 'role' ? 'Confirm Role Change' :
                                            modalOpen === 'group' ? 'Confirm Group Change' : ''}
                            </AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogDescription>
                            {modalOpen === 'reset' && (
                                <>
                                    <div className="text-sm mb-4">A new password will be generated and sent to the user's email. This action cannot be undone.<br />Are you sure you want to reset the password for the selected user(s)?</div>
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
            {/* Invite User Dialog */}
            <Dialog open={showInviteDialog} onOpenChange={open => {
                setShowInviteDialog(open);
                if (!open) {
                    setInviteForm({ fullname: '', email: '', contact: '', user_type: 1 });
                    setInviteError(null);
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite New User</DialogTitle>
                        <DialogDescription>Fill in the details below:</DialogDescription>
                        {inviteError && <div className="text-xs text-red-600">{inviteError}</div>}
                    </DialogHeader>
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            handleInviteUser();
                        }}
                        className="flex flex-col gap-3"
                    >
                        <div>
                            <label className="block text-sm font-medium mb-1">User Type</label>
                            <Select
                                value={String(inviteForm.user_type)}
                                onValueChange={val => setInviteForm(f => ({ ...f, user_type: Number(val) }))}
                                required
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select user type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Employee</SelectItem>
                                    <SelectItem value="2">Non-employee</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Full Name</label>
                            <Input
                                type="text"
                                value={inviteForm.fullname}
                                onChange={e => setInviteForm(f => ({ ...f, fullname: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <Input
                                type="email"
                                value={inviteForm.email}
                                onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Contact</label>
                            <Input
                                type="text"
                                value={inviteForm.contact}
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setInviteForm(f => ({ ...f, contact: val }));
                                }}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose>
                                <Button variant="outline" onClick={() => setShowInviteDialog(false)} className="mt-4">
                                    Close
                                </Button>
                            </DialogClose>
                            <Button type="submit" className="mt-4" variant="default" disabled={inviteLoading}>{inviteLoading ? 'Inviting...' : 'Invite'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};


export default UserManagement;