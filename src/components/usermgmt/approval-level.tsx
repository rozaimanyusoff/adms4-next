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
import { Loader2, Plus, Edit2, Trash2, Save, X, Settings, ChevronUp, ChevronDown, Check, ChevronsUpDown, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface ApprovalLevel {
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

interface ApprovalLevelForm {
  id?: number;
  module_name: string;
  level_order: number;
  level_name: string;
  description: string;
  is_active: boolean;
  employee_ramco_id: string;
}

interface Employee {
  ramco_id: string;
  full_name: string;
}

const MODULES = [
  'billing',
  'purchase_order',
  'maintenance',
  'asset_management',
  'inventory',
  'hr',
  'finance',
  'procurement'
];

interface ApprovalLevelProps {
  className?: string;
}

const ApprovalLevel: React.FC<ApprovalLevelProps> = ({ className = '' }) => {
  const [approvalLevels, setApprovalLevels] = useState<ApprovalLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<ApprovalLevel | null>(null);
  const [formData, setFormData] = useState<ApprovalLevelForm>({
    module_name: '',
    level_order: 1,
    level_name: '',
    description: '',
    is_active: true,
    employee_ramco_id: ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Employee search state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [employeeComboboxOpen, setEmployeeComboboxOpen] = useState(false);

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
      const response = await authenticatedApi.get('/api/users/approvals');
      const data = response.data as { status: string; message: string; data: ApprovalLevel[] };
      if (data.status === 'success') {
        setApprovalLevels(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching approval levels:', error);
      toast.error('Failed to fetch approval levels');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate required fields
      if (!formData.module_name || !formData.level_name || !formData.employee_ramco_id) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (editingLevel?.id) {
        // Update existing approval level
        await authenticatedApi.put(`/api/users/approvals/${editingLevel.id}`, formData);
        toast.success('Approval level updated successfully');
      } else {
        // Create new approval level
        await authenticatedApi.post('/api/users/approvals', formData);
        toast.success('Approval level created successfully');
      }

      setIsDialogOpen(false);
      setEditingLevel(null);
      resetForm();
      await fetchApprovalLevels();

    } catch (error) {
      console.error('Error saving approval level:', error);
      toast.error('Failed to save approval level');
    } finally {
      setSaving(false);
    }
  };

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({ ...formData, employee_ramco_id: employee.ramco_id });
    setEmployeeComboboxOpen(false);
    setEmployeeSearchQuery(employee.full_name);
  };

  const handleDelete = async (levelId: number) => {
    const performDelete = async () => {
      try {
        setDeleting(levelId);
        await authenticatedApi.delete(`/api/users/approvals/${levelId}`);
        toast.success('Approval level deleted successfully');
        await fetchApprovalLevels();
      } catch (error) {
        console.error('Error deleting approval level:', error);
        toast.error('Failed to delete approval level');
      } finally {
        setDeleting(null);
      }
    };

    showAlertDialog(
      'Delete Approval Level',
      'Are you sure you want to delete this approval level? This action cannot be undone.',
      performDelete,
      'Delete',
      'Cancel'
    );
  };

  const handleEdit = (level: ApprovalLevel) => {
    setEditingLevel(level);
    setFormData({
      id: level.id,
      module_name: level.module_name,
      level_order: level.level_order,
      level_name: level.level_name,
      description: level.description || '',
      is_active: level.is_active,
      employee_ramco_id: level.employee?.ramco_id || ''
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
      level_order: 1,
      level_name: '',
      description: '',
      is_active: true,
      employee_ramco_id: ''
    });
    setSelectedEmployee(null);
    setEmployeeSearchQuery('');
    setEmployees([]);
  };

  const handleToggleActive = async (level: ApprovalLevel) => {
    const action = level.is_active ? 'deactivate' : 'activate';

    const performToggle = async () => {
      try {
        const updatedLevel = { ...level, is_active: !level.is_active };
        await authenticatedApi.put(`/api/approval-levels/${level.id}`, updatedLevel);
        toast.success(`Approval level ${updatedLevel.is_active ? 'activated' : 'deactivated'}`);
        await fetchApprovalLevels();
      } catch (error) {
        console.error('Error toggling approval level status:', error);
        toast.error('Failed to update approval level status');
      }
    };

    showAlertDialog(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Approval Level`,
      `Are you sure you want to ${action} this approval level?`,
      performToggle,
      action.charAt(0).toUpperCase() + action.slice(1),
      'Cancel'
    );
  };

  const moveLevel = async (levelId: number, direction: 'up' | 'down') => {
    try {
      await authenticatedApi.post(`/api/approval-levels/${levelId}/move`, { direction });
      toast.success('Level order updated successfully');
      await fetchApprovalLevels();
    } catch (error) {
      console.error('Error moving level:', error);
      toast.error('Failed to update level order');
    }
  };

  useEffect(() => {
    fetchApprovalLevels();
  }, []);

  // Group approval levels by module
  const groupedLevels = approvalLevels.reduce((acc, level) => {
    if (!acc[level.module_name]) {
      acc[level.module_name] = [];
    }
    acc[level.module_name].push(level);
    return acc;
  }, {} as Record<string, ApprovalLevel[]>);

  // Sort levels within each module by level_order
  Object.keys(groupedLevels).forEach(module => {
    groupedLevels[module].sort((a, b) => a.level_order - b.level_order);
  });

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Approval Levels Management</h2>
          <p className="text-gray-600 mt-1">Configure approval workflow levels for different modules</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Approval Level
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingLevel ? 'Edit Approval Level' : 'Add New Approval Level'}
              </DialogTitle>
              <DialogDescription>
                {editingLevel ? 'Update the approval level details' : 'Create a new approval level for workflow management'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-2">Module Name *</label>
                <Select value={formData.module_name} onValueChange={(value) => setFormData({ ...formData, module_name: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULES.map(module => (
                      <SelectItem key={module} value={module}>
                        {module.replace('_', ' ').toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium block mb-2">Employee *</label>
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
                    {selectedEmployee && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => {
                          setSelectedEmployee(null);
                          setFormData({ ...formData, employee_ramco_id: '' });
                          setEmployeeSearchQuery('');
                          setEmployeeComboboxOpen(false);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
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

                  {selectedEmployee && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                      <span className="font-medium text-blue-800">Selected: </span>
                      <span className="text-blue-700">{selectedEmployee.full_name} ({selectedEmployee.ramco_id})</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Level Order *</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.level_order}
                  onChange={(e) => setFormData({ ...formData, level_order: parseInt(e.target.value) || 1 })}
                  placeholder="Enter level order"
                />
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium block mb-2">Level Name *</label>
                <Input
                  value={formData.level_name}
                  onChange={(e) => setFormData({ ...formData, level_name: e.target.value })}
                  placeholder="e.g., Prepare, Verify, Approve"
                />
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
                disabled={saving || !formData.module_name || !formData.level_name || !formData.employee_ramco_id}
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
                  <Badge variant="secondary">
                    {levels.length} levels
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="space-y-3">
                  {levels.map((level, index) => (
                    <div key={level.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
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
                          onClick={() => moveLevel(level.id!, 'up')}
                          disabled={index === 0}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveLevel(level.id!, 'down')}
                          disabled={index === levels.length - 1}
                          className="h-8 w-8 p-0"
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(level.id!)}
                          disabled={deleting === level.id}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deleting === level.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Approval Levels</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first approval level</p>
              <Button onClick={handleAdd} className="flex items-center gap-2 mx-auto">
                <Plus className="w-4 h-4" />
                Add Approval Level
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

export default ApprovalLevel;
