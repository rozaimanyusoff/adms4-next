import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Edit2, Check } from "lucide-react";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authenticatedApi } from "@/config/api";
import { toast } from "sonner";
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

interface AssetDetailSpecComputerProps {
    asset: any;
    onUpdate?: () => void;
}

const AssetDetailSpecComputer: React.FC<AssetDetailSpecComputerProps> = ({ asset, onUpdate }) => {
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
                cpu_model: rawSpecs?.cpu_model || rawSpecs?.processor || rawSpecs?.cpu || "",
                cpu_manufacturer: rawSpecs?.cpu_manufacturer || "",
                cpu_generation: rawSpecs?.cpu_generation || "",
                memory_size_gb: rawSpecs?.memory_size_gb ?? rawSpecs?.ram ?? rawSpecs?.memory ?? "",
                memory_type: rawSpecs?.memory_type || "",
                memory_manufacturer: rawSpecs?.memory_manufacturer || "",
                storage_size_gb: rawSpecs?.storage_size_gb ?? rawSpecs?.storage ?? rawSpecs?.hdd ?? "",
                storage_type: rawSpecs?.storage_type || "",
                storage_manufacturer: rawSpecs?.storage_manufacturer || "",
                graphics_specs: rawSpecs?.graphics_specs ?? rawSpecs?.graphics ?? rawSpecs?.gpu ?? "",
                graphics_type: rawSpecs?.graphics_type || "",
                graphics_manufacturer: rawSpecs?.graphics_manufacturer || "",
                os_version: rawSpecs?.os_version || rawSpecs?.os_name || rawSpecs?.os || "",
                display_size: rawSpecs?.display_size || rawSpecs?.display || "",
                display_resolution: rawSpecs?.display_resolution || "",
                display_form_factor: rawSpecs?.display_form_factor || "",
                display_interfaces: rawSpecs?.display_interfaces || "",
                display_manufacturer: rawSpecs?.display_manufacturer || "",
                ports_ethernet: rawSpecs?.ports_ethernet ?? rawSpecs?.network_card ?? rawSpecs?.nic ?? "",
                ports_usb_a: rawSpecs?.ports_usb_a ?? "",
                ports_usb_c: rawSpecs?.ports_usb_c ?? "",
                ports_thunderbolt: rawSpecs?.ports_thunderbolt ?? "",
                ports_hdmi: rawSpecs?.ports_hdmi ?? "",
                ports_displayport: rawSpecs?.ports_displayport ?? "",
                ports_vga: rawSpecs?.ports_vga ?? "",
                ports_sdcard: rawSpecs?.ports_sdcard ?? "",
                ports_audiojack: rawSpecs?.ports_audiojack ?? "",
                battery_capacity: rawSpecs?.battery_capacity ?? rawSpecs?.battery ?? "",
                battery_equipped: rawSpecs?.battery_equipped ?? "",
                adapter_equipped: rawSpecs?.adapter_equipped ?? "",
                adapter_output: rawSpecs?.adapter_output ?? "",
                av_vendor: rawSpecs?.av_vendor ?? "",
                av_status: rawSpecs?.av_status ?? "",
                av_license: rawSpecs?.av_license ?? "",
                vpn_installed: rawSpecs?.vpn_installed ?? "",
                vpn_setup_type: rawSpecs?.vpn_setup_type ?? "",
                vpn_username: rawSpecs?.vpn_username ?? "",
                hostname: rawSpecs?.hostname || rawSpecs?.computer_name || "",
                installed_software: rawSpecs?.installed_software || rawSpecs?.software || "",
                office_account: rawSpecs?.office_account ?? "",
            });
        }
    }, [editing, asset, rawSpecs]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: any = {
                type_id: 1,
                brand_id: selectedBrand ? Number(selectedBrand) : undefined,
                model_id: selectedModel ? Number(selectedModel) : undefined,
                category_id: selectedCategory ? Number(selectedCategory) : undefined,
                cpu_model: formSpecs.cpu_model,
                cpu_manufacturer: formSpecs.cpu_manufacturer,
                cpu_generation: formSpecs.cpu_generation,
                memory_size_gb: formSpecs.memory_size_gb,
                memory_type: formSpecs.memory_type,
                memory_manufacturer: formSpecs.memory_manufacturer,
                storage_size_gb: formSpecs.storage_size_gb,
                storage_type: formSpecs.storage_type,
                storage_manufacturer: formSpecs.storage_manufacturer,
                graphics_specs: formSpecs.graphics_specs,
                graphics_type: formSpecs.graphics_type,
                graphics_manufacturer: formSpecs.graphics_manufacturer,
                os_version: formSpecs.os_version,
                display_size: formSpecs.display_size,
                display_resolution: formSpecs.display_resolution,
                display_form_factor: formSpecs.display_form_factor,
                display_interfaces: formSpecs.display_interfaces,
                display_manufacturer: formSpecs.display_manufacturer,
                ports_ethernet: formSpecs.ports_ethernet,
                ports_usb_a: formSpecs.ports_usb_a,
                ports_usb_c: formSpecs.ports_usb_c,
                ports_thunderbolt: formSpecs.ports_thunderbolt,
                ports_hdmi: formSpecs.ports_hdmi,
                ports_displayport: formSpecs.ports_displayport,
                ports_vga: formSpecs.ports_vga,
                ports_sdcard: formSpecs.ports_sdcard,
                ports_audiojack: formSpecs.ports_audiojack,
                battery_capacity: formSpecs.battery_capacity,
                battery_equipped: formSpecs.battery_equipped,
                adapter_equipped: formSpecs.adapter_equipped,
                adapter_output: formSpecs.adapter_output,
                av_vendor: formSpecs.av_vendor,
                av_status: formSpecs.av_status,
                av_license: formSpecs.av_license,
                vpn_installed: formSpecs.vpn_installed,
                vpn_setup_type: formSpecs.vpn_setup_type,
                vpn_username: formSpecs.vpn_username,
                hostname: formSpecs.hostname,
                installed_software: formSpecs.installed_software,
                office_account: formSpecs.office_account,
            };
            await authenticatedApi.put(`/api/assets/specs/${asset.id}`, payload);
            setEditing(false);
            toast.success("Computer details updated");
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to update computer info:", error);
            toast.error("Failed to update computer details");
        } finally {
            setSaving(false);
            setConfirmOpen(false);
        }
    };

    const renderField = (label: string, value: any, onChange?: (v: string) => void, suffix?: string) => {
        const display = value ?? "-";
        if (editing && onChange) {
            return (
                <div className="space-y-1">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <Input
                        value={value ?? ""}
                        onChange={(e) => onChange(e.target.value)}
                        className="h-9 text-sm"
                    />
                </div>
            );
        }
        return (
            <div>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-sm font-semibold text-gray-900">
                    {display !== "-" && suffix ? `${display} ${suffix}` : display}
                </p>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <Card className="bg-stone-50/50">
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
                                title="Save Computer Information"
                            >
                                <Check className="w-4 h-4 text-green-600" />
                            </Button>
                        ) : (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => setEditing(true)}
                                title="Edit Computer Information"
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {renderField("Processor", formSpecs.cpu_model, (v) => setFormSpecs((p: any) => ({ ...p, cpu_model: v })))}
                        {renderField("CPU Manufacturer", formSpecs.cpu_manufacturer, (v) => setFormSpecs((p: any) => ({ ...p, cpu_manufacturer: v })))}
                        {renderField("CPU Generation", formSpecs.cpu_generation, (v) => setFormSpecs((p: any) => ({ ...p, cpu_generation: v })))}
                        {renderField("RAM", formSpecs.memory_size_gb, (v) => setFormSpecs((p: any) => ({ ...p, memory_size_gb: v })), "GB")}
                        {renderField("Memory Type", formSpecs.memory_type, (v) => setFormSpecs((p: any) => ({ ...p, memory_type: v })))}
                        {renderField("Memory Manufacturer", formSpecs.memory_manufacturer, (v) => setFormSpecs((p: any) => ({ ...p, memory_manufacturer: v })))}
                        {renderField("Storage", formSpecs.storage_size_gb, (v) => setFormSpecs((p: any) => ({ ...p, storage_size_gb: v })), "GB")}
                        {renderField("Storage Type", formSpecs.storage_type, (v) => setFormSpecs((p: any) => ({ ...p, storage_type: v })))}
                        {renderField("Storage Manufacturer", formSpecs.storage_manufacturer, (v) => setFormSpecs((p: any) => ({ ...p, storage_manufacturer: v })))}
                        {renderField("Graphics", formSpecs.graphics_specs, (v) => setFormSpecs((p: any) => ({ ...p, graphics_specs: v })))}
                        {renderField("Graphics Type", formSpecs.graphics_type, (v) => setFormSpecs((p: any) => ({ ...p, graphics_type: v })))}
                        {renderField("Graphics Manufacturer", formSpecs.graphics_manufacturer, (v) => setFormSpecs((p: any) => ({ ...p, graphics_manufacturer: v })))}
                        {renderField("Operating System", formSpecs.os_version, (v) => setFormSpecs((p: any) => ({ ...p, os_version: v })))}
                        {renderField("Display Size", formSpecs.display_size, (v) => setFormSpecs((p: any) => ({ ...p, display_size: v })))}
                        {renderField("Display Resolution", formSpecs.display_resolution, (v) => setFormSpecs((p: any) => ({ ...p, display_resolution: v })))}
                        {renderField("Display Form Factor", formSpecs.display_form_factor, (v) => setFormSpecs((p: any) => ({ ...p, display_form_factor: v })))}
                        {renderField("Display Interfaces", formSpecs.display_interfaces, (v) => setFormSpecs((p: any) => ({ ...p, display_interfaces: v })))}
                        {renderField("Display Manufacturer", formSpecs.display_manufacturer, (v) => setFormSpecs((p: any) => ({ ...p, display_manufacturer: v })))}
                        {renderField("Ethernet Ports", formSpecs.ports_ethernet, (v) => setFormSpecs((p: any) => ({ ...p, ports_ethernet: v })))}
                        {renderField("USB-A Ports", formSpecs.ports_usb_a, (v) => setFormSpecs((p: any) => ({ ...p, ports_usb_a: v })))}
                        {renderField("USB-C Ports", formSpecs.ports_usb_c, (v) => setFormSpecs((p: any) => ({ ...p, ports_usb_c: v })))}
                        {renderField("Thunderbolt Ports", formSpecs.ports_thunderbolt, (v) => setFormSpecs((p: any) => ({ ...p, ports_thunderbolt: v })))}
                        {renderField("HDMI Ports", formSpecs.ports_hdmi, (v) => setFormSpecs((p: any) => ({ ...p, ports_hdmi: v })))}
                        {renderField("DisplayPort Ports", formSpecs.ports_displayport, (v) => setFormSpecs((p: any) => ({ ...p, ports_displayport: v })))}
                        {renderField("VGA Ports", formSpecs.ports_vga, (v) => setFormSpecs((p: any) => ({ ...p, ports_vga: v })))}
                        {renderField("SD Card Slots", formSpecs.ports_sdcard, (v) => setFormSpecs((p: any) => ({ ...p, ports_sdcard: v })))}
                        {renderField("Audio Jacks", formSpecs.ports_audiojack, (v) => setFormSpecs((p: any) => ({ ...p, ports_audiojack: v })))}
                        {renderField("Battery Capacity", formSpecs.battery_capacity, (v) => setFormSpecs((p: any) => ({ ...p, battery_capacity: v })))}
                        {renderField("Battery Equipped", formSpecs.battery_equipped, (v) => setFormSpecs((p: any) => ({ ...p, battery_equipped: v })))}
                        {renderField("Adapter Equipped", formSpecs.adapter_equipped, (v) => setFormSpecs((p: any) => ({ ...p, adapter_equipped: v })))}
                        {renderField("Adapter Output", formSpecs.adapter_output, (v) => setFormSpecs((p: any) => ({ ...p, adapter_output: v })))}
                        {renderField("AV Installed", formSpecs.av_installed, (v) => setFormSpecs((p: any) => ({ ...p, av_installed: v })))}
                        {renderField("AV Vendor", formSpecs.av_vendor, (v) => setFormSpecs((p: any) => ({ ...p, av_vendor: v })))}
                        {renderField("AV Status", formSpecs.av_status, (v) => setFormSpecs((p: any) => ({ ...p, av_status: v })))}
                        {renderField("AV License", formSpecs.av_license, (v) => setFormSpecs((p: any) => ({ ...p, av_license: v })))}
                        {renderField("VPN Installed", formSpecs.vpn_installed, (v) => setFormSpecs((p: any) => ({ ...p, vpn_installed: v })))}
                        {renderField("VPN Setup Type", formSpecs.vpn_setup_type, (v) => setFormSpecs((p: any) => ({ ...p, vpn_setup_type: v })))}
                        {renderField("VPN Username", formSpecs.vpn_username, (v) => setFormSpecs((p: any) => ({ ...p, vpn_username: v })))}
                        {renderField("Hostname", formSpecs.hostname, (v) => setFormSpecs((p: any) => ({ ...p, hostname: v })))}
                        {renderField("Installed Software", formSpecs.installed_software, (v) => setFormSpecs((p: any) => ({ ...p, installed_software: v })))}
                        {renderField("Office Account", formSpecs.office_account, (v) => setFormSpecs((p: any) => ({ ...p, office_account: v })))}
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Save changes?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will update the basic information and specs for this computer.
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

export default AssetDetailSpecComputer;
