'use client';
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Cpu, HardDrive, MemoryStick, Edit2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authenticatedApi } from "@/config/api";

interface ComputerSpecsProps {
    asset: any;
    onUpdate?: () => void;
}

const ComputerSpecs: React.FC<ComputerSpecsProps> = ({ asset, onUpdate }) => {
    const specs = asset?.specs || asset?.extra_specs || {};
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [saving, setSaving] = useState(false);

    const handleEdit = (fieldName: string, currentValue: any) => {
        setEditingField(fieldName);
        setEditValue(currentValue || "");
    };

    const handleCancel = () => {
        setEditingField(null);
        setEditValue("");
    };

    const handleSave = async (fieldName: string) => {
        setSaving(true);
        try {
            const updatedSpecs = { ...specs, [fieldName]: editValue };
            await authenticatedApi.put(`/api/assets/${asset.id}`, {
                specs: updatedSpecs,
                extra_specs: updatedSpecs
            });
            setEditingField(null);
            setEditValue("");
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to update spec:", error);
            alert("Failed to update. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const renderEditableField = (label: string, fieldName: string, currentValue: any, icon?: React.ReactNode) => {
        const isEditing = editingField === fieldName;
        let displayValue: React.ReactNode = currentValue ?? '-';

        if (fieldName === "memory_size_gb" && currentValue !== undefined && currentValue !== null && currentValue !== '') {
            displayValue = `${currentValue} GB`;
        }
        if (fieldName === "storage_size_gb" && currentValue !== undefined && currentValue !== null && currentValue !== '') {
            displayValue = `${currentValue} GB`;
        }

        return (
            <div className={icon ? "flex items-start gap-3" : ""}>
                {icon && <span className="mt-1">{icon}</span>}
                <div className="flex-1">
                    <p className="text-sm text-gray-600">{label}</p>
                    {isEditing ? (
                        <div className="flex items-center gap-2 mt-1">
                            <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                                disabled={saving}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleSave(fieldName)}
                                disabled={saving}
                            >
                                <Check className="w-4 h-4" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={handleCancel}
                                disabled={saving}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group">
                            <p className="font-semibold">{displayValue}</p>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleEdit(fieldName, currentValue)}
                            >
                                <Edit2 className="w-3 h-3 text-gray-400" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    return (
        <div className="space-y-4">
            <Card className="bg-stone-50/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Monitor className="w-4 h-4 text-purple-600" />
                        </div>
                        Computer Specifications
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {renderEditableField(
                            "Processor",
                            "cpu_model",
                            specs?.cpu_model || specs?.processor || specs?.cpu,
                            <Cpu className="w-5 h-5 text-blue-500" />
                        )}
                        {renderEditableField(
                            "RAM (GB)",
                            "memory_size_gb",
                            specs?.memory_size_gb ?? specs?.ram ?? specs?.memory,
                            <MemoryStick className="w-5 h-5 text-green-500" />
                        )}
                        {renderEditableField(
                            "Storage (GB)",
                            "storage_size_gb",
                            specs?.storage_size_gb ?? specs?.storage ?? specs?.hdd,
                            <HardDrive className="w-5 h-5 text-orange-500" />
                        )}
                        {renderEditableField(
                            "Graphics",
                            "graphics_specs",
                            specs?.graphics_specs ?? specs?.graphics_type ?? specs?.graphics ?? specs?.gpu
                        )}
                        {renderEditableField(
                            "Operating System",
                            "os_version",
                            specs?.os_version || specs?.os_name || specs?.os || specs?.operating_system
                        )}
                        {renderEditableField(
                            "Screen Size",
                            "display_size",
                            specs?.display_size || specs?.display
                        )}
                        {renderEditableField(
                            "Network Card",
                            "ports_ethernet",
                            specs?.ports_ethernet ?? specs?.network_card ?? specs?.nic
                        )}
                        {renderEditableField(
                            "Battery",
                            "battery_capacity",
                            specs?.battery_capacity ?? specs?.battery
                        )}
                        {renderEditableField(
                            "Hostname",
                            "hostname",
                            specs?.hostname || specs?.computer_name
                        )}
                        {renderEditableField(
                            "Serial Number",
                            "serial_number",
                            specs?.serial_number || asset?.serial_number
                        )}
                    </div>
                </CardContent>
            </Card>

            {(specs?.software || specs?.installed_software) && (
                <Card className="bg-stone-50/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-700">Installed Software</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {renderEditableField("Software", "installed_software", specs.installed_software || specs.software)}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default ComputerSpecs;
