import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Edit2, Check } from "lucide-react";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { authenticatedApi } from "@/config/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AssetDetailSpecVehicleProps {
    asset: any;
    onUpdate?: () => void;
}

const AssetDetailSpecVehicle: React.FC<AssetDetailSpecVehicleProps> = ({ asset, onUpdate }) => {
    const [editing, setEditing] = React.useState(false);
    const [brandOptions, setBrandOptions] = React.useState<ComboboxOption[]>([]);
    const [modelOptions, setModelOptions] = React.useState<ComboboxOption[]>([]);
    const [categoryOptions, setCategoryOptions] = React.useState<ComboboxOption[]>([]);
    const [selectedBrand, setSelectedBrand] = React.useState<string>("");
    const [selectedModel, setSelectedModel] = React.useState<string>("");
    const [selectedCategory, setSelectedCategory] = React.useState<string>("");
    const [saving, setSaving] = React.useState(false);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const rawSpecs = React.useMemo(() => asset?.specs || asset?.extra_specs || {}, [asset]);
    const [formSpecs, setFormSpecs] = React.useState<any>({});

    const loadOptions = async () => {
        try {
            const [brandsRes, modelsRes, categoriesRes] = await Promise.all([
                authenticatedApi.get<any>("/api/assets/brands"),
                authenticatedApi.get<any>("/api/assets/models"),
                authenticatedApi.get<any>("/api/assets/categories"),
            ]);
            const toOptions = (arr: any[] = []) => arr.map((item: any) => ({ value: String(item.id), label: item.name || item.title || String(item.id) }));
            setBrandOptions(toOptions(brandsRes.data?.data || brandsRes.data || []));
            setModelOptions(toOptions(modelsRes.data?.data || modelsRes.data || []));
            setCategoryOptions(toOptions(categoriesRes.data?.data || categoriesRes.data || []));
        } catch (error) {
            console.error("Failed to load lookup data", error);
            toast.error("Failed to load brand/model/category options");
        }
    };

    React.useEffect(() => {
        if (editing) {
            loadOptions();
            setSelectedBrand(asset?.brand?.id ? String(asset.brand.id) : "");
            setSelectedModel(asset?.model?.id ? String(asset.model.id) : "");
            setSelectedCategory(asset?.category?.id ? String(asset.category.id) : "");
            setFormSpecs({
                cubic_meter: rawSpecs?.cubic_meter || "",
                fuel_type: rawSpecs?.fuel_type || "",
                transmission: rawSpecs?.transmission || "",
                color: rawSpecs?.color || "",
                chassis_no: rawSpecs?.chassis_no || rawSpecs?.chassis_number || "",
                engine_no: rawSpecs?.engine_no || rawSpecs?.engine_number || "",
                registration_date: rawSpecs?.registration_date || "",
                road_tax_expiry: rawSpecs?.road_tax_expiry || "",
                insurance_expiry: rawSpecs?.insurance_expiry || "",
                seating_capacity: rawSpecs?.seating_capacity || rawSpecs?.seats || "",
                mileage: rawSpecs?.mileage ?? rawSpecs?.odometer ?? "",
                avls_availability: rawSpecs?.avls_availability ?? "",
                avls_install_date: rawSpecs?.avls_install_date || "",
                avls_removal_date: rawSpecs?.avls_removal_date || "",
                avls_transfer_date: rawSpecs?.avls_transfer_date || "",
            });
        }
    }, [editing, asset, rawSpecs]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const toIsoDate = (v: any) => {
                if (!v) return "";
                const d = new Date(v);
                if (isNaN(d.getTime())) return "";
                return d.toISOString().slice(0, 10);
            };
            const payload: any = {
                type_id: 2,
                cubic_meter: formSpecs.cubic_meter,
                fuel_type: formSpecs.fuel_type,
                transmission: formSpecs.transmission,
                color: formSpecs.color,
                chassis_no: formSpecs.chassis_no,
                engine_no: formSpecs.engine_no,
                seating_capacity: formSpecs.seating_capacity,
                mileage: formSpecs.mileage,
                avls_availability: formSpecs.avls_availability,
                avls_install_date: toIsoDate(formSpecs.avls_install_date),
                avls_removal_date: toIsoDate(formSpecs.avls_removal_date),
                avls_transfer_date: toIsoDate(formSpecs.avls_transfer_date),
            };
            if (selectedBrand) payload.brand_id = Number(selectedBrand);
            if (selectedModel) payload.model_id = Number(selectedModel);
            if (selectedCategory) payload.category_id = Number(selectedCategory);
            await authenticatedApi.put(`/api/assets/specs/${asset.id}`, payload);
            setEditing(false);
            toast.success("Basic information updated");
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to update asset basic info:", error);
            toast.error("Failed to update basic information");
        } finally {
            setSaving(false);
            setConfirmOpen(false);
        }
    };

    const renderSpecField = (label: string, key: string) => {
        const value = formSpecs[key];
        const fallbackValue = rawSpecs?.[key];
        const display = value ?? fallbackValue ?? "-";
        const formatDateDisplay = (val: any) => {
            if (!val) return "-";
            const d = new Date(val);
            if (isNaN(d.getTime())) return "-";
            const day = d.getDate().toString().padStart(2, "0");
            const month = (d.getMonth() + 1).toString().padStart(2, "0");
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        };
        const normalizedDisplay = display === "yes" ? "Yes" : display === "no" ? "No" : display;

        const isViewOnlyDate = ["road_tax_expiry", "insurance_expiry"].includes(key);

        if (isViewOnlyDate) {
            return (
                <div>
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDateDisplay(normalizedDisplay)}</p>
                </div>
            );
        }

        // Controlled options for certain fields (editable)
        if (editing) {
            if (key === "fuel_type") {
                return (
                    <div className="space-y-1">
                        <p className="text-xs text-gray-500 mb-1">{label}</p>
                        <Select
                            value={value ?? ""}
                            onValueChange={(v) => setFormSpecs((prev: any) => ({ ...prev, [key]: v }))}
                        >
                            <SelectTrigger className="h-9 text-sm w-full">
                                <SelectValue placeholder="Select fuel type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="diesel">Diesel</SelectItem>
                                <SelectItem value="petrol">Petrol</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                );
            }

            if (key === "transmission") {
                return (
                    <div className="space-y-1">
                        <p className="text-xs text-gray-500 mb-1">{label}</p>
                        <Select
                            value={value ?? ""}
                            onValueChange={(v) => setFormSpecs((prev: any) => ({ ...prev, [key]: v }))}
                        >
                            <SelectTrigger className="h-9 text-sm w-full">
                                <SelectValue placeholder="Select transmission" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="manual">Manual</SelectItem>
                                <SelectItem value="auto">Auto</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                );
            }

            if (key === "avls_availability") {
                return (
                    <div className="space-y-1">
                        <p className="text-xs text-gray-500 mb-1">{label}</p>
                        <Select
                            value={value ?? ""}
                            onValueChange={(v) => setFormSpecs((prev: any) => ({ ...prev, [key]: v }))}
                        >
                            <SelectTrigger className="h-9 text-sm w-full">
                                <SelectValue placeholder="Select availability" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                );
            }

            if (key === "avls_install_date" || key === "avls_removal_date" || key === "avls_transfer_date") {
                return (
                    <div className="space-y-1">
                        <p className="text-xs text-gray-500 mb-1">{label}</p>
                        <Input
                            type="date"
                            value={(value || "").toString().slice(0, 10)}
                            onChange={(e) => setFormSpecs((prev: any) => ({ ...prev, [key]: e.target.value }))}
                            className="h-9 text-sm"
                        />
                    </div>
                );
            }

            if (key === "seating_capacity") {
                return (
                    <div className="space-y-1">
                        <p className="text-xs text-gray-500 mb-1">{label}</p>
                        <Select
                            value={value ? String(value) : ""}
                            onValueChange={(v) => setFormSpecs((prev: any) => ({ ...prev, [key]: Number(v) }))}
                        >
                            <SelectTrigger className="h-9 text-sm w-full">
                                <SelectValue placeholder="Select seating capacity" />
                            </SelectTrigger>
                            <SelectContent>
                                {[2, 4, 5, 6, 7, 10].map((n) => (
                                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                );
            }
        }

        if (editing) {
            return (
                <div className="space-y-1">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <Input
                        value={value ?? ""}
                        onChange={(e) => setFormSpecs((prev: any) => ({ ...prev, [key]: e.target.value }))}
                        className="h-9 text-sm"
                    />
                </div>
            );
        }
        return (
            <div>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-sm font-semibold text-gray-900">
                    {["avls_install_date", "avls_removal_date", "avls_transfer_date"].includes(key)
                        ? formatDateDisplay(normalizedDisplay)
                        : (normalizedDisplay || "-")}
                </p>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <Card className="bg-stone-100/80">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-purple-600" />
                        </div>
                        Basic Information
                        {editing ? (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => setConfirmOpen(true)}
                                disabled={saving}
                                title="Save Basic Information"
                            >
                                <Check className="w-4 h-4 text-green-600" />
                            </Button>
                        ) : (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => setEditing(true)}
                                title="Edit Basic Information"
                        >
                            <Edit2 className="w-4 h-4 text-gray-400" />
                        </Button>
                    )}
                </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <p className="text-xs text-gray-500 mb-1">Brand</p>
                            {editing ? (
                                <Combobox
                                    options={brandOptions}
                                    value={selectedBrand}
                                    onValueChange={setSelectedBrand}
                                    placeholder="Search brand..."
                                />
                            ) : (
                                <p className="text-sm font-semibold text-gray-900">{asset?.brand?.name || asset?.brands?.name || '-'}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-gray-500 mb-1">Model</p>
                            {editing ? (
                                <Combobox
                                    options={modelOptions}
                                    value={selectedModel}
                                    onValueChange={setSelectedModel}
                                    placeholder="Search model..."
                                />
                            ) : (
                                <p className="text-sm font-semibold text-gray-900">{asset?.model?.name || asset?.models?.name || '-'}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-gray-500 mb-1">Category</p>
                            {editing ? (
                                <Combobox
                                    options={categoryOptions}
                                    value={selectedCategory}
                                    onValueChange={setSelectedCategory}
                                    placeholder="Search category..."
                                />
                            ) : (
                                <p className="text-sm font-semibold text-gray-900">{asset?.category?.name || asset?.categories?.name || '-'}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Serial Number</p>
                            <p className="text-sm font-semibold text-gray-900">{asset?.serial || asset?.serial_number || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Asset Tag</p>
                            <p className="text-sm font-semibold text-gray-900">{asset?.tag || asset?.asset_tag || '-'}</p>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 my-6" />

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {renderSpecField("Engine Capacity", "cubic_meter")}
                        {renderSpecField("Fuel Type", "fuel_type")}
                        {renderSpecField("Transmission", "transmission")}
                        {renderSpecField("Color", "color")}
                        {renderSpecField("Chassis Number", "chassis_no")}
                        {renderSpecField("Engine Number", "engine_no")}
                        {renderSpecField("Seating Capacity", "seating_capacity")}
                        {renderSpecField("AVLS Availability", "avls_availability")}
                        {renderSpecField("AVLS Install Date", "avls_install_date")}
                        {renderSpecField("AVLS Removal Date", "avls_removal_date")}
                        {renderSpecField("AVLS Transfer Date", "avls_transfer_date")}
                        {renderSpecField("Road Tax Expiry", "road_tax_expiry")}
                        {renderSpecField("Insurance Expiry", "insurance_expiry")}
                        {renderSpecField("Mileage", "mileage")}
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Save changes?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will update the basic information for this vehicle.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction disabled={saving} onClick={handleSave}>
                            Save
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AssetDetailSpecVehicle;
