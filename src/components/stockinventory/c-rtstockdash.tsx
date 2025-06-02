import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';

// Types
interface StockAnalysis {
  stock: {
    total_items: number;
    total_issued: number;
    total_available: number;
    total_defective: number;
    total_installed: number;
    total_uninstalled: number;
  };
  teams: Array<{
    team_id: number;
    team_name: string;
    issued_count: number;
    available_count: number;
    defective_count: number;
    installed_count: number;
    uninstalled_count: number;
  }>;
  top_5_items: Array<{
    item_code: string;
    item_name: string;
    issued_count: number;
    available_count: number;
    defective_count: number;
    installed_count: number;
    uninstalled_count: number;
  }>;
}

// Helper for random bg color
const widgetBgColors = [
  'bg-blue-100 dark:bg-blue-900',
  'bg-green-100 dark:bg-green-900',
  'bg-yellow-100 dark:bg-yellow-900',
  'bg-red-100 dark:bg-red-900',
  'bg-purple-100 dark:bg-purple-900',
  'bg-pink-100 dark:bg-pink-900',
  'bg-orange-100 dark:bg-orange-900',
  'bg-cyan-100 dark:bg-cyan-900',
  'bg-teal-100 dark:bg-teal-900',
];
function getRandomBg(idx: number) {
  return widgetBgColors[idx % widgetBgColors.length];
}

const CDash: React.FC = () => {
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    authenticatedApi.get('/api/stock/analysis')
      .then(res => {
        setAnalysis((res as any).data?.analysis || null);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-gray-500 text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">{error}</div>;
  if (!analysis) return <div className="text-gray-500 text-center py-10">No data available.</div>;

  const { stock, teams, top_5_items } = analysis;

  return (
    <div className="w-full max-w-5xl mx-auto mt-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className={`rounded shadow-lg p-4 text-center ${getRandomBg(0)}`}>
          <div className="text-lg font-semibold">Total Products</div>
          <div className="text-3xl font-bold text-blue-600">{stock.total_items}</div>
        </div>
        <div className={`rounded shadow-lg p-4 text-center ${getRandomBg(1)}`}>
          <div className="text-lg font-semibold">Total Issued</div>
          <div className="text-3xl font-bold text-green-600">{stock.total_issued}</div>
        </div>
        <div className={`rounded shadow-lg p-4 text-center ${getRandomBg(2)}`}>
          <div className="text-lg font-semibold">Total Available</div>
          <div className="text-3xl font-bold text-primary">{stock.total_available}</div>
        </div>
        <div className={`rounded shadow-lg p-4 text-center ${getRandomBg(3)}`}>
          <div className="text-lg font-semibold">Total Defective</div>
          <div className="text-3xl font-bold text-red-500">{stock.total_defective}</div>
        </div>
      </div>
      {/* Teams Row */}
      <div className="mb-8">
        <div className="text-lg font-semibold mb-2">Issued by Team</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {teams.map((team, idx) => (
            <div key={team.team_id} className={`rounded shadow-lg p-4 text-center ${getRandomBg(idx + 4)}`}>
              <div className="font-semibold">{team.team_name}</div>
              <div className="text-2xl font-bold text-blue-700">{team.issued_count}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Top 5 Items Row */}
      <div className="mb-8">
        <div className="text-lg font-semibold mb-2">Top 5 Issued Items</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {top_5_items.map((item, idx) => (
            <div key={item.item_code} className={`rounded shadow-lg p-4 text-center ${getRandomBg(idx + 7)}`}>
              <div className="font-semibold">{item.item_name}</div>
              <div className="text-xs text-gray-500">{item.item_code}</div>
              <div className="text-2xl font-bold text-green-700 mt-2">{item.issued_count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CDash;
