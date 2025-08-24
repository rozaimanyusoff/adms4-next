'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export interface ServiceType {
  svcTypeId: number;
  svcType: string;
  svcOpt: number;
  group_desc: string;
}

interface ServiceTypesProps {
  filterByGroup?: string;
  selectedServiceIds?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
  displayMode?: 'badges' | 'checkboxes' | 'list' | 'management';
  className?: string;
  showGroupLabels?: boolean;
}

interface ServiceTypeForm {
  svcTypeId?: number;
  svcType: string;
  svcOpt: number;
  group_desc: string;
}

const SERVICE_GROUPS = [
  'Routine Service',
  'Extra Service',
  'Major Service',
  'Car Wash',
  'Tyres',
  'Accessories',
  'Others'
];

const SERVICE_OPTIONS = [
  { value: 0, label: 'Basic' },
  { value: 1, label: 'Standard' },
  { value: 2, label: 'Premium' },
  { value: 3, label: 'Advanced' },
  { value: 4, label: 'Professional' },
  { value: 5, label: 'Expert' },
  { value: 6, label: 'Specialized' },
  { value: 10, label: 'Custom' }
];

const ServiceTypes: React.FC<ServiceTypesProps> = ({
  filterByGroup,
  selectedServiceIds = [],
  onSelectionChange,
  displayMode = 'badges',
  className = '',
  showGroupLabels = false
}) => {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [formData, setFormData] = useState<ServiceTypeForm>({
    svcType: '',
    svcOpt: 0,
    group_desc: ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchServiceTypes = async () => {
    try {
      setLoading(true);
      const response = await authenticatedApi.get('/api/mtn/types');
      const data = response.data as { status: string; data: ServiceType[] };
      if (data.status === 'success') {
        setServiceTypes(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching service types:', error);
      toast.error('Failed to fetch service types');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (editingService) {
        // Update existing service type
        await authenticatedApi.put(`/api/mtn/types/${editingService.svcTypeId}`, formData);
        toast.success('Service type updated successfully');
      } else {
        // Create new service type
        await authenticatedApi.post('/api/mtn/types', formData);
        toast.success('Service type created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingService(null);
      setFormData({ svcType: '', svcOpt: 0, group_desc: '' });
      await fetchServiceTypes();
      
    } catch (error) {
      console.error('Error saving service type:', error);
      toast.error('Failed to save service type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (serviceTypeId: number) => {
    if (!confirm('Are you sure you want to delete this service type?')) return;
    
    try {
      setDeleting(serviceTypeId);
      await authenticatedApi.delete(`/api/mtn/types/${serviceTypeId}`);
      toast.success('Service type deleted successfully');
      await fetchServiceTypes();
    } catch (error) {
      console.error('Error deleting service type:', error);
      toast.error('Failed to delete service type');
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = (serviceType: ServiceType) => {
    setEditingService(serviceType);
    setFormData({
      svcTypeId: serviceType.svcTypeId,
      svcType: serviceType.svcType,
      svcOpt: serviceType.svcOpt,
      group_desc: serviceType.group_desc
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingService(null);
    setFormData({ svcType: '', svcOpt: 0, group_desc: '' });
    setIsDialogOpen(true);
  };

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  // Filter service types by group if specified
  const filteredServiceTypes = filterByGroup
    ? serviceTypes.filter(serviceType => serviceType.group_desc === filterByGroup)
    : serviceTypes;

  // Group service types by group_desc if showGroupLabels is true
  const groupedServiceTypes = showGroupLabels || displayMode === 'management'
    ? filteredServiceTypes.reduce((acc, serviceType) => {
        const group = serviceType.group_desc;
        if (!acc[group]) {
          acc[group] = [];
        }
        acc[group].push(serviceType);
        return acc;
      }, {} as Record<string, ServiceType[]>)
    : { '': filteredServiceTypes };

  const handleSelectionChange = (serviceTypeId: number, isChecked: boolean) => {
    if (!onSelectionChange) return;

    const newSelection = isChecked
      ? [...selectedServiceIds, serviceTypeId]
      : selectedServiceIds.filter(id => id !== serviceTypeId);

    onSelectionChange(newSelection);
  };

  // Management mode UI
  if (displayMode === 'management') {
    return (
      <div className={className}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Service Types Management</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Service Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingService ? 'Edit Service Type' : 'Add New Service Type'}
                </DialogTitle>
                <DialogDescription>
                  {editingService ? 'Update the service type details' : 'Create a new maintenance service type'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Service Type Name</label>
                  <Input
                    value={formData.svcType}
                    onChange={(e) => setFormData({ ...formData, svcType: e.target.value })}
                    placeholder="Enter service type name"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium block mb-2">Group</label>
                  <Select value={formData.group_desc} onValueChange={(value) => setFormData({ ...formData, group_desc: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_GROUPS.map(group => (
                        <SelectItem key={group} value={group}>{group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium block mb-2">Service Option Level</label>
                  <Select value={formData.svcOpt.toString()} onValueChange={(value) => setFormData({ ...formData, svcOpt: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select option level" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.value} - {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || !formData.svcType || !formData.group_desc}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {editingService ? 'Update' : 'Create'}
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading service types...</span>
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {Object.entries(groupedServiceTypes).map(([groupName, services]) => (
              <AccordionItem key={groupName || 'default'} value={groupName || 'default'} className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center justify-between w-full mr-4">
                    <span className="font-medium text-left">{groupName || 'Ungrouped'}</span>
                    <Badge variant="secondary" className="ml-2">
                      {services.length} items
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {services.map(serviceType => (
                      <div key={serviceType.svcTypeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <div className="font-medium">{serviceType.svcType}</div>
                          <div className="text-sm text-gray-500">
                            ID: {serviceType.svcTypeId} | Level: {serviceType.svcOpt}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(serviceType)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(serviceType.svcTypeId)}
                            disabled={deleting === serviceType.svcTypeId}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {deleting === serviceType.svcTypeId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading service types...</span>
      </div>
    );
  }

  if (filteredServiceTypes.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        {filterByGroup ? `No service types found in "${filterByGroup}" group` : 'No service types available'}
      </div>
    );
  }

  const renderServiceType = (serviceType: ServiceType) => {
    const isSelected = selectedServiceIds.includes(serviceType.svcTypeId);

    switch (displayMode) {
      case 'checkboxes':
        return (
          <label
            key={serviceType.svcTypeId}
            htmlFor={`service-${serviceType.svcTypeId}`}
            className="flex items-center gap-3 cursor-pointer"
          >
            <Checkbox
              id={`service-${serviceType.svcTypeId}`}
              checked={isSelected}
              onCheckedChange={(checked) => 
                handleSelectionChange(serviceType.svcTypeId, Boolean(checked))
              }
            />
            <span className="text-sm">{serviceType.svcType}</span>
          </label>
        );

      case 'list':
        return (
          <div key={serviceType.svcTypeId} className="text-sm py-1">
            {serviceType.svcType}
          </div>
        );

      case 'badges':
      default:
        return (
          <Badge
            key={serviceType.svcTypeId}
            variant={isSelected ? "default" : "outline"}
            className={`cursor-pointer transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'hover:bg-gray-100'
            }`}
            onClick={() => onSelectionChange && handleSelectionChange(serviceType.svcTypeId, !isSelected)}
          >
            {serviceType.svcType}
          </Badge>
        );
    }
  };

  return (
    <div className={className}>
      {Object.entries(groupedServiceTypes).map(([groupName, services]) => (
        <div key={groupName || 'default'} className="space-y-2">
          {showGroupLabels && groupName && (
            <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">
              {groupName}
            </h4>
          )}
          <div className={`${
            displayMode === 'badges'
              ? 'flex flex-wrap gap-2'
              : displayMode === 'checkboxes'
              ? 'space-y-2'
              : 'space-y-1'
          }`}>
            {services.map(renderServiceType)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ServiceTypes;

// Export utility functions for working with service types
export const getServiceTypesByGroup = (serviceTypes: ServiceType[], groupName: string): ServiceType[] => {
  return serviceTypes.filter(serviceType => serviceType.group_desc === groupName);
};

export const getServiceTypeNames = (serviceTypes: ServiceType[], selectedIds: number[]): string[] => {
  return serviceTypes
    .filter(serviceType => selectedIds.includes(serviceType.svcTypeId))
    .map(serviceType => serviceType.svcType);
};

export const getServiceTypeIds = (serviceTypes: ServiceType[], selectedNames: string[]): number[] => {
  return serviceTypes
    .filter(serviceType => selectedNames.includes(serviceType.svcType))
    .map(serviceType => serviceType.svcTypeId);
};
