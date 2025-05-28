import React, { useRef, useEffect, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import NavTreeView from "@components/ui/NavTreeView";
import { authenticatedApi } from "@/config/api";

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
		<div className="bg-neutral-50 dark:bg-gray-900 p-6">
			<h2 className="text-md font-semibold mb-4">{group.id ? `Edit Group: ${group.name}` : 'Create Group'}</h2>
			<form className="space-y-4" onSubmit={onSubmit}>
				<div className="flex flex-col md:flex-row gap-4 items-center">
					<div className="flex-1 w-full">
						<label className="block text-sm font-medium mb-1">Name</label>
						<input type="text" className="form-input w-full" value={editName} onChange={e => setEditName(e.target.value)} />
					</div>
					<div className="w-full md:w-40">
						<label className="block text-sm font-medium mb-1">Status</label>
						<select className="form-select w-full" value={editStatus} onChange={e => setEditStatus(Number(e.target.value))}>
							<option value={1}>Active</option>
							<option value={2}>Disabled</option>
						</select>
					</div>
				</div>
				<div>
					<label className="block text-sm font-medium mb-1">Description</label>
					<textarea className="form-input w-full" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
				</div>
				<div className="flex flex-col lg:flex-row gap-4 w-full text-sm">
					{/* Assigned Users */}
					<div className="w-full lg:w-1/2 border dark:border-gray-700 rounded-sm p-3 shrink-0 min-w-0 max-w-full lg:min-w-[260px] lg:max-w-[340px] bg-gray-50 dark:bg-gray-800 mb-4 lg:mb-0">
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
						{group.users && group.users.length > 0 ? (
							<ul className="divide-y divide-gray-200 dark:divide-gray-600">
								{group.users.map((user: any) => (
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
					{/* Navigation Structure Assignment (with label and assign button) */}
					<div className="flex-1 w-full dark:border-gray-700 rounded-sm min-w-0 max-w-full bg-gray-50 dark:bg-gray-800">
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
					<button type="button" className="btn rounded-full bg-slate-500 text-white hover:bg-slate-600 border-0 shadow-none w-full sm:w-auto" onClick={onCancel}>
						Cancel
					</button>
					<button type="submit" className="btn rounded-full bg-green-600 text-white hover:bg-green-700 border-0 shadow-none w-full sm:w-auto">
						Save
					</button>
				</div>
			</form>
		</div>
	);
};

export default FGroupForm;
