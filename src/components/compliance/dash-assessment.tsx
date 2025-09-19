"use client";

import React, { useEffect, useMemo, useState } from "react";
import { authenticatedApi } from "@/config/api";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface AssessmentLocation {
  id?: number;
  code?: string | null;
}

interface AssessmentOwner {
  ramco_id?: string | null;
  full_name?: string | null;
}

interface AssessmentAsset {
  id?: number;
  register_number?: string | null;
  purchase_date?: string | null;
  age?: number | null;
  costcenter?: { id?: number; name?: string | null } | null;
  location?: { id?: number; code?: string | null } | null;
  owner?: AssessmentOwner | null;
}

interface Assessment {
  assess_id: number;
  a_date: string | null;
  a_ncr: number | null;
  a_rate: string | number | null;
  a_upload?: string | null;
  a_upload2?: string | null;
  a_upload3?: string | null;
  a_upload4?: string | null;
  a_remark?: string | null;
  a_dt?: string | null;
  asset?: AssessmentAsset | null;
  assessment_location?: AssessmentLocation | null;
}

const getAssessmentDate = (item: Assessment): Date | null => {
  const raw = item.a_date ?? item.a_dt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const rateTrendConfig = {
  rate: {
    label: "Assessment Rate",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const locationConfig = {
  count: {
    label: "Assessments",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const ncrTrendConfig = {
  ncr: {
    label: "NCR",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

const yearSummaryConfig = {
  total: {
    label: "Assessments",
    color: "hsl(var(--chart-4))",
  },
  avg: {
    label: "Average Rate",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const pieColors = [
  "#2563eb",
  "#60a5fa",
  "#34d399",
  "#f97316",
  "#facc15",
  "#8b5cf6",
  "#f472b6",
  "#ec4899",
  "#22d3ee",
  "#14b8a6",
];

const DashAssessment: React.FC = () => {
  const [data, setData] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("all");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authenticatedApi.get("/api/compliance/assessments");
        const list = (res as any)?.data?.data || (res as any)?.data || [];
        if (Array.isArray(list)) {
          setData(list as Assessment[]);
        } else {
          setData([]);
        }
      } catch (err) {
        setError("Unable to load assessment dashboard data.");
        toast.error("Failed to load dash assessment data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.forEach((item) => {
      const date = getAssessmentDate(item);
      if (!date) return;
      years.add(String(date.getFullYear()));
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [data]);

  useEffect(() => {
    if (selectedYear === "all") return;
    if (!availableYears.length) {
      setSelectedYear("all");
      return;
    }
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0] ?? "all");
    }
  }, [availableYears, selectedYear]);

  const filteredData = useMemo(() => {
    if (selectedYear === "all") return data;
    return data.filter((item) => {
      const date = getAssessmentDate(item);
      return date ? String(date.getFullYear()) === selectedYear : false;
    });
  }, [data, selectedYear]);

  const numericRate = (value: Assessment["a_rate"]) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return value;
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const uploadsCount = (item: Assessment) => {
    return [item.a_upload, item.a_upload2, item.a_upload3, item.a_upload4]
      .filter(Boolean)
      .flatMap((entry) => (entry ? String(entry).split(',').filter(Boolean) : []))
      .length;
  };

  const metrics = useMemo(() => {
    if (!filteredData.length) {
      return {
        totalAssessments: 0,
        avgRate: 0,
        totalNcr: 0,
        locations: 0,
        zeroNcr: 0,
        totalUploads: 0,
      };
    }

    let rateSum = 0;
    let rateCount = 0;
    let totalNcr = 0;
    let zeroNcr = 0;
    let totalUploads = 0;
    const locationSet = new Set<string>();

    filteredData.forEach((item) => {
      const rate = numericRate(item.a_rate);
      if (rate !== null) {
        rateSum += rate;
        rateCount += 1;
      }
      totalNcr += item.a_ncr ?? 0;
      if ((item.a_ncr ?? 0) === 0) {
        zeroNcr += 1;
      }
      totalUploads += uploadsCount(item);
      const loc = item.assessment_location?.code || item.asset?.location?.code;
      if (loc) locationSet.add(loc);
    });

    return {
      totalAssessments: filteredData.length,
      avgRate: rateCount ? rateSum / rateCount : 0,
      totalNcr,
      locations: locationSet.size,
      zeroNcr,
      totalUploads,
    };
  }, [filteredData]);

  const rateTrend = useMemo(() => {
    return filteredData
      .map((item) => {
        const date = getAssessmentDate(item);
        if (!date) return null;
        return {
          date,
          rate: numericRate(item.a_rate),
          ncr: item.a_ncr ?? 0,
          code: item.assessment_location?.code || item.asset?.location?.code || "Unknown",
        };
      })
      .filter((item): item is { date: Date; rate: number | null; ncr: number; code: string } => Boolean(item))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((item) => ({
        dateLabel: item.date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        rate: item.rate,
        ncr: item.ncr,
        location: item.code,
      }));
  }, [filteredData]);

  const locationBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; avgRateSum: number; avgRateCount: number }> = {};

    filteredData.forEach((item) => {
      const location = item.assessment_location?.code || item.asset?.location?.code || "Unknown";
      if (!counts[location]) {
        counts[location] = { count: 0, avgRateSum: 0, avgRateCount: 0 };
      }
      counts[location].count += 1;
      const rate = numericRate(item.a_rate);
      if (rate !== null) {
        counts[location].avgRateSum += rate;
        counts[location].avgRateCount += 1;
      }
    });

    return Object.entries(counts)
      .map(([location, { count, avgRateSum, avgRateCount }]) => ({
        location,
        count,
        avgRate: avgRateCount ? avgRateSum / avgRateCount : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredData]);

  const ownerBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach((item) => {
      const owner = item.asset?.owner?.full_name || "Unassigned";
      counts[owner] = (counts[owner] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([owner, count]) => ({ name: owner, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredData]);

  const latestAssessments = useMemo(() => {
    return filteredData
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.a_date ?? a.a_dt ?? 0).getTime();
        const dateB = new Date(b.a_date ?? b.a_dt ?? 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [filteredData]);

  const yearlySummary = useMemo(() => {
    if (!data.length) return [] as Array<{ year: string; total: number; avgRate: number; totalNcr: number; zeroNcr: number }>;

    const summary: Record<string, { total: number; rateSum: number; rateCount: number; totalNcr: number; zeroNcr: number }> = {};
    data.forEach((item) => {
      const date = getAssessmentDate(item);
      if (!date) return;
      const yearKey = String(date.getFullYear());
      if (!summary[yearKey]) {
        summary[yearKey] = { total: 0, rateSum: 0, rateCount: 0, totalNcr: 0, zeroNcr: 0 };
      }
      const bucket = summary[yearKey];
      bucket.total += 1;
      const rate = numericRate(item.a_rate);
      if (rate !== null) {
        bucket.rateSum += rate;
        bucket.rateCount += 1;
      }
      bucket.totalNcr += item.a_ncr ?? 0;
      if ((item.a_ncr ?? 0) === 0) {
        bucket.zeroNcr += 1;
      }
    });

    return Object.entries(summary)
      .map(([year, bucket]) => ({
        year,
        total: bucket.total,
        avgRate: bucket.rateCount ? bucket.rateSum / bucket.rateCount : 0,
        totalNcr: bucket.totalNcr,
        zeroNcr: bucket.zeroNcr,
      }))
      .sort((a, b) => Number(b.year) - Number(a.year));
  }, [data]);

  const yearlyChartData = useMemo(() => {
    return yearlySummary
      .slice()
      .sort((a, b) => Number(a.year) - Number(b.year))
      .map((item) => ({ year: item.year, total: item.total, avg: Number(item.avgRate.toFixed(2)) }));
  }, [yearlySummary]);

  const locationChartMinWidth = useMemo(() => {
    return Math.max(locationBreakdown.length * 72, 480);
  }, [locationBreakdown]);

  const yearlyChartMinWidth = useMemo(() => {
    return Math.max(yearlyChartData.length * 96, 480);
  }, [yearlyChartData]);

  const selectedYearDescription = selectedYear === "all" ? "all available years" : `the year ${selectedYear}`;
  const hasFilteredData = filteredData.length > 0;

  const renderLoadingState = () => (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="mt-4 h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (loading) {
    return renderLoadingState();
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assessment Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-sm text-muted-foreground">
          No assessment data available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Assessment Dashboard</h2>
          <p className="text-sm text-muted-foreground">Showing metrics for {selectedYearDescription}.</p>
        </div>
        {availableYears.length ? (
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Assessments</CardTitle>
            <p className="text-xs text-muted-foreground">
              {selectedYear === "all" ? "All records" : `Year ${selectedYear}`}
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.totalAssessments}</div>
            <p className="mt-2 text-xs text-muted-foreground">
              {metrics.zeroNcr} assessments recorded zero NCR findings.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Rate</CardTitle>
            <p className="text-xs text-muted-foreground">
              Based on valid rates in {selectedYear === "all" ? "all years" : selectedYear}.
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.avgRate.toFixed(2)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total NCR</CardTitle>
            <p className="text-xs text-muted-foreground">
              Sum of NCR findings for the selected period.
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.totalNcr}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Locations Covered</CardTitle>
            <p className="text-xs text-muted-foreground">
              {metrics.totalUploads} supporting media uploaded overall.
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.locations}</div>
          </CardContent>
        </Card>
      </div>

      {yearlySummary.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Yearly Summary</CardTitle>
            <p className="text-xs text-muted-foreground">Aggregated by assessment date (a_date).</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-72 overflow-x-auto">
              <ChartContainer
                config={yearSummaryConfig}
                className="!aspect-auto h-full"
                style={{ minWidth: `${yearlyChartMinWidth}px` }}
              >
                <BarChart data={yearlyChartData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis yAxisId="left" allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: number, name: string, item) => {
                      if (item?.dataKey === "avg") {
                        return [`${Number(value).toFixed(2)}%`, "Average Rate"];
                      }
                      return [String(value), "Assessments"];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="total" name="Assessments" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avg"
                    name="Average Rate"
                    stroke="var(--color-avg)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </BarChart>
              </ChartContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Year</th>
                    <th className="px-2 py-2 font-medium">Assessments</th>
                    <th className="px-2 py-2 font-medium">Average Rate</th>
                    <th className="px-2 py-2 font-medium">Total NCR</th>
                    <th className="px-2 py-2 font-medium">Zero NCR</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlySummary.map((row) => (
                    <tr key={row.year} className="border-t border-border/50">
                      <td className="px-2 py-2">{row.year}</td>
                      <td className="px-2 py-2">{row.total}</td>
                      <td className="px-2 py-2">{row.avgRate.toFixed(2)}%</td>
                      <td className="px-2 py-2">{row.totalNcr}</td>
                      <td className="px-2 py-2">{row.zeroNcr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!hasFilteredData && selectedYear !== "all" ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No assessments recorded for {selectedYear}.
          </CardContent>
        </Card>
      ) : null}

      {hasFilteredData ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Assessment Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={rateTrendConfig} className="h-72">
                  <LineChart data={rateTrend} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateLabel" />
                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="var(--color-rate)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assessments by Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72 overflow-x-auto">
                  <ChartContainer
                    config={locationConfig}
                    className="!aspect-auto h-full"
                    style={{ minWidth: `${locationChartMinWidth}px` }}
                  >
                    <BarChart data={locationBreakdown} margin={{ left: 12, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="location" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>NCR Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={ncrTrendConfig} className="h-72">
                  <AreaChart data={rateTrend} margin={{ left: 12, right: 12 }}>
                    <defs>
                      <linearGradient id="ncrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-ncr)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-ncr)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateLabel" />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="ncr"
                      stroke="var(--color-ncr)"
                      fillOpacity={1}
                      fill="url(#ncrGradient)"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Assessors / Owners</CardTitle>
              </CardHeader>
              <CardContent>
                {ownerBreakdown.length ? (
                  <div className="h-72">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={ownerBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                          {ownerBreakdown.map((entry, index) => (
                            <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: number, name: string) => [`${value} assessments`, name]} />
                        <Legend verticalAlign="bottom" height={48} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Owner information not available.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Latest Assessments</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Date</th>
                    <th className="px-2 py-2 font-medium">Asset</th>
                    <th className="px-2 py-2 font-medium">Location</th>
                    <th className="px-2 py-2 font-medium">Rate</th>
                    <th className="px-2 py-2 font-medium">NCR</th>
                    <th className="px-2 py-2 font-medium">Uploads</th>
                  </tr>
                </thead>
                <tbody>
                  {latestAssessments.map((item) => {
                    const date = item.a_date || item.a_dt;
                    const formattedDate = date
                      ? new Date(date).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-";
                    const rate = numericRate(item.a_rate);
                    const location = item.assessment_location?.code || item.asset?.location?.code || "-";
                    const asset = item.asset?.register_number || "-";
                    const uploads = uploadsCount(item);

                    return (
                      <tr key={item.assess_id} className="border-t border-border/50">
                        <td className="px-2 py-2">{formattedDate}</td>
                        <td className="px-2 py-2">{asset}</td>
                        <td className="px-2 py-2">{location}</td>
                        <td className="px-2 py-2">{rate !== null ? `${rate.toFixed(2)}%` : "-"}</td>
                        <td className="px-2 py-2">{item.a_ncr ?? "-"}</td>
                        <td className="px-2 py-2">{uploads}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};

export default DashAssessment;
