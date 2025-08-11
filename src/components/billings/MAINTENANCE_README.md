# Vehicle Maintenance Dashboard Components

This directory contains two new components for vehicle maintenance reporting:

## Components

### 1. MaintenanceDash (`maintenance-dash.tsx`)
A comprehensive dashboard for vehicle maintenance billing with:
- Monthly chart visualization of maintenance expenses
- Year filtering capability
- Data fetched from `/api/bills/mtn` endpoint
- Similar structure to fuel, telco, and utility dashboards

### 2. ExcelMaintenanceReport (`excel-maintenance-report.tsx`)
Excel report generator for maintenance data with:
- Two report types: By Vehicle and By Cost Center
- Date range selection
- Cost center filtering
- Uses `/api/bills/mtn/summary/vehicle` and `/api/bills/mtn/summary/costcenter` endpoints
- Generates formatted Excel files with monthly breakdown

## Usage

### Importing the Dashboard
```tsx
import MaintenanceDash from '@/components/billings/maintenance-dash';

export default function MaintenancePage() {
  return (
    <div>
      <h1>Vehicle Maintenance</h1>
      <MaintenanceDash />
    </div>
  );
}
```

### Importing the Excel Report
```tsx
import ExcelMaintenanceReport from '@/components/billings/excel-maintenance-report';

export default function ReportsPage() {
  return (
    <div>
      <h1>Maintenance Reports</h1>
      <ExcelMaintenanceReport />
    </div>
  );
}
```

## API Endpoints Used

1. **Dashboard Data**: `GET /api/bills/mtn`
   - Returns array of maintenance bills with `stmt_id`, `stmt_no`, `stmt_date`, `stmt_total`

2. **Vehicle Report**: `GET /api/bills/mtn/summary/vehicle?from={date}&to={date}&cc={costcenter_id}`
   - Returns maintenance expenses grouped by vehicle/equipment

3. **Cost Center Report**: `GET /api/bills/mtn/summary/costcenter?from={date}&to={date}&cc={costcenter_id}`
   - Returns maintenance expenses grouped by cost center

4. **Cost Centers List**: `GET /api/assets/costcenters`
   - Returns list of available cost centers for filtering

## Features

### Dashboard Features
- Interactive chart with monthly maintenance expenses
- Year filtering with dropdown
- Responsive design matching existing dashboard styles
- Loading states and error handling

### Excel Report Features
- Two report types (Vehicle/Cost Center)
- Date range selection with validation
- Cost center filtering option
- Professional Excel formatting with:
  - Header styling
  - Currency formatting
  - Auto-column sizing
  - Monthly breakdown columns
- Downloadable files with descriptive names

## Styling
Both components follow the existing design patterns:
- Uses shadcn/ui components
- Consistent with fuel, telco, and utility dashboards
- Responsive grid layouts
- Professional color scheme (red theme for maintenance)

## Error Handling
- API error handling with user-friendly messages
- Loading states during data fetching
- Form validation for required fields
- Graceful degradation when no data is available
