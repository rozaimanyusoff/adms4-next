'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TrainingDashboard from '@/components/training/training-dashboard';
import TrainingRecordList from '@/components/training/training-record';

const TrainingTabs = () => {
    return (
        <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="w-full justify-start gap-2">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="records">Records</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
                <TrainingDashboard />
            </TabsContent>

            <TabsContent value="records">
                <TrainingRecordList />
            </TabsContent>
        </Tabs>
    );
};

export default TrainingTabs;
