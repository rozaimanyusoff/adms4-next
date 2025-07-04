import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface AccountData {
    id: number;
    account_master: string;
}

const TelcoAccounts: React.FC = () => {
    const [accounts, setAccounts] = useState<AccountData[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await authenticatedApi.get('/api/telco/accounts');
            const response = res.data as { status: string; message: string; data: AccountData[] };
            setAccounts(response.data);
        } catch (err) {
            toast.error('Failed to fetch account data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const columns: ColumnDef<AccountData>[] = [
        { key: 'id', header: '#', sortable: false },
        { key: 'account_master', header: 'Account', sortable: true, filter: 'input' },
    ];

    return (
        <div className="mt-4">
            <h2 className="text-xl font-bold mb-4">Telco Account & Subscribers</h2>
            <CustomDataGrid
                data={accounts}
                columns={columns}
                pageSize={10}
                pagination={true}
                inputFilter={false}
                theme="sm"
                dataExport={true}
            />
        </div>
    );
};

export default TelcoAccounts;
