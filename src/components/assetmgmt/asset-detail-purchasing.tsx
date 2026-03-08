import React from "react";
import { ShoppingCart, FileText } from "lucide-react";

interface PurchasingProps {
    asset: any;
    purchaseData: any;
    formatCurrency: (value?: number | null) => string;
    formatDate: (value?: string | null) => string;
}

const DataRow = ({ label, value, valueClassName = "" }: { label: string; value: React.ReactNode; valueClassName?: string }) => (
    <div className="flex justify-between items-center border-b border-cyan-500/18 last:border-0 py-2.5">
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`text-sm font-semibold text-slate-900 dark:text-slate-100 ${valueClassName}`}>{value}</span>
    </div>
);

const AssetDetailPurchasing: React.FC<PurchasingProps> = ({ asset, purchaseData, formatCurrency, formatDate }) => {
    const purchasePrice = formatCurrency(asset?.unit_price || asset?.purchaseprice || asset?.purchase_price);
    const poRows = [
        {
            numberLabel: "PO Number",
            numberValue: purchaseData?.po?.number || purchaseData?.po_no || '-',
            dateLabel: "PO Date",
            dateValue: formatDate(purchaseData?.po?.date || purchaseData?.po_date),
        },
        {
            numberLabel: "DO Number",
            numberValue: purchaseData?.do?.number || purchaseData?.do_no || '-',
            dateLabel: "DO Date",
            dateValue: formatDate(purchaseData?.do?.date || purchaseData?.do_date),
        },
        {
            numberLabel: "GRN Number",
            numberValue: purchaseData?.grn?.number || purchaseData?.grn_no || '-',
            dateLabel: "GRN Date",
            dateValue: formatDate(purchaseData?.grn?.date || purchaseData?.grn_date),
        }
    ];

    return (
        <div className="space-y-4 text-slate-900 dark:text-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="px-3 py-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 leading-none">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/15 dark:bg-cyan-500/18 flex items-center justify-center border border-cyan-500/20">
                            <ShoppingCart className="w-4 h-4 text-cyan-600 dark:text-cyan-400" strokeWidth={2.2} />
                        </div>
                        Purchase Details
                    </h3>
                    <div className="h-px bg-cyan-500/20 mt-3 mb-4" />
                    <div className="space-y-3">
                        <DataRow label="Purchase Date" value={formatDate(asset?.purchase_date || purchaseData?.purchase_date || asset?.purchasedate)} />
                        <DataRow label="Purchase Year" value={asset?.purchase_year || purchaseData?.purchase_year || '-'} />
                        <DataRow label="Purchase Price" value={purchasePrice} valueClassName="text-amber-400" />
                        <DataRow label="Supplier" value={(purchaseData?.supplier?.name || purchaseData?.supplier_name || asset?.supplier?.name || '-')} />
                    </div>
                </section>

                <section className="px-3 py-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 leading-none">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/15 dark:bg-indigo-500/18 flex items-center justify-center border border-indigo-500/20">
                            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-300" strokeWidth={2.2} />
                        </div>
                        Purchase Order Info
                    </h3>
                    <div className="h-px bg-cyan-500/20 mt-3 mb-4" />
                    {purchaseData ? (
                        <div className="space-y-2">
                            {poRows.map((row, idx) => (
                                <div key={row.numberLabel} className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${idx < 2 ? 'border-b border-cyan-500/18 pb-3' : 'pt-1'}`}>
                                    <DataRow label={row.numberLabel} value={row.numberValue} valueClassName={row.numberValue !== '-' ? 'text-cyan-700 dark:text-cyan-400' : ''} />
                                    <DataRow label={row.dateLabel} value={row.dateValue || '-'} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            <p className="text-sm">No purchase order data</p>
                        </div>
                    )}
                </section>
            </div>

            <section className="px-3 py-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Financial Information</h3>
                <div className="h-px bg-cyan-500/20 mt-3 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-cyan-500/25 bg-slate-50/85 dark:bg-[#0b2246]/78 p-4 min-h-21.5">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 tracking-wide">Warranty Period</p>
                        <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                            {purchaseData?.warranty_period
                                ? `${purchaseData.warranty_period} ${purchaseData.warranty_period === 1 ? 'year' : 'years'}`
                                : '-'}
                        </p>
                    </div>
                    <div className="rounded-xl border border-cyan-500/25 bg-slate-50/85 dark:bg-[#0b2246]/78 p-4 min-h-21.5">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 tracking-wide">Depreciation Rate</p>
                        <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">-</p>
                        <div className="h-1.5 rounded-full bg-slate-300/70 dark:bg-slate-700/50 overflow-hidden">
                            <div className="h-full w-3/5 bg-teal-500 dark:bg-[#10d6bd]" />
                        </div>
                    </div>
                    <div className="rounded-xl border border-cyan-500/25 bg-slate-50/85 dark:bg-[#0b2246]/78 p-4 min-h-21.5">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 tracking-wide">Book Value</p>
                        <p className="text-xl font-semibold text-amber-400">-</p>
                    </div>
                    <div className="rounded-xl border border-cyan-500/25 bg-slate-50/85 dark:bg-[#0b2246]/78 p-4 min-h-21.5">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 tracking-wide">Residual Value</p>
                        <p className="text-xl font-semibold text-teal-500 dark:text-[#10d6bd]">-</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AssetDetailPurchasing;
