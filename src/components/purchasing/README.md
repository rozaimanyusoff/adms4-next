# Purchase Records Component

A comprehensive purchasing management system built for tracking purchase requests, orders, deliveries, and invoicing with Excel import capabilities.

## Features

### 🎯 Core Functionality
- **Complete Purchase Lifecycle Management**: Track from request to goods receipt
- **Real-time Status Updates**: Visual indicators for purchase process stages
- **Dual Data Entry Methods**: Manual form entry or Excel import
- **Advanced Data Grid**: Filtering, sorting, pagination, and expandable rows
- **Responsive Design**: Mobile-friendly UI with proper UX/UI for purchasing context

### 📊 Purchase Process Stages
1. **Request** - Initial purchase request with PR number
2. **Purchase Order** - PO generation and approval
3. **Delivery Order** - Goods shipment tracking
4. **Invoice** - Supplier billing management
5. **GRN** - Goods receipt confirmation

### 🚀 Technical Features
- **ActionSidebar Integration**: Side panel for forms and detailed views
- **CustomDataGrid Integration**: Advanced data table with filtering
- **Excel Import/Export**: Bulk data management capabilities
- **Form Validation**: Client-side validation with error handling
- **Real-time Calculations**: Auto-calculation of totals
- **Status-based Badge System**: Visual status indicators

## Component Structure

### Main Components
- `PurchaseRecords` - Main container component
- `ActionSidebar` - Form container for CRUD operations
- `CustomDataGrid` - Data table with advanced features
- `DataImporter` - Excel import functionality

### Key Interfaces

```typescript
interface PurchaseRecord {
  id: number;
  request_type: string;        // CAPEX, OPEX, SERVICES
  costcenter: string;
  pic: string;
  item_type: string;
  items: string;
  supplier: string;
  brand: string;
  qty: number;
  unit_price: string;          // API returns as string
  pr_date?: string;
  pr_no?: string;
  po_date?: string;
  po_no?: string;
  do_date?: string;
  do_no?: string;
  inv_date?: string;
  inv_no?: string;
  grn_date?: string;
  grn_no?: string;
}
```
  created_at?: string;
  updated_at?: string;
}
```

## API Endpoints

The component expects the following API endpoints:

```typescript
GET    /api/purchases           // Fetch all purchase records
POST   /api/purchases           // Create new purchase record
PUT    /api/purchases/:id       // Update existing purchase record
DELETE /api/purchases/:id       // Delete purchase record
POST   /api/purchases/import    // Bulk import from Excel
```

### Expected API Response Format
```json
{
  "data": [
    {
      "id": 1,
      "request_type": "CAPEX",
      "costcenter": "TC100",
      "pic": "John Doe",
      "item_type": "Computer Equipment",
      "items": "HP PRO INTEL I3 MONITOR",
      "supplier": "FLOW ELITE ENGINEERING",
      "brand": "HP",
      "qty": 1,
      "unit_price": "1199.00",
      "pr_date": "2024-12-17",
      "pr_no": "10674",
      "po_date": "2024-12-14",
      "po_no": "5458",
      "do_date": "2024-11-14",
      "do_no": "FRE0100104",
      "inv_date": "2024-11-14",
      "inv_no": "FE0100104",
      "grn_date": "2024-11-14",
      "grn_no": "7205"
    }
  ]
}
```

## Usage

### Basic Implementation
```tsx
import { PurchaseRecords } from '@/components/purchasing';

export default function PurchasePage() {
  return <PurchaseRecords />;
}
```

### With Custom API Configuration
Ensure your API endpoints follow the expected format and the `authenticatedApi` from `@/config/api` is properly configured.

## Features in Detail

### 1. Data Grid Features
- **Filtering**: Column-based filtering (input, select, date ranges)
- **Sorting**: Multi-column sorting capabilities
- **Pagination**: Built-in pagination controls
- **Export Options**: Export to Excel/CSV formats
- **Column Visibility**: Show/hide columns dynamically
- **Expandable Rows**: Quick actions in expanded view

### 2. Form Features
- **Smart Form Layout**: Grouped sections for better UX
- **Real-time Validation**: Instant feedback on form errors
- **Auto-calculations**: Automatic total calculation
- **Date Pickers**: Easy date selection
- **Dropdown Selections**: Predefined options for consistency
- **Rich Text Areas**: Multi-line descriptions

### 3. Status Management
- **Visual Status Badges**: Color-coded status indicators
  - 🔴 **Requested**: Only request information available
  - 🟡 **Ordered**: PO generated
  - 🟠 **Delivered**: DO processed
  - 🟣 **Invoiced**: Invoice received
  - 🟢 **Completed**: GRN processed

### 4. Import/Export Features
- **Excel Import**: Bulk data import with column mapping
- **Data Validation**: Import validation and error reporting
- **Export Options**: Export filtered/selected data
- **Template Download**: Excel template for import

## Customization

### Styling
The component uses Tailwind CSS and shadcn/ui components. Customize by:
- Modifying the component's className properties
- Updating the theme configuration
- Customizing badge variants for status colors

### Validation Rules
Update validation in the `validateForm` function:
```typescript
const validateForm = (): boolean => {
  const errors: Record<string, string> = {};
  
  if (!formData.request_type) errors.request_type = 'Request type is required';
  if (!formData.costcenter) errors.costcenter = 'Cost center is required';
  if (!formData.items) errors.items = 'Item description is required';
  // Add more validation rules...
  
  setValidationErrors(errors);
  return Object.keys(errors).length === 0;
};
```

### Custom Columns
Modify the `columns` array to add/remove/customize data grid columns:
```typescript
const columns: ColumnDef<PurchaseRecord>[] = [
  { 
    key: 'custom_field', 
    header: 'Custom Field',
    render: (row) => <CustomComponent data={row} />,
    filter: 'input'
  },
  // ... other columns
];
```

## Dependencies

### Required UI Components
- `@/components/ui/button`
- `@/components/ui/input`
- `@/components/ui/select`
- `@/components/ui/textarea`
- `@/components/ui/label`
- `@/components/ui/badge`
- `@/components/ui/card`
- `@/components/ui/separator`
- `@/components/ui/dropdown-menu`

### Required External Components
- `@/components/ui/action-aside` (ActionSidebar)
- `@/components/ui/DataGrid` (CustomDataGrid)
- `@/components/data-importer/DataImporter`

### Icons
- `lucide-react` icons for UI elements

## Performance Considerations

### Optimizations Implemented
- **Memoized Calculations**: `useMemo` for computed total
- **Efficient State Management**: Minimal re-renders
- **Lazy Loading**: Import components only when needed
- **Debounced Search**: Efficient filtering

### Best Practices
- Load large datasets with pagination
- Implement server-side filtering for performance
- Cache frequently accessed data
- Use skeleton loaders for better UX

## Troubleshooting

### Common Issues
1. **API Errors**: Ensure endpoints return expected JSON format
2. **Import Failures**: Check Excel file format and column headers
3. **Validation Errors**: Verify required fields are properly filled
4. **Performance Issues**: Implement pagination for large datasets

### Development Tips
- Use browser dev tools to inspect API calls
- Check console for validation errors
- Test import functionality with small datasets first
- Verify all required UI components are available

## Future Enhancements

### Potential Features
- **Approval Workflow**: Multi-step approval process
- **Email Notifications**: Automated status updates
- **Document Attachments**: File upload for invoices/receipts
- **Reporting Dashboard**: Analytics and insights
- **Mobile App**: React Native implementation
- **Real-time Updates**: WebSocket integration
- **Audit Trail**: Track all changes and modifications

## License

This component is part of the ADMS4-Next project and follows the project's licensing terms.
