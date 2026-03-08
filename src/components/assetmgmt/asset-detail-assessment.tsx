import React from "react";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";

interface AssessmentProps {
    assessmentRecords: any[];
    formatDate: (value?: string | null) => string;
}

const AssetDetailAssessment: React.FC<AssessmentProps> = ({ assessmentRecords, formatDate }) => {
    return (
        <div className="space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between mb-2 px-3 pt-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 leading-none">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 dark:bg-amber-500/18 flex items-center justify-center border border-amber-500/20">
                        <ClipboardCheck className="w-4 h-4 text-amber-600 dark:text-amber-300" strokeWidth={2.2} />
                    </div>
                    Annual Condition Assessments
                </h3>
                <Badge className="text-xs bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30">{assessmentRecords.length} records</Badge>
            </div>
            <div className="h-px bg-cyan-500/20 mx-3" />

            {assessmentRecords.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 px-3">
                    {assessmentRecords.map((record: any, idx: number) => {
                        const isLast = idx === assessmentRecords.length - 1;
                        return (
                            <div key={idx} className={`py-3 ${!isLast ? 'border-b border-cyan-500/20' : ''}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assessment #{record.assess_id}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(record.a_date)}</p>
                                    </div>
                                    <div className="text-right flex flex-col gap-1">
                                        <Badge variant={record.a_ncr > 0 ? 'destructive' : 'default'} className={`text-xs ${record.a_ncr > 0 ? '' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-500'}`}>
                                            NCR: {record.a_ncr || 0}
                                        </Badge>
                                        <span className="text-xs text-slate-600 dark:text-slate-300">Rating: {record.a_rate || '-'}</span>
                                    </div>
                                </div>
                                {record.a_remark && (
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-50/85 dark:bg-[#0b2246]/70 border border-cyan-500/20 p-2 rounded">{record.a_remark}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="py-14 text-center text-slate-500 dark:text-slate-400">
                    <ClipboardCheck className="w-10 h-10 text-slate-500 dark:text-slate-400 mx-auto mb-4" />
                    <p className="text-2xl text-slate-700 dark:text-slate-300">No assessments completed</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Physical and condition audit results will appear here.</p>
                </div>
            )}
        </div>
    );
};

export default AssetDetailAssessment;
