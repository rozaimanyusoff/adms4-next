'use client';
import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '@store/AuthContext';
import { authenticatedApi } from '@/config/api';
import { CustomDataGrid, ColumnDef } from '@components/ui/DataGrid';
import { Loader2 } from 'lucide-react';

interface AuthLog {
    id: number;
    action: string;
    status: string;
    ip: string;
    user_agent: string;
    details?: string | null;
    created_at: string;
    user: {
        id: number;
        name: string;
    };
}

const CLogs: React.FC = () => {
    const authContext = useContext(AuthContext);
    const user = authContext?.authData?.user;
    const [logs, setLogs] = useState<AuthLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        if (!user?.username || typeof user.role === 'undefined') {
            setLoading(false);
            return;
        }
        authenticatedApi.get('/api/users/logs')
            .then(res => {
                if (res.status !== 200) throw new Error('Failed to fetch logs');
                const data = res.data as { status: string; message: string; logs: AuthLog[] };
                if (Array.isArray(data.logs)) {
                    setLogs(data.logs);
                } else {
                    setLogs([]);
                }
            })
            .catch(err => setError(err.message))
            .then(() => setLoading(false));
    }, [user]);

    // Define columns for CustomDataGrid
    const columns: ColumnDef<AuthLog & { row_number: number }>[] = [
        { key: 'row_number', header: '#', render: row => row.row_number },
        { key: 'user', header: 'User ID', sortable: true, render: row => row.user?.name ?? '-', filter: 'input' },
        { key: 'action', header: 'Action', sortable: true, filter: 'singleSelect' },
        { key: 'status', header: 'Status', sortable: true, filter: 'singleSelect' },
        { key: 'ip', header: 'IP Address', sortable: true },
        { key: 'user_agent', header: 'User Agent', render: row => (
            <span title={row.user_agent} className="truncate max-w-xs inline-block align-middle">{row.user_agent}</span>
        ) },
        { key: 'created_at', header: 'Date', sortable: true, render: row => new Date(row.created_at).toLocaleString() },
        // Add User Name as a custom column at the end
        { key: 'user', header: 'User Name', sortable: true, render: row => row.user?.name ?? '-' },
    ];
    // Add row_number for display
    const logsWithRowNumber = logs.map((log, idx) => ({ ...log, row_number: idx + 1 }));

    return (
        <div className="mt-4">
            <h2 className="text-lg font-bold mb-4">Authentication Logs</h2>
            {loading && (
                <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" /> Loading logs...</div>
            )}
            {error && <div className="text-red-600 mb-2">{error}</div>}
            {!loading && !error && logs.length === 0 && (
                <div className="text-gray-400 italic">No logs found.</div>
            )}
            {!loading && !error && logs.length > 0 && (
                <CustomDataGrid
                    data={logsWithRowNumber}
                    columns={columns}
                    pageSize={10}
                    pagination={true}
                    inputFilter={false}
                    theme={'sm'}
                />
            )}
        </div>
    );
};

export default CLogs;
