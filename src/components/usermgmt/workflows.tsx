'use client';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { authenticatedApi } from '@/config/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Plus, Edit2, Trash2, Save, X, Settings, Check, User, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface Workflows {
  id?: number;
  module_name: string;
  level_order: number;
  level_name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  employee?: {
    ramco_id: string;
    full_name: string;
  };
}

type AuthorizeLevel = string;

interface AssignedEmployee {
  ramco_id: string;
  full_name: string;
  authorize_level: AuthorizeLevel;
}

interface WorkflowsForm {
  id?: number;
  module_name: string;
  description: string;
  is_active: boolean;
  employees: AssignedEmployee[];
}

interface Employee {
  ramco_id: string;
  full_name: string;
}

const authorizedLevels: string[] = ['Verify', 'Recommend', 'Approval'];

interface WorkflowsProps {
  className?: string;
}

const Workflows: React.FC<WorkflowsProps> = ({ className = '' }) => {
  const [workflows, setWorkflows] = useState<Workflows[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Workflows | null>(null);
  const [formData, setFormData] = useState<WorkflowsForm>({
    module_name: '',
    description: '',
    is_active: true,
    employees: []
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Employee search state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [employeeComboboxOpen, setEmployeeComboboxOpen] = useState(false);
  // Per-employee authorize level select state
  const [empSelectOpen, setEmpSelectOpen] = useState<Record<number, boolean>>({});
  const [customLevelInputs, setCustomLevelInputs] = useState<Record<number, string>>({});

  // Alert dialog state
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => { },
    confirmText: 'Confirm',
    cancelText: 'Cancel'
  });

  // Helper function to show alert dialog
  const showAlertDialog = (title: string, description: string, onConfirm: () => void, confirmText = 'Confirm', cancelText = 'Cancel') => {
    setAlertDialog({
      isOpen: true,
      title,
      description,
      onConfirm,
      confirmText,
      cancelText
    });
  };

  const closeAlertDialog = () => {
    setAlertDialog(prev => ({ ...prev, isOpen: false }));
  };

  // Employee search functionality
  const searchEmployees = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setEmployees([]);
      return;
    }

    try {
      setEmployeeSearchLoading(true);
      console.log('Searching for employees with query:', query);
      const response = await authenticatedApi.get(`/api/assets/employees/search?q=${encodeURIComponent(query)}`);
      console.log('Employee search response:', response.data);
      const data = response.data as { status: string; message: string; data: Employee[] };
      if (data.status === 'success') {
        setEmployees(data.data || []);
        console.log('Set employees:', data.data);
      }
    } catch (error) {
      console.error('Error searching employees:', error);
      setEmployees([]);
    } finally {
      setEmployeeSearchLoading(false);
    }
  }, []);

  // Debounced employee search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchEmployees(employeeSearchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [employeeSearchQuery, searchEmployees]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.employee-dropdown')) {
        setEmployeeComboboxOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchApprovalLevels = async () => {
    try {
      setLoading(true);
      const response = await authenticatedApi.get('/api/users/workflows');
      const data = response.data as { status: string; message: string; data: Workflows[] };
      if (data.status === 'success') {
        setWorkflows(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast.error('Failed to fetch workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate required fields
      if (!formData.module_name || formData.employees.length === 0 || formData.employees.some(e => !e.authorize_level?.trim())) {
        toast.error('Please fill in all required fields');
        setSaving(false);
        return;
      }

      if (editingLevel?.id) {
        const assignee = formData.employees[0];
        if (!assignee) {
          toast.error('Please assign an employee to this workflow level');
          setSaving(false);
          return;
        }

        const updatePayload = {
          module_name: formData.module_name,
          description: formData.description,
          level_name: assignee.authorize_level,
          level_order: editingLevel.level_order ?? 1,
          ramco_id: assignee.ramco_id,
          is_active: formData.is_active,
        };

        await authenticatedApi.put(`/api/users/workflows/${editingLevel.id}`, updatePayload);
        toast.success('Workflow updated successfully');
      } else {
        const createPayload = {
          module_name: formData.module_name,
          description: formData.description,
          is_active: formData.is_active,
          employees: formData.employees.map((e) => ({
            ramco_id: e.ramco_id,
            level_name: e.authorize_level,
          })),
        };

        await authenticatedApi.post('/api/users/workflows', createPayload);
        toast.success('Workflow created successfully');
      }

      setIsDialogOpen(false);
      setEditingLevel(null);
      resetForm();
      await fetchApprovalLevels();

    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEmployeeComboboxOpen(false);
    setEmployeeSearchQuery(employee.full_name);
  };

  const handleAddSelectedEmployee = () => {
    if (!selectedEmployee) return;
    // Allow duplicates for the same employee as long as authorize_level differs
    const usedLevels = formData.employees
      .filter((e) => e.ramco_id === selectedEmployee.ramco_id)
      .map((e) => e.authorize_level);

    // Pick first unused standard level; if all used, leave empty to let user choose
    const defaultLevel = authorizedLevels.find((lvl) => !usedLevels.includes(lvl)) || '';

    // Prevent adding exact duplicate pair (same employee with same level)
    if (defaultLevel && formData.employees.some((e) => e.ramco_id === selectedEmployee.ramco_id && e.authorize_level === defaultLevel)) {
      toast.error('Employee already added with this authorize level');
      return;
    }

    // If all standard levels are used and there is already an empty-level entry, block
    if (!defaultLevel && formData.employees.some((e) => e.ramco_id === selectedEmployee.ramco_id && !e.authorize_level)) {
      toast.error('Please set a unique authorize level for the existing entry first');
      return;
    }

    setFormData({
      ...formData,
      employees: [
        ...formData.employees,
        {
          ramco_id: selectedEmployee.ramco_id,
          full_name: selectedEmployee.full_name,
          authorize_level: defaultLevel,
        },
      ],
    });
    setSelectedEmployee(null);
    setEmployeeSearchQuery('');
  };

  const handleRemoveAssignedEmployee = (index: number) => {
    setFormData({
      ...formData,
      employees: formData.employees.filter((_, i) => i !== index),
    });
  };

  const handleDelete = async (levelId: number) => {
    const performDelete = async () => {
      try {
        setDeleting(levelId);
        await authenticatedApi.delete(`/api/users/workflows/${levelId}`);
        toast.success('Workflow deleted successfully');
        await fetchApprovalLevels();
      } catch (error) {
        console.error('Error deleting workflow:', error);
        toast.error('Failed to delete workflow');
      } finally {
        setDeleting(null);
      }
    };

    showAlertDialog(
      'Delete Workflow',
      'Are you sure you want to delete this workflow? This action cannot be undone.',
      performDelete,
      'Delete',
      'Cancel'
    );
  };

  const handleEdit = (level: Workflows) => {
    setEditingLevel(level);
    setFormData({
      id: level.id,
      module_name: level.module_name,
      description: level.description || '',
      is_active: level.is_active,
      employees: level.employee
        ? [
            {
              ramco_id: level.employee.ramco_id,
              full_name: level.employee.full_name,
              authorize_level: level.level_name || 'Verify',
            },
          ]
        : [],
    });

    // Set selected employee if available
    if (level.employee) {
      setSelectedEmployee({
        ramco_id: level.employee.ramco_id,
        full_name: level.employee.full_name
      });
    } else {
      setSelectedEmployee(null);
    }

    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingLevel(null);
    resetForm();
    setIsDialogOpen(true);
    // Auto-open the employee combobox for better UX
    setTimeout(() => setEmployeeComboboxOpen(true), 100);
  };

  const resetForm = () => {
    setFormData({
      module_name: '',
      description: '',
      is_active: true,
      employees: []
    });
    setSelectedEmployee(null);
    setEmployeeSearchQuery('');
    setEmployees([]);
  };

  const handleToggleActive = async (level: Workflows) => {
    const action = level.is_active ? 'deactivate' : 'activate';

    const performToggle = async () => {
      try {
        const updatedLevel = { ...level, is_active: !level.is_active };
        await authenticatedApi.put(`/api/approval-levels/${level.id}`, updatedLevel);
        toast.success(`Workflow ${updatedLevel.is_active ? 'activated' : 'deactivated'}`);
        await fetchApprovalLevels();
      } catch (error) {
        console.error('Error toggling workflow status:', error);
        toast.error('Failed to update workflow status');
      }
    };

    showAlertDialog(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Workflow`,
      `Are you sure you want to ${action} this workflow?`,
      performToggle,
      action.charAt(0).toUpperCase() + action.slice(1),
      'Cancel'
    );
  };

  const moveLevel = async (levelId: number, direction: 'up' | 'down') => {
    try {
      await authenticatedApi.post(`/api/approval-levels/${levelId}/move`, { direction });
      toast.success('Workflow order updated successfully');
      await fetchApprovalLevels();
    } catch (error) {
      console.error('Error moving workflow:', error);
      toast.error('Failed to update workflow order');
    }
  };

  // Chevron up/down reorder within a module via reorder endpoint
  const handleChevronMove = async (module: string, index: number, direction: 'up' | 'down') => {
    const levels = groupedLevels[module];
    if (!levels) return;
    const ids = levels.map((l) => l.id!);
    const to = direction === 'up' ? index - 1 : index + 1;
    if (to < 0 || to >= ids.length) return;
    const newOrder = ids.slice();
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(to, 0, moved);
    try {
      await authenticatedApi.post('/api/users/workflows/reorder', {
        module_name: module,
        order: newOrder,
      });
      toast.success('Workflow order updated successfully');
      await fetchApprovalLevels();
    } catch (error) {
      console.error('Error reordering workflow:', error);
      toast.error('Failed to reorder workflow');
    }
  };

  // Edit/Delete at module (workflow) level
  const handleEditModule = (moduleName: string) => {
    const levels = groupedLevels[moduleName] || [];
    setEditingLevel(null);
    setFormData({
      id: undefined,
      module_name: moduleName,
      description: levels[0]?.description || '',
      is_active: levels.some((l) => l.is_active),
      employees: levels
        .filter((l) => !!l.employee)
        .map((l) => ({
          ramco_id: l.employee!.ramco_id,
          full_name: l.employee!.full_name,
          authorize_level: l.level_name || 'Verify',
        })),
    });
    setIsDialogOpen(true);
  };

  const handleDeleteModule = (moduleName: string) => {
    const levels = groupedLevels[moduleName] || [];
    const performDelete = async () => {
      try {
        for (const lvl of levels) {
          await authenticatedApi.delete(`/api/users/approvals/${lvl.id}`);
        }
        toast.success('Workflow deleted successfully');
        await fetchApprovalLevels();
      } catch (error) {
        console.error('Error deleting workflow module:', error);
        toast.error('Failed to delete workflow');
      }
    };

    showAlertDialog(
      'Delete Workflow',
      `Delete entire workflow for "${moduleName.replace('_', ' ').toUpperCase()}"? This cannot be undone.`,
      performDelete,
      'Delete',
      'Cancel'
    );
  };

  useEffect(() => {
    fetchApprovalLevels();
  }, []);

  // Group approval levels by module
  const groupedLevels = workflows.reduce((acc, level) => {
    if (!acc[level.module_name]) {
      acc[level.module_name] = [];
    }
    acc[level.module_name].push(level);
    return acc;
  }, {} as Record<string, Workflows[]>);

  // Sort levels within each module by level_order
  Object.keys(groupedLevels).forEach(module => {
    groupedLevels[module].sort((a, b) => a.level_order - b.level_order);
  });

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Workflows Management</h2>
          <p className="text-gray-600 mt-1">Configure workflows for different modules</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingLevel ? 'Edit Workflow' : 'Add New Workflow'}
              </DialogTitle>
              <DialogDescription>
                {editingLevel ? 'Update the workflow details' : 'Create a new workflow for management'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-2">Module Name *</label>
                <Input
                  value={formData.module_name}
                  onChange={(e) => setFormData({ ...formData, module_name: e.target.value })}
                  placeholder="Enter module name"
                  className='capitalize'
                />
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium block mb-2">Employees *</label>
                <div className="relative employee-dropdown">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search employee..."
                      value={employeeSearchQuery}
                      onChange={(e) => {
                        setEmployeeSearchQuery(e.target.value);
                        if (e.target.value.length >= 2) {
                          setEmployeeComboboxOpen(true);
                        } else {
                          setEmployeeComboboxOpen(false);
                        }
                      }}
                      onFocus={() => {
                        if (employeeSearchQuery.length >= 2) {
                          setEmployeeComboboxOpen(true);
                        }
                      }}
                      className="pl-10"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 px-2"
                      variant="default"
                      onClick={handleAddSelectedEmployee}
                      disabled={!selectedEmployee}
                      title="Add employee"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {employeeComboboxOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {employeeSearchLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span className="text-sm">Searching...</span>
                        </div>
                      ) : employees.length === 0 && employeeSearchQuery.length >= 2 ? (
                        <div className="py-4 text-center text-sm text-gray-500">
                          No employees found.
                        </div>
                      ) : employees.length === 0 && employeeSearchQuery.length < 2 ? (
                        <div className="py-4 text-center text-sm text-gray-500">
                          Type at least 2 characters to search...
                        </div>
                      ) : (
                        <div className="py-2">
                          {employees.map((employee) => (
                            <div
                              key={employee.ramco_id}
                              className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                              onClick={() => handleEmployeeSelect(employee)}
                            >
                              <div className="flex-1">
                                <div className="font-medium text-sm">{employee.full_name}</div>
                                <div className="text-xs text-gray-500">{employee.ramco_id}</div>
                              </div>
                              {selectedEmployee?.ramco_id === employee.ramco_id && (
                                <Check className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {formData.employees.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {formData.employees.map((emp, idx) => (
                        <div key={`${emp.ramco_id}-${idx}`} className="flex items-center justify-between gap-3 p-2 bg-gray-50 border rounded">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{emp.full_name}</div>
                            <div className="text-xs text-gray-500">{emp.ramco_id}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              open={empSelectOpen[idx] || false}
                              onOpenChange={(o) => setEmpSelectOpen((prev) => ({ ...prev, [idx]: o }))}
                              value={emp.authorize_level}
                              onValueChange={(val) => {
                                // Prevent duplicate level for the same employee across entries
                                const duplicate = formData.employees.some((x, i) => i !== idx && x.ramco_id === emp.ramco_id && x.authorize_level === val);
                                if (duplicate) {
                                  toast.error('This authorize level is already assigned to this employee');
                                  return;
                                }
                                setFormData({
                                  ...formData,
                                  employees: formData.employees.map((x, i) => (i === idx ? { ...x, authorize_level: val } : x)),
                                });
                              }}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Authorize level" />
                              </SelectTrigger>
                              <SelectContent>
                                {authorizedLevels.map((lvl) => (
                                  <SelectItem key={lvl} value={lvl}>
                                    {lvl}
                                  </SelectItem>
                                ))}
                                <div className="border-t my-1" />
                                <div className="p-2 flex items-center gap-2">
                                  <Input
                                    placeholder="Custom level"
                                    value={customLevelInputs[idx] || ''}
                                    onChange={(e) =>
                                      setCustomLevelInputs((prev) => ({ ...prev, [idx]: e.target.value }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const name = (customLevelInputs[idx] || '').trim();
                                        if (!name) return;
                                        const duplicate = formData.employees.some((x, i) => i !== idx && x.ramco_id === emp.ramco_id && x.authorize_level === name);
                                        if (duplicate) {
                                          toast.error('This authorize level is already assigned to this employee');
                                          return;
                                        }
                                        setFormData({
                                          ...formData,
                                          employees: formData.employees.map((x, i) => (i === idx ? { ...x, authorize_level: name } : x)),
                                        });
                                        setCustomLevelInputs((prev) => ({ ...prev, [idx]: '' }));
                                        setEmpSelectOpen((prev) => ({ ...prev, [idx]: false }));
                                      }
                                    }}
                                    className="h-8"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      const name = (customLevelInputs[idx] || '').trim();
                                      if (!name) return;
                                      const duplicate = formData.employees.some((x, i) => i !== idx && x.ramco_id === emp.ramco_id && x.authorize_level === name);
                                      if (duplicate) {
                                        toast.error('This authorize level is already assigned to this employee');
                                        return;
                                      }
                                      setFormData({
                                        ...formData,
                                        employees: formData.employees.map((x, i) => (i === idx ? { ...x, authorize_level: name } : x)),
                                      });
                                      setCustomLevelInputs((prev) => ({ ...prev, [idx]: '' }));
                                      setEmpSelectOpen((prev) => ({ ...prev, [idx]: false }));
                                    }}
                                  >
                                    Add
                                  </Button>
                                </div>
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleRemoveAssignedEmployee(idx)}
                              title="Remove"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              

              <div className="col-span-2">
                <label className="text-sm font-medium block mb-2">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description of this approval level"
                  rows={3}
                />
              </div>

              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <label className="text-sm font-medium">Active</label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formData.module_name || formData.employees.length === 0}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingLevel ? 'Update' : 'Create'}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading approval levels...</span>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {Object.entries(groupedLevels).map(([moduleName, levels]) => (
            <AccordionItem key={moduleName} value={moduleName} className='border rounded-lg'>
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center justify-between w-full mr-4">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5" />
                    <span className="font-medium text-left">
                      {moduleName.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{levels.length} levels</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEditModule(moduleName);
                      }}
                      title="Edit Workflow"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteModule(moduleName);
                      }}
                      title="Delete Workflow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="space-y-3">
                  {levels.map((level, index) => (
                    <div
                      key={level.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {level.level_order}
                          </Badge>
                          <span className="font-medium">{level.level_name}</span>
                          {level.employee?.full_name && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                              <User className="w-3 h-3 mr-1" />
                              {level.employee.full_name}
                            </Badge>
                          )}
                          {!level.is_active && (
                            <Badge variant="destructive" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {level.description && (
                          <p className="text-sm text-gray-600 ml-16">{level.description}</p>
                        )}
                        {level.employee && (
                          <p className="text-sm text-blue-600 ml-16">
                            Employee: {level.employee.full_name} ({level.employee.ramco_id})
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleChevronMove(moduleName, index, 'up')}
                          disabled={index === 0}
                          className="h-8 w-8 p-0"
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleChevronMove(moduleName, index, 'down')}
                          disabled={index === levels.length - 1}
                          className="h-8 w-8 p-0"
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(level)}
                          className="h-8 w-8 p-0"
                        >
                          <Switch checked={level.is_active} className="pointer-events-none scale-75" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(level)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {levels.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No approval levels configured for this module
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {Object.keys(groupedLevels).length === 0 && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Workflow Levels</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first approval level</p>
              <Button onClick={handleAdd} className="flex items-center gap-2 mx-auto">
                <Plus className="w-4 h-4" />
                Add Workflow Level
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert Dialog */}
      <AlertDialog open={alertDialog.isOpen} onOpenChange={closeAlertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeAlertDialog}>
              {alertDialog.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                alertDialog.onConfirm();
                closeAlertDialog();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {alertDialog.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Workflows;
