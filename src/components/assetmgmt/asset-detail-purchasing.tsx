import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, FileText } from "lucide-react";

interface PurchasingProps {
    asset: any;
    purchaseData: any;
    formatCurrency: (value?: number | null) => string;
    formatDate: (value?: string | null) => string;
}

const DataRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-center border-b border-gray-100 last:border-0">
        <span className="text-sm">{label}</span>
        <span className="text-sm font-semibold">{value}</span>
    </div>
);

const AssetDetailPurchasing: React.FC<PurchasingProps> = ({ asset, purchaseData, formatCurrency, formatDate }) => {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-stone-50/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                                <ShoppingCart className="w-4 h-4 text-blue-600" />
                            </div>
                            Purchase Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <DataRow label="Purchase Date" value={formatDate(asset?.purchase_date || purchaseData?.purchase_date || asset?.purchasedate)} />
                            <DataRow label="Purchase Year" value={asset?.purchase_year || purchaseData?.purchase_year || '-'} />
                            <DataRow label="Purchase Price" value={formatCurrency(asset?.unit_price || asset?.purchaseprice || asset?.purchase_price)} />
                            <DataRow label="Supplier" value={(purchaseData?.supplier?.name || purchaseData?.supplier_name || asset?.supplier?.name || '-')} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-stone-50/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-purple-600" />
                            </div>
                            Purchase Order Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {purchaseData ? (
                            <div className="space-y-3">
                                {[
                                    {
                                        numberLabel: "PO Number",
                                        numberValue: purchaseData.po?.number || purchaseData.po_no || '-',
                                        dateLabel: "PO Date",
                                        dateValue: formatDate(purchaseData.po?.date || (purchaseData as any).po_date),
                                    },
                                    {
                                        numberLabel: "DO Number",
                                        numberValue: purchaseData.do?.number || purchaseData.do_no || '-',
                                        dateLabel: "DO Date",
                                        dateValue: formatDate(purchaseData.do?.date || (purchaseData as any).do_date),
                                    },
                                    {
                                        numberLabel: "GRN Number",
                                        numberValue: purchaseData.grn?.number || purchaseData.grn_no || '-',
                                        dateLabel: "GRN Date",
                                        dateValue: formatDate(purchaseData.grn?.date || (purchaseData as any).grn_date),
                                    }
                                ].map((row, idx) => (
                                    <div key={row.numberLabel} className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${idx < 2 ? 'border-b border-gray-100 pb-2' : ''}`}>
                                        <DataRow label={row.numberLabel} value={row.numberValue} />
                                        <DataRow label={row.dateLabel} value={row.dateValue || '-'} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <p className="text-sm">No purchase order data</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-stone-50/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-700">Financial Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Warranty Period</p>
                            <p className="text-sm font-semibold">
                                {purchaseData?.warranty_period
                                    ? `${purchaseData.warranty_period} ${purchaseData.warranty_period === 1 ? 'year' : 'years'}`
                                    : '-'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Depreciation</p>
                            <p className="text-sm font-semibold">-</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Book Value</p>
                            <p className="text-sm font-semibold">-</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Residual Value</p>
                            <p className="text-sm font-semibold">-</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AssetDetailPurchasing;
