'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomDataGrid, type ColumnDef } from '@/components/ui/DataGrid';
import { Loader2, Plus, Pencil, CornerUpLeft } from 'lucide-react';
import TrainingCourseForm from '@/components/training/training-course-form';

type Course = {
  id: number;
  course_id?: number;
  course_title: string;
  course_type?: string | null;
  course_cat?: string | null;
  course_opt?: string | null;
  trainer?: { id?: number; name?: string } | null;
};

const normalizeCourse = (raw: any): Course => ({
  id: Number(raw?.course_id ?? raw?.id ?? 0),
  course_id: Number(raw?.course_id ?? raw?.id ?? 0),
  course_title: String(raw?.course_title ?? raw?.title ?? 'Untitled Course'),
  course_type: raw?.course_type ?? null,
  course_cat: raw?.course_cat ?? null,
  course_opt: raw?.course_opt ?? null,
  trainer: raw?.trainer ? { id: Number(raw?.trainer?.id ?? raw?.trainer_id ?? 0), name: raw?.trainer?.name ?? raw?.trainer_name ?? '' } : null,
});

const TrainingCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedApi.get('/api/training/courses');
      const data: any = (res as any)?.data;
      const list: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setCourses(list.map(normalizeCourse));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const columns = useMemo<ColumnDef<Course>[]>(() => [
    { key: 'course_title', header: 'Title', filterable: true, filter: 'input' },
    {
      key: 'course_type',
      header: 'Type',
      filterable: true,
      filter: 'singleSelect',
      render: (row) => <Badge variant="outline" className="capitalize">{row.course_type || '-'}</Badge>,
    },
    {
      key: 'course_cat',
      header: 'Category',
      filterable: true,
      filter: 'singleSelect',
      render: (row) => <span className="capitalize">{row.course_cat || '-'}</span>,
    },
    {
      key: 'course_opt',
      header: 'Options',
      render: (row) => {
        const opts = (row.course_opt || '').split(',').map((s) => s.trim()).filter(Boolean);
        return (
          <div className="flex flex-wrap gap-1">
            {opts.length ? opts.map((o, idx) => (
              <Badge key={`${row.id}-${o}-${idx}`} variant="secondary" className="capitalize">{o}</Badge>
            )) : <span className="text-muted-foreground">-</span>}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <Button size="sm" variant="outline" onClick={() => { setEditingId(row.id); setShowForm(true); }}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      ),
    },
  ], []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Courses</h2>
          <p className="text-sm text-muted-foreground">Manage course definitions from /api/training/courses.</p>
        </div>
        <div className="flex items-center gap-2">
          {showForm ? (
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(undefined); }}>
              <CornerUpLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <>
              <Button type="button" onClick={() => { setEditingId(undefined); setShowForm(true); }}>
                <Plus className="h-4 w-4" /> New Course
              </Button>
              <Button type="button" variant="outline" onClick={() => loadCourses()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
              </Button>
            </>
          )}
        </div>
      </div>

      {showForm ? (
        <TrainingCourseForm
          courseId={editingId}
          onSuccess={() => { setShowForm(false); setEditingId(undefined); loadCourses(); }}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Course List</CardTitle>
          </CardHeader>
          <CardContent>
            {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
            {loading && (
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading courses...
              </div>
            )}
            <CustomDataGrid
              data={courses}
              columns={columns}
              pagination={false}
              pageSize={10}
              inputFilter={false}
              onRowDoubleClick={(row) => { setEditingId((row as any)?.id); setShowForm(true); }}
              dataExport={false}
              rowColHighlight={false}
              columnsVisibleOption={false}
              gridSettings={false}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrainingCourses;
