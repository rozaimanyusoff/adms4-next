import React, { useEffect, useState, useMemo } from "react";
import ActionSidebar from "@components/ui/action-aside";
import { authenticatedApi } from "@/config/api";
import { Plus, PlusCircle, Trash2, MinusCircle } from "lucide-react";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Checkbox } from "@components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface FRoleFormProps {
    role: any;
    setRole: (role: any) => void;
    onSaved: () => void;
    formName: string;
    setFormName: (v: string) => void;
    formDesc: string;
    setFormDesc: (v: string) => void;
    formPerms: { view: boolean; create: boolean; update: boolean; delete: boolean };
    setFormPerms: (v: any) => void;
    formUsers: number[];
    setFormUsers: (v: number[]) => void;
    saving: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    assignSidebarOpen: boolean;
    setAssignSidebarOpen: (v: boolean) => void;
    allUsers: any[];
    setAllUsers: (v: any[]) => void;
    userSearch: string;
    setUserSearch: (v: string) => void;
    onAssignUsers: () => void;
    onRemoveUser: (userId: number) => void;
    userListRef: React.MutableRefObject<{ [key: number]: HTMLLIElement | null }>;
    newlyAssignedUserIds: number[];
}

const FRoleForm: React.FC<FRoleFormProps> = ({
    role,
    setRole,
    onSaved,
    formName,
    setFormName,
    formDesc,
    setFormDesc,
    formPerms,
    setFormPerms,
    formUsers,
    setFormUsers,
    saving,
    onSubmit,
    onCancel,
    assignSidebarOpen,
    setAssignSidebarOpen,
    allUsers,
    setAllUsers,
    userSearch,
    setUserSearch,
    onAssignUsers,
    onRemoveUser,
    userListRef,
    newlyAssignedUserIds,
}) => {
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Fetch users when assignSidebarOpen is true
    useEffect(() => {
        if (assignSidebarOpen) {
            setLoadingUsers(true);
            authenticatedApi.get("/api/users").then(res => {
                const users = (res.data as any)?.data || [];
                setAllUsers(users);
                console.log('Fetched users for assignment:', users); // Debug log
                setLoadingUsers(false);
            }).catch(() => setLoadingUsers(false));
        }
    }, [assignSidebarOpen, setAllUsers]);

    // Filter available users (not already assigned)
    const availableUsers = useMemo(() => {
        return allUsers.filter(u =>
            !formUsers.includes(u.id) &&
            (!userSearch ||
                (u.username && u.username.toLowerCase().includes(userSearch.toLowerCase())) ||
                (u.fname && u.fname.toLowerCase().includes(userSearch.toLowerCase())) ||
                (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
            )
        );
    }, [allUsers, formUsers, userSearch]);

    // Handler to assign user
    const handleAssignUser = (user: any) => {
        setFormUsers([...formUsers, user.id]);
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded shadow max-w-3xl mx-auto p-4">
            <h1 className="text-xl font-bold mb-4 text-center">Role Assignment Form</h1>
            <form
                onSubmit={e => {
                    e.preventDefault();
                    setShowConfirmDialog(true);
                }}
                className="space-y-4"
            >
                <div>
                    <label className="block text-sm font-medium mb-1">Role Name</label>
                    <Input className="w-full" placeholder="Enter the new role" value={formName} onChange={e => setFormName(e.target.value)} required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <Input className="w-full" placeholder="Provide role descriptions" value={formDesc} onChange={e => setFormDesc(e.target.value)} />
                </div>
                <div className="flex flex-row gap-4 py-3">
                    <label className="block text-sm font-medium">Permissions</label>
                    <div className="flex flex-row gap-x-6 gap-y-2 items-center">
                        {Object.entries(formPerms).map(([perm, val]) => (
                            <label key={perm} className="inline-flex items-center gap-1 text-xs font-medium">
                                <Checkbox
                                    checked={val}
                                    className="h-5 w-5"
                                    onCheckedChange={checked => setFormPerms((p: any) => ({ ...p, [perm]: checked }))}
                                />
                                {perm.charAt(0).toUpperCase() + perm.slice(1)}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="w-full border dark:border-gray-700 rounded-sm p-3 shrink-0 min-w-0 max-w-full bg-gray-50 dark:bg-gray-800 mb-4 lg:mb-0">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold underline underline-offset-4">Assigned Users</span>
                        <Button
                            type="button"
                            size={'sm'}
                            variant={"default"}
                            onClick={onAssignUsers}
                        >
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>
                    {role.users && role.users.length > 0 ? (
                        <ul className="divide-y divide-gray-200 dark:divide-gray-600 mt-2">
                            {role.users.map((user: any) => (
                                <li
                                    key={user.id}
                                    ref={el => { userListRef.current[user.id] = el; }}
                                    className={`flex items-center justify-between py-1.5 px-2 text-sm ${newlyAssignedUserIds.includes(user.id) ? "bg-green-100" : ""}`}
                                >
                                    <span className="flex flex-col">
                                        <span className="capitalize">{user.username} - {user.fname || user.name}</span>
                                        <span className="font-semibold text-xs">Current Role: <span className="text-red-600 font-bold">{user.role && user.role.name ? user.role.name : '-'}</span></span>
                                    </span>
                                    <MinusCircle className="text-red-500 w-6 h-6 cursor-pointer ml-2" onClick={() => onRemoveUser(user.id)} />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-gray-500 italic text-sm">No users</div>
                    )}
                </div>
                <div className="flex gap-2 justify-center mt-4">
                    <Button type="button" variant={'destructive'} onClick={onCancel}>Cancel</Button>
                    <Button
                        type="submit"
                        className={
                            role && role.id
                                ? "btn bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-700 dark:text-white shadow-none border-none"
                                : "btn bg-green-600 hover:bg-green-600 text-white dark:bg-green-700 shadow-none border-none"
                        }
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : (role && role.id ? 'Update' : 'Create')}
                    </Button>
                </div>
            </form>
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Role Assignment</AlertDialogTitle>
                        <AlertDialogDescription>
                            Assigning users to this role will immediately change their current role to <span className="font-bold text-blue-600">{formName}</span>.<br />
                            Are you sure you want to proceed?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                variant="default"
                                onClick={() => {
                                    setShowConfirmDialog(false);
                                    onSubmit(new Event('submit') as any);
                                }}
                            >
                                Confirm
                            </Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {assignSidebarOpen && (
                <ActionSidebar
                    title="Assign Users"
                    onClose={() => setAssignSidebarOpen(false)}
                    size="sm"
                    content={
                        <>
                            <Input className="w-full mb-2" placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                            {loadingUsers ? <div>Loading...</div> : (
                                <ul className="mt-1 text-sm overflow-y-auto divide-y">
                                    {availableUsers.map(user => (
                                        <li key={user.id}className="flex flex-col gap-1 px-3 py-1.5 mb-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex flex-col">
                                                    <span className="capitalize font-semibold text-base text-gray-800 dark:text-gray-100">{user.fname}</span>
                                                    <span className="font-semibold text-xs dark:text-gray-400">Username: <span>{user.username}</span></span>
                                                    <span className="font-semibold text-xs">Role: <span>{user.role && user.role.name ? user.role.name : '-'}</span></span>
                                                    <span className="font-semibold text-xs">Groups: <span>{user.usergroups && user.usergroups.length > 0 ? user.usergroups.map((g: any) => g.name).join(', ') : '-'}</span></span>
                                                </div>
                                                <PlusCircle
                                                    className="w-6 h-6 text-green-600"
                                                    onClick={() => handleAssignUser(user)}
                                                    style={{ display: user.role && user.role.id === 1 ? 'none' : undefined }}
                                                />
                                            </div>
                                        </li>
                                    ))}
                                    {availableUsers.length === 0 && <li className="text-gray-400 italic">No users found</li>}
                                </ul>
                            )}
                        </>
                    }
                />
            )}
        </div>
    );
};

export default FRoleForm;
