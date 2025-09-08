import React from 'react';

export default function MaintenanceFormPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Maintenance Bill Form</h1>
                    <p className="text-gray-600">
                        Add or edit vehicle maintenance billing records
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-center py-12">
                    <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-300" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Form Coming Soon</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            The maintenance bill form is currently under development.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
