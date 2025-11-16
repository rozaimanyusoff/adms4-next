'use client';
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Zap, Gauge, Edit2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authenticatedApi } from "@/config/api";

interface EquipmentSpecsProps {
    asset: any;
    onUpdate?: () => void;
}

const EquipmentSpecs: React.FC<EquipmentSpecsProps> = ({ asset, onUpdate }) => {
    const specs = asset?.extra_specs || {};
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
        const displayValue = currentValue || '-';

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
                        <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                            <Wrench className="w-4 h-4 text-orange-600" />
                        </div>
                        Equipment/Instrument Specifications
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {renderEditableField(
                            "Power Rating",
                            "power_rating",
                            specs?.power_rating || specs?.wattage,
                            <Zap className="w-5 h-5 text-yellow-500" />
                        )}
                        {renderEditableField(
                            "Voltage",
                            "voltage",
                            specs?.voltage,
                            <Gauge className="w-5 h-5 text-blue-500" />
                        )}
                        {renderEditableField("Frequency", "frequency", specs?.frequency)}
                        {renderEditableField("Dimensions", "dimensions", specs?.dimensions)}
                        {renderEditableField("Weight", "weight", specs?.weight)}
                        {renderEditableField("Capacity", "capacity", specs?.capacity)}
                        {renderEditableField("Calibration Date", "calibration_date", specs?.calibration_date)}
                        {renderEditableField("Next Calibration", "next_calibration", specs?.next_calibration)}
                        {renderEditableField("Certification", "certification", specs?.certification)}
                    </div>
                </CardContent>
            </Card>

            {specs?.technical_specs && (
                <Card className="bg-stone-50/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-700">Technical Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {renderEditableField("Technical Specifications", "technical_specs", specs.technical_specs)}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default EquipmentSpecs;
