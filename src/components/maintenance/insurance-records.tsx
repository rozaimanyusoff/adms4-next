'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { RefreshCcw, Search } from 'lucide-react';

type Insurance = {
  id: number | string;
  insurer: string;
  policy_no: string;
  start_date?: string;
  end_date?: string;
  coverage?: string;
  premium?: string;
  vehicles_count?: number;
};

const InsuranceRecords: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Insurance[]>([]);
  const [query, setQuery] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res: any = await authenticatedApi.get('/api/insurance');
      const data: Insurance[] = res?.data?.data || res?.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load insurance records');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(x =>
      (String(x.id)).includes(q) ||
      (x.insurer || '').toLowerCase().includes(q) ||
      (x.policy_no || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  function openDetail(id: string | number) {
    router.push(`/mtn/insurance/${id}`);
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-base w-full">Insurance Records</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
            <Input placeholder="Search insurer/policy/id" className="pl-7" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        <div className="border rounded overflow-hidden">
          <div className="grid grid-cols-12 bg-gray-100 dark:bg-gray-800 text-xs font-medium p-2">
            <div className="col-span-2">ID</div>
            <div className="col-span-3">Insurer</div>
            <div className="col-span-3">Policy No.</div>
            <div className="col-span-2">Start</div>
            <div className="col-span-2">End</div>
          </div>
          <div className="max-h-80 overflow-auto divide-y">
            {loading && <div className="p-3 text-sm text-gray-500">Loading...</div>}
            {!loading && filtered.length === 0 && (
              <div className="p-3 text-sm text-gray-500">No records</div>
            )}
            {!loading && filtered.map((x) => (
              <div
                key={x.id}
                className="grid grid-cols-12 items-center p-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                onDoubleClick={() => openDetail(x.id)}
                title="Double click to open detail"
              >
                <div className="col-span-2">{x.id}</div>
                <div className="col-span-3 font-medium">{x.insurer}</div>
                <div className="col-span-3">{x.policy_no}</div>
                <div className="col-span-2">{x.start_date?.slice(0,10) || '-'}</div>
                <div className="col-span-2">{x.end_date?.slice(0,10) || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InsuranceRecords;

