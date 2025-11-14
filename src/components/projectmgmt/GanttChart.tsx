'use client';

import React, { useMemo, useState } from 'react';
import { format, parseISO, isValid as isDateValid, eachWeekOfInterval, startOfWeek, endOfWeek, differenceInDays, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar, Download, GripVertical } from 'lucide-react';
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

export interface GanttTask {
  id: string;
  name: string;
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
  onTaskClick?: (task: GanttTask) => void;
  onTaskEdit?: (taskId: string) => void;
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

interface SortableTaskRowProps {
  task: GanttTask;
  taskBar: any;
  index: number;
  timeColumns: any[];
  timelineStart: Date;
  timelineEnd: Date;
  showActual: boolean;
  onTaskClick?: (task: GanttTask) => void;
}

const SortableTaskRow: React.FC<SortableTaskRowProps> = ({
  task,
  taskBar,
  index,
  timeColumns,
  timelineStart,
  timelineEnd,
  showActual,
  onTaskClick,
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
        // Count working days (Mon-Fri)
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

  return (
    <React.Fragment>
      {/* Task Info Cell */}
      <div 
        ref={setNodeRef} 
        style={style}
        className="p-2 border-b border-r border-slate-200 bg-white flex items-center h-[40px] hover:bg-blue-50/30 transition-colors"
      >
        {/* Drag Handle */}
        <div 
          {...attributes}
          {...listeners}
          className="mr-2 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 flex-shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        
        <div className="grid grid-cols-[180px_1fr] gap-3 flex-1 min-w-0">
          {/* Left: Task Name & Assignee */}
          <div className="space-y-1 min-w-0">
            <div className="font-semibold text-slate-800 truncate text-sm" title={task.name}>
              {task.name}
            </div>
            <div className="text-xs text-slate-600 truncate">
              {task.assignee && <span>{task.assignee}</span>}
            </div>
          </div>

          {/* Right: Dates & Duration */}
          <div className="grid grid-cols-2 gap-2 text-xs min-w-0">
            {/* Planned Column */}
            <div className="space-y-0.5">
              <div className="font-medium text-slate-700">
                {task.startDate ? format(parseISO(task.startDate), 'dd/MM/yy') : '-'}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-600">
                  {task.endDate ? format(parseISO(task.endDate), 'dd/MM/yy') : '-'}
                </span>
                <span className="text-blue-600 font-medium">
                  ({task.mandays || 0}md)
                </span>
              </div>
            </div>

            {/* Actual Column */}
            <div className="space-y-0.5">
              <div className={`font-medium ${task.actualStartDate ? 'text-slate-700' : 'text-slate-400'}`}>
                {task.actualStartDate ? format(parseISO(task.actualStartDate), 'dd/MM/yy') : '-'}
              </div>
              <div className="flex items-center gap-1">
                <span className={`${task.actualEndDate ? 'text-slate-600' : 'text-slate-400'}`}>
                  {task.actualEndDate ? format(parseISO(task.actualEndDate), 'dd/MM/yy') : '-'}
                </span>
                <span className={`font-medium ${actualDuration > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  ({actualDuration > 0 ? actualDuration : '-'}md)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Cell */}
      <div className="relative h-[40px] flex items-center px-2 border-b border-slate-200 bg-white overflow-x-auto">
        <div className="min-w-[800px] w-full relative h-full">
          {/* Grid lines for each time column */}
          <div className="absolute inset-0 grid z-0" style={{ gridTemplateColumns: `repeat(${timeColumns.length}, 1fr)` }}>
            {timeColumns.map((_, idx) => (
              <div key={idx} className="border-r border-slate-100 h-full" />
            ))}
          </div>
          
          {/* Planned Task Bar - Dashed Border */}
          <div
            className="absolute h-6 rounded-lg cursor-pointer border-1 border-dashed transition-all duration-200 hover:shadow-md z-10"
            style={{
              left: `${Math.max(0.5, taskBar.leftPercent)}%`,
              width: `${Math.min(99 - Math.max(0.5, taskBar.leftPercent), taskBar.widthPercent)}%`,
              borderColor: taskBar.color,
              backgroundColor: `${taskBar.color}15`,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
            onClick={() => onTaskClick?.(task)}
            title={`Planned: ${task.name}\n${format(parseISO(task.startDate), 'MMM dd, yyyy')} - ${format(parseISO(task.endDate), 'MMM dd, yyyy')}\nDuration: ${task.mandays || 0} mandays`}
          >
            {/* Actual Progress Bar - Overlays on Planned */}
            {showActual && taskBar.actualBar && (
              <div
                className="absolute h-full rounded-lg shadow-md border border-white/20 transition-all duration-200"
                style={{
                  left: `${Math.max(0, ((taskBar.actualBar.leftPercent - taskBar.leftPercent) / taskBar.widthPercent) * 100)}%`,
                  width: `${Math.min(100, ((taskBar.actualBar.widthPercent / taskBar.widthPercent) * 100) * (task.progress / 100))}%`,
                  background: task.progress <= 25 
                    ? 'linear-gradient(135deg, #dc2626F0, #dc2626)'
                    : task.progress <= 80
                      ? 'linear-gradient(135deg, #f59e0bF0, #f59e0b)'
                      : 'linear-gradient(135deg, #10b981F0, #10b981)',
                  top: 0,
                }}
                title={`Actual: ${task.actualStartDate ? format(parseISO(task.actualStartDate), 'MMM dd, yyyy') : '-'} - ${task.actualEndDate ? format(parseISO(task.actualEndDate), 'MMM dd, yyyy') : '-'}\nProgress: ${task.progress}%`}
              >
                {/* Progress Percentage Label */}
                <div className="absolute inset-0 flex items-center justify-center px-2 text-white text-xs font-bold truncate">
                  {task.progress}%
                </div>
              </div>
            )}
          </div>

          {/* Today Line */}
          {(() => {
            const today = new Date();
            const todayOffset = differenceInDays(today, timelineStart);
            const totalDays = differenceInDays(timelineEnd, timelineStart);
            const todayPercent = (todayOffset / totalDays) * 100;
            
            if (todayPercent >= 0 && todayPercent <= 100) {
              return (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 shadow-md"
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
    </React.Fragment>
  );
};

const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  projectStart,
  projectEnd,
  onTaskClick,
  onTaskEdit,
  onTasksReorder,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'weeks' | 'months'>('weeks');
  const [showActual, setShowActual] = useState(true);
  const [localTasks, setLocalTasks] = useState(tasks);

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

    if (viewMode === 'weeks') {
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
  }, [localTasks, projectStart, projectEnd, viewMode, showActual]);

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
      ctx.fillText('Gantt Chart Export', 20, 30);

      tasks.forEach((task, index) => {
        const y = 60 + (index * 30);
        ctx.fillText(task.name, 20, y);
        ctx.fillText(`${task.startDate} - ${task.endDate}`, 300, y);
      });

      // Download
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `gantt-chart-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <Card className={`p-0 shadow-lg border-slate-200 ${className}`}>
      {/* Header */}
      <div className="border-b border-slate-200 p-4 bg-gradient-to-r from-white to-slate-50">
        <h3 className="font-bold text-xl text-slate-800 flex items-center gap-3">
          <Calendar className="h-6 w-6 text-blue-600" />
          Gantt Chart
        </h3>
      </div>

      {/* Gantt Content - Proper Grid Layout */}
      <div className="grid grid-cols-[450px_1fr]">
        {/* Headers */}
        <div className="p-2 font-semibold text-slate-700 bg-white border-b border-r bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 z-30">
          <div className="flex items-center">
            {/* Drag handle space */}
            <div className="w-6 mr-2"></div>
            <div className="grid grid-cols-[180px_1fr] gap-3 flex-1">
              <div>Task Name</div>
              <div className="grid grid-cols-2 gap-2 text-xs font-normal text-slate-600">
                <div>Planned</div>
                <div>Actual</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-b bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 z-20 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Month Headers Row */}
            <div className="grid border-b border-slate-300" style={{ gridTemplateColumns: `repeat(${timeColumns.length}, 1fr)` }}>
              {monthGroups.map((group, groupIndex) => (
                <div 
                  key={groupIndex} 
                  className="font-bold text-sm text-slate-700 bg-slate-100 py-2 text-center"
                  style={{ 
                    gridColumn: `span ${group.count}`,
                    borderRight: groupIndex < monthGroups.length - 1 ? '2px solid #cbd5e1' : 'none'
                  }}
                >
                  {group.month}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task Rows */}
        {localTasks.length === 0 ? (
          <>
            <div className="col-span-2 p-16 text-center bg-white">
              <div className="mx-auto w-24 h-24 mb-6 text-slate-300">
                <Calendar className="w-full h-full" />
              </div>
              <h4 className="text-lg font-semibold text-slate-600 mb-2">No tasks to display</h4>
              <p className="text-slate-500 max-w-md mx-auto">
                Add some project scopes to see them visualized in the Gantt chart timeline.
              </p>
            </div>
          </>
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
                if (!taskBar) return null;

                return (
                  <SortableTaskRow
                    key={task.id}
                    task={task}
                    taskBar={taskBar}
                    index={index}
                    timeColumns={timeColumns}
                    timelineStart={timelineStart}
                    timelineEnd={timelineEnd}
                    showActual={showActual}
                    onTaskClick={onTaskClick}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Footer Stats */}
      {localTasks.length > 0 && (
        <div className="border-t border-slate-200 p-4 bg-gradient-to-r from-slate-50 to-gray-50 text-sm">
          <div className="flex justify-between items-center text-slate-600">
            <div className="flex items-center gap-6">
              <span className="font-medium">{localTasks.length} tasks total</span>
              <span>{localTasks.filter(t => t.status === 'completed').length} completed</span>
              <span>{localTasks.filter(t => t.status === 'in_progress').length} in progress</span>
            </div>
            <span className="text-slate-500">
              {format(timelineStart, 'MMM dd')} - {format(timelineEnd, 'MMM dd, yyyy')} 
              <span className="ml-2 text-xs">
                ({Math.ceil(differenceInDays(timelineEnd, timelineStart) / 7)} weeks)
              </span>
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default GanttChart;
