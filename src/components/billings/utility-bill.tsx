'use client';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Plus, Download, Loader2, ChevronRight, Search, X, Printer } from 'lucide-react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@store/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import ActionSidebar from '@/components/ui/action-aside';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SearchableSelect } from '@/components/ui/select';
import { SingleSelect } from '@/components/ui/combobox';
import { Separator } from '@radix-ui/react-select';

// Helper function to construct logo URL
const getLogoUrl = (logoPath: string | null): string => {
  if (!logoPath) {
    return '/assets/images/Logo-RTech.jpeg'; // Use existing RTech logo as fallback
  }

  // If it's already a full URL, return as is
  if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
    return logoPath;
  }

  // If it's a relative path, construct full URL using NEXT_PUBLIC_APP_URL from env
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_API_URL || '';
  if (appUrl && logoPath.startsWith('/')) {
    return `${appUrl}${logoPath}`;
  }

  // Default fallback - try as relative path first
  return logoPath || '/assets/images/Logo-RTech.jpeg';
};

// Helper function to check if a service is printing-related
const isPrintingService = (service: string | null | undefined): boolean => {
  if (!service) return false;
  const serviceLower = service.toLowerCase();
  return serviceLower.includes('print') ||
    serviceLower.includes('copy') ||
    serviceLower.includes('photostat') ||
    serviceLower.includes('laser') ||
    serviceLower.includes('inkjet') ||
    serviceLower.includes('copier') ||
    serviceLower.includes('scanner');
};

interface UtilityBill {
  util_id: number;
  // nested account object from backend
  account: {
    bill_id: number;
    bill_ac?: string | null;
    beneficiary?: { id?: number; name?: string; logo?: string; prepared_by?: any } | null;
    service?: string | null;
    desc?: string | null;
    costcenter?: { id?: number; name?: string } | null;
    location?: { id?: number; name?: string } | null;
  };
  // billing fields
  ubill_date: string;
  ubill_no: string;
  ubill_ref: string | null;
  ubill_submit: string | null;
  ubill_stotal: string | null;
  ubill_tax: string | null;
  ubill_taxrate: string | null;
  ubill_disc: string | null;
  ubill_round: string | null;
  ubill_rent: string | null;
  ubill_bw: string | null;
  ubill_color: string | null;
  ubill_gtotal: string | null;
  ubill_deduct: string | null;
  ubill_count: string | null;
  ubill_usage: string | null;
  ubill_paystat: string | null;
  ubill_payref: string | null;
  // legacy/helpers for grid display (filled at fetch time)
  service?: string;
  beneficiary?: string;
  costcenter?: string;
  location?: string;
  // derived for grid display/filtering
  account_display?: string;
}

interface BillingAccount {
  bill_id: number;
  account: string;
  category?: string;
  description?: string;
  status?: string;
  contract_start?: string | null;
  contract_end?: string | null;
  deposit?: string;
  rental?: string;
  beneficiary?: {
    id: number;
    name: string;
    logo: string | null;
  } | null;
  costcenter?: {
    id: number;
    name: string;
  } | null;
  location?: {
    id: number;
    name: string;
  } | null;
}

interface UtilityBillForm {
  bill_id?: number;
  loc_id: string;
  cc_id: string;
  ubill_date: string;
  ubill_no: string;
  ubill_stotal: string;
  ubill_tax: string;
  ubill_taxrate: string;
  ubill_disc: string;
  ubill_round: string;
  ubill_rent: string;
  ubill_bw: string;
  ubill_color: string;
  ubill_gtotal: string;
  ubill_deduct: string;
  ubill_count: string;
  ubill_usage: string;
  ubill_paystat: string;
  ubill_ref?: string; // File reference for uploaded payment document
}

// Add global type for window.reloadUtilityBillGrid
declare global {
  interface Window {
    reloadUtilityBillGrid?: () => void;
  }
}

const UtilityBill = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed
  const [saving, setSaving] = useState(false);
  const [editingBill, setEditingBill] = useState<UtilityBill | null>(null);
  const [costCenters, setCostCenters] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [billingAccounts, setBillingAccounts] = useState<BillingAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [beneficiaryFilter, setBeneficiaryFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>(String(new Date().getFullYear()));
  const [selectedAccount, setSelectedAccount] = useState<BillingAccount | null>(null);
  const [sidebarSize, setSidebarSize] = useState<'sm' | 'lg'>('sm');
  const [paymentRefFile, setPaymentRefFile] = useState<File | null>(null);
  const [paymentRefPreview, setPaymentRefPreview] = useState<string | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false); // Loading state for account switching
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const dropZoneRef = React.useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // Delete bill authorizer - 2 usernames
  const deleteBillAuthorizer = ['000712', '000277']; //must match username from session

  // Get current user from AuthContext and read username (with localStorage fallback)
  const user = React.useContext(AuthContext);
  const username: string = user?.authData?.user?.username || (() => {
    try {
      return JSON.parse(localStorage.getItem('authData') || '{}')?.user?.username || '';
    } catch {
      return '';
    }
  })();

  // Dialog state for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Confirm delete handler (invoked from dialog)
  const handleConfirmDelete = async () => {
    // Double-check authorization before deleting
    if (!deleteBillAuthorizer.includes(username)) {
      toast.error('You are not authorized to delete bills');
      setDeleteDialogOpen(false);
      return;
    }

    try {
      setLoading(true);
      // Delete each selected bill (no batch endpoint assumed)
      await Promise.all(selectedRowIds.map(id => authenticatedApi.delete(`/api/bills/util/${id}`)));
      toast.success('Selected bills deleted');
      setSelectedRowIds([]);
      fetchUtilityBills();
    } catch (err) {
      console.error('Failed to delete selected bills', err);
      toast.error('Failed to delete selected bills');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // Compute whether printing fields should be shown based on selected account or editing bill
  const showPrintingFields = useMemo(() => {
    if (editingBill) {
      return isPrintingService(editingBill.account?.service);
    }
    if (selectedAccount) {
      // category may map to non-printing/printing; fall back to description if needed
      return isPrintingService(selectedAccount.category || selectedAccount.description || undefined);
    }
    return false;
  }, [editingBill, selectedAccount]);

  // Memoized accounts with processed logo URLs to prevent repetitive fetching
  const accountsWithLogos = useMemo(() => {
    console.log('Processing logo URLs for', billingAccounts.length, 'accounts');
    return billingAccounts.map(account => ({
      ...account,
      logoUrl: getLogoUrl(account.beneficiary?.logo || null)
    }));
  }, [billingAccounts]);

  // Derive beneficiary options from billing accounts
  const beneficiaryOptions = useMemo(() => {
    const map = new Map<number, string>();
    billingAccounts.forEach(acc => {
      if (acc.beneficiary && acc.beneficiary.id) {
        map.set(acc.beneficiary.id, acc.beneficiary.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ value: String(id), label: name }));
  }, [billingAccounts]);

  // Displayed rows after beneficiary filter
  const displayedRows = useMemo(() => {
    if (!beneficiaryFilter) return rows;
    return rows.filter(r => String(r.account?.beneficiary?.id || '') === beneficiaryFilter);
  }, [rows, beneficiaryFilter]);

  // Whether export is allowed: require explicit row selection by the user
  const canExport = useMemo(() => {
    try {
      const hasSelected = selectedRowIds && selectedRowIds.length > 0;
      return !loading && hasSelected;
    } catch (e) {
      return false;
    }
  }, [selectedRowIds, loading]);

  // When beneficiary filter is cleared, also clear any selected rows and prevent row selection
  useEffect(() => {
    if (!beneficiaryFilter) {
      setSelectedRowIds([]);
    }
  }, [beneficiaryFilter]);

  // Filter memoized accounts with provider prioritization
  const filteredAccountsWithLogos = useMemo(() => {
    if (searchTerm.trim() === '') {
      return accountsWithLogos;
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = accountsWithLogos.filter((account) =>
        (account.category?.toLowerCase() || '').includes(searchLower) ||
        (account.beneficiary?.name?.toLowerCase() || '').includes(searchLower) ||
        (account.account?.toLowerCase() || '').includes(searchLower) ||
        (account.description?.toLowerCase() || '').includes(searchLower)
      );

      // Sort with provider matches first
      return filtered.sort((a, b) => {
        const aProviderMatch = (a.beneficiary?.name?.toLowerCase() || '').includes(searchLower);
        const bProviderMatch = (b.beneficiary?.name?.toLowerCase() || '').includes(searchLower);

        if (aProviderMatch && !bProviderMatch) return -1;
        if (!aProviderMatch && bProviderMatch) return 1;
        return 0;
      });
    }
  }, [accountsWithLogos, searchTerm]);

  const [formData, setFormData] = useState<UtilityBillForm>({
    bill_id: undefined,
    cc_id: 'none',
    loc_id: 'none',
    ubill_date: '',
    ubill_no: '',
    ubill_stotal: '0.00',
    ubill_tax: '0.00',
    ubill_taxrate: '0.00',
    ubill_disc: '0.00',
    ubill_round: '0.00',
    ubill_rent: '0.00',
    ubill_bw: '0.00',
    ubill_color: '0.00',
    ubill_gtotal: '0.00',
    ubill_deduct: '0.00',
    ubill_count: '0',
    ubill_usage: '0.00',
    ubill_paystat: 'Pending',
    ubill_ref: '',
  });

  // Fetch cost centers and locations
  const fetchCostCenters = async () => {
    try {
      const response = await authenticatedApi.get('/api/assets/costcenters');
      if ((response.data as any)?.data) {
        setCostCenters((response.data as any).data.map((cc: any) => ({
          id: cc.id?.toString() || '',
          name: cc.name || ''
        })));
      }
    } catch (error) {
      console.error('Error fetching cost centers:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await authenticatedApi.get('/api/assets/locations');

      let locationData: { id: string; name: string }[] = [];

      // Try different response structures
      if ((response.data as any)?.data && Array.isArray((response.data as any).data)) {
        // Structure: { data: [...] }
        locationData = (response.data as any).data.map((loc: any) => ({
          id: loc.id?.toString() || loc.loc_id?.toString() || '',
          name: loc.name || loc.location_name || loc.loc_name || ''
        }));
      } else if (Array.isArray(response.data)) {
        // Structure: [...]
        locationData = response.data.map((loc: any) => ({
          id: loc.id?.toString() || loc.loc_id?.toString() || '',
          name: loc.name || loc.location_name || loc.loc_name || ''
        }));
      } else if ((response.data as any)?.locations && Array.isArray((response.data as any).locations)) {
        // Structure: { locations: [...] }
        locationData = (response.data as any).locations.map((loc: any) => ({
          id: loc.id?.toString() || loc.loc_id?.toString() || '',
          name: loc.name || loc.location_name || loc.loc_name || ''
        }));
      }

      setLocations(locationData);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    }
  };

  const fetchBillingAccounts = async () => {
    try {
      const response = await authenticatedApi.get('/api/bills/util/accounts');
      if ((response.data as any)?.data) {
        setBillingAccounts((response.data as any).data);
        setBillingAccounts((response.data as any).data);
      }
    } catch (error) {
      console.error('Error fetching billing accounts:', error);
      setBillingAccounts([]);
      setBillingAccounts([]);
    }
  };

  const handleInputChange = (field: keyof UtilityBillForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-calculate grand total when amounts change
    if (['ubill_stotal', 'ubill_tax', 'ubill_disc', 'ubill_round', 'ubill_rent', 'ubill_bw', 'ubill_color'].includes(field)) {
      calculateGrandTotal(field, value);
    }
  };

  // Handle numeric input for financial fields
  const handleNumericInputChange = (field: keyof UtilityBillForm, value: string) => {
    // Allow empty string, numbers, and decimal points
    const numericRegex = /^-?\d*\.?\d*$/;

    if (value === '' || numericRegex.test(value)) {
      // For empty string, set to '0.00' 
      const processedValue = value === '' ? '0.00' : value;

      setFormData(prev => ({
        ...prev,
        [field]: processedValue
      }));

      // Auto-calculate grand total when amounts change
      if (['ubill_stotal', 'ubill_tax', 'ubill_disc', 'ubill_round', 'ubill_rent', 'ubill_bw', 'ubill_color'].includes(field)) {
        calculateGrandTotal(field, processedValue);
      }
    }
  }; const calculateGrandTotal = (changedField: keyof UtilityBillForm, newValue: string) => {
    const currentData = { ...formData, [changedField]: newValue };
    const subTotal = parseFloat(currentData.ubill_stotal) || 0;
    const tax = parseFloat(currentData.ubill_tax) || 0;
    const discount = parseFloat(currentData.ubill_disc) || 0;
    const rounding = parseFloat(currentData.ubill_round) || 0;
    const rental = parseFloat(currentData.ubill_rent) || 0;

    // Only include B&W and Color if service supports printing
    const isPrintingAccount = selectedAccount ? isPrintingService(selectedAccount.category || selectedAccount.description) :
      editingBill ? isPrintingService(editingBill.account?.service) : false;
    const bw = isPrintingAccount ? (parseFloat(currentData.ubill_bw) || 0) : 0;
    const color = isPrintingAccount ? (parseFloat(currentData.ubill_color) || 0) : 0;

    const grandTotal = subTotal + tax - discount + rounding + rental + bw + color;
    setFormData(prev => ({
      ...prev,
      ubill_gtotal: grandTotal.toFixed(2)
    }));
  };

  // Handle file upload for payment reference
  const handleFileUpload = (file: File) => {
    console.log('File upload initiated:', {
      name: file.name,
      size: file.size,
      type: file.type,
      valid: file instanceof File
    });

    // Validate file type - only accept PDF
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are allowed for bill references');
      return;
    }

    // Validate file size (optional - you can set a maximum size)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setPaymentRefFile(file);

    // Create a blob URL for previewing the PDF (thumbnail/embed)
    try {
      const url = URL.createObjectURL(file);
      setPaymentRefPreview(url);
    } catch (err) {
      console.error('Failed to create preview URL for PDF', err);
      setPaymentRefPreview(null);
    }

    console.log('PDF file accepted and state set');
  };

  // Revoke object URL when preview changes or component unmounts
  useEffect(() => {
    return () => {
      if (paymentRefPreview) {
        try { URL.revokeObjectURL(paymentRefPreview); } catch (e) { /* noop */ }
      }
    };
  }, [paymentRefPreview]);

  // Search functionality - now handled by useMemo
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  // Account selection handler
  const handleAccountSelect = async (account: BillingAccount) => {
    setIsFormLoading(true);

    // Show toast notification for account switching
    toast.success(`Switched to ${account.beneficiary?.name || 'Account'} - ${account.category || account.description || 'Service'}`, {
      //description: 'Form data refreshed with new account information',
      duration: 2000,
    });

    setSelectedAccount(account);
    setSidebarSize('lg');

    // Check if this is a printing service
    const isPrinting = isPrintingService(account.category || account.description || undefined);

    // Clear any editing state when switching accounts
    setEditingBill(null);

    // Only clear file upload state when switching to a different account
    // Don't clear if user is just re-selecting the same account
    if (selectedAccount?.bill_id !== account.bill_id) {
      setPaymentRefFile(null);
      setPaymentRefPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }

    // Pre-fill form with account data and reset financial fields
    setFormData({
      bill_id: account.bill_id,
      cc_id: account.costcenter ? account.costcenter.id.toString() : 'none',
      loc_id: account.location ? account.location.id.toString() : 'none',
      // Reset all fields for new bill
      ubill_date: '',
      ubill_no: '',
      ubill_stotal: '0.00',
      ubill_tax: '0.00',
      ubill_taxrate: '0.00',
      ubill_disc: '0.00',
      ubill_round: '0.00',
      ubill_rent: '0.00',
      ubill_bw: '0.00',
      ubill_color: '0.00',
      ubill_gtotal: '0.00',
      ubill_deduct: '0.00',
      ubill_count: '0',
      ubill_usage: '0.00',
      ubill_paystat: 'Pending',
      ubill_ref: '',
    });

    // Small delay to show loading effect
    setTimeout(() => {
      setIsFormLoading(false);
    }, 300);
  };

  const resetForm = () => {
    setFormData({
      bill_id: undefined,
      cc_id: 'none',
      loc_id: 'none',
      ubill_date: '',
      ubill_no: '',
      ubill_stotal: '0.00',
      ubill_tax: '0.00',
      ubill_taxrate: '0.00',
      ubill_disc: '0.00',
      ubill_round: '0.00',
      ubill_rent: '0.00',
      ubill_bw: '0.00',
      ubill_color: '0.00',
      ubill_gtotal: '0.00',
      ubill_deduct: '0.00',
      ubill_count: '0',
      ubill_usage: '0.00',
      ubill_paystat: 'Pending',
      ubill_ref: '',
    });
    setEditingBill(null);
    setSelectedAccount(null);
    setSearchTerm('');
    setSidebarSize('sm');
    setPaymentRefFile(null);
    setPaymentRefPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAdd = () => {
    resetForm();
    setSelectedAccount(null);
    setSidebarSize('sm');
    if (!sidebarOpen) {
      setSidebarOpen(true);
    }
  };

  const handleRowDoubleClick = (bill: UtilityBill & { rowNumber: number }) => {
    console.log('Double-clicked bill:', bill); // Debug log
    const originalDate = (bill as any).ubill_date_original || bill.ubill_date;

    setFormData({
      bill_id: bill.account?.bill_id,
      cc_id: bill.account?.costcenter ? String(bill.account.costcenter.id) : 'none',
      loc_id: bill.account?.location ? String(bill.account.location.id) : 'none',
      ubill_date: originalDate ? new Date(originalDate).toISOString().split('T')[0] : '',
      ubill_no: bill.ubill_no || '',
      ubill_stotal: bill.ubill_stotal || '0.00',
      ubill_tax: bill.ubill_tax || '0.00',
      ubill_taxrate: bill.ubill_taxrate || '0.00',
      ubill_disc: bill.ubill_disc || '0.00',
      ubill_round: bill.ubill_round || '0.00',
      ubill_rent: bill.ubill_rent || '0.00',
      ubill_bw: bill.ubill_bw || '0.00',
      ubill_color: bill.ubill_color || '0.00',
      ubill_gtotal: bill.ubill_gtotal || '0.00',
      ubill_deduct: bill.ubill_deduct || '0.00',
      ubill_count: bill.ubill_count || '0',
      ubill_usage: bill.ubill_usage || '0.00',
      ubill_paystat: bill.ubill_paystat || 'Pending',
      ubill_ref: (bill as any).ubill_ref || '',
    });
    setEditingBill(bill);
    setSelectedAccount(null); // Clear selected account when editing
    setSidebarSize('lg'); // Go directly to form for editing
    setSidebarOpen(true);
    console.log('Sidebar opened for editing, form data set'); // Debug log
    // Clear file upload state when editing existing bill
    setPaymentRefFile(null);
    setPaymentRefPreview(null);
  };

  const handleSave = async () => {
    if (!formData.ubill_no || !formData.ubill_date) {
      toast.error('Please fill in required fields: Bill No and Date');
      return;
    }

    setSaving(true);
    try {
      let payload: any;

      console.log('Save initiated. File state:', paymentRefFile ? {
        name: paymentRefFile.name,
        size: paymentRefFile.size,
        type: paymentRefFile.type,
        valid: paymentRefFile instanceof File,
        isPDF: paymentRefFile.type.includes('pdf') || paymentRefFile.name.toLowerCase().endsWith('.pdf')
      } : 'No file');

      if (paymentRefFile && paymentRefFile instanceof File && paymentRefFile.size > 0) {
        // Double-check that the file is a PDF before sending
        if (!paymentRefFile.type.includes('pdf') && !paymentRefFile.name.toLowerCase().endsWith('.pdf')) {
          toast.error('Only PDF files are allowed for bill references');
          setSaving(false);
          return;
        }
        // Use FormData for file upload
        payload = new FormData();
        payload.append('bill_id', String(formData.bill_id || ''));
        payload.append('cc_id', (formData.cc_id && formData.cc_id !== 'none') ? String(formData.cc_id) : '');
        payload.append('loc_id', (formData.loc_id && formData.loc_id !== 'none') ? String(formData.loc_id) : '');
        payload.append('ubill_date', formData.ubill_date || '');
        payload.append('ubill_no', formData.ubill_no || '');
        payload.append('ubill_stotal', formData.ubill_stotal || '0.00');
        payload.append('ubill_tax', formData.ubill_tax || '0.00');
        payload.append('ubill_taxrate', formData.ubill_taxrate || '0.00');
        payload.append('ubill_disc', formData.ubill_disc || '0.00');
        payload.append('ubill_round', formData.ubill_round || '0.00');
        payload.append('ubill_rent', formData.ubill_rent || '0.00');
        payload.append('ubill_bw', formData.ubill_bw || '0.00');
        payload.append('ubill_color', formData.ubill_color || '0.00');
        payload.append('ubill_gtotal', formData.ubill_gtotal || '0.00');
        payload.append('ubill_deduct', formData.ubill_deduct || '0.00');
        payload.append('ubill_count', formData.ubill_count || '0');
        payload.append('ubill_usage', formData.ubill_usage || '0.00');
        payload.append('ubill_paystat', formData.ubill_paystat || 'Pending');
        payload.append('ubill_ref', paymentRefFile, paymentRefFile.name);
        console.log('Uploading file:', paymentRefFile.name, 'Size:', paymentRefFile.size, 'Type:', paymentRefFile.type);
      } else {
        // Use JSON payload when no file
        payload = {
          ...formData,
          cc_id: (formData.cc_id && formData.cc_id !== 'none') ? parseInt(formData.cc_id) : null,
          loc_id: (formData.loc_id && formData.loc_id !== 'none') ? parseInt(formData.loc_id) : null,
          ubill_date: formData.ubill_date || null,
        };
      }

      if (editingBill) {
        // Update existing bill (use util_id)
        if (paymentRefFile && paymentRefFile instanceof File && paymentRefFile.size > 0) {
          // Explicitly set multipart/form-data so the request is sent as FormData
          await authenticatedApi.put(`/api/bills/util/${editingBill.util_id}`, payload, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else {
          await authenticatedApi.put(`/api/bills/util/${editingBill.util_id}`, payload);
        }
        toast.success('Utility bill updated successfully');
      } else {
        // Create new bill
        if (paymentRefFile && paymentRefFile instanceof File && paymentRefFile.size > 0) {
          // Explicitly set multipart/form-data so the request is sent as FormData
          await authenticatedApi.post('/api/bills/util', payload, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else {
          await authenticatedApi.post('/api/bills/util', payload);
        }
        toast.success('Utility bill created successfully');
      }

      // Close only the form pane: collapse to small sidebar and clear selection/editing
      setSidebarSize('sm');
      setSelectedAccount(null);
      setEditingBill(null);
      resetForm();
      fetchUtilityBills();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save utility bill');
      console.error('Error saving bill:', error);
    } finally {
      setSaving(false);
    }
  };
  const fetchUtilityBills = () => {
    setLoading(true);
    authenticatedApi.get('/api/bills/util')
      .then(res => {
        const data = (res.data as { data?: UtilityBill[] })?.data || [];
        const filtered = (data as any[]).filter((item: any) => {
          if (!yearFilter || yearFilter === 'all') return true;
          if (!item.ubill_date) return false;
          try { return new Date(item.ubill_date).getFullYear() === Number(yearFilter); } catch { return false; }
        });

        setRows(filtered.map((item: any, idx: number) => ({
          ...item,
          rowNumber: idx + 1,
          service: item.account?.service || '',
          beneficiary: item.account?.beneficiary?.name || item.account?.provider || '',
          costcenter: item.account?.costcenter?.name || '',
          location: item.account?.location?.name || '',
          account_display: (() => {
            const accNo = item.account?.account || item.account?.bill_ac || '';
            return `${accNo}`;
          })(),
          ubill_date_display: item.ubill_date ? new Date(item.ubill_date).toLocaleDateString() : '',
          ubill_date_original: item.ubill_date, // Keep original date for editing
        })));
        setLoading(false);
      })
      .catch(() => {
        setRows([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUtilityBills();
    fetchCostCenters();
    fetchLocations();
    fetchBillingAccounts();
  }, []);

  useEffect(() => {
    fetchUtilityBills();
  }, [yearFilter]);

  useEffect(() => {
    window.reloadUtilityBillGrid = () => {
      fetchUtilityBills();
    };
    return () => {
      delete window.reloadUtilityBillGrid;
    };
  }, []);

  const columns: ColumnDef<UtilityBill & { rowNumber: number }>[] = [
    {
      key: 'rowNumber',
      header: 'No',
      render: (row) => (
        <div className="flex items-center min-w-[60px]">
          <span>{row.rowNumber}</span>
        </div>
      ),
    },
    { key: 'ubill_no', header: 'Bill No', filter: 'input' },
    {
      key: 'ubill_date',
      header: 'Date',
      render: (row: UtilityBill) => (row as any).ubill_date_display || row.ubill_date
    },
    { key: 'service', header: 'Service', filter: 'singleSelect' },
    { key: 'beneficiary', header: 'Beneficiary', filter: 'singleSelect' },
    {
      key: 'account_display',
      header: 'Account',
      filter: 'singleSelect',
      render: (row: UtilityBill) => row.account_display || (row as any).account?.account || ''
    },
    {
      key: 'costcenter',
      header: 'Cost Center',
      filter: 'singleSelect',
      render: (row: UtilityBill) => row.account?.costcenter?.name || 'N/A'
    },
    {
      key: 'location',
      header: 'Location',
      filter: 'singleSelect',
      render: (row: UtilityBill) => row.account?.location?.name || 'N/A'
    },
    { key: 'ubill_gtotal', header: 'Grand Total', colClass: 'text-right' },
    { key: 'ubill_paystat', header: 'Payment Status', filter: 'singleSelect' },
  ];

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">

          <h2 className="text-lg font-bold">Utility Bills Summary</h2>
          {/* Export button removed; use single Print button to handle batch export */}
        </div>
        <div className="flex items-center gap-2">
          {/* Beneficiary filter combobox and printer export */}
          <div className="flex items-center gap-2">
            <div className="w-80">
              <SingleSelect
                options={beneficiaryOptions}
                value={beneficiaryFilter}
                onValueChange={(v) => setBeneficiaryFilter(v)}
                placeholder="Select beneficiary..."
                clearable
                searchPlaceholder="Search beneficiary..."
                className="w-full py-0"
              />
            </div>
            <Button
              variant="default"
              onClick={async () => {
                try {
                  // If user selected rows, export those; otherwise export currently filtered (displayed) rows
                  const idsToExport = (selectedRowIds && selectedRowIds.length > 0)
                    ? selectedRowIds
                    : (displayedRows || []).map((r: any) => r.util_id).filter(Boolean);

                  if (!idsToExport || idsToExport.length === 0) {
                    toast.error('No bills to export');
                    return;
                  }

                    // Determine whether any of the bills selected are printing-related
                    const rowsForIds = (displayedRows || []).filter((r: any) => idsToExport.includes(r.util_id));
                    const anyPrinting = rowsForIds.some((r: any) => isPrintingService(r.account?.service || r.service || r.account?.category || r.service));
                    if (anyPrinting) {
                      const { exportPrintingBillSummary } = await import('./pdfreport-printing-costcenter');
                      await exportPrintingBillSummary(beneficiaryFilter || null, idsToExport);
                    } else {
                      const { exportUtilityBillSummary } = await import('./pdfreport-utility-costcenter');
                      await exportUtilityBillSummary(beneficiaryFilter || null, idsToExport);
                    }
                } catch (err) {
                  console.error('Failed to export utility PDF batch', err);
                  toast.error('Failed to export PDF.');
                }
              }}
              disabled={!canExport}
            >
        <Printer size={16} className="mr-1" /> Batch Bill Print
            </Button>
            {/* Delete Selected: only show when beneficiary selected, at least one row selected, and user is authorized */}
            {beneficiaryFilter && selectedRowIds && selectedRowIds.length > 0 && deleteBillAuthorizer.includes(username) && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete Selected
                </Button>

                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm delete</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                      Are you sure you want to delete {selectedRowIds.length} selected bill(s)? This cannot be undone.
                    </div>
                    <DialogFooter className="flex gap-2">
                      <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={handleConfirmDelete}>
                        {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                        Delete
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
            <div className="flex items-center">
              <Select value={yearFilter} onValueChange={(v) => setYearFilter(v)}>
                <SelectTrigger className="w-28 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {Array.from({ length: 6 }).map((_, i) => {
                    const y = String(new Date().getFullYear() - i);
                    return (<SelectItem key={y} value={y}>{y}</SelectItem>);
                  })}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant={'default'}
              onClick={handleAdd}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            </Button>
          </div>
        </div>
      </div>
      <CustomDataGrid
        columns={columns as ColumnDef<unknown>[]}
        data={displayedRows}
        pagination={false}
        inputFilter={false}
        theme="sm"
        dataExport={true}
        onRowDoubleClick={handleRowDoubleClick}
        rowSelection={{
          // Enable row selection only after a beneficiary is selected
          enabled: Boolean(beneficiaryFilter),
          getRowId: (row: any) => row.util_id || row.account?.bill_id,
          onSelect: (selectedKeys: (string | number)[], selectedRows: any[]) => {
            setSelectedRowIds(selectedKeys.map(Number));
          },
        }}
      />

      <ActionSidebar
        isOpen={sidebarOpen}
        title={
          editingBill
            ? `Edit Bill - ${editingBill.account?.service || 'Utility Bill'}`
            : selectedAccount
              ? `New Bill - ${selectedAccount.category || selectedAccount.description} (${selectedAccount.beneficiary?.name})`
              : 'Utility Billing Accounts'
        }
        onClose={() => {
          setSidebarOpen(false);
          setSelectedAccount(null);
          setSidebarSize('sm');
          resetForm();
        }}
        size={sidebarSize}
        content={
          <div className={`flex ${sidebarSize === 'lg' ? 'space-x-6' : ''} h-full`}>
            {/* Left Column - Billing Accounts List */}
            <div className={`${sidebarSize === 'lg' ? 'w-1/3' : 'w-full'} space-y-4`}>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by beneficiary, service, account..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Search results indicator */}
                {searchTerm && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                    {filteredAccountsWithLogos.length} result{filteredAccountsWithLogos.length !== 1 ? 's' : ''} for "{searchTerm}"
                  </div>
                )}

                <div className="max-h-[600px] overflow-y-auto space-y-2 px-2">
                  {filteredAccountsWithLogos.map((account) => (
                    <div
                      key={account.bill_id}
                      className={`px-3 py-1 border rounded-lg cursor-pointer transition-colors bg-gray-50 hover:bg-amber-100 dark:hover:bg-gray-800 ${selectedAccount?.bill_id === account.bill_id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                        }`}
                      onClick={() => handleAccountSelect(account)}
                    >
                      <div className="flex items-center space-x-3">
                        {/* Logo on the left */}
                        <div className="flex-shrink-0">
                          <img
                            src={
                              ((account as any).beneficiary?.logo) ? getLogoUrl((account as any).beneficiary.logo) : (account.logoUrl || getLogoUrl(account.beneficiary?.logo || null))
                            }
                            alt={account.beneficiary?.name || 'Provider'}
                            className="w-15 rounded-0 object-cover bg-gray-100 dark:bg-gray-800"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              // Only set fallback once to prevent infinite loops
                              if (!img.src.includes('Logo-RTech.jpeg')) {
                                img.src = '/assets/images/Logo-RTech.jpeg';
                              }
                            }}
                          />
                        </div>

                        {/* Provider details stacked on the right */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {account.beneficiary?.name || 'Unknown Provider'}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                            Account: {account.account || 'N/A'}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
                            {account.category || account.description || 'Unknown Service'}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-300 truncate">
                            {account.costcenter?.name || 'N/A'}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-300 truncate">
                            {account.location?.name || 'N/A'}
                          </p>
                        </div>

                        {sidebarSize === 'sm' && (
                          <ChevronRight className="w-8 h-8 text-gray-600" />
                        )}

                        {/* Selected indicator */}
                        {selectedAccount?.bill_id === account.bill_id && (
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredAccountsWithLogos.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {searchTerm ? (
                        <div>
                          <p>No accounts found for "{searchTerm}"</p>
                          <p className="text-xs mt-1">Try searching by provider, service, or account number</p>
                        </div>
                      ) : (
                        <p>No billing accounts found</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Form (only shown when lg size) */}
            {sidebarSize === 'lg' && (selectedAccount || editingBill) && (
              <div className="w-2/3 border-l pl-6 space-y-4 relative">
                {/* Loading overlay for account switching */}
                {isFormLoading && (
                  <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                    <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg border">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Refreshing form data...</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Date and Bill Number */}
                  <div className="space-y-2">
                    <Label htmlFor="ubill_date">Bill Date *</Label>
                    <Input
                      id="ubill_date"
                      type="date"
                      value={formData.ubill_date}
                      onChange={(e) => handleInputChange('ubill_date', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ubill_no">Bill/Invoice Number *</Label>
                    <Input
                      id="ubill_no"
                      type="text"
                      value={formData.ubill_no}
                      onChange={(e) => handleInputChange('ubill_no', e.target.value)}
                      placeholder="Enter bill number"
                      required
                    />
                  </div>

                  {/* Cost Center */}
                  <div className="space-y-2">
                    <Label htmlFor="cc_id">Cost Center</Label>
                    <Select
                      value={formData.cc_id}
                      onValueChange={(value) => handleInputChange('cc_id', value)}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder="Select Cost Center" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select Cost Center</SelectItem>
                        {costCenters.map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="loc_id">Location</Label>
                    <Select
                      value={formData.loc_id}
                      onValueChange={(value) => handleInputChange('loc_id', value)}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder="Select Location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select Location</SelectItem>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Financial Fields */}
                  <div className="space-y-2">
                    <Label htmlFor="ubill_stotal">Bill Amount</Label>
                    <Input
                      id="ubill_stotal"
                      type="text"
                      inputMode="decimal"
                      value={formData.ubill_stotal}
                      onChange={(e) => handleNumericInputChange('ubill_stotal', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ubill_rent">Rental</Label>
                    <Input
                      id="ubill_rent"
                      type="text"
                      inputMode="decimal"
                      value={formData.ubill_rent}
                      onChange={(e) => handleNumericInputChange('ubill_rent', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  {/* B&W and Color fields - only show for printing services */}
                  {showPrintingFields && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="ubill_bw">B&W Charges (Printing)</Label>
                        <Input
                          className='bg-yellow-100'
                          id="ubill_bw"
                          type="text"
                          inputMode="decimal"
                          value={formData.ubill_bw}
                          onChange={(e) => handleNumericInputChange('ubill_bw', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ubill_color">Color Charges (Printing)</Label>
                        <Input
                          className='bg-yellow-100'
                          id="ubill_color"
                          type="text"
                          inputMode="decimal"
                          value={formData.ubill_color}
                          onChange={(e) => handleNumericInputChange('ubill_color', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="ubill_tax">Tax</Label>
                    <Input
                      id="ubill_tax"
                      type="text"
                      inputMode="decimal"
                      value={formData.ubill_tax}
                      onChange={(e) => handleNumericInputChange('ubill_tax', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ubill_disc">Adjustment</Label>
                    <Input
                      id="ubill_disc"
                      type="text"
                      inputMode="decimal"
                      value={formData.ubill_disc}
                      onChange={(e) => handleNumericInputChange('ubill_disc', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ubill_round">Rounding</Label>
                    <Input
                      id="ubill_round"
                      type="text"
                      inputMode="decimal"
                      value={formData.ubill_round}
                      onChange={(e) => handleNumericInputChange('ubill_round', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ubill_gtotal">Grand Total</Label>
                    <Input
                      id="ubill_gtotal"
                      type="text"
                      value={formData.ubill_gtotal}
                      readOnly
                      className="bg-gray-50 dark:bg-gray-700"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Payment Status and Reference */}
                  <div className="space-y-2">
                    <Label htmlFor="ubill_paystat">Payment Status</Label>
                    <Select
                      value={formData.ubill_paystat}
                      onValueChange={(value) => handleInputChange('ubill_paystat', value)}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Upload Bill PDF</Label>
                  <div
                    ref={dropZoneRef}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer?.files && e.dataTransfer.files[0];
                      if (file) handleFileUpload(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-dashed border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer text-center bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {!paymentRefFile ? (
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 mb-2 text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Drag & drop PDF bill document here, or click to select</p>
                        <p className="text-xs text-gray-400 mt-1">PDF only — max 10MB</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 justify-center">
                        {paymentRefPreview ? (
                          <div className="flex items-center gap-3">
                            <div className="w-20 h-20 bg-white dark:bg-gray-900 rounded overflow-hidden border">
                              {/* Embed the PDF preview - browsers will render first page as a mini viewer */}
                              <embed src={paymentRefPreview} type="application/pdf" width="100%" height="100%" />
                            </div>
                            <div className="text-left">
                              <div className="text-sm font-medium">{paymentRefFile?.name}</div>
                              <div className="text-xs text-gray-500">{Math.round((paymentRefFile?.size || 0) / 1024)} KB</div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <a href={paymentRefPreview} target="_blank" rel="noreferrer" className="text-xs underline text-blue-600">Open</a>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:bg-red-500 hover:text-white"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setPaymentRefFile(null);
                                  if (paymentRefPreview) {
                                    try { URL.revokeObjectURL(paymentRefPreview); } catch (e) { /* noop */ }
                                  }
                                  setPaymentRefPreview(null);
                                  if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 flex items-center justify-center bg-red-100 dark:bg-red-900 rounded">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <div className="text-sm font-medium">{paymentRefFile?.name}</div>
                              <div className="text-xs text-gray-500">{Math.round((paymentRefFile?.size || 0) / 1024)} KB</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:bg-red-500 hover:text-white"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setPaymentRefFile(null);
                                setPaymentRefPreview(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </div>
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingBill ? 'Update Bill' : 'Create Bill'}
                  </Button>
                  <Button
                    onClick={() => {
                      setSidebarOpen(false);
                      resetForm();
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        }
      />
    </div>
  );
};

export default UtilityBill;

// Helper to download a Blob as a file
function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/*

ToDo:
- Add utility bill form page at /billings/utility/form
- Implement utility PDF report generation similar to fuel reports
- Add proper error handling and loading states

*/
