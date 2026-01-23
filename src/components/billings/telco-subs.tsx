import React, { useEffect, useState, useMemo } from "react";
import { CustomDataGrid, ColumnDef } from "@/components/ui/DataGrid";
import { authenticatedApi } from "@/config/api";
import { Plus, Replace, ArrowBigLeft, ArrowBigRight, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ActionSidebar from "@components/ui/action-aside";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import clsx from "clsx";
import { AuthContext } from "@/store/AuthContext";
import ExcelTelcoSubs from "./excel-telco-subs";

interface Account {
	id: number;
	account_master: string;
	provider: string;
}

interface Simcard {
	id: number;
	sim_sn: string;
}

interface CostCenter {
	id: number;
	name: string;
}

interface Department {
	id: number;
	name: string;
}

interface User {
	ramco_id: string;
	full_name: string;
	name?: string;
	contact?: string;
	costcenter?: CostCenter | null;
	department?: Department | null;
	location?: Location | null;
}

interface Location {
	id: number;
	name: string;
}

interface Brand {
	id: number;
	name: string;
}

interface Model {
	id: number;
	name: string;
}

interface Owner {
	full_name: string;
	ramco_id: string;
}

interface Asset {
	id: number;
	classification: string;
	asset_code: string | null;
	finance_tag: string | null;
	register_number: string;
	category?: { id: number; name: string } | null;
	dop: string;
	year: string;
	unit_price: number | null;
	depreciation_length: number;
	depreciation_rate: string;
	cost_center: string;
	status: string;
	disposed_date: string;
	types: {
		type_id: number;
		type_code: string;
		name: string;
	};
	specs: {
		categories: {
			category_id: number;
			name: string;
		};
		brands: { id: number; name: string } | null;
		models: { id: number; name: string } | null;
		id: number;
		asset_id: number;
		type_id: number;
		category_id: number;
		brand_id: number | null;
		model_id: number | null;
		entry_code: string;
		asset_code: string | null;
		register_number: string;
		chassis_no: string;
		engine_no: string;
		transmission: string;
		fuel_type: string;
		cubic_meter: string;
		avls_availability: string;
		avls_install_date: string;
		avls_removal_date: string;
		avls_transfer_date: string;
		updated_at: string;
		updated_by: string;
	};
	owner: Array<{
		ramco_id: string;
		name: string;
		email: string;
		contact: string;
		department: string;
		cost_center: string | null;
		district: string | null;
		effective_date: string;
	}>;
	// Lightweight fields from telco assets listing
	brand?: Brand | null;
	model?: Model | null;
	owner_current?: Owner | null;
}

interface SubscriberAsset {
	id: number;
	register_number: string;
	brand?: Brand | null;
	category?: { id: number; name: string } | null;
	model?: Model | null;
	specs?: Asset["specs"] | null;
}

interface Subscriber {
	id: number;
	sub_no: string;
	account_sub: string;
	status: string;
	account: Account;
	simcard: Simcard;
	costcenter: CostCenter;
	department: Department;
	location?: Location;
	asset: SubscriberAsset;
	user: User;
	register_date: string;
}

// Add a form type for create/update
interface SubscriberForm {
	id?: number;
	sub_no?: string;
	account_sub?: string;
	status?: string;
	account?: number;
	simcard?: number;
	costcenter?: number;
	department?: number;
	user?: string;
	register_date?: string;
	asset_id?: number; // <-- added asset_id
}

const TelcoSubs = () => {
	const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
	const [sortConfig, setSortConfig] = useState<{ key: keyof Subscriber; direction: "asc" | "desc" } | null>(null);
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState<SubscriberForm>({});
	const [editId, setEditId] = useState<number | null>(null);
	const [accountsOpt, setAccountsOpt] = useState<Account[]>([]);
	const [assetsOpt, setAssetsOpt] = useState<Asset[]>([]);
	const [userOpt, setUserOpt] = useState<any[]>([]);
	const [costCentersOpt, setCostCentersOpt] = useState<CostCenter[]>([]);
	const [replaceField, setReplaceField] = useState<null | 'simcard' | 'costcenter' | 'department' | 'user' | 'asset'>(null);
	const [optionSearch, setOptionSearch] = useState("");
	type SummaryFilter =
		| { type: "all" }
		| { type: "missingUser"; provider?: string }
		| { type: "missingDevice"; provider?: string }
		| { type: "status"; provider?: string; status?: string };
	const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>({ type: "all" });
	const authContext = React.useContext(AuthContext);
	const username = authContext?.authData?.user?.username;

	const selectedAsset = useMemo(() => {
		if (!form.asset_id) return undefined;
		return assetsOpt.find(a => a.id === Number(form.asset_id))
			|| subscribers.find(s => s.asset?.id === Number(form.asset_id))?.asset;
	}, [form.asset_id, assetsOpt, subscribers]);

	const selectedAssetCategory = useMemo(() => {
		if (!selectedAsset) return "—";
		if (selectedAsset.category?.name) return selectedAsset.category.name;
		if (selectedAsset.specs?.categories?.name) return selectedAsset.specs.categories.name;
		return "—";
	}, [selectedAsset]);

	const selectedAssetBrand = useMemo(() => {
		if (!selectedAsset) return "—";
		if (selectedAsset.brand?.name) return selectedAsset.brand.name;
		if (selectedAsset.specs?.brands?.name) return selectedAsset.specs.brands.name;
		return "—";
	}, [selectedAsset]);

	const selectedAssetModel = useMemo(() => {
		if (!selectedAsset) return "—";
		if (selectedAsset.model?.name) return selectedAsset.model.name;
		if (selectedAsset.specs?.models?.name) return selectedAsset.specs.models.name;
		return "—";
	}, [selectedAsset]);

	// Move fetchSubscribers outside useEffect so it can be called after submit
	const fetchSubscribers = async () => {
		try {
			const res = await authenticatedApi.get("/api/telco/subs");
			const response = res.data as { status: string; message: string; data: Subscriber[] };
			if (response?.status === "success") {
				setSubscribers(response.data);
			}
		} catch (error) {
			console.error("Error fetching subscribers:", error);
		}
	};

	useEffect(() => {
		fetchSubscribers();
	}, []);

	useEffect(() => {
		const fetchAccounts = async () => {
			try {
				const res = await authenticatedApi.get("/api/telco/accounts");
				const response = res.data as { status: string; message: string; data: Account[] };
				setAccountsOpt(response.data || []);
			} catch (e) {
				// handle error
			}
		};
		fetchAccounts();

		// Fetch user options for replacement
		const fetchUsers = async () => {
			try {
				const res = await authenticatedApi.get("/api/assets/employees?status=active");
				const response = res.data as { status: string; message: string; data: any[] };
				if (response?.status === "success") {
					setUserOpt(response.data);
				}
			} catch (e) {
				// handle error
			}
		};
		fetchUsers();

		// Fetch cost centers for replacement
		const fetchCostCenters = async () => {
			try {
				const res = await authenticatedApi.get("/api/assets/costcenters");
				const response = res.data as { status: string; message: string; data: CostCenter[] };
				if (response?.status === "success") {
					setCostCentersOpt(response.data);
				}
			} catch (e) {
				// handle error
			}
		};
		fetchCostCenters();
	}, []);

	useEffect(() => {
		const fetchAssets = async () => {
			try {
				const res = await authenticatedApi.get("/api/assets?manager=1&status=active");
				const response = res.data as { status: string; message: string; data: Asset[] };
				if (response?.status === "success") {
					// Keep full list; API already scoped by status when provided
					setAssetsOpt(response.data || []);
				}
			} catch (e) {
				// handle error
			}
		};
		fetchAssets();
	}, []);

	const isMissingUser = (sub?: Subscriber) => !sub?.user || (!sub.user.full_name && !sub.user.ramco_id);
	const isMissingDevice = (sub?: Subscriber) => !sub?.asset || !sub.asset?.id;

	const sortedSubscribers = React.useMemo(() => {
		if (!sortConfig || !sortConfig.key) return subscribers;

		const key = sortConfig.key;
		return [...subscribers].sort((a, b) => {
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
	}, [subscribers, sortConfig]);

	const handleSort = (key: keyof Subscriber) => {
		setSortConfig((prevConfig) => {
			if (prevConfig?.key === key && prevConfig.direction === "asc") {
				return { key, direction: "desc" };
			}
			return { key, direction: "asc" };
		});
	};

	const [searchTerm, setSearchTerm] = useState("");

	const filteredSubscribers = React.useMemo(() => {
		let base = sortedSubscribers;

		if (summaryFilter.type === "missingUser") {
			base = base.filter(sub => isMissingUser(sub));
			if (summaryFilter.provider) base = base.filter(sub => (sub.account?.provider || "Unknown") === summaryFilter.provider);
		} else if (summaryFilter.type === "missingDevice") {
			base = base.filter(sub => isMissingDevice(sub));
			if (summaryFilter.provider) base = base.filter(sub => (sub.account?.provider || "Unknown") === summaryFilter.provider);
		} else if (summaryFilter.type === "status") {
			if (summaryFilter.status) base = base.filter(sub => (sub.status || "Unknown") === summaryFilter.status);
			if (summaryFilter.provider) base = base.filter(sub => (sub.account?.provider || "Unknown") === summaryFilter.provider);
		}

		if (!searchTerm) return base;

		return base.filter((subscriber) =>
			Object.values(subscriber).some((value) =>
				String(value).toLowerCase().includes(searchTerm.toLowerCase())
			)
		);
	}, [sortedSubscribers, searchTerm, summaryFilter]);

	/* columns filtering params */
	// Remove masterAcOpt since 'account' is now a single object, not an array
	// If you need a filter for account master, you can build it from the subscribers list:
	const masterAcOpt = useMemo(
		() => Array.from(new Set(subscribers.map(s => s.account?.account_master).filter((v): v is string => typeof v === "string"))),
		[subscribers]
	);

	const subSummary = useMemo(() => {
		let withoutUser = 0;
		let withoutDevice = 0;
		const userByProvider = new Map<string, number>();
		const deviceByProvider = new Map<string, number>();
		const statusTotals = new Map<string, number>();
		const statusByProvider = new Map<string, Map<string, number>>();
		for (const sub of subscribers) {
			const provider = sub?.account?.provider || "Unknown";
			const status = sub?.status || "Unknown";

			statusTotals.set(status, (statusTotals.get(status) || 0) + 1);
			if (!statusByProvider.has(provider)) statusByProvider.set(provider, new Map());
			const providerStatuses = statusByProvider.get(provider)!;
			providerStatuses.set(status, (providerStatuses.get(status) || 0) + 1);

			if (isMissingUser(sub)) {
				withoutUser += 1;
				userByProvider.set(provider, (userByProvider.get(provider) || 0) + 1);
			}
			if (isMissingDevice(sub)) {
				withoutDevice += 1;
				deviceByProvider.set(provider, (deviceByProvider.get(provider) || 0) + 1);
			}
		}
		return {
			withoutUser,
			withoutDevice,
			missingUserByProvider: Array.from(userByProvider.entries()),
			missingDeviceByProvider: Array.from(deviceByProvider.entries()),
			statusTotals: Array.from(statusTotals.entries()).sort((a, b) => b[1] - a[1]),
			statusByProvider: Array.from(statusByProvider.entries()).map(([prov, map]) => [prov, Array.from(map.entries())] as const),
		};
	}, [subscribers]);

	const columns: ColumnDef<Subscriber>[] = [
		{ key: 'id', header: 'ID', sortable: false },
		{ key: 'sub_no', header: 'Sub Number', sortable: true, filter: 'input' },
		{ key: 'account_sub', header: 'Sub AC', sortable: true, filter: 'input' },
		{ key: 'account', header: 'Master AC', filter: 'singleSelect', render: (row: Subscriber) => row.account?.account_master ?? '—' },
		{ key: 'provider' as any, header: 'Provider', filter: 'singleSelect', render: (row: Subscriber) => row.account?.provider ?? '—' },
		{ key: 'status', header: 'Status', sortable: true, filter: 'singleSelect' },
		{ key: 'register_date', header: 'Register Date', sortable: true, render: (row: Subscriber) => new Date(row.register_date).toLocaleDateString() },
		{
			key: 'simcard',
			header: 'SIM',
			filter: 'input',
			filterValue: (row: Subscriber) => row.simcard?.sim_sn ?? '',
			render: (row: Subscriber) => row.simcard?.sim_sn ?? '—'
		},
		{
			key: 'user',
			header: 'User',
			filter: 'input',
			filterValue: (row: Subscriber) => `${row.user?.full_name ?? ''} ${row.user?.ramco_id ?? ''}`.trim(),
			render: (row: Subscriber) => row.user?.full_name ?? '—'
		},
		{
			key: 'costcenter',
			header: 'Cost Center',
			filter: 'singleSelect',
			filterValue: (row: Subscriber) => row.costcenter?.name ?? row.user?.costcenter?.name ?? '',
			render: (row: Subscriber) => row.costcenter?.name ?? row.user?.costcenter?.name ?? '—'
		},
		{
			key: 'department',
			header: 'Department',
			filter: 'singleSelect',
			filterValue: (row: Subscriber) => row.department?.name ?? row.user?.department?.name ?? '',
			render: (row: Subscriber) => row.department?.name ?? row.user?.department?.name ?? '—'
		},
		{
			key: 'location',
			header: 'Location',
			filter: 'singleSelect',
			filterValue: (row: Subscriber) => row.location?.name ?? row.user?.location?.name ?? '',
			render: (row: Subscriber) => row.location?.name ?? row.user?.location?.name ?? '—'
		},
		// Asset columns with unique keys
		{
			key: 'asset_sn' as any,
			header: 'Register Number',
			filter: 'input',
			filterValue: (row: Subscriber) => row.asset?.register_number ?? '',
			render: (row: Subscriber) => row.asset?.register_number ?? '—'
		},
		{ key: 'asset_brand' as any, header: 'Brand', filter: 'singleSelect', render: (row: Subscriber) => row.asset?.brand?.name ?? '—' },
		{ key: 'asset_model' as any, header: 'Model', filter: 'singleSelect', render: (row: Subscriber) => row.asset?.model?.name ?? '—' },
	];

	const rowClass = (row: Subscriber) => {
		if (row.status === "terminated") return "bg-red-500 text-white";
		return "";
	};

	const handleOpen = (subscriber?: Subscriber) => {
		if (subscriber) {
			setForm({
				id: subscriber.id,
				sub_no: subscriber.sub_no,
				account_sub: subscriber.account_sub,
				register_date: subscriber.register_date.split("T")[0],
				status: subscriber.status,
				account: subscriber.account?.id,
				simcard: subscriber.simcard?.id,
				costcenter: subscriber.costcenter?.id ?? subscriber.user?.costcenter?.id,
				department: subscriber.department?.id ?? subscriber.user?.department?.id,
				user: subscriber.user?.ramco_id,
				asset_id: subscriber.asset?.id // <-- use id instead of asset_id
			});
			setEditId(subscriber.id);
		} else {
			setForm({
				register_date: new Date().toISOString().split("T")[0] // default to today
			});
			setEditId(null);
		}
		setOpen(true);
	};

	const handleClose = () => {
		setOpen(false);
		setForm({});
		setEditId(null);
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setForm({ ...form, [e.target.name]: e.target.value });
	};

	const handleAccountChange = (value: string) => {
		setForm({ ...form, account: Number(value) });
	};

	const handleSimcardChange = (value: string) => {
		setForm({ ...form, simcard: Number(value) });
	};

	const handleCostCenterChange = (value: string) => {
		setForm({ ...form, costcenter: Number(value) });
	};

	const handleDepartmentChange = (value: string) => {
		setForm({ ...form, department: Number(value) });
	};

	const handleUserChange = (value: string) => {
		// If needed elsewhere, keep helper for manual user changes
		setForm({ ...form, user: value });
	};

	// When choosing a user from the picker, also hydrate cost center & department from the employee record
	const handleSelectUser = (user: any) => {
		setForm({
			...form,
			user: user.ramco_id,
			costcenter: user.costcenter?.id ?? form.costcenter,
			department: user.department?.id ?? form.department
		});
		setReplaceField(null);
		setOptionSearch("");
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const submitData = {
				...form,
				account: form.account ? form.account : undefined,
				simcard: form.simcard ? form.simcard : undefined,
				costcenter: form.costcenter ? form.costcenter : undefined,
				department: form.department ? form.department : undefined,
				user: form.user ? form.user : undefined,
				asset_id: form.asset_id ? form.asset_id : undefined, // <-- include asset_id in payload
				updated_by: username ?? undefined
			};
			if (editId) {
				await authenticatedApi.put(`/api/telco/subs/${editId}`, submitData);
			} else {
				await authenticatedApi.post("/api/telco/subs", submitData);
			}
			fetchSubscribers();
			handleClose();
		} catch (e) {
			// handle error
		}
	};

	return (
		<div className="mt-4">
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
				<Card
					className={clsx(
						"bg-stone-100 cursor-pointer transition-shadow",
						summaryFilter.type === "missingUser" && !summaryFilter.provider ? "ring-2 ring-amber-500 shadow-sm" : "hover:shadow"
					)}
					onClick={() => setSummaryFilter(prev => prev.type === "missingUser" && !prev.provider ? { type: "all" } : { type: "missingUser" })}
				>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-semibold">Subs without User</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{subSummary.withoutUser}</div>
						<div className="text-xs">
							{summaryFilter.type === "missingUser" ? "Filter applied" : "No user linked to subscription number"}
						</div>
						<div className="mt-2 text-xs space-y-1">
							<div className="uppercase tracking-wide text-[11px] text-foreground/70">Provider</div>
							{subSummary.missingUserByProvider.length === 0 ? (
								<div className="flex justify-between">
									<span>—</span>
									<span>0</span>
								</div>
							) : (
								subSummary.missingUserByProvider.map(([prov, count]) => {
									const active = summaryFilter.type === "missingUser" && summaryFilter.provider === prov;
									return (
										<div
											key={prov}
											className={clsx(
												"flex justify-between items-center rounded px-2 py-1 cursor-pointer transition-colors",
												active ? "bg-amber-100 font-semibold" : "hover:bg-white/70"
											)}
											onClick={(e) => {
												e.stopPropagation();
												setSummaryFilter(prev =>
													prev.type === "missingUser" && prev.provider === prov
														? { type: "missingUser" }
														: { type: "missingUser", provider: prov }
												);
											}}
										>
											<span>{prov}</span>
											<span className="font-semibold">{count}</span>
										</div>
									);
								})
							)}
						</div>
					</CardContent>
				</Card>
				<Card
					className={clsx(
						"bg-stone-100 cursor-pointer transition-shadow",
						summaryFilter.type === "missingDevice" && !summaryFilter.provider ? "ring-2 ring-amber-500 shadow-sm" : "hover:shadow"
					)}
					onClick={() => setSummaryFilter(prev => prev.type === "missingDevice" && !prev.provider ? { type: "all" } : { type: "missingDevice" })}
				>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-semibold">Subs without Device</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{subSummary.withoutDevice}</div>
						<div className="text-xs">
							{summaryFilter.type === "missingDevice" ? "Filter applied" : "No device/asset linked to subscription number"}
						</div>
						<div className="mt-2 text-xs space-y-1">
							<div className="uppercase tracking-wide text-[11px] text-foreground/70">Provider</div>
							{subSummary.missingDeviceByProvider.length === 0 ? (
								<div className="flex justify-between">
									<span>—</span>
									<span>0</span>
								</div>
							) : (
								subSummary.missingDeviceByProvider.map(([prov, count]) => {
									const active = summaryFilter.type === "missingDevice" && summaryFilter.provider === prov;
									return (
										<div
											key={prov}
											className={clsx(
												"flex justify-between items-center rounded px-2 py-1 cursor-pointer transition-colors",
												active ? "bg-amber-100 font-semibold" : "hover:bg-white/70"
											)}
											onClick={(e) => {
												e.stopPropagation();
												setSummaryFilter(prev =>
													prev.type === "missingDevice" && prev.provider === prov
														? { type: "missingDevice" }
														: { type: "missingDevice", provider: prov }
												);
											}}
										>
											<span>{prov}</span>
											<span className="font-semibold">{count}</span>
										</div>
									);
								})
							)}
						</div>
					</CardContent>
				</Card>
				<Card className="bg-stone-100">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-semibold">Status Breakdown</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-xs space-y-2">
							<div>
								{subSummary.statusTotals.length === 0 ? (
									<div className="flex justify-between">
										<span>—</span>
										<span>0</span>
									</div>
								) : (
									subSummary.statusTotals.map(([status, count]) => (
										<div key={status} className="flex justify-between">
											<span className="capitalize">{status}</span>
											<span className="font-semibold">{count}</span>
										</div>
									))
								)}
							</div>
							<div>
								<div className="uppercase tracking-wide text-[11px] text-foreground/70 mb-1">By Provider</div>
								{subSummary.statusByProvider.length === 0 ? (
									<div className="flex justify-between">
										<span>—</span>
										<span>0</span>
									</div>
								) : (
									subSummary.statusByProvider.map(([prov, statuses]) => {
										const providerTotal = statuses.reduce((sum, [, c]) => sum + c, 0);
										const providerActive = summaryFilter.type === "status" && summaryFilter.provider === prov && !summaryFilter.status;
										return (
											<div key={prov} className="mb-1">
												<div className="flex items-center justify-between gap-2">
													<div className="flex items-center gap-2 flex-wrap">
														<button
															type="button"
															className={clsx(
																"font-semibold rounded px-2 py-1 text-left transition-colors",
																providerActive ? "bg-amber-100" : "hover:bg-white/70"
															)}
															onClick={() =>
																setSummaryFilter(prev =>
																	prev.type === "status" && prev.provider === prov && !prev.status
																		? { type: "status" }
																		: { type: "status", provider: prov }
																)
															}
														>
															{prov}
														</button>
														<div className="flex flex-wrap gap-2 text-[11px] text-foreground/70">
															{statuses.map(([status, count]) => {
																const active = summaryFilter.type === "status" && summaryFilter.provider === prov && summaryFilter.status === status;
																const isTerminated = String(status).toLowerCase() === "terminated";
																return (
																	<button
																		type="button"
																		key={`${prov}-${status}`}
																		className={clsx(
																			"inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ring-foreground/10 cursor-pointer transition-colors",
																			isTerminated
																				? "bg-red-600 text-white hover:bg-red-700"
																				: "bg-white text-foreground hover:bg-amber-50",
																			active && !isTerminated && "ring-amber-500 bg-amber-50 font-semibold",
																			active && isTerminated && "ring-amber-300"
																		)}
																		onClick={() =>
																			setSummaryFilter(prev =>
																				prev.type === "status" && prev.provider === prov && prev.status === status
																					? { type: "status", provider: prov }
																					: { type: "status", provider: prov, status }
																			)
																		}
																	>
																		<span className="capitalize">{status}</span>
																		<span className="font-semibold">{count}</span>
																	</button>
																);
															})}
														</div>
													</div>
													<span className="text-foreground/70 text-[11px]">{providerTotal}</span>
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-xl font-bold">Subscribers</h1>
				<div className="flex items-center gap-2">
					<ExcelTelcoSubs />
					<Button onClick={() => handleOpen()}><Plus /></Button>
				</div>
			</div>

			<CustomDataGrid
				data={filteredSubscribers}
				columns={columns}
				pageSize={10}
				inputFilter={false}
				pagination={false}
				rowClass={rowClass}
				columnsVisibleOption={false}
				dataExport={false}
				onRowDoubleClick={handleOpen}
			/>
			<ActionSidebar
				isOpen={open}
				onClose={() => { setReplaceField(null); handleClose(); }}
				size={replaceField ? 'md' : 'sm'}
				title={editId ? "Edit Subscriber" : "Add Subscriber"}
				content={
					<div className={replaceField ? "flex flex-row gap-6" : undefined}>
						<form onSubmit={handleSubmit} className={replaceField ? "space-y-3 p-4 flex-1" : "space-y-3 p-4"}>
							<label className="block">
								<span className="block mb-1">Subscriber Number</span>
								<Input name="sub_no" value={form.sub_no || ""} onChange={handleChange} required />
							</label>
							<label className="block">
								<span className="block mb-1">Sub Account</span>
								<Input name="account_sub" value={form.account_sub || ""} onChange={handleChange} required />
							</label>
							<label className="block">
								<span className="block mb-1">Status</span>
								<Input name="status" value={form.status || ""} onChange={handleChange} required />
							</label>
							<label className="block">
								<span className="block mb-1">Register Date</span>
								<Input name="register_date" type="date" value={form.register_date || ""} onChange={handleChange} required />
							</label>
							<label className="block">
								<span className="block mb-1">Master Account</span>
								<Select value={form.account?.toString() || ""} onValueChange={handleAccountChange} required>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select account" />
									</SelectTrigger>
									<SelectContent>
										{accountsOpt.map(acc => (
											<SelectItem key={acc.id} value={acc.id.toString()}>{acc.account_master}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</label>
							<label className="block">
								<span className="block mb-1">SIM</span>
								<div className="relative group">
									<Input
										name="simcard"
										className="pr-8 group-focus-within:ring-2"
										value={
											form.simcard
												? subscribers.find(s => s.simcard?.id === Number(form.simcard))?.simcard?.sim_sn || form.simcard.toString()
												: ""
										}
										readOnly
										required
									/>
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 cursor-pointer" onClick={() => setReplaceField('simcard')}>
													<ArrowBigRight />
												</span>
											</TooltipTrigger>
											<TooltipContent side="left">Click to replace SIM card</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
							</label>
							<label className="block">
								<span className="block mb-1">User</span>
								<div className="relative group">
									<Input
										name="user"
										className="pr-8 group-focus-within:ring-2"
										value={
											form.user
												? (userOpt.find(u => u.ramco_id === form.user)?.full_name || "")
												: ""
										}
										readOnly
										required
									/>
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 cursor-pointer" onClick={() => setReplaceField('user')}>
													<ArrowBigRight />
												</span>
											</TooltipTrigger>
											<TooltipContent side="left">Click to replace user</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
							</label>
							<label className="block">
								<span className="block mb-1">Cost Center</span>
								<div className="relative group">
									<Input
										name="costcenter"
										className="pr-8 group-focus-within:ring-2"
										value={
											form.costcenter
												? costCentersOpt.find(cc => cc.id === Number(form.costcenter))?.name
													|| userOpt.find(u => u.costcenter?.id === Number(form.costcenter))?.costcenter?.name
													|| form.costcenter.toString()
												: ""
										}
										readOnly
										required
									/>
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 cursor-pointer" onClick={() => setReplaceField('costcenter')}>
													<ArrowBigRight />
												</span>
											</TooltipTrigger>
											<TooltipContent side="left">Click to replace cost center</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
							</label>
							<label className="block">
								<span className="block mb-1">Department</span>
								<div className="relative group">
									<Input
										name="department"
										className="pr-8 group-focus-within:ring-2"
										value={
											form.department
												? subscribers.find(s => s.department?.id === Number(form.department))?.department?.name
													|| userOpt.find(u => u.department?.id === Number(form.department))?.department?.name
													|| form.department.toString()
												: ""
										}
										readOnly
										required
									/>
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 cursor-pointer" onClick={() => setReplaceField('department')}>
													<ArrowBigRight />
												</span>
											</TooltipTrigger>
											<TooltipContent side="left">Click to replace department</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
							</label>
							<label className="block">
								<span className="block mb-1">Register Number</span>
								<div className="relative group">
									<Input
										name="asset_id"
										className="pr-16 group-focus-within:ring-2"
										value={
											form.asset_id
												? (
													assetsOpt.find(a => a.id === Number(form.asset_id))?.register_number
													|| subscribers.find(s => s.asset?.id === Number(form.asset_id))?.asset?.register_number
													|| ""
											)
											: ""
									}
										readOnly
										required
									/>
									{selectedAsset && (
										<Popover>
											<PopoverTrigger asChild>
												<button
													type="button"
													className="absolute right-10 top-1/2 -translate-y-1/2 text-sky-600 hover:text-sky-700"
												>
													<Info size={18} />
												</button>
											</PopoverTrigger>
											<PopoverContent className="w-64" align="end">
												<div className="text-sm space-y-1">
													<div className="font-semibold">{selectedAsset.register_number ?? "—"}</div>
													<div className="text-xs text-foreground/70">Category: <span className="text-foreground">{selectedAssetCategory}</span></div>
													<div className="text-xs text-foreground/70">Brand: <span className="text-foreground">{selectedAssetBrand}</span></div>
													<div className="text-xs text-foreground/70">Model: <span className="text-foreground">{selectedAssetModel}</span></div>
												</div>
											</PopoverContent>
										</Popover>
									)}
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 cursor-pointer" onClick={() => setReplaceField('asset')}>
													<ArrowBigRight />
												</span>
											</TooltipTrigger>
											<TooltipContent side="left">Click to replace asset</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
							</label>
							<div className="flex gap-2 mt-6">
								<Button type="submit">{editId ? "Update" : "Create"}</Button>
								<Button type="button" variant="destructive" onClick={handleClose}>Cancel</Button>
							</div>
						</form>
						{replaceField && (
							<div className="border-l px-4 mt-4 flex-1 min-w-65 max-w-md">
								<h3 className="font-semibold mb-2">Select a {replaceField.replace(/([A-Z])/g, ' $1').toLowerCase()}</h3>
								<Input
									placeholder={`Search ${replaceField.replace(/([A-Z])/g, ' $1').toLowerCase()}...`}
									className="mb-3"
									value={optionSearch}
									onChange={e => setOptionSearch(e.target.value)}
								/>
								<div className="max-h-125 overflow-y-auto space-y-2">
									{replaceField === 'simcard' && Array.from(new Map(subscribers.filter(s => s.simcard).map(s => [s.simcard.id, s.simcard])).values())
										.filter(sim => sim.sim_sn.toLowerCase().includes(optionSearch.toLowerCase()))
										.map(sim => (
											<div key={sim.id} className="p-2 border rounded cursor-pointer hover:bg-amber-100 flex items-center gap-2">
												<ArrowBigLeft className="text-green-500 cursor-pointer" onClick={() => { setForm({ ...form, simcard: sim.id }); setReplaceField(null); setOptionSearch(""); }} />
												<span onClick={() => { setForm({ ...form, simcard: sim.id }); setReplaceField(null); setOptionSearch(""); }} className="flex-1 cursor-pointer">{sim.sim_sn}</span>
											</div>
										))}
									{replaceField === 'costcenter' && costCentersOpt
										.filter(cc => cc.name.toLowerCase().includes(optionSearch.toLowerCase()))
										.map(cc => (
											<div key={cc.id} className="p-2 border rounded cursor-pointer hover:bg-amber-100 flex items-center gap-2">
												<ArrowBigLeft className="text-green-500 cursor-pointer" onClick={() => { setForm({ ...form, costcenter: cc.id }); setReplaceField(null); setOptionSearch(""); }} />
												<span onClick={() => { setForm({ ...form, costcenter: cc.id }); setReplaceField(null); setOptionSearch(""); }} className="flex-1 cursor-pointer">{cc.name}</span>
											</div>
										))}
									{replaceField === 'department' && Array.from(new Map(subscribers.filter(s => s.department).map(s => [s.department.id, s.department])).values())
										.filter(dep => dep.name.toLowerCase().includes(optionSearch.toLowerCase()))
										.map(dep => (
											<div key={dep.id} className="p-2 border rounded cursor-pointer hover:bg-amber-100 flex items-center gap-2">
												<ArrowBigLeft className="text-green-500 cursor-pointer" onClick={() => { setForm({ ...form, department: dep.id }); setReplaceField(null); setOptionSearch(""); }} />
												<span onClick={() => { setForm({ ...form, department: dep.id }); setReplaceField(null); setOptionSearch(""); }} className="flex-1 cursor-pointer">{dep.name}</span>
											</div>
										))}
									{replaceField === 'user' && userOpt
										.filter(user => user.full_name?.toLowerCase().includes(optionSearch.toLowerCase()))
										.map(user => (
											<div key={user.ramco_id} className="p-2 border rounded cursor-pointer hover:bg-amber-100 flex items-center gap-2">
												<ArrowBigLeft className="text-green-500 cursor-pointer" onClick={() => handleSelectUser(user)} />
												<span onClick={() => handleSelectUser(user)} className="flex flex-col cursor-pointer">{user.full_name}
													<span className="text-gray-700 text-xs">Ramco ID: {user.ramco_id}</span>
													<span className="text-gray-700 text-xs">Contact: {user.contact}</span>
													<span className="text-gray-700 text-xs">Email: {user.email}</span>
													<span className="text-gray-700 text-xs">Department: {user.department?.name}</span>
												</span>
											</div>
										))}
									{replaceField === 'asset' && assetsOpt
										.filter(asset => asset.register_number?.toLowerCase().includes(optionSearch.toLowerCase()))
										.map(asset => (
											<div key={asset.id} className="p-2 border rounded cursor-pointer hover:bg-amber-100 flex items-center gap-2">
												<ArrowBigLeft className="text-green-500 cursor-pointer" onClick={() => { setForm({ ...form, asset_id: asset.id }); setReplaceField(null); setOptionSearch(""); }} />
												<span onClick={() => { setForm({ ...form, asset_id: asset.id }); setReplaceField(null); setOptionSearch(""); }} className="flex flex-col cursor-pointer">
													<span className="text-black">{asset.register_number}</span>
													<span className="text-gray-700 text-xs">Brand: <span className="uppercase ">{asset.brand ? ` ${asset.brand.name}` : '—'}</span></span>
													<span className="text-gray-700 text-xs">Model: <span className="uppercase text-xs">{asset.model ? ` ${asset.model.name}` : '—'}</span></span>
													<span className="text-gray-700 text-xs">Owner: {asset.owner_current?.full_name ?? asset.owner?.[0]?.name ?? '—'}</span>
												</span>
											</div>
										))}
								</div>
							</div>
						)}
					</div>
				}
			/>
		</div>
	);
};

export default TelcoSubs;
