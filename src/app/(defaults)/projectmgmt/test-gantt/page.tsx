'use client';

import React from 'react';
import GanttChart, { type GanttTask } from '@/components/projectmgmt/GanttChart';
import { addDays, format } from 'date-fns';

const TestGanttPage = () => {
  const today = new Date();
  
  // Sample tasks for testing
  const sampleTasks: GanttTask[] = [
    {
      id: '1',
      name: 'Project Planning & Requirements',
      startDate: format(today, 'yyyy-MM-dd'),
      endDate: format(addDays(today, 14), 'yyyy-MM-dd'),
      progress: 100,
      status: 'completed',
      assignee: 'John Doe',
      mandays: 10,
      color: '#4F46E5',
    },
    {
      id: '2',
      name: 'Design & Architecture',
      startDate: format(addDays(today, 7), 'yyyy-MM-dd'),
      endDate: format(addDays(today, 28), 'yyyy-MM-dd'),
      progress: 75,
      status: 'in_progress',
      assignee: 'Jane Smith',
      mandays: 15,
      actualStartDate: format(addDays(today, 7), 'yyyy-MM-dd'),
      actualEndDate: format(addDays(today, 30), 'yyyy-MM-dd'),
      color: '#DC2626',
    },
    {
      id: '3',
      name: 'Backend Development',
      startDate: format(addDays(today, 21), 'yyyy-MM-dd'),
      endDate: format(addDays(today, 56), 'yyyy-MM-dd'),
      progress: 45,
      status: 'in_progress',
      assignee: 'Mike Johnson',
      mandays: 25,
      color: '#059669',
    },
    {
      id: '4',
      name: 'Frontend Development',
      startDate: format(addDays(today, 28), 'yyyy-MM-dd'),
      endDate: format(addDays(today, 63), 'yyyy-MM-dd'),
      progress: 20,
      status: 'in_progress',
      assignee: 'Sarah Wilson',
      mandays: 25,
      color: '#D97706',
    },
    {
      id: '5',
      name: 'Testing & QA',
      startDate: format(addDays(today, 56), 'yyyy-MM-dd'),
      endDate: format(addDays(today, 77), 'yyyy-MM-dd'),
      progress: 0,
      status: 'not_started',
      assignee: 'Tom Brown',
      mandays: 15,
      color: '#7C3AED',
    },
    {
      id: '6',
      name: 'Deployment & Launch',
      startDate: format(addDays(today, 70), 'yyyy-MM-dd'),
      endDate: format(addDays(today, 84), 'yyyy-MM-dd'),
      progress: 0,
      status: 'not_started',
      assignee: 'Alice Davis',
      mandays: 10,
      color: '#0891B2',
    },
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Gantt Chart Test</h1>
        <p className="text-slate-600">Testing the Gantt chart component with sample data</p>
      </div>

      <GanttChart
        tasks={sampleTasks}
        projectStart={format(today, 'yyyy-MM-dd')}
        projectEnd={format(addDays(today, 84), 'yyyy-MM-dd')}
        onTaskClick={(task) => {
          console.log('Task clicked:', task);
          alert(`Clicked: ${task.name}`);
        }}
        className="shadow-xl"
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">📊 Test Instructions</h3>
        <ul className="list-disc list-inside text-blue-800 space-y-1">
          <li>The Gantt chart should display {sampleTasks.length} tasks with colored bars</li>
          <li>Each task bar should show progress as a lighter overlay</li>
          <li>Hover over tasks to see interactive effects</li>
          <li>The red vertical line represents today's date</li>
          <li>Click tasks to test interaction</li>
          <li>Try switching between Weekly and Monthly views</li>
          <li>Toggle "Show Actual" to see planned vs actual dates</li>
        </ul>
      </div>
    </div>
  );
};

export default TestGanttPage;
