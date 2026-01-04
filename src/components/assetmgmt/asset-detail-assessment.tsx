import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";

interface AssessmentProps {
    assessmentRecords: any[];
    formatDate: (value?: string | null) => string;
}

const AssetDetailAssessment: React.FC<AssessmentProps> = ({ assessmentRecords, formatDate }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                    Compliance Assessment History
                </h3>
                <Badge variant="secondary" className="text-xs">{assessmentRecords.length} records</Badge>
            </div>

            {assessmentRecords.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {assessmentRecords.map((record: any, idx: number) => (
                        <Card key={idx} className="bg-stone-50/50 hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Assessment #{record.assess_id}</p>
                                        <p className="text-xs text-gray-500">{formatDate(record.a_date)}</p>
                                    </div>
                                    <div className="text-right flex flex-col gap-1">
                                        <Badge variant={record.a_ncr > 0 ? 'destructive' : 'default'} className="text-xs">
                                            NCR: {record.a_ncr || 0}
                                        </Badge>
                                        <span className="text-xs text-gray-600">Rating: {record.a_rate || '-'}</span>
                                    </div>
                                </div>
                                {record.a_remark && (
                                    <p className="text-xs text-gray-600 mt-2 bg-white p-2 rounded">{record.a_remark}</p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="bg-stone-50/50">
                    <CardContent className="p-8 text-center">
                        <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No assessment records available</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AssetDetailAssessment;
