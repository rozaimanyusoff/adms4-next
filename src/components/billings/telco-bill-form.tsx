import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";

interface TelcoAccount {
  id: number;
  account_no: string;
  provider: string;
  old_id: number;
}

interface TelcoBillDetail {
  util_id: number;
  bfcy_id: number;
  account: TelcoAccount;
  ubill_date: string;
  ubill_no: string;
  ubill_gtotal: string;
  ubill_paystat: string;
  details: TelcoBillDetailItem[];
}

interface TelcoBillDetailItem {
  util2_id: number;
  util_id_copy2: number;
  util_id: number;
  bill_id: number;
  sim_id: number;
  loc_id: number;
  cc_id: number;
  sim_user_id: string;
  cc_no: string;
  cc_user: string;
  util2_plan: string;
  util2_usage: string;
  util2_disc: string;
  util2_amt: string;
  cc_dt: string;
}

interface TelcoBillFormProps {
  utilId: number;
}

const TelcoBillForm: React.FC<TelcoBillFormProps> = ({ utilId }) => {
  const [data, setData] = useState<TelcoBillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    if (utilId && utilId > 0) {
      authenticatedApi.get<{ data: TelcoBillDetail }>(`/api/telco/bills/${utilId}`)
        .then(res => {
          setData(res.data.data);
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to load telco bill details.');
          setLoading(false);
        });
    } else {
      setData(null);
      setLoading(false);
    }
  }, [utilId]);

  if (loading) return <div className="p-4">Loading...</div>;
  if ((utilId && utilId > 0) && !data) return <div className="p-4">No data found.</div>;

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-800">
      <nav className="w-full bg-white dark:bg-gray-900 shadow-sm mb-6">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-center items-center">
          <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100">Telco Billing Form</h1>
        </div>
      </nav>
      <div className="flex gap-6 px-6 mx-auto">
        <div className="pt-4 w-full space-y-6">
          <div className="border rounded p-4 bg-white dark:bg-gray-900 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Bill Info</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex flex-col">
                <span className="font-medium mb-1">Provider</span>
                <Input type="text" value={data?.account?.provider || ''} readOnly className="w-full text-right border-0 rounded-none bg-gray-100" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium mb-1">Account No</span>
                <Input type="text" value={data?.account?.account_no || ''} readOnly className="w-full text-right border-0 rounded-none bg-gray-100" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium mb-1">Bill No</span>
                <Input type="text" value={data?.ubill_no || ''} readOnly className="w-full text-right border-0 rounded-none bg-gray-100" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium mb-1">Bill Date</span>
                <Input type="date" value={data?.ubill_date ? data.ubill_date.slice(0, 10) : ''} readOnly className="w-full text-right border-0 rounded-none bg-gray-100" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium mb-1">Grand Total</span>
                <Input type="text" value={data?.ubill_gtotal || ''} readOnly className="w-full text-right border-0 rounded-none bg-gray-100" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium mb-1">Status</span>
                <Input type="text" value={data?.ubill_paystat || ''} readOnly className="w-full text-right border-0 rounded-none bg-gray-100" />
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2 gap-2">
              <h3 className="text-xl font-semibold flex items-center gap-2">Details</h3>
            </div>
            <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-200 sticky -top-1 z-10">
                  <tr>
                    <th className="border px-2 py-1.5">#</th>
                    <th className="border px-2 py-1.5">SIM User ID</th>
                    <th className="border px-2 py-1.5">Plan</th>
                    <th className="border px-2 py-1.5">Usage</th>
                    <th className="border px-2 py-1.5">Discount</th>
                    <th className="border px-2 py-1.5">Amount</th>
                    <th className="border px-2 py-1.5">Cost Center</th>
                    <th className="border px-2 py-1.5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.details?.map((detail, idx) => (
                    <tr key={detail.util2_id}>
                      <td className="border px-2 text-center">{idx + 1}</td>
                      <td className="border px-2">{detail.sim_user_id}</td>
                      <td className="border px-2 text-right">{detail.util2_plan}</td>
                      <td className="border px-2 text-right">{detail.util2_usage}</td>
                      <td className="border px-2 text-right">{detail.util2_disc}</td>
                      <td className="border px-2 text-right">{detail.util2_amt}</td>
                      <td className="border px-2">{detail.cc_id}</td>
                      <td className="border px-2">{detail.cc_dt ? detail.cc_dt.slice(0, 10) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelcoBillForm;
