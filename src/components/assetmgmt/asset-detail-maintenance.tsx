import React from "react";
import { Badge } from "@/components/ui/badge";
import { Wrench } from "lucide-react";

interface MaintenanceProps {
    maintenanceRecords: any[];
    formatCurrency: (value?: number | null) => string;
    formatDate: (value?: string | null) => string;
}

const AssetDetailMaintenance: React.FC<MaintenanceProps> = ({ maintenanceRecords, formatCurrency, formatDate }) => {
    return (
        <div className="space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between mb-2 px-3 pt-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 leading-none">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/15 dark:bg-cyan-500/18 flex items-center justify-center border border-cyan-500/20">
                        <Wrench className="w-4 h-4 text-cyan-600 dark:text-cyan-300" strokeWidth={2.2} />
                    </div>
                    Maintenance History
                </h3>
                <Badge className="text-xs bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30">{maintenanceRecords.length} records</Badge>
            </div>
            <div className="h-px bg-cyan-500/20 mx-3" />

            {maintenanceRecords.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 px-3">
                    {maintenanceRecords.map((record: any, idx: number) => {
                        const isLast = idx === maintenanceRecords.length - 1;
                        return (
                            <div key={idx} className={`py-3 ${!isLast ? 'border-b border-cyan-500/20' : ''}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{record.description || record.svc_type || 'Maintenance'}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(record.req_date || record.svc_date)}</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs font-semibold border-cyan-500/30 text-cyan-700 dark:text-cyan-300">
                                        {formatCurrency(record.amount || record.inv_total)}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-slate-500 dark:text-slate-400">Supplier: </span>
                                        <span className="font-medium text-slate-900 dark:text-slate-100">{record.supplier?.name || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 dark:text-slate-400">Status: </span>
                                        <Badge className="text-xs h-5 bg-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-700/60 dark:text-slate-200 dark:hover:bg-slate-700/60">{record.status || record.inv_stat || '-'}</Badge>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="py-14 text-center text-slate-500 dark:text-slate-400">
                    <Wrench className="w-10 h-10 text-slate-500 dark:text-slate-400 mx-auto mb-4" />
                    <p className="text-2xl text-slate-700 dark:text-slate-300">No maintenance records</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Routine maintenance, repairs and expenses will appear here.</p>
                </div>
            )}
        </div>
    );
};

export default AssetDetailMaintenance;
