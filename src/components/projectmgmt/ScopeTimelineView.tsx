'use client';

import React, { useMemo, useState } from 'react';
import { format, parseISO, isValid as isDateValid, eachWeekOfInterval, startOfWeek, endOfWeek, differenceInDays, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Download, MoreVertical, Trash2, Pencil, ArrowUp, ArrowDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Separate component for sortable task row to maintain consistent hook order
interface SortableTaskRowProps {
  task: GanttTask;
  taskBar: any;
  timeColumns: Array<{ label: string; date: Date; isWeekStart: boolean }>;
  projectStart: Date;
  onTaskEdit?: (taskId: string) => void;
  onTaskDelete?: (taskId: string) => void;
  onMoveUp: (task: GanttTask) => void;
  onMoveDown: (task: GanttTask) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const SortableTaskRow: React.FC<SortableTaskRowProps> = ({
  task,
  taskBar,
  timeColumns,
  projectStart,
  onTaskEdit,
  onTaskDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Calculate actual duration
  const actualDuration = task.actualStartDate && task.actualEndDate
    ? (() => {
      const start = parseISO(task.actualStartDate);
      const end = parseISO(task.actualEndDate);
      if (!isDateValid(start) || !isDateValid(end)) return 0;
      let count = 0;
      let current = new Date(start);
      while (current <= end) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) count++;
        current = addDays(current, 1);
      }
      return count;
    })()
    : 0;

  if (!taskBar) return null;

  return (
    <div
      key={task.id}
      ref={setNodeRef}
      style={style}
      className="p-2 border-b border-slate-200 bg-white flex items-center h-14 hover:bg-blue-50/30 transition-colors"
    >
      {/* 3-Dot Menu */}
      <div className="mr-2 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 cursor-pointer hover:bg-slate-200"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {onTaskEdit && (
              <DropdownMenuItem onClick={() => onTaskEdit(task.id)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {onTaskDelete && (
              <DropdownMenuItem
                onClick={() => onTaskDelete(task.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onMoveUp(task)}
              disabled={!canMoveUp}
            >
              <ArrowUp className="mr-2 h-4 w-4" />
              Move Up
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onMoveDown(task)}
              disabled={!canMoveDown}
            >
              <ArrowDown className="mr-2 h-4 w-4" />
              Move Down
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Task Info Grid - aligned with header */}
      <div className="grid grid-cols-[200px_1fr] gap-3 flex-1">
        {/* Task Name */}
        <div className="flex flex-col">
          <div className="truncate text-sm font-medium text-slate-700">
            {task.name}
          </div>
          {task.assignee && (
            <div className="text-xs text-slate-500 truncate">
              {task.assignee}
            </div>
          )}
        </div>
        
        {/* Planned & Actual columns */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Planned */}
          <div className="flex flex-col">
            <div className="text-slate-600 truncate">
              {task.startDate && task.endDate 
                ? `${format(parseISO(task.startDate), 'dd/MM/yy')} → ${format(parseISO(task.endDate), 'dd/MM/yy')}`
                : '-'}
            </div>
            <div className="text-slate-500">{task.mandays || 0} days</div>
          </div>
          
          {/* Actual */}
          <div className="flex flex-col">
            <div className="text-slate-600 truncate">
              {task.actualStartDate && task.actualEndDate
                ? `${format(parseISO(task.actualStartDate), 'dd/MM/yy')} → ${format(parseISO(task.actualEndDate), 'dd/MM/yy')}`
                : '-'}
            </div>
            <div className="text-slate-500">{actualDuration || 0} days</div>
          </div>
        </div>
      </div>

      {/* Progress & Status - moved to timeline section */}
    </div>
  );
};

export interface GanttTask {
  id: string;
  index: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed';
  assignee?: string;
  mandays?: number;
  actualStartDate?: string;
  actualEndDate?: string;
  taskGroups?: string[];
  color?: string;
}

interface GanttChartProps {
  tasks: GanttTask[];
  projectStart?: string;
  projectEnd?: string;
  projectName?: string;
  projectCode?: string;
  onTaskClick?: (task: GanttTask) => void;
  onTaskEdit?: (taskId: string) => void;
  onTaskDelete?: (taskId: string) => void;
  onTasksReorder?: (tasks: GanttTask[]) => void;
  className?: string;
}

// Color palette for different task types/groups - more professional colors
const TASK_COLORS = [
  '#4F46E5', // indigo
  '#DC2626', // red
  '#059669', // emerald  
  '#D97706', // amber
  '#7C3AED', // violet
  '#0891B2', // cyan
  '#EA580C', // orange
  '#65A30D', // lime
  '#BE185D', // rose
  '#374151', // gray
];

const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  projectStart,
  projectEnd,
  projectName,
  projectCode,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onTasksReorder,
  className = '',
}) => {
  const [timelineViewMode, setTimelineViewMode] = useState<'weeks' | 'months'>('weeks');
  const [showActual, setShowActual] = useState(true);
  const [localTasks, setLocalTasks] = useState(tasks);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Update local tasks when props change
  React.useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localTasks.findIndex((task) => task.id === active.id);
      const newIndex = localTasks.findIndex((task) => task.id === over.id);

      const reorderedTasks = arrayMove(localTasks, oldIndex, newIndex);
      setLocalTasks(reorderedTasks);

      if (onTasksReorder) {
        onTasksReorder(reorderedTasks);
      }
    }
  };

  // Calculate timeline bounds
  const { timelineStart, timelineEnd, timeColumns } = useMemo(() => {
    // Determine overall timeline
    const dates = localTasks.flatMap(task => {
      const dates = [];
      if (task.startDate) dates.push(parseISO(task.startDate));
      if (task.endDate) dates.push(parseISO(task.endDate));
      if (showActual) {
        if (task.actualStartDate) dates.push(parseISO(task.actualStartDate));
        if (task.actualEndDate) dates.push(parseISO(task.actualEndDate));
      }
      return dates.filter(d => isDateValid(d));
    });

    if (projectStart) dates.push(parseISO(projectStart));
    if (projectEnd) dates.push(parseISO(projectEnd));

    if (dates.length === 0) {
      return { timelineStart: new Date(), timelineEnd: new Date(), timeColumns: [] };
    }

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Expand to week boundaries
    const timelineStart = startOfWeek(minDate, { weekStartsOn: 1 }); // Monday start
    const timelineEnd = endOfWeek(maxDate, { weekStartsOn: 1 });

    // Generate time columns based on view mode
    let timeColumns: Array<{ label: string; date: Date; isWeekStart: boolean }> = [];

    if (timelineViewMode === 'weeks') {
      const weeks = eachWeekOfInterval(
        { start: timelineStart, end: timelineEnd },
        { weekStartsOn: 1 }
      );
      timeColumns = weeks.map(week => ({
        label: format(week, 'MMM dd'),
        date: week,
        isWeekStart: true
      }));
    } else {
      // Monthly view - simplified for now
      const weeks = eachWeekOfInterval(
        { start: timelineStart, end: timelineEnd },
        { weekStartsOn: 1 }
      );
      timeColumns = weeks.map(week => ({
        label: format(week, 'MMM dd'),
        date: week,
        isWeekStart: true
      }));
    }

    return { timelineStart, timelineEnd, timeColumns };
  }, [localTasks, projectStart, projectEnd, timelineViewMode, showActual]);

  // Group weeks by month for header display
  const monthGroups = useMemo(() => {
    const groups: Array<{ month: string; year: string; count: number; weeks: typeof timeColumns }> = [];

    timeColumns.forEach((column) => {
      const monthYear = format(column.date, 'MMM yyyy');
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && format(lastGroup.weeks[0].date, 'MMM yyyy') === monthYear) {
        lastGroup.count++;
        lastGroup.weeks.push(column);
      } else {
        groups.push({
          month: format(column.date, 'MMM'),
          year: format(column.date, 'yyyy'),
          count: 1,
          weeks: [column]
        });
      }
    });

    return groups;
  }, [timeColumns]);

  // Calculate task positioning
  const taskBars = useMemo(() => {
    return localTasks.map((task, index) => {
      // Bar color based on progress percentage
      const progress = task.progress ?? 0;
      const color =
        progress <= 45
          ? '#dc2626' // red
          : progress <= 80
            ? '#f59e0b' // yellow
            : '#10b981'; // green

      const startDate = task.startDate ? parseISO(task.startDate) : null;
      const endDate = task.endDate ? parseISO(task.endDate) : null;
      const actualStart = showActual && task.actualStartDate ? parseISO(task.actualStartDate) : null;
      const actualEnd = showActual && task.actualEndDate ? parseISO(task.actualEndDate) : null;

      if (!startDate || !endDate || !isDateValid(startDate) || !isDateValid(endDate)) {
        return null;
      }

      // Calculate position and width as percentage of timeline
      const totalDays = differenceInDays(timelineEnd, timelineStart);
      const startOffset = differenceInDays(startDate, timelineStart);
      const duration = differenceInDays(endDate, startDate) + 1;

      const leftPercent = Math.max(0, (startOffset / totalDays) * 100);
      const widthPercent = Math.min(100 - leftPercent, (duration / totalDays) * 100);

      // Calculate actual dates bar if available
      let actualBar = null;
      if (actualStart && actualEnd && isDateValid(actualStart) && isDateValid(actualEnd)) {
        const actualStartOffset = differenceInDays(actualStart, timelineStart);
        const actualDuration = differenceInDays(actualEnd, actualStart) + 1;
        const actualLeftPercent = Math.max(0, (actualStartOffset / totalDays) * 100);
        const actualWidthPercent = Math.min(100 - actualLeftPercent, (actualDuration / totalDays) * 100);

        actualBar = {
          leftPercent: actualLeftPercent,
          widthPercent: actualWidthPercent,
        };
      }

      return {
        task,
        leftPercent,
        widthPercent,
        color,
        actualBar,
      };
    }).filter(Boolean);
  }, [localTasks, timelineStart, timelineEnd, showActual]);

  const exportGanttPNG = async () => {
    // Simple export functionality - could be enhanced
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      canvas.width = 1200;
      canvas.height = Math.max(400, tasks.length * 40 + 100);

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Simple text rendering
      ctx.fillStyle = '#000000';
      ctx.font = '14px Arial';
      ctx.fillText('Timeline Chart Export', 20, 30);

      tasks.forEach((task, index) => {
        const y = 60 + (index * 30);
        ctx.fillText(task.name, 20, y);
        ctx.fillText(`${task.startDate} - ${task.endDate}`, 300, y);
      });

      // Download
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `timeline-chart-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className={className}>
      {/* Gantt Content - Proper Grid Layout */}
      <div className="flex border rounded-lg shadow-sm bg-white">
        {/* Fixed Left Column - Task Info */}
        <div className="flex-none w-[520px] border-r border-slate-200">
          {/* Headers */}
          <div className="p-2 font-semibold text-slate-700 bg-white border-b bg-linear-to-r from-slate-50 to-slate-100 sticky top-0 z-40 h-[42px] flex items-center">
            {/* Drag handle space */}
            <div className="w-6 mr-2"></div>
            <div className="grid grid-cols-[200px_1fr] gap-3 flex-1">
              <div>Task Name</div>
              <div className="grid grid-cols-2 gap-2 text-xs font-normal text-slate-600">
                <div>Planned</div>
                <div>Actual</div>
              </div>
            </div>
          </div>

          {/* Task Info Rows */}
          {localTasks.length === 0 ? (
            <div className="p-16 text-center bg-white">
              <div className="mx-auto w-24 h-24 mb-6 text-slate-300">
                <Calendar className="w-full h-full" />
              </div>
              <h4 className="text-lg font-semibold text-slate-600 mb-2">No tasks to display</h4>
              <p className="text-slate-500 max-w-md mx-auto">
                Add some project scopes to see them visualized in the timeline chart.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {localTasks.map((task, index) => {
                  const taskBar = taskBars[index];

                  return (
                    <SortableTaskRow
                      key={task.id}
                      task={task}
                      taskBar={taskBar}
                      timeColumns={timeColumns}
                      projectStart={timelineStart}
                      onTaskEdit={onTaskEdit}
                      onTaskDelete={onTaskDelete}
                      onMoveUp={(t) => {
                        if (index > 0 && onTasksReorder) {
                          const reordered = [...localTasks];
                          [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
                          onTasksReorder(reordered);
                        }
                      }}
                      onMoveDown={(t) => {
                        if (index < localTasks.length - 1 && onTasksReorder) {
                          const reordered = [...localTasks];
                          [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
                          onTasksReorder(reordered);
                        }
                      }}
                      canMoveUp={index > 0}
                      canMoveDown={index < localTasks.length - 1}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Scrollable Right Column - Timeline */}
        <div 
          className="flex-1 overflow-x-auto relative"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
            const containerWidth = e.currentTarget.scrollWidth;
            const percentX = x / containerWidth;
            
            // Calculate date based on position
            const totalDays = differenceInDays(timelineEnd, timelineStart);
            const dayOffset = Math.floor(percentX * totalDays);
            const date = addDays(timelineStart, dayOffset);
            
            setHoverX(x - e.currentTarget.scrollLeft);
            setHoverDate(date);
          }}
          onMouseLeave={() => {
            setHoverX(null);
            setHoverDate(null);
          }}
        >
          <div className="min-w-[800px] relative">
            {/* Hover Vertical Line - Spans entire timeline height */}
            {hoverX !== null && hoverDate && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-50"
                style={{ left: `${hoverX}px` }}
              >
                <div className="w-px h-full bg-blue-500 opacity-60" />
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                  {format(hoverDate, 'MMM dd, yyyy')}
                </div>
              </div>
            )}
            
            {/* Timeline Header */}
            <div className="bg-linear-to-r from-slate-50 to-slate-100 sticky top-0 z-40 h-[42px] border-b border-slate-200">
              {/* Month Headers Row */}
              <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${timeColumns.length}, 1fr)` }}>
                {monthGroups.map((group, groupIndex) => (
                  <div
                    key={groupIndex}
                    className="font-bold text-xs text-slate-700 bg-slate-100 flex items-center justify-center h-full"
                    style={{
                      gridColumn: `span ${group.count}`,
                      borderRight: groupIndex < monthGroups.length - 1 ? '2px solid #cbd5e1' : 'none'
                    }}
                  >
                    {group.month}&apos;{group.year.slice(2)}
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Rows */}
            {localTasks.length === 0 ? null : (
              localTasks.map((task, index) => {
                const taskBar = taskBars[index];
                if (!taskBar) return null;

                return (
                  <div key={task.id} className="relative h-14 flex items-center px-2 border-b border-slate-200 bg-white">
                    <div className="w-full relative h-full">
                      {/* Actual Progress Bar - Renders first, sits below */}
                      {showActual && taskBar.actualBar && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute h-5 rounded-md shadow-lg border border-white/50 transition-all duration-200 hover:shadow-xl z-10 cursor-pointer"
                              style={{
                                left: `${Math.max(0.5, taskBar.actualBar.leftPercent)}%`,
                                width: `${Math.min(99 - Math.max(0.5, taskBar.actualBar.leftPercent), taskBar.actualBar.widthPercent * (task.progress / 100))}%`,
                                background: (() => {
                                  // Check if actual end date extends beyond planned end date
                                  const plannedEnd = task.endDate ? parseISO(task.endDate) : null;
                                  const actualEnd = task.actualEndDate ? parseISO(task.actualEndDate) : null;
                                  const isOverdue = plannedEnd && actualEnd && isDateValid(plannedEnd) && isDateValid(actualEnd) && actualEnd > plannedEnd;

                                  if (isOverdue) {
                                    // Yellow/orange gradient for overdue
                                    return 'linear-gradient(135deg, #f59e0b, #fbbf24)';
                                  }

                                  // Normal color based on progress percentage
                                  return task.progress <= 25
                                    ? 'linear-gradient(135deg, #dc2626, #ef4444)'
                                    : task.progress <= 80
                                      ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                                      : 'linear-gradient(135deg, #10b981, #34d399)';
                                })(),
                                top: '50%',
                                transform: 'translateY(-50%)',
                              }}
                              onClick={() => onTaskClick?.(task)}
                            >
                              {/* Progress Percentage Label */}
                              <div className="absolute inset-0 flex items-center justify-center px-2 text-white text-xs font-bold truncate drop-shadow-md">
                                {task.progress}%
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm bg-slate-900 text-white">
                            <div className="space-y-1.5">
                              <div className="font-semibold text-sm">{task.name}</div>
                              {task.description && (
                                <div className="text-xs text-slate-300 whitespace-pre-wrap border-t border-slate-700 pt-1.5">
                                  {task.description}
                                </div>
                              )}
                              <div className="text-xs border-t border-slate-700 pt-1.5 space-y-0.5">
                                <div>
                                  <span className="text-slate-400">Planned:</span>{' '}
                                  {format(parseISO(task.startDate), 'MMM dd, yyyy')} - {format(parseISO(task.endDate), 'MMM dd, yyyy')}
                                </div>
                                <div>
                                  <span className="text-slate-400">Duration:</span> {task.mandays || 0} mandays
                                </div>
                                <div>
                                  <span className="text-slate-400">Actual:</span>{' '}
                                  {task.actualStartDate ? format(parseISO(task.actualStartDate), 'MMM dd, yyyy') : '-'} - {task.actualEndDate ? format(parseISO(task.actualEndDate), 'MMM dd, yyyy') : '-'}
                                </div>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {/* Planned Task Bar - Dashed Border - Overlays on top to show planned boundary */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute h-5 rounded-lg cursor-pointer border-2 border-dashed transition-all duration-200 hover:shadow-md z-20"
                            style={{
                              left: `${Math.max(0.5, taskBar.leftPercent)}%`,
                              width: `${Math.min(99 - Math.max(0.5, taskBar.leftPercent), taskBar.widthPercent)}%`,
                              borderColor: taskBar.color,
                              backgroundColor: 'transparent',
                              top: '50%',
                              transform: 'translateY(-50%)',
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm bg-slate-900 text-white">
                          <div className="space-y-1.5">
                            <div className="font-semibold text-sm">{task.name}</div>
                            {task.description && (
                              <div className="text-xs text-slate-300 whitespace-pre-wrap border-t border-slate-700 pt-1.5">
                                {task.description}
                              </div>
                            )}
                            <div className="text-xs border-t border-slate-700 pt-1.5 space-y-0.5">
                              <div>
                                <span className="text-slate-400">Planned:</span>{' '}
                                {format(parseISO(task.startDate), 'MMM dd, yyyy')} - {format(parseISO(task.endDate), 'MMM dd, yyyy')}
                              </div>
                              <div>
                                <span className="text-slate-400">Duration:</span> {task.mandays || 0} mandays
                              </div>
                              <div>
                                <span className="text-slate-400">Actual:</span>{' '}
                                {task.actualStartDate ? format(parseISO(task.actualStartDate), 'MMM dd, yyyy') : '-'} - {task.actualEndDate ? format(parseISO(task.actualEndDate), 'MMM dd, yyyy') : '-'}
                              </div>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>

                      {/* Today Line */}
                      {(() => {
                        const today = new Date();
                        const todayOffset = differenceInDays(today, timelineStart);
                        const totalDays = differenceInDays(timelineEnd, timelineStart);
                        const todayPercent = (todayOffset / totalDays) * 100;

                        if (todayPercent >= 0 && todayPercent <= 100) {
                          return (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 shadow-md"
                              style={{ left: `${todayPercent}%` }}
                              title={`Today: ${format(today, 'MMM dd, yyyy')}`}
                            >
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-md" />
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
