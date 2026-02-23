'use client';

import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CorrespondenceRegister from './docs-correspondence-register';
import { Direction, seedCorrespondenceRecords } from './correspondence-tracking-data';

type CorrespondenceTabsProps = {
    value: 'all' | Direction;
    onValueChange: (value: 'all' | Direction) => void;
};

export const CorrespondenceTabs = ({ value, onValueChange }: CorrespondenceTabsProps) => {
    return (
        <Tabs value={value} onValueChange={(next) => onValueChange(next as 'all' | Direction)} className="w-full">
            <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="incoming">Incoming</TabsTrigger>
                <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
            </TabsList>
        </Tabs>
    );
};

export const DocsCorrespondenceTabs = () => {
    const [directionTab, setDirectionTab] = useState<'all' | Direction>('all');

    const filteredRecords = useMemo(() => {
        return seedCorrespondenceRecords.filter((record) => {
            return directionTab === 'all' ? true : record.direction === directionTab;
        });
    }, [directionTab]);

    return (
        <div className="space-y-6">
            <CorrespondenceTabs value={directionTab} onValueChange={setDirectionTab} />
            <CorrespondenceRegister records={filteredRecords} />
        </div>
    );
};

export default DocsCorrespondenceTabs;
