import React, { useRef, useEffect, useState } from "react";
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
}) => {
	const userListRef = useRef<{ [key: number]: HTMLLIElement | null }>({});
	const navListRef = useRef<{ [key: number]: HTMLLIElement | null }>({});
	const [navTreeStructure, setNavTreeStructure] = useState<any[]>([]);
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);

	useEffect(() => {
		// Fetch navigation structure from /api/nav and extract navTree
		authenticatedApi.get("/api/nav").then(res => {
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

	return (
		<div className="bg-white dark:bg-gray-900 p-4 rounded shadow mx-auto">
			<h2 className="text-xl font-bold mb-4 text-center">{group.id ? `Group ${group.name} Update` : 'Group Assignment'} Form</h2>
			<form
				onSubmit={e => {
					e.preventDefault();
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
					<Textarea className="w-full min-h-[80px]" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
				</div>
				<div className="flex flex-col lg:flex-row gap-4 w-full text-sm">
					{/* Assigned Users */}
					<div className="w-full lg:w-1/2 border dark:border-gray-700 rounded-sm p-3 shrink-0 min-w-0 max-w-full lg:min-w-[260px] lg:max-w-[340px] bg-gray-50 dark:bg-gray-800 mb-4 lg:mb-0">
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
						{group.users && group.users.length > 0 ? (
							<ul className="divide-y divide-gray-200 dark:divide-gray-600 mt-2">
								{group.users.map((user: any) => (
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
									const findNav = (nodes: any[]): any | null => {
										for (const n of nodes) {
											if (String(n.navId) === String(navId)) return n;
											if (n.children) {
												const found = findNav(n.children);
												if (found) return found;
											}
										}
										return null;
									};
									const navNode = findNav(navTreeStructure);
									if (checked) {
										if (navNode && !updatedNavs.some((n: any) => String(n.navId) === String(navId))) {
											updatedNavs.push({ navId: navNode.navId, title: navNode.title, path: navNode.path });
										}
									} else {
										updatedNavs = updatedNavs.filter((n: any) => String(n.navId) !== String(navId));
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
					<Button type="button" variant={'destructive'} onClick={onCancel}>
						Cancel
					</Button>
					<Button type="submit" variant={'default'} className="btn bg-green-600 text-white hover:bg-green-700 shadow-none w-full sm:w-auto">
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
