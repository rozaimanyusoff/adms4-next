import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, UserCheck } from "lucide-react";

interface OwnershipProps {
    asset: any;
    ownerHistory: any[];
    formatDate: (value?: string | null) => string;
}

const AssetDetailOwnership: React.FC<OwnershipProps> = ({ ownerHistory, formatDate }) => {
    return (
        <div className="space-y-4">
            <Card className="bg-stone-50/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                            <UserCheck className="w-4 h-4 text-green-600" />
                        </div>
                        Current Assignment
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {ownerHistory && ownerHistory.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Owner</p>
                                <p className="text-sm font-semibold text-gray-900">{ownerHistory[ownerHistory.length - 1]?.name || ownerHistory[ownerHistory.length - 1]?.employee?.name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Department</p>
                                <p className="text-sm font-semibold text-gray-900">{ownerHistory[ownerHistory.length - 1]?.department?.name || ownerHistory[ownerHistory.length - 1]?.department || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Cost Center</p>
                                <p className="text-sm font-semibold text-gray-900">{ownerHistory[ownerHistory.length - 1]?.costcenter?.name || ownerHistory[ownerHistory.length - 1]?.costcenter || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Assigned Date</p>
                                <p className="text-sm font-semibold text-gray-900">{formatDate(ownerHistory[ownerHistory.length - 1]?.effective_date || ownerHistory[ownerHistory.length - 1]?.assign_date)}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-400">
                            <p className="text-sm">No ownership data available</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-stone-50/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <History className="w-4 h-4 text-gray-600" />
                        Movement History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {ownerHistory && ownerHistory.length > 0 ? (
                        <div className="relative border-l-2 border-gray-200 pl-6 space-y-6">
                            {ownerHistory.map((record: any, idx: number) => {
                                const isCurrent = idx === ownerHistory.length - 1;
                                return (
                                    <div key={idx} className="relative">
                                        <div className={`absolute -left-8 w-4 h-4 rounded-full ${isCurrent ? 'bg-green-500' : 'bg-gray-300'} border-4 border-white shadow-sm`} />
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{record?.name || record?.employee?.name || '-'}</p>
                                                <p className="text-xs text-gray-600">{record?.department?.name || record?.department || '-'}</p>
                                                <p className="text-xs text-gray-500">{record?.location?.name || record?.location || '-'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-600">{formatDate(record?.effective_date || record?.assign_date)}</p>
                                                {isCurrent && <Badge variant="default" className="mt-1 text-xs">Current</Badge>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <History className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm">No movement history available</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AssetDetailOwnership;
