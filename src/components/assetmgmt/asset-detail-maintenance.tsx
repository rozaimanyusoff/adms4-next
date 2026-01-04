import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench } from "lucide-react";

interface MaintenanceProps {
    maintenanceRecords: any[];
    formatCurrency: (value?: number | null) => string;
    formatDate: (value?: string | null) => string;
}

const AssetDetailMaintenance: React.FC<MaintenanceProps> = ({ maintenanceRecords, formatCurrency, formatDate }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-orange-600" />
                    Maintenance History
                </h3>
                <Badge variant="secondary" className="text-xs">{maintenanceRecords.length} records</Badge>
            </div>

            {maintenanceRecords.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {maintenanceRecords.map((record: any, idx: number) => (
                        <Card key={idx} className="bg-stone-50/50 hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{record.description || record.svc_type || 'Maintenance'}</p>
                                        <p className="text-xs text-gray-500">{formatDate(record.req_date || record.svc_date)}</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs font-semibold">{formatCurrency(record.amount || record.inv_total)}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-gray-500">Supplier: </span>
                                        <span className="font-medium text-gray-900">{record.supplier?.name || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Status: </span>
                                        <Badge variant="secondary" className="text-xs h-5">{record.status || record.inv_stat || '-'}</Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="bg-stone-50/50">
                    <CardContent className="p-8 text-center">
                        <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No maintenance records available</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AssetDetailMaintenance;
