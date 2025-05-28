import React, { useEffect, useState, useMemo, useRef } from "react";
import { CustomDataGrid, ColumnDef, DataGridProps } from "@/components/ui/DataGrid";
import ActionSidebar from "@components/layouts/ui/ActionSidebar";
import { authenticatedApi } from "@/config/api";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle, faChevronDown, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import Modal from "@components/layouts/ui/modal";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { toast } from "sonner";
import { format, formatDistanceToNow, formatDistance, isToday, isFuture, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

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
    const [modalOpen, setModalOpen] = useState<null | 'reset' | 'suspend' | 'role' | 'group'>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [toastState, setToastState] = useState<{ open: boolean, message: string, color: string } | null>(null);
    const [selectedUsersSearch, setSelectedUsersSearch] = useState("");

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await authenticatedApi.get<UsersApiResponse>("/api/users");
                if (response.data.status === "success") {
                    setUsers(response.data.data);
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
                if (data && data.roles) setAllRoles(data.roles);
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

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return sortedUsers;

        return sortedUsers.filter((user) =>
            Object.values(user).some((value) =>
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [sortedUsers, searchTerm]);

    const handleSort = (key: keyof User) => {
        setSortConfig((prevConfig) => {
            if (prevConfig?.key === key && prevConfig.direction === "asc") {
                return { key, direction: "desc" };
            }
            return { key, direction: "asc" };
        });
    };

    const columns: ColumnDef<User>[] = [
        { key: "id", header: "ID", sortable: true, },
        { key: "username", header: "Username", sortable: true, filter: "input", colClass: 'capitalize' },
        { key: "email", header: "Email", sortable: true, filter: "input" },
        { key: "fname", header: "Full Name", sortable: true, filter: "input" },
        { key: "contact", header: "Contact", sortable: true, filter: "input" },
        {
            key: "role",
            header: "Role",
            sortable: true,
            render: (row) => row.role && typeof row.role === 'object' ? row.role.name : '-',
        },
        {
            key: "usergroups",
            header: "Groups",
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
            render: (row) => (row.user_type === 1 ? "Admin" : "User"),
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

    // Utility function to format time spent in hours and minutes
    function formatTimeSpent(minutes: number) {
        if (!minutes || isNaN(minutes) || minutes <= 0) return '-';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h > 0 ? h + 'h ' : ''}${m}m`;
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

    useEffect(() => {
        if (selectedUserId !== null) {
            // no-op for now
        }
    }, [selectedUserId]);

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

    // Replace Toast.success/error with function calls
    // Defensive check for API response success
    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        if (type === 'success') toast.success(msg);
        else toast.error(msg);
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

    const handleResetPassword = async () => {
        setModalLoading(true);
        setModalError(null);
        try {
            const res = await authenticatedApi.post('/api/users/reset-password', {
                user_ids: selectedUsers.map(u => u.id)
            });
            const data = res.data as any;
            const results = Array.isArray(data?.results) ? data.results : [];
            const message = typeof data?.message === 'string' ? data.message : '';
            setShowPasswordDropdown(false);
            setModalOpen(null); // Dismiss modal immediately
            if (results.length > 0) {
                showToast(message || 'Password(s) reset and sent to user email.', 'success');
                clearUserSelection();
            } else {
                showToast(message || 'Failed to reset password(s).', 'error');
            }
        } catch (err) {
            setModalError('Failed to reset password(s).');
            setShowPasswordDropdown(false);
            setModalOpen(null);
            showToast('Failed to reset password(s).', 'error');
        } finally {
            setModalLoading(false);
        }
    };

    const handleSuspendActivate = async () => {
        setModalLoading(true);
        setModalError(null);
        try {
            const res = await authenticatedApi.post('/api/users/suspend', {
                user_ids: selectedUsers.map(u => u.id),
                status: suspendAction === 'activate' ? 1 : 2
            });
            const data = res.data as any;
            setShowSuspendDropdown(false);
            setModalOpen(null);
            if (data?.status === 'success') {
                showToast('User status updated.', 'success');
                clearUserSelection();
            } else {
                showToast('Failed to update user status.', 'error');
            }
        } catch (err) {
            setModalError('Failed to update user status.');
            setShowSuspendDropdown(false);
            setModalOpen(null);
            showToast('Failed to update user status.', 'error');
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
            if (data?.status === 'success') {
                showToast('User role(s) updated.', 'success');
                clearUserSelection();
            } else {
                showToast('Failed to update user role(s).', 'error');
            }
        } catch (err) {
            setModalError('Failed to update user role(s).');
            setShowRoleDropdown(false);
            setModalOpen(null);
            showToast('Failed to update user role(s).', 'error');
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
            if (data?.status === 'success') {
                showToast('User group(s) updated.', 'success');
                clearUserSelection();
            } else {
                showToast('Failed to update user group(s).', 'error');
            }
        } catch (err) {
            setModalError('Failed to update user group(s).');
            setShowGroupDropdown(false);
            setModalOpen(null);
            showToast('Failed to update user group(s).', 'error');
        } finally {
            setModalLoading(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-lg font-bold">User Management</h1>
                <button
                    className="btn bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-3 py-1 rounded-full border-none shadow-none"
                    type="button"
                    onClick={() => {/* TODO: handle invite user */ }}
                >
                    <FontAwesomeIcon icon={faPlusCircle} className="mr-1" size="xl" />
                    Invite
                </button>
            </div>
            <CustomDataGrid
                ref={gridRef}
                data={filteredUsers}
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
            {showSidebar && selectedUsers.length > 0 && (
                <ActionSidebar
                    title="User Maintenance"
                    content={
                        <div className="flex flex-row gap-4">
                            {/* Left column: action buttons */}
                            <div className="flex flex-col gap-2 min-w-[180px] pr-2 border-r border-gray-200 dark:border-gray-700 relative">
                                <div className="font-semibold text-xs mb-2 text-gray-700 dark:text-gray-200">Select Actions</div>
                                {/* Reset Password button and dropdown */}
                                <div className="relative">
                                    <button
                                        className="btn btn-sm bg-amber-500 hover:bg-amber-600 hover:text-white border-0 w-full mb-1"
                                        onClick={() => setShowPasswordDropdown(v => !v)}
                                        type="button"
                                    >
                                        Reset Password
                                    </button>
                                    {showPasswordDropdown && (
                                        <div className="absolute left-0 top-0 z-20 mt-0 w-56 bg-amber-200 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-sm shadow-lg p-4 overflow-y-auto">
                                            <div className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-200">Reset Password</div>
                                            <div className="text-sm text-red-600 rounded-sm p-1 mb-2">
                                                A new password will be generated and sent to the user's email. This action cannot be undone.<br />
                                                Are you sure you want to reset the password for the selected user(s)?
                                            </div>
                                            <div className="flex justify-center mt-2 gap-2">
                                                <button className="btn py-2 px-4 bg-slate-500 text-white border-0 rounded-full" onClick={() => setShowPasswordDropdown(false)} type="button">Close</button>
                                                <button className="btn py-2 px-4 bg-blue-500 text-white border-0 rounded-full" onClick={() => { setShowPasswordDropdown(false); setModalOpen('reset'); }} type="button">Apply</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Suspend/Activate button and dropdown */}
                                <div className="relative">
                                    <button
                                        className="btn btn-sm bg-amber-500 hover:bg-amber-600 hover:text-white border-0 w-full mb-1"
                                        onClick={() => setShowSuspendDropdown(v => !v)}
                                        type="button"
                                    >
                                        Suspend / Activate
                                    </button>
                                    {showSuspendDropdown && (
                                        <div className="absolute left-0 top-0 z-20 mt-0 w-56 bg-stone-200 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-sm shadow-lg p-4 max-h-64 overflow-y-auto">
                                            <div className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-200">Select Action</div>
                                            <ul>
                                                <li className="flex items-center gap-2 py-1">
                                                    <input
                                                        type="radio"
                                                        name="suspend-action"
                                                        checked={suspendAction === "suspend"}
                                                        onChange={() => setSuspendAction("suspend")}
                                                        className="form-radio border-slate-400 dark:border-slate-600"
                                                    />
                                                    <span className="text-xs">Suspend</span>
                                                </li>
                                                <li className="flex items-center gap-2 py-1">
                                                    <input
                                                        type="radio"
                                                        name="suspend-action"
                                                        checked={suspendAction === "activate"}
                                                        onChange={() => setSuspendAction("activate")}
                                                        className="form-radio border-slate-400 dark:border-slate-600"
                                                    />
                                                    <span className="text-xs">Activate</span>
                                                </li>
                                            </ul>
                                            <div className="flex justify-center mt-2 gap-2">
                                                <button className="btn py-2 px-4 bg-slate-500 text-white border-0 rounded-full" onClick={() => setShowSuspendDropdown(false)} type="button">Close</button>
                                                <button className="btn py-2 px-4 bg-blue-500 text-white border-0 rounded-full" onClick={() => { setShowSuspendDropdown(false); setModalOpen('suspend'); }} type="button">Apply</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <button
                                        className="btn btn-sm bg-gray-300 hover:bg-gray-400 hover:text-white border-0 w-full flex items-center justify-between mb-1"
                                        onClick={() => setShowRoleDropdown(v => !v)}
                                        type="button"
                                    >
                                        Change Roles
                                        <FontAwesomeIcon icon={faChevronDown} className="ml-2" />
                                    </button>
                                    {showRoleDropdown && (
                                        <div className="absolute left-0 top-0 z-20 mt-0 w-56 bg-stone-200 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-sm shadow-lg p-2 overflow-y-auto">
                                            <div className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-200">Select Role</div>
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
                                            <div className="flex justify-center mt-2 gap-2">
                                                <button className="btn py-2 px-4 bg-slate-500 text-white border-0 rounded-full" onClick={() => setShowRoleDropdown(false)} type="button">Close</button>
                                                <button className="btn py-2 px-4 bg-blue-500 text-white border-0 rounded-full" onClick={() => { setShowRoleDropdown(false); setModalOpen('role'); }} type="button">Apply</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <button
                                        className="btn btn-sm bg-gray-300 hover:bg-gray-400 hover:text-white border-0 w-full flex items-center justify-between"
                                        onClick={() => setShowGroupDropdown(v => !v)}
                                        type="button"
                                    >
                                        Change Groups
                                        <FontAwesomeIcon icon={faChevronDown} className="ml-2" />
                                    </button>
                                    {showGroupDropdown && (
                                        <div className="absolute left-0 top-0 z-20 mt-0 w-56 bg-stone-200 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-sm shadow-lg p-2 overflow-y-auto">
                                            <div className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-200">Select Groups</div>
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
                                            <div className="flex justify-center mt-2 gap-2">
                                                <button className="btn py-2 px-4 bg-slate-500 text-white border-0 rounded-full" onClick={() => setShowGroupDropdown(false)} type="button">Close</button>
                                                <button className="btn py-2 px-4 bg-blue-500 text-white border-0 rounded-full" onClick={() => { setShowGroupDropdown(false); setModalOpen('group'); }} type="button">Apply</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Right column: search + user list */}
                            <div className="flex-1 min-w-[220px]">
                                <div className="font-semibold text-xs mb-2 text-gray-700 dark:text-gray-200">Selected Users</div>
                                <div className="flex items-center gap-2 mb-2">
                                    <input
                                        className="form-input flex-grow"
                                        placeholder="Search selected users..."
                                        value={selectedUsersSearch}
                                        onChange={e => setSelectedUsersSearch(e.target.value)}
                                    />
                                    <button
                                        className="px-4 py-2.5 shadow-none border-0 bg-red-600 hover:bg-red-700 text-white rounded-sm flex items-center gap-1"
                                        onClick={() => clearUserSelection(true)}
                                        type="button"
                                    >
                                        <FontAwesomeIcon icon={faTrashAlt} />
                                    </button>
                                </div>
                                <ul className="mt-2 text-sm max-h-72 overflow-y-auto divide-y">
                                    {selectedUsers
                                        .filter(user =>
                                            !selectedUsersSearch ||
                                            user.fname.toLowerCase().includes(selectedUsersSearch.toLowerCase()) ||
                                            user.username.toLowerCase().includes(selectedUsersSearch.toLowerCase())
                                        )
                                        .map((user) => (
                                            <li className="flex items-center capitalize justify-between px-2 py-2" key={user.id}>
                                                <span>{user.fname} <span className="text-xs text-gray-400 ml-1">({user.username})</span></span>
                                                <FontAwesomeIcon icon={faMinusCircle} className="text-red-500 text-lg cursor-pointer ml-2" onClick={() => handleDelistUser(user.id)} />
                                            </li>
                                        ))}
                                    {selectedUsers.length === 0 && <li className="text-gray-400 italic">No users selected</li>}
                                </ul>
                            </div>
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
                                    modalOpen === 'suspend' ? 'Confirm Status Change' :
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
                            {modalOpen === 'suspend' && (
                                <>
                                    <div className="text-sm mb-4">Are you sure you want to {suspendAction === 'activate' ? 'activate' : 'suspend'} the selected user(s)?</div>
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
                                        if (modalOpen === 'suspend') handleSuspendActivate();
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
        </div>
    );
};


export default UserManagement;