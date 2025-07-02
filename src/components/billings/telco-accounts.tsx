import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface Subscriber {
    id: number;
    ramco_id: string;
    current_owner: string;
    sub_no: string;
    account_sub: string;
    sim_sn: string;
    no_acc: string;
    account_id: number;
    status: string;
    cc: string;
    department: string;
    location: string;
    sn: string;
    asset_category: string;
    costcenter_id: number;
    department_id: number;
    district_id: number;
    category_id: number;
    brand_id: number;
    model_id: number;
    brand: string;
    model: string;
}

interface AccountData {
    id: number;
    account_master: string;
    subs: Subscriber[];
}

const TelcoAccounts: React.FC = () => {
    const [account, setAccount] = useState<AccountData | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchAccount = async () => {
        setLoading(true);
        try {
            const res = await authenticatedApi.get('/api/telco/accounts/subs');
            const response = res.data as { status: string; message: string; data: AccountData };
            setAccount(response.data);
        } catch (err) {
            toast.error('Failed to fetch account data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccount();
    }, []);

    const columns: ColumnDef<AccountData>[] = [
        { key: 'id', header: '#', sortable: false },
        { key: 'account_master', header: 'Account', sortable: true, filter: 'input' },
    ];

    return (
        <div className="mt-4">
            <h2 className="text-xl font-bold mb-4">Telco Account & Subscribers</h2>
            <CustomDataGrid
                data={account}
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
