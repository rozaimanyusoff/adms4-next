"use client";

import DataImporter from "@/components/data-importer/DataImporter";
import { Metadata } from 'next';
import React from 'react';

const DataImporters = () => {
    const handleConfirm = (tableName: string, headers: string[], data: any[][]) => {
        // TODO: implement what should happen on confirm
        console.log('Confirmed:', { tableName, headers, data });
    };

    return <DataImporter onConfirm={handleConfirm} />;
};

export default DataImporters;