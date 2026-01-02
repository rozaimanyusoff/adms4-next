import React, { useRef, useEffect, useState, useMemo } from "react";
import { Plus, PlusCircle, Trash2, MinusCircle } from "lucide-react";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Checkbox } from "@components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import NavTreeView from "@components/ui/NavTreeView";
import { authenticatedApi } from "@/config/api";
import { Textarea } from "@components/ui/textarea";

interface FGroupFormProps {
	group: any;
	setGroup: (g: any | null) => void;
	onSaved: () => void;
	setToast?: (t: { type: "success" | "error"; message: string } | null) => void;
	editName: string;
	setEditName: (v: string) => void;
	editDesc: string;
	setEditDesc: (v: string) => void;
	editStatus: number;
	setEditStatus: (v: number) => void;
	onSubmit: (e: React.FormEvent) => void;
	onCancel: () => void;
	onAssignUsers: () => void;
	onAssignNav: () => void;
	onRemoveUser: (userId: number) => void;
	onRemoveNav: (navId: number) => void;
	newlyAssignedUserIds: number[];
	newlyAssignedNavIds: number[];
	assignedUserError?: boolean;
}

const FGroupForm: React.FC<FGroupFormProps> = ({
	group,
	setGroup,
	onSaved,
	setToast,
	editName,
	setEditName,
	editDesc,
	setEditDesc,
	editStatus,
	setEditStatus,
	onSubmit,
	onCancel,
	onAssignUsers,
	onAssignNav,
	onRemoveUser,
	onRemoveNav,
	newlyAssignedUserIds,
	newlyAssignedNavIds,
	assignedUserError = false,
}) => {
	const userListRef = useRef<{ [key: number]: HTMLLIElement | null }>({});
	const navListRef = useRef<{ [key: number]: HTMLLIElement | null }>({});
	const [navTreeStructure, setNavTreeStructure] = useState<any[]>([]);
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);
	const [assignedUserSearch, setAssignedUserSearch] = useState("");
	const navLookup = useMemo(() => {
		const idToNode = new Map<string, any>();
		const parentMap = new Map<string, string | null>();
		const walk = (nodes: any[], parentId: string | null) => {
			for (const n of nodes || []) {
				const id = String(n.navId);
				idToNode.set(id, n);
				parentMap.set(id, parentId);
				if (n.children && n.children.length > 0) {
					walk(n.children, id);
				}
			}
		};
		walk(navTreeStructure, null);
		return { idToNode, parentMap };
	}, [navTreeStructure]);
	const getDescendants = React.useCallback((id: string): Set<string> => {
		const result = new Set<string>();
		const node = navLookup.idToNode.get(String(id));
		const walk = (nodes: any[]) => {
			for (const child of nodes || []) {
				result.add(String(child.navId));
				if (child.children && child.children.length > 0) {
					walk(child.children);
				}
			}
		};
		if (node?.children) {
			walk(node.children);
		}
		return result;
	}, [navLookup.idToNode]);
	const hasSelectedDescendants = React.useCallback((id: string, selectedIds: Set<string>) => {
		const desc = getDescendants(id);
		for (const d of desc) {
			if (selectedIds.has(d)) return true;
		}
		return false;
	}, [getDescendants]);

	useEffect(() => {
		// Fetch navigation structure from /api/nav and extract navTree
		authenticatedApi.get("/api/admin/nav").then(res => {
			const data = res.data as any;
			if (data && data.navTree) {
				setNavTreeStructure(data.navTree as any[]);
			} else {
				setNavTreeStructure([]);
			}
		}).catch(() => {
			setNavTreeStructure([]);
		});
	}, []);

	const filteredAssignedUsers = useMemo(() => {
		if (!group.users) return [];
		const term = assignedUserSearch.trim().toLowerCase();
		if (!term) return group.users;
		return group.users.filter((user: any) =>
			(user.username || "").toLowerCase().includes(term) ||
			(user.fname || user.name || "").toLowerCase().includes(term)
		);
	}, [assignedUserSearch, group.users]);

	return (
		<div className="bg-white dark:bg-gray-900 p-4 rounded shadow mx-auto">
			<h2 className="text-xl font-bold mb-4 text-center">{group.id ? `Group ${group.name} Update` : 'Group Assignment'} Form</h2>
			<form
				onSubmit={e => {
					e.preventDefault();
					if (!group.users || group.users.length === 0) {
						onSubmit(e);
						return;
					}
					setShowConfirmDialog(true);
				}}
				className="space-y-4"
			>
				<div className="flex flex-col md:flex-row gap-4 items-center">
					<div className="flex-1 w-full">
						<label className="block text-sm font-medium mb-1">Name</label>
						<Input className="w-full" value={editName} onChange={e => setEditName(e.target.value)} />
					</div>
					<div className="w-full md:w-40">
						<label className="block text-sm font-medium mb-1">Status</label>
						<Select value={String(editStatus)} onValueChange={val => setEditStatus(Number(val))}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="1">Active</SelectItem>
								<SelectItem value="2">Disabled</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<div>
					<label className="block text-sm font-medium mb-1">Description</label>
					<Textarea className="w-full min-h-20" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
				</div>
				<div className="flex flex-col lg:flex-row gap-4 w-full text-sm">
					{/* Assigned Users */}
					<div className={`w-full lg:w-1/2 border rounded-sm p-3 shrink-0 min-w-0 max-w-full lg:min-w-65 lg:max-w-85 bg-gray-50 dark:bg-gray-800 mb-4 lg:mb-0 ${assignedUserError ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}>
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
						<div className="flex items-center gap-2 mb-2">
							<Input
								placeholder="Search assigned users..."
								value={assignedUserSearch}
								onChange={e => setAssignedUserSearch(e.target.value)}
								className="w-full h-9"
							/>
						</div>
						{assignedUserError && (!group.users || group.users.length === 0) && (
							<div className="text-xs text-red-600 mb-2">Please assign at least one user before saving.</div>
						)}
						{group.users && group.users.length > 0 ? (
							<ul className="divide-y divide-gray-200 dark:divide-gray-600 mt-2">
								{filteredAssignedUsers.map((user: any) => (
									<li
										key={user.id}
										ref={el => { userListRef.current[user.id] = el; }}
										className={`flex items-center justify-between py-1.5 text-sm ${newlyAssignedUserIds.includes(user.id) ? "bg-green-100" : ""}`}
									>
										<span className="flex flex-col">
											<span className="capitalize">{user.username} - {user.fname || user.name}</span>
											<span className="font-semibold text-xs">Current Groups: <span>{user.usergroups && user.usergroups.length > 0 ? user.usergroups.map((g: any) => g.name).join(', ') : '-'}</span></span>
										</span>
										<MinusCircle className="text-red-600 w-6 h-6 cursor-pointer ml-2" onClick={() => onRemoveUser(user.id)} />
									</li>
								))}
								{filteredAssignedUsers.length === 0 && (
									<li className="py-2 text-xs text-gray-500 italic">No users match this search.</li>
								)}
							</ul>
						) : (
							<div className="text-gray-500 italic text-sm">No users</div>
						)}
					</div>
					{/* Navigation Structure Assignment (with label and assign button) */}
					<div className="flex-1 w-full lg:w-1/2 dark:border-gray-700 rounded-sm min-w-0 max-w-full bg-gray-50 dark:bg-gray-800">
						{navTreeStructure && navTreeStructure.length > 0 ? (
							<NavTreeView
								tree={navTreeStructure}
								className="mt-0"
								checkedNavIds={(() => {
									const assignedIds = new Set((group.navTree || []).map((n: any) => String(n.navId)));
									const checked: string[] = [];
									const collectChecked = (nodes: any[]) => {
										for (const n of nodes) {
											if (assignedIds.has(String(n.navId))) checked.push(String(n.navId));
											if (n.children && n.children.length > 0) collectChecked(n.children);
										}
									};
									collectChecked(navTreeStructure);
									return checked;
								})()}
								onToggleNav={(navId, checked) => {
									let updatedNavs = group.navTree ? [...group.navTree] : [];
									const ensureNav = (id: string) => {
										const navNode = navLookup.idToNode.get(String(id));
										if (!navNode) return;
										if (!updatedNavs.some((n: any) => String(n.navId) === String(id))) {
											updatedNavs.push({ navId: navNode.navId, title: navNode.title, path: navNode.path });
										}
									};
									if (checked) {
										const descendants = Array.from(getDescendants(navId));
										ensureNav(navId);
										descendants.forEach(d => ensureNav(d));
										let parent = navLookup.parentMap.get(String(navId));
										while (parent) {
											ensureNav(parent);
											parent = navLookup.parentMap.get(String(parent));
										}
									} else {
										const toRemove = new Set<string>([String(navId), ...Array.from(getDescendants(navId))]);
										updatedNavs = updatedNavs.filter((n: any) => !toRemove.has(String(n.navId)));
										let parent = navLookup.parentMap.get(String(navId));
										const selectedIds = new Set(updatedNavs.map((n: any) => String(n.navId)));
										while (parent) {
											if (!hasSelectedDescendants(parent, selectedIds)) {
												updatedNavs = updatedNavs.filter((n: any) => String(n.navId) !== String(parent));
												selectedIds.delete(String(parent));
												parent = navLookup.parentMap.get(String(parent));
											} else {
												parent = null;
											}
										}
									}
									setGroup({ ...group, navTree: updatedNavs });
								}}
							/>
						) : (
							<div className="text-gray-500 italic text-sm">No navigation data</div>
						)}
					</div>
				</div>
				<div className="flex items-center justify-center sm:flex-row gap-2 mt-4">
					<Button variant={'outline'} onClick={onCancel}>
						Cancel
					</Button>
					<Button variant={'default'} >
						Save
					</Button>
				</div>
			</form>
			<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm Group Changes</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to save these group changes? This will update the group details and assignments.
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
		</div>
	);
};

export default FGroupForm;
