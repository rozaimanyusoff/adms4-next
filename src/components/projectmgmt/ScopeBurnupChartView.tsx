'use client';

import React, { useState, useRef, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, LabelList, ReferenceLine, ReferenceArea } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar, Zap, Target, AlertCircle } from 'lucide-react';
import { parseISO, isValid as isDateValid, startOfWeek, addWeeks, addDays, differenceInCalendarDays, format as formatDate, differenceInDays } from 'date-fns';

interface BurnupChartViewProps {
   projectName: string;
   timeline: {
      startDate: string;
      endDate: string;
   };
   deliverables: any[];
   totalPlannedEffort: number;
   calcMandays: (start: string, end: string) => number;
   chartRef?: React.RefObject<HTMLDivElement | null>;
}

const BurnupChartView: React.FC<BurnupChartViewProps> = ({
   projectName,
   timeline,
   deliverables,
   totalPlannedEffort,
   calcMandays,
   chartRef,
}) => {
   const [showPlanned, setShowPlanned] = useState(true);
   const [showActual, setShowActual] = useState(true);
   const [showValues, setShowValues] = useState(false);
   const [plannedMode, setPlannedMode] = useState<'scope' | 'linear'>('scope');
   const [completionMode, setCompletionMode] = useState<'actual' | 'planned'>('actual');

   const internalRef = useRef<HTMLDivElement>(null);
   const burnupRef = chartRef || internalRef;

   // Custom label component for values
   const BurnupValueLabel = (props: any) => {
      const { x, y, value, color } = props;
      if (value == null || Number.isNaN(Number(value))) return null;
      const yy = typeof y === 'number' ? y - 6 : 0;
      return (
         <text x={x} y={yy} textAnchor="middle" fontSize={10} fill={color || '#334155'}>
            {Number(value).toFixed(0)}
         </text>
      );
   };

   // Custom clickable legend
   const BurnupLegend = ({ payload }: any) => {
      return (
         <div className="flex items-center justify-center gap-6 pb-2 text-xs">
            <button
               type="button"
               onClick={() => setShowPlanned(v => !v)}
               className={`flex items-center gap-1 ${showPlanned ? '' : 'line-through text-muted-foreground'}`}
               aria-pressed={showPlanned}
               title="Toggle Planned"
            >
               <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#2563eb' }} />
               Planned
            </button>
            <button
               type="button"
               onClick={() => setShowActual(v => !v)}
               className={`flex items-center gap-1 ${showActual ? '' : 'line-through text-muted-foreground'}`}
               aria-pressed={showActual}
               title="Toggle Actual"
            >
               <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
               Actual
            </button>
         </div>
      );
   };

   // Calculate burnup data
   const burnupData = useMemo(() => {
      const s0 = parseISO(timeline.startDate);
      const e0 = parseISO(timeline.endDate);
      if (!isDateValid(s0) || !isDateValid(e0)) return [];

      const s = startOfWeek(s0, { weekStartsOn: 1 });
      const rows: any[] = [];
      const totalPlanned = totalPlannedEffort;
      const today = new Date();

      // Helper to compute planned/actual up to a date
      const plannedAtLinear = (date: Date) => {
         const totalMd = Math.max(1, calcMandays(timeline.startDate, timeline.endDate));
         const elapsedMd = Math.max(0, Math.min(totalMd, calcMandays(timeline.startDate, date.toISOString().slice(0, 10))));
         return totalPlanned * (elapsedMd / totalMd);
      };

      const plannedAtByScope = (date: Date) => {
         const dateStr = date.toISOString().slice(0, 10);
         let sum = 0;
         deliverables.forEach((d: any) => {
            if (!d?.startDate || !d?.endDate) return;
            const sd = parseISO(d.startDate);
            const ed = parseISO(d.endDate);
            if (!isDateValid(sd) || !isDateValid(ed)) return;
            const md = typeof d?.mandays === 'number' ? d.mandays : calcMandays(d.startDate, d.endDate);
            const denom = Math.max(1, calcMandays(d.startDate, d.endDate));
            if (date < sd) return;
            if (date >= ed) { sum += md; return; }
            const elapsed = Math.max(0, Math.min(denom, calcMandays(d.startDate, dateStr)));
            sum += md * (elapsed / denom);
         });
         return sum;
      };

      const plannedAt = (date: Date) => plannedMode === 'scope' ? plannedAtByScope(date) : plannedAtLinear(date);

      const actualAt = (date: Date) => {
         let actual = 0;
         deliverables.forEach((d: any) => {
            const mandays = typeof d?.mandays === 'number' ? d.mandays : calcMandays(d?.startDate, d?.endDate);
            const completed = (d?.progress ?? 0) / 100 * mandays;
            if (!d?.startDate || !d?.endDate) return;
            const sd = parseISO(d.startDate);
            const ed = parseISO(d.endDate);
            if (!isDateValid(sd) || !isDateValid(ed)) return;
            const activeEnd = ed < today ? ed : today;
            if (date < sd) return;
            if (date >= sd && date <= activeEnd) {
               const denom = Math.max(1, differenceInCalendarDays(activeEnd, sd) + 1);
               const frac = Math.min(1, (differenceInCalendarDays(date, sd) + 1) / denom);
               actual += completed * frac;
            } else if (date > activeEnd) {
               actual += completed;
            }
         });
         return actual;
      };

      // Iterate weeks
      let wStart = s;
      while (wStart <= e0) {
         const wEnd = addDays(wStart, 6) > e0 ? e0 : addDays(wStart, 6);
         const dLabel = `${formatDate(wStart, 'dd/MM')}–${formatDate(wEnd, 'dd/MM')}`;
         const p = plannedAt(wEnd);
         const a = actualAt(wEnd);
         const titles: string[] = deliverables.map((d: any) => {
            if (!d?.startDate || !d?.endDate) return '';
            const sd = parseISO(d.startDate);
            const ed = parseISO(d.endDate);
            if (!isDateValid(sd) || !isDateValid(ed)) return '';
            const overlap = !(addDays(wStart, 6) < sd || wStart > ed);
            return overlap ? (d?.name || '') : '';
         }).filter(Boolean);
         rows.push({
            date: dLabel,
            Planned: Number(p.toFixed(2)),
            Actual: Number(a.toFixed(2)),
            Scope: totalPlanned,
            scopeTitles: titles
         });
         wStart = addWeeks(wStart, 1);
      }
      return rows;
   }, [timeline, deliverables, totalPlannedEffort, calcMandays, plannedMode]);

   // Calculate completion trend data
   const completionData = useMemo(() => {
      const grouped: any = {};
      deliverables.forEach((d: any) => {
         const key = completionMode === 'actual'
            ? d?.actualEndDate || d?.endDate || ''
            : d?.endDate || '';
         if (!key) return;
         if (!grouped[key]) grouped[key] = { date: key, count: 0 };
         grouped[key].count += 1;
      });
      return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
   }, [deliverables, completionMode]);

   // Calculate project metrics
   const projectMetrics = useMemo(() => {
      const today = new Date();
      const projectStart = parseISO(timeline.startDate);
      const projectEnd = parseISO(timeline.endDate);
      
      if (!isDateValid(projectStart) || !isDateValid(projectEnd)) {
         return null;
      }

      // Get latest actual and planned values
      const latestData = burnupData[burnupData.length - 1];
      const currentActual = latestData?.Actual || 0;
      const currentPlanned = latestData?.Planned || 0;
      
      // Calculate completion percentage
      const completionPercent = totalPlannedEffort > 0 
         ? (currentActual / totalPlannedEffort) * 100 
         : 0;
      
      // Calculate Schedule Performance Index (SPI)
      const spi = currentPlanned > 0 ? currentActual / currentPlanned : 0;
      
      // Calculate velocity (mandays per week)
      const weeksElapsed = burnupData.length;
      const velocity = weeksElapsed > 0 ? currentActual / weeksElapsed : 0;
      
      // Calculate remaining work
      const remainingWork = Math.max(0, totalPlannedEffort - currentActual);
      
      // Project completion date based on current velocity
      let projectedCompletion = null;
      let weeksRemaining = 0;
      if (velocity > 0 && remainingWork > 0) {
         weeksRemaining = Math.ceil(remainingWork / velocity);
         projectedCompletion = addWeeks(today, weeksRemaining);
      }
      
      // Calculate variance
      const scheduleVariance = currentActual - currentPlanned;
      const daysAheadBehind = currentPlanned > 0 
         ? Math.round((scheduleVariance / currentPlanned) * differenceInDays(projectEnd, projectStart))
         : 0;
      
      return {
         completionPercent,
         spi,
         velocity,
         remainingWork,
         projectedCompletion,
         weeksRemaining,
         scheduleVariance,
         daysAheadBehind,
         isAhead: spi > 1,
         isOnTrack: spi >= 0.95 && spi <= 1.05,
         isBehind: spi < 0.95,
      };
   }, [burnupData, totalPlannedEffort, timeline]);

   // Find today's position in the data
   const todayIndex = useMemo(() => {
      const today = new Date();
      const projectStart = parseISO(timeline.startDate);
      if (!isDateValid(projectStart)) return -1;
      
      const weeksFromStart = Math.floor(differenceInDays(today, projectStart) / 7);
      return Math.min(weeksFromStart, burnupData.length - 1);
   }, [burnupData, timeline]);

   return (
      <div className="space-y-6">
         {/* Project Metrics Dashboard */}
         {projectMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {/* Completion Percentage */}
               <Card>
                  <CardContent className="pt-6">
                     <div className="flex items-start justify-between">
                        <div>
                           <p className="text-sm text-muted-foreground">Completion</p>
                           <p className="text-2xl font-bold mt-1">
                              {projectMetrics.completionPercent.toFixed(1)}%
                           </p>
                           <p className="text-xs text-muted-foreground mt-1">
                              {projectMetrics.remainingWork.toFixed(0)} days remaining
                           </p>
                        </div>
                        <Target className="h-8 w-8 text-blue-500" />
                     </div>
                  </CardContent>
               </Card>

               {/* Schedule Performance Index */}
               <Card>
                  <CardContent className="pt-6">
                     <div className="flex items-start justify-between">
                        <div>
                           <p className="text-sm text-muted-foreground">Performance (SPI)</p>
                           <p className={`text-2xl font-bold mt-1 ${
                              projectMetrics.isAhead ? 'text-green-600' : 
                              projectMetrics.isOnTrack ? 'text-blue-600' : 
                              'text-red-600'
                           }`}>
                              {projectMetrics.spi.toFixed(2)}
                           </p>
                           <p className="text-xs text-muted-foreground mt-1">
                              {projectMetrics.isAhead ? 'Ahead of schedule' :
                               projectMetrics.isOnTrack ? 'On track' :
                               'Behind schedule'}
                           </p>
                        </div>
                        {projectMetrics.isAhead ? (
                           <TrendingUp className="h-8 w-8 text-green-500" />
                        ) : projectMetrics.isBehind ? (
                           <TrendingDown className="h-8 w-8 text-red-500" />
                        ) : (
                           <AlertCircle className="h-8 w-8 text-blue-500" />
                        )}
                     </div>
                  </CardContent>
               </Card>

               {/* Velocity */}
               <Card>
                  <CardContent className="pt-6">
                     <div className="flex items-start justify-between">
                        <div>
                           <p className="text-sm text-muted-foreground">Velocity</p>
                           <p className="text-2xl font-bold mt-1">
                              {projectMetrics.velocity.toFixed(1)}
                           </p>
                           <p className="text-xs text-muted-foreground mt-1">
                              mandays/week
                           </p>
                        </div>
                        <Zap className="h-8 w-8 text-amber-500" />
                     </div>
                  </CardContent>
               </Card>

               {/* Projected Completion */}
               <Card>
                  <CardContent className="pt-6">
                     <div className="flex items-start justify-between">
                        <div>
                           <p className="text-sm text-muted-foreground">Projected End</p>
                           <p className="text-lg font-bold mt-1">
                              {projectMetrics.projectedCompletion 
                                 ? formatDate(projectMetrics.projectedCompletion, 'MMM dd, yyyy')
                                 : 'On schedule'}
                           </p>
                           <p className={`text-xs mt-1 ${
                              projectMetrics.daysAheadBehind > 0 ? 'text-green-600' :
                              projectMetrics.daysAheadBehind < 0 ? 'text-red-600' :
                              'text-muted-foreground'
                           }`}>
                              {projectMetrics.daysAheadBehind !== 0 
                                 ? `${Math.abs(projectMetrics.daysAheadBehind)} days ${projectMetrics.daysAheadBehind > 0 ? 'ahead' : 'behind'}`
                                 : 'On target'}
                           </p>
                        </div>
                        <Calendar className="h-8 w-8 text-purple-500" />
                     </div>
                  </CardContent>
               </Card>
            </div>
         )}

         {/* Burnup Chart */}
         <div className="space-y-2">
            <div className="flex items-center justify-between">
               <h4 className="text-sm font-semibold">Burnup Chart (Planned vs Actual)</h4>
               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                     <Switch
                        id="show-values"
                        checked={showValues}
                        onCheckedChange={setShowValues}
                     />
                     <Label htmlFor="show-values" className="text-xs cursor-pointer">
                        Show values
                     </Label>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                     <span className="text-muted-foreground">Planned mode</span>
                     <Select value={plannedMode} onValueChange={(v) => setPlannedMode(v as 'scope' | 'linear')}>
                        <SelectTrigger className="h-7 w-[180px]">
                           <SelectValue placeholder="By scope" />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="scope">By scope (recommended)</SelectItem>
                           <SelectItem value="linear">Linear by window</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
               </div>
            </div>
            <div className="h-[500px] max-w-5xl mx-auto border rounded-xl p-4" ref={burnupRef}>
               <div className="text-sm font-semibold mb-2 truncate">
                  {projectName || 'Untitled Project'}
               </div>
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={burnupData}>
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={70}
                        interval={0}
                     />
                     <YAxis
                        tick={{ fontSize: 10 }}
                        label={{ value: 'Mandays', angle: -90, position: 'insideLeft', offset: 10 }}
                     />
                     <Tooltip content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const planned = payload.find((p: any) => p.dataKey === 'Planned')?.value;
                        const actual = payload.find((p: any) => p.dataKey === 'Actual')?.value;
                        const scopes = (payload?.[0]?.payload?.scopeTitles as string[] | undefined) ?? [];
                        return (
                           <div className="rounded border bg-background p-2 text-xs">
                              <div className="font-medium mb-1">{label}</div>
                              <div className="text-blue-600">Planned: {planned}</div>
                              <div className="text-amber-600">Actual: {actual}</div>
                              <div className="text-muted-foreground">Scope: {totalPlannedEffort}</div>
                              {scopes.length > 0 && (
                                 <div className="mt-1">
                                    <div className="text-foreground font-medium">Scopes:</div>
                                    <div className="max-w-[280px] whitespace-normal leading-snug">
                                       {scopes.join(', ')}
                                    </div>
                                 </div>
                              )}
                           </div>
                        );
                     }} />
                     <Legend verticalAlign="top" align="center" content={<BurnupLegend />} />
                     
                     {/* Total Scope Reference Line */}
                     <ReferenceLine 
                        y={totalPlannedEffort} 
                        stroke="#94a3b8" 
                        strokeDasharray="5 5"
                        label={{ value: 'Total Scope', position: 'insideTopRight', fill: '#64748b', fontSize: 11 }}
                     />
                     
                     {/* Today Marker */}
                     {todayIndex >= 0 && todayIndex < burnupData.length && (
                        <ReferenceLine 
                           x={burnupData[todayIndex]?.date} 
                           stroke="#ef4444" 
                           strokeWidth={2}
                           label={{ value: 'Today', position: 'top', fill: '#ef4444', fontSize: 11 }}
                        />
                     )}
                     
                     {/* Performance Zone Shading */}
                     {projectMetrics && (
                        <ReferenceArea
                           y1={0}
                           y2={totalPlannedEffort}
                           fill={projectMetrics.isAhead ? '#22c55e' : projectMetrics.isBehind ? '#ef4444' : '#3b82f6'}
                           fillOpacity={0.05}
                        />
                     )}
                     
                     {showPlanned && (
                        <Line type="monotone" dataKey="Planned" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }}>
                           {showValues && (
                              <LabelList dataKey="Planned" content={(p: any) => <BurnupValueLabel {...p} color="#2563eb" />} />
                           )}
                        </Line>
                     )}
                     {showActual && (
                        <Line type="monotone" dataKey="Actual" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }}>
                           {showValues && (
                              <LabelList dataKey="Actual" content={(p: any) => <BurnupValueLabel {...p} color="#f59e0b" />} />
                           )}
                        </Line>
                     )}
                  </LineChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Scope Completion Trend */}
         <div className="space-y-2">
            <div className="flex items-center justify-between">
               <h4 className="text-sm font-semibold">Scope Completion Trend</h4>
               <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Completion by</span>
                  <Select value={completionMode} onValueChange={(v) => setCompletionMode(v as 'actual' | 'planned')}>
                     <SelectTrigger className="h-7 w-[160px]">
                        <SelectValue placeholder="Actual end" />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="actual">Actual end</SelectItem>
                        <SelectItem value="planned">Planned end</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
            </div>
            <div className="h-[300px] max-w-3xl mx-auto border rounded-xl p-4">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={completionData}>
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                     <YAxis tick={{ fontSize: 10 }} label={{ value: 'Scopes', angle: -90, position: 'insideLeft' }} />
                     <Tooltip />
                     <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>
   );
};

export default BurnupChartView;
