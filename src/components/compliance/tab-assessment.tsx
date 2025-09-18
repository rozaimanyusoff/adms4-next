"use client";

import React from "react";
import AssessmentCriteriaGrid from "@/components/compliance/assessment-criteria";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: 'Assessment Criteria Management',
    description: 'Manage assessment criteria for compliance assessments',
};

const TabAssessment: React.FC = () => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Assessment Management</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="criteria" className="w-full">
                    <TabsList className="mb-2">
                        <TabsTrigger value="criteria">Assessment Criteria</TabsTrigger>
                        <TabsTrigger value="other">Other Tab</TabsTrigger>
                        {/* Add more TabsTrigger as needed */}
                    </TabsList>
                    <TabsContent value="criteria">
                        <AssessmentCriteriaGrid />
                    </TabsContent>
                    <TabsContent value="other">
                        {/* Other tab content here */}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default TabAssessment;
