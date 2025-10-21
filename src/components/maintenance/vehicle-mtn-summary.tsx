"use client";
import React from 'react';
import { authenticatedApi } from '@/config/api';
import { AuthContext } from '@/store/AuthContext';

type SummaryMap = Record<number, Record<number, number[]>>; // year -> month(1-12) -> req_ids

function formatDMY(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function VehicleMtnSummary({ onOpen }: { onOpen?: (id: number) => void }) {
  const auth = React.useContext(AuthContext);
  const username = auth?.authData?.user?.username || '';
  const [summary, setSummary] = React.useState<SummaryMap>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      if (!username) return;
      setLoading(true);
      setError(null);
      try {
        const res = await authenticatedApi.get(`/api/mtn/request?ramco=${encodeURIComponent(username)}`);
        const payload = res?.data as any;
        const list: any[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload?.result)
                ? payload.result
                : [];
        const map: SummaryMap = {};
        list.forEach((d: any) => {
          const dt = new Date(d?.req_date);
          if (isNaN(dt.getTime())) return;
          const y = dt.getFullYear();
          const m = dt.getMonth() + 1; // 1..12
          if (!map[y]) map[y] = {} as any;
          if (!map[y][m]) map[y][m] = [];
          map[y][m].push(Number(d?.req_id));
        });
        setSummary(map);
      } catch (e: any) {
        setError('Failed to load summary');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading summary...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  // Build continuous year range from earliest data year to current year
  const dataYears = Object.keys(summary).map(Number);
  const currentYear = new Date().getFullYear();
  const minYear = dataYears.length ? Math.min(...dataYears) : currentYear;
  const years: number[] = [];
  for (let y = currentYear; y >= minYear; y--) years.push(y);
  if (years.length === 0) return <div className="text-sm text-muted-foreground">No data</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border text-xs">
        <thead>
          <tr className="bg-slate-50">
            <th className="border px-2 py-1 text-left">Year</th>
            {months.map((m) => (
              <th key={m} className="border px-2 py-1 text-center">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map(y => (
            <tr key={y}>
              <td className="border px-2 py-1 font-medium">{y}</td>
              {months.map((_, idx) => {
                const ids = summary[y]?.[idx+1] || [];
                return (
                  <td key={`${y}-${idx}`} className="border px-1 py-1 align-top text-center">
                    {ids.length ? (
                      <span className="whitespace-pre-wrap break-words">
                        {ids.map((id, i) => (
                          <>
                            <button
                              key={`${y}-${idx}-${id}`}
                              className="text-blue-600 hover:text-blue-800 underline"
                              onClick={() => onOpen?.(id)}
                              type="button"
                            >
                              {id}
                            </button>
                            {i < ids.length - 1 ? ', ' : ''}
                          </>
                        ))}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
