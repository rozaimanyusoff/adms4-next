'use client';

import React, { useState } from 'react';
import { CustomDataGrid } from '@components/ui/DataGrid';

const columns = [
    { key: 'id', header: 'ID' },
    { key: 'item', header: 'Item' },
    { key: 'quantity', header: 'Quantity' },
    { key: 'status', header: 'Status' },
    { key: 'date', header: 'Date' },
    { key: 'actions', header: 'Actions' },
] as const;

const CInApp: React.FC = () => {
    const [showForm, setShowForm] = useState(false);
    // Placeholder for application records
    const applications: any[] = [];

    return (
        <div className="bg-white dark:bg-neutral-900 rounded shadow p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Stock In Applications</h2>
                <button
                    className="px-4 py-2 bg-primary text-white rounded"
                    onClick={() => setShowForm(v => !v)}
                >
                    {showForm ? 'Close Form' : 'Create Stock In Application'}
                </button>
            </div>
            {showForm && (
                <div className="mb-6">
                    {/* Replace with actual form component */}
                    <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded border mb-4">
                        <div className="text-gray-500 text-center">Stock in application form goes here.</div>
                    </div>
                </div>
            )}
            {/* Table of applications */}
            <CustomDataGrid columns={columns as any} data={applications} />
            {applications.length === 0 && (
                <div className="text-gray-500 text-center py-10">No stock in applications yet.</div>
            )}
        </div>
    );
};

export default CInApp;
