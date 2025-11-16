'use client';

import React from 'react';
import { CustomDataGrid, type ColumnDef } from '@/components/ui/DataGrid';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowUp, ArrowDown, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';

export type ScopeRow = {
   id: string;
   index: number;
   serverId?: string;
   title: string;
   groupsText: string;
   assigneeText: string;
   plannedText: string;
   actualText: string;
   mandays: number;
   actualMandays: number;
   progress: number;
   status: string;
};

interface ScopesTableViewProps {
   scopeRows: ScopeRow[];
   savingProgressId: string | null;
   editProjectId?: string;
   onProgressChange: (index: number, value: number) => void;
   onReorder: (fromIndex: number, toIndex: number) => void;
   onEdit: (index: number) => void;
   onDelete: (index: number, serverId?: string) => void;
}

const ScopesTableView: React.FC<ScopesTableViewProps> = ({
   scopeRows,
   savingProgressId,
   editProjectId,
   onProgressChange,
   onReorder,
   onEdit,
   onDelete,
}) => {
   const scopeColumns: ColumnDef<ScopeRow>[] = [
      {
         key: 'index',
         header: '#',
         render: (row) => row.index + 1,
         colClass: 'w-10 text-right text-muted-foreground',
      },
      {
         key: 'title',
         header: 'Scopes',
         render: (row) => (
            <div className="flex flex-col">
               <span className="font-medium">{row.title}</span>
               <span className="text-xs text-muted-foreground">{row.assigneeText}</span>
            </div>
         ),
         columnVisible: true,
      },
      { key: 'groupsText', header: 'Tasks' },
      {
         key: 'plannedText',
         header: 'Planned',
         render: (row) => (
            <div className="flex flex-col text-xs">
               <div>{row.plannedText}</div>
               <div className="text-muted-foreground">{row.mandays} days</div>
            </div>
         ),
      },
      {
         key: 'actualText',
         header: 'Actual',
         render: (row) => (
            <div className="flex flex-col text-xs">
               <div>{row.actualText}</div>
               <div className="text-muted-foreground">{row.actualMandays} days</div>
            </div>
         ),
      },
      {
         key: 'progress',
         header: 'Progress/Status',
         render: (row) => (
            <div className="flex flex-col gap-1">
               <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={row.progress ?? 0}
                  disabled={Boolean(savingProgressId) && String(row.serverId || '') === savingProgressId}
                  onChange={e => onProgressChange(row.index, Number(e.target.value))}
                  className="accent-emerald-600"
               />
               <span className="text-[10px] text-muted-foreground">{row.status}</span>
            </div>
         ),
      },
      {
         key: 'id',
         header: 'Actions',
         render: (row) => (
            <div className="flex items-center gap-1 justify-end">
               <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Move up"
                  onClick={() => onReorder(row.index, row.index - 1)}
               >
                  <ArrowUp className="h-4 w-4" />
               </Button>
               <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Move down"
                  onClick={() => onReorder(row.index, row.index + 1)}
               >
                  <ArrowDown className="h-4 w-4" />
               </Button>
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button variant="ghost" size="icon" aria-label="Scope actions">
                        <MoreVertical className="h-4 w-4" />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                     <DropdownMenuItem onClick={() => onEdit(row.index)}>
                        Edit
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => {
                        toast.info(`Add issues for: ${row.title}`);
                     }}>
                        Add Issues
                     </DropdownMenuItem>
                     <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(row.index, row.serverId)}
                     >
                        Delete
                     </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
         ),
      },
   ];

   if (scopeRows.length === 0) {
      return (
         <p className="text-sm text-muted-foreground">No scopes yet. Use the sidebar to add.</p>
      );
   }

   return (
      <CustomDataGrid
         data={scopeRows}
         columns={scopeColumns}
         pagination={false}
         inputFilter={false}
         dataExport={false}
      />
   );
};

export default ScopesTableView;
