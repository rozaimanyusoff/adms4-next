import React from "react";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

interface OwnershipProps {
    asset: any;
    ownerHistory: any[];
    formatDate: (value?: string | null) => string;
}

const AssetDetailOwnership: React.FC<OwnershipProps> = ({ ownerHistory, formatDate }) => {
    const hasHistory = Array.isArray(ownerHistory) && ownerHistory.length > 0;

    return (
        <div className="space-y-4 text-slate-900 dark:text-slate-100">
            <section className="px-3 py-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 leading-none">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/15 dark:bg-cyan-500/18 flex items-center justify-center border border-cyan-500/20">
                        <RefreshCw className="w-4 h-4 text-cyan-600 dark:text-cyan-300" strokeWidth={2.2} />
                    </div>
                    Ownership History
                </h3>
                <div className="h-px bg-cyan-500/20 mt-3 mb-4" />

                {hasHistory ? (
                    <div className="relative border-l-2 border-cyan-500/25 pl-6 space-y-6">
                        {ownerHistory.map((record: any, idx: number) => {
                            const isCurrent = idx === ownerHistory.length - 1;
                            return (
                                <div key={idx} className="relative">
                                    <div className={`absolute -left-8 w-4 h-4 rounded-full ${isCurrent ? 'bg-emerald-400' : 'bg-slate-500'} border-4 border-white dark:border-[#102a53] shadow-sm`} />
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{record?.name || record?.employee?.name || '-'}</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-300">{record?.department?.name || record?.department || '-'}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{record?.location?.name || record?.location || '-'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-600 dark:text-slate-300">{formatDate(record?.effective_date || record?.assign_date)}</p>
                                            {isCurrent && <Badge className="mt-1 text-xs bg-emerald-500 text-slate-950 hover:bg-emerald-500">Current</Badge>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-14 text-center">
                        <RefreshCw className="w-10 h-10 text-slate-500 dark:text-slate-400 mx-auto mb-4" />
                        <p className="text-2xl text-slate-700 dark:text-slate-300">No reassignments recorded</p>
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Asset has not been handed over since acquisition.</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default AssetDetailOwnership;
