'use client';
import React, { useEffect, useState, useCallback, useContext } from 'react';
import { authenticatedApi } from '@/config/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Plus, Edit2, Trash2, Save, X, Settings, Check, User, ChevronUp, ChevronDown, Repeat2 } from 'lucide-react';
import { toast } from 'sonner';
import { AuthContext } from '@/store/AuthContext';

export interface Workflows {
  id?: number;
  module_name: string;
  level_order: number;
  level_name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  department_id?: number | null;
  employee?: {
    ramco_id: string;
    full_name: string;
  };
}

interface AssignedEmployee {
  ramco_id: string;
  full_name: string;
  department_id?: number | null;
  level_name: string;
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
  department?: {
    id: number;
    name: string;
  } | null;
}

const levelNames: string[] = ['verifier', 'recommender', 'approver'];

interface WorkflowsProps {
  className?: string;
}

const Workflows: React.FC<WorkflowsProps> = ({ className = '' }) => {
  const auth = useContext(AuthContext);
  const [workflows, setWorkflows] = useState<Workflows[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
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
  const [lastReplacement, setLastReplacement] = useState<{
    removed: { name: string; id: string };
    added: { name: string; id: string };
    role?: string;
  } | null>(null);
  const roleLocked = Boolean(editingLevel);
  const isEditing = Boolean(editingLevel);
  const formTitle = isEditing
    ? `Edit ${editingLevel?.level_name || 'role'} in ${editingLevel?.module_name} workflow`
    : 'Add New Workflow';
  const canAddWorkflow = auth?.authData?.user?.role?.id === 1 && auth?.authData?.user?.username === '000277';

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
      if (
        !formData.module_name ||
        formData.employees.length === 0 ||
        formData.employees.some(e => !e.level_name?.trim())
      ) {
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
          level_name: assignee.level_name,
          level_order: editingLevel.level_order ?? 1,
          ramco_id: assignee.ramco_id,
          department_id: assignee.department_id ?? null,
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
            level_name: e.level_name,
            department_id: e.department_id ?? null,
          })),
        };

        await authenticatedApi.post('/api/users/workflows', createPayload);
        toast.success('Workflow created successfully');
      }

      setIsFormOpen(false);
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
    if (isEditing) {
      // Replace current employee entry with the newly selected employee
      const existingLevelName = formData.employees[0]?.level_name || levelNames[0] || 'verifier';
      const previous = formData.employees[0];
      if (previous && previous.ramco_id === selectedEmployee.ramco_id) {
        setEmployeeComboboxOpen(false);
        return;
      }

      setFormData({
        ...formData,
        employees: [{
          ramco_id: selectedEmployee.ramco_id,
          full_name: selectedEmployee.full_name,
          department_id: selectedEmployee.department?.id ?? null,
          level_name: existingLevelName,
        }],
      });
      if (previous) {
        setLastReplacement({
          removed: { name: previous.full_name, id: previous.ramco_id },
          added: { name: selectedEmployee.full_name, id: selectedEmployee.ramco_id },
          role: existingLevelName,
        });
      } else {
        setLastReplacement(null);
      }
    } else {
      // Adding new entries for a new workflow
      if (formData.employees.some((e) => e.ramco_id === selectedEmployee.ramco_id)) {
        toast.error('Employee already added');
        return;
      }
      const usedLevelNames = formData.employees.map((e) => e.level_name);
      const defaultLevelName = levelNames.find((n) => !usedLevelNames.includes(n)) || levelNames[0] || 'verifier';
      setFormData({
        ...formData,
        employees: [
          ...formData.employees,
          {
            ramco_id: selectedEmployee.ramco_id,
            full_name: selectedEmployee.full_name,
            department_id: selectedEmployee.department?.id ?? null,
            level_name: defaultLevelName,
          },
        ],
      });
      setLastReplacement(null);
    }
    setSelectedEmployee(null);
    setEmployeeSearchQuery('');
    setEmployeeComboboxOpen(false);
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
            department_id: (level as any).department_id ?? null,
            level_name: level.level_name || 'verifier',
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

    setIsFormOpen(true);
  };

  const handleAdd = () => {
    if (!canAddWorkflow) return;
    setEditingLevel(null);
    resetForm();
    setIsFormOpen(true);
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
    setLastReplacement(null);
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
          department_id: (l as any).department_id ?? null,
          level_name: l.level_name || 'verifier',
        })),
    });
    setIsFormOpen(true);
  };

  const handleDeleteModule = (moduleName: string) => {
    const performDelete = async () => {
      try {
        await authenticatedApi.delete(`/api/users/workflows/${moduleName}`);
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
        <Button onClick={handleAdd} className="flex items-center gap-2" disabled={!canAddWorkflow}>
          <Plus className="w-4 h-4" />
          Add Workflow
        </Button>
      </div>

      {isFormOpen && (
        <Card className="mb-6 bg-stone-200/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <div>
                <div className="text-lg">{formTitle}</div>
                <p className="text-sm font-normal text-gray-500">
                  {editingLevel ? 'Update the workflow details' : 'Create a new workflow for management'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <span className="font-medium">Active</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {editingLevel ? (
                <>
                  <input type="hidden" value={formData.module_name} readOnly />
                  <textarea className="hidden" value={formData.description} readOnly />
                </>
              ) : (
                <>
                  <div className="col-span-2">
                    <label className="text-sm font-medium block mb-2">Module Name *</label>
                    <Input
                      value={formData.module_name}
                      onChange={(e) => setFormData({ ...formData, module_name: e.target.value })}
                      placeholder="Enter module name"
                      className="capitalize bg-stone-50/50"
                    />
                  </div>
                </>
              )}

              <div className="col-span-2">
                <label className="text-sm font-medium block mb-2">
                  {isEditing ? 'Role replacement' : 'Add Role'}
                </label>
                <div className="relative employee-dropdown">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={isEditing ? 'Search replacement employee...' : 'Search employee...'}
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
                      className="pl-10 bg-stone-50/50"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 px-2"
                      variant="default"
                      onClick={handleAddSelectedEmployee}
                      disabled={!employeeSearchQuery.trim()}
                      title={isEditing ? 'Replace employee' : 'Add employee to workflow'}
                    >
                      {isEditing ? <Repeat2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
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
                        <div key={`${emp.ramco_id}-${idx}`} className="flex items-center justify-between gap-3 p-2 bg-stone-50/50 border rounded">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{emp.full_name}</div>
                            <div className="text-xs text-gray-500">{emp.ramco_id}</div>
                          </div>
                      {lastReplacement && isEditing && (
                        <div className="text-xs text-blue-600 px-3 py-2">
                          Replaced <span className="font-semibold">{lastReplacement.removed.name}</span> ({lastReplacement.removed.id})
                          with <span className="font-semibold">{lastReplacement.added.name}</span> ({lastReplacement.added.id})
                          {lastReplacement.role ? <> as <span className="font-semibold capitalize">{lastReplacement.role}</span></> : null}
                        </div>
                      )}
                          <div className="flex items-center gap-2">
                            {!isEditing && (
                              <Select
                                disabled={roleLocked}
                                value={emp.level_name}
                                onValueChange={(val) => {
                                  if (roleLocked) return;
                                  setFormData({
                                    ...formData,
                                    employees: formData.employees.map((x, i) => (i === idx ? { ...x, level_name: val } : x)),
                                  });
                                }}
                              >
                                <SelectTrigger className="w-55" disabled={roleLocked}>
                                  <SelectValue placeholder="Level" />
                                </SelectTrigger>
                                <SelectContent>
                                  {levelNames.map((lvl) => (
                                    <SelectItem key={lvl} value={lvl}>
                                      {lvl}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
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

              {!editingLevel && (
                <div className="col-span-2">
                  <label className="text-sm font-medium block mb-2">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description of this approval level"
                    rows={3}
                    className='bg-stone-50/50'
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingLevel(null);
                  resetForm();
                }}
              >
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
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading approval levels...</span>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {Object.entries(groupedLevels).map(([moduleName, levels]) => {
            const isEditingModule = editingLevel?.module_name === moduleName;
            return (
              <AccordionItem key={moduleName} value={moduleName} className={`border rounded-lg ${isEditingModule ? 'ring-2 ring-red-400 border-red-200' : ''}`}>
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
                        className="relative p-4 bg-gray-50 rounded-lg border pr-28 sm:pr-36"
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-medium text-gray-700">
                            {level.level_order}
                          </span>
                          <span className="font-medium capitalize text-gray-900">{level.level_name}</span>
                          {!level.is_active && (
                            <span className="text-xs text-red-600 font-semibold">Inactive</span>
                          )}
                        </div>
                        {level.description && (
                          <p className="text-sm text-gray-600 ml-10 sm:ml-14">{level.description}</p>
                        )}
                        {level.employee && (
                          <p className="text-sm text-blue-600 ml-10 sm:ml-14">
                            Employee: {level.employee.full_name} ({level.employee.ramco_id})
                          </p>
                        )}

                        <div className="absolute top-3 right-3 flex items-center gap-1 sm:gap-2">
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
                            className="h-8 w-10 px-2"
                            title={level.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <Switch checked={level.is_active} className="pointer-events-none scale-75" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(level)}
                            className="h-8 w-8 p-0"
                            title="Edit level"
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
            );
          })}
        </Accordion>
      )}

      {Object.keys(groupedLevels).length === 0 && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Workflow Levels</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first approval level</p>
              <Button onClick={handleAdd} className="flex items-center gap-2 mx-auto" disabled={!canAddWorkflow}>
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
