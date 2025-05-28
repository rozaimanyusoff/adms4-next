import React, { useEffect, useState, useMemo } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import ActionSidebar from "@components/layouts/ui/ActionSidebar";
import { authenticatedApi } from "@/config/api";

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

    // Fetch users when assignSidebarOpen is true
    useEffect(() => {
        if (assignSidebarOpen) {
            setLoadingUsers(true);
            authenticatedApi.get("/api/users").then(res => {
                const data = res.data as any;
                setAllUsers(data.data || []);
                setLoadingUsers(false);
            }).catch(() => setLoadingUsers(false));
        }
    }, [assignSidebarOpen, setAllUsers]);

    // Filter available users (not already assigned)
    const availableUsers = useMemo(() => {
        return allUsers.filter(u => !formUsers.includes(u.id) && (!userSearch || (u.username?.toLowerCase().includes(userSearch.toLowerCase()) || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.fname?.toLowerCase().includes(userSearch.toLowerCase()))));
    }, [allUsers, formUsers, userSearch]);

    // Handler to assign user
    const handleAssignUser = (user: any) => {
        setFormUsers([...formUsers, user.id]);
    };

    return (
        <>
            <form onSubmit={onSubmit} className="space-y-4 p-2">
                <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input className="form-input w-full" value={formName} onChange={e => setFormName(e.target.value)} required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input className="form-input w-full" value={formDesc} onChange={e => setFormDesc(e.target.value)} />
                </div>
                <div className="flex flex-row gap-4 py-3">
                    <label className="block text-sm font-medium">Permissions</label>
                    <div className="flex flex-row gap-x-6 gap-y-2 items-center">
                        {Object.entries(formPerms).map(([perm, val]) => (
                            <label key={perm} className="inline-flex items-center gap-1 text-xs font-medium">
                                <input
                                    type="checkbox"
                                    className="form-checkbox"
                                    checked={val}
                                    onChange={e => setFormPerms((p: any) => ({ ...p, [perm]: e.target.checked }))}
                                />
                                {perm.charAt(0).toUpperCase() + perm.slice(1)}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="w-full border dark:border-gray-700 rounded-sm p-3 shrink-0 min-w-0 max-w-full bg-gray-50 dark:bg-gray-800 mb-4 lg:mb-0">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold underline underline-offset-4">Assigned Users</span>
                        <button
                            type="button"
                            className="px-2 py-1 text-sm rounded-full hover:bg-green-100 hover:shadow-sm transition flex items-center gap-1"
                            onClick={onAssignUsers}
                        >
                            <FontAwesomeIcon icon={faPlusCircle} className="text-green-600 text-lg" /> Assign Users
                        </button>
                    </div>
                    {role.users && role.users.length > 0 ? (
                        <ul className="divide-y divide-gray-200 dark:divide-gray-600">
                            {role.users.map((user: any) => (
                                <li
                                    key={user.id}
                                    ref={el => { userListRef.current[user.id] = el; }}
                                    className={`flex items-center justify-between py-1.5 text-sm ${newlyAssignedUserIds.includes(user.id) ? "bg-green-100" : ""}`}
                                >
                                    <span>
                                        {user.username} - <span className="capitalize">{user.fname || user.name}</span>
                                    </span>
                                    <FontAwesomeIcon icon={faMinusCircle} className="text-red-500 text-lg cursor-pointer ml-2" onClick={() => onRemoveUser(user.id)} />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-gray-500 italic text-sm">No users</div>
                    )}
                </div>
                <div className="flex gap-2 justify-center mt-4">
                    <button type="button" className="btn bg-slate-400 hover:bg-slate-500 dark:bg-slate-600 text-white rounded-full shadow-none border-none" onClick={onCancel}>Cancel</button>
                    <button
                        type="submit"
                        className={
                            role && role.id
                                ? "btn bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-700 dark:text-white rounded-full shadow-none border-none"
                                : "btn bg-green-600 hover:bg-green-600 text-white dark:bg-green-700 rounded-full shadow-none border-none"
                        }
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : (role && role.id ? 'Update' : 'Create')}
                    </button>
                </div>
            </form>
            {assignSidebarOpen && (
                <ActionSidebar
                    title="Assign Users"
                    onClose={() => setAssignSidebarOpen(false)}
                    size="md"
                    content={
                        <>
                            <input className="form-input w-full mb-2" placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                            {loadingUsers ? <div>Loading...</div> : (
                                <ul>
                                    {availableUsers.map(user => (
                                        <li key={user.id} className="flex items-center justify-between py-1.5 border-b">
                                            <span>{user.username} - <span className="capitalize">{user.fname || user.name}</span></span>
                                            <button className="text-green-600 hover:bg-green-100 rounded-full p-1" onClick={() => handleAssignUser(user)}><FontAwesomeIcon icon={faPlusCircle} size="lg" /></button>
                                        </li>
                                    ))}
                                    {availableUsers.length === 0 && <li className="text-gray-400 italic">No users found</li>}
                                </ul>
                            )}
                        </>
                    }
                />
            )}
        </>
    );
};

export default FRoleForm;
