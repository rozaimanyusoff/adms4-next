import React from "react";
import { Trash2 } from "lucide-react";

interface DisposalProps {
    asset: any;
}

const AssetDetailDisposal: React.FC<DisposalProps> = ({ asset }) => {
    const recordStatus = String(asset?.record_status || asset?.status || '').toLowerCase();
    const title = recordStatus === 'disposed' ? 'Asset is Disposed' : 'Asset is Active';

    return (
        <div className="space-y-4 text-slate-900 dark:text-slate-100">
            <section className="px-3 py-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 leading-none">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/15 dark:bg-rose-500/18 flex items-center justify-center border border-rose-500/20">
                        <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-300" strokeWidth={2.2} />
                    </div>
                    Disposal
                </h3>
                <div className="h-px bg-cyan-500/20 mt-3 mb-4" />

                <div className="py-14 text-center text-slate-500 dark:text-slate-400">
                    <Trash2 className="w-10 h-10 text-slate-500 dark:text-slate-400 mx-auto mb-4" />
                    <p className="text-2xl text-slate-700 dark:text-slate-300">{title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Disposal planning and decommissioning details will appear here when initiated.</p>
                </div>
            </section>
        </div>
    );
};

export default AssetDetailDisposal;
