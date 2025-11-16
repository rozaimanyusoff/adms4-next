# Asset Details Component Revision

## Overview
The asset details component has been completely revised to provide a comprehensive **workflow-style dashboard** that covers the complete asset lifecycle from procurement to disposal.

## New Structure

### Main Component
**File**: `src/components/assetmgmt/detail-asset-revised.tsx`

The revised component follows a **dashboard workflow layout** organized into 6 lifecycle stages:

### 1. **Purchasing Stage** 🛒
- Purchase details (date, price, supplier)
- Purchase order information (PO, PR, DO, GRN)
- Financial information (warranty, depreciation, book value)

### 2. **Specifications Stage** 📄
- Basic asset information (brand, model, category, serial)
- **Type-specific specifications** (dynamic based on asset type)
- Technical details relevant to each asset category

### 3. **Ownership Stage** 👤
- Current assignment details
- Complete ownership movement history with timeline
- Department, cost center, and location tracking

### 4. **Maintenance Stage** 🔧
- Complete maintenance history
- Service records with costs and suppliers
- Maintenance status tracking

### 5. **Assessment Stage** ✅
- Compliance assessment records
- NCR (Non-Conformance Report) tracking
- Assessment ratings and remarks

### 6. **Disposal Stage** 🗑️
- Disposal status and information
- Disposal method and reason
- Disposal date and remarks

## Type-Specific Sub-Components

The system now includes **5 specialized sub-components** that render asset-type-specific specifications:

### 1. Computer Specs (`computer-specs.tsx`)
- Processor (CPU)
- RAM/Memory
- Storage (HDD/SSD)
- Graphics card
- Operating system
- Screen size
- Network card
- Battery
- Hostname

### 2. Vehicle Specs (`vehicle-specs.tsx`)
- Engine capacity
- Fuel type
- Transmission
- Color
- Chassis number
- Engine number
- Registration date
- Road tax expiry
- Insurance expiry
- Seating capacity
- Mileage/Odometer
- Insurance details

### 3. Equipment/Instrument Specs (`equipment-specs.tsx`)
- Power rating/Wattage
- Voltage
- Frequency
- Dimensions
- Weight
- Capacity
- Calibration dates
- Certification
- Technical specifications

### 4. Machinery Specs (`machinery-specs.tsx`)
- Power output/Horsepower
- Load capacity
- Dimensions & weight
- Operating hours
- Fuel type
- Engine type
- Condition
- Last service date
- Operational specifications

### 5. Office Equipment Specs (`office-equipment-specs.tsx`)
- Material
- Color
- Dimensions
- Weight
- Condition
- Quantity
- Description

## Asset Type Detection

The system automatically detects asset types based on the `type_id` or type name:

```typescript
const getAssetType = () => {
    const typeName = asset.types?.name.toLowerCase();
    if (typeName.includes('computer') || typeName.includes('laptop')) return 'computer';
    if (typeName.includes('motor') || typeName.includes('vehicle')) return 'vehicle';
    if (typeName.includes('equipment') || typeName.includes('instrument')) return 'equipment';
    if (typeName.includes('machinery')) return 'machinery';
    if (typeName.includes('office')) return 'office-equipment';
    return 'general';
};
```

## Features

### ✅ Complete Lifecycle Coverage
- Full asset journey from purchase to disposal
- Each stage has dedicated UI section
- Data fetched from appropriate APIs

### ✅ Type-Specific Intelligence
- Dynamic rendering based on asset type
- Specialized specification forms per type
- Extensible architecture for new types

### ✅ Enhanced Navigation
- Top navigation bar with search
- Previous/Next asset navigation
- Quick asset search by register number

### ✅ Visual Workflow Design
- Tab-based interface for lifecycle stages
- Icons for each stage
- Color-coded status badges
- Timeline visualizations for history

### ✅ Responsive Layout
- Mobile-friendly design
- Flexible grid layouts
- Collapsible sections

## API Integration

The component fetches data from multiple endpoints:

```typescript
// Main asset data
GET /api/assets/${id}

// Purchase/procurement data
GET /api/purchase/records?asset_id=${id}

// Maintenance records
GET /api/bills/mtn/vehicle/${id}

// Assessment records
GET /api/compliance/assessments?asset_id=${id}

// Disposal data
GET /api/assets/${id}/disposal
```

## Usage

To use the revised component in your page:

```tsx
import DetailAsset from '@/components/assetmgmt/detail-asset-revised';

export default function AssetDetailPage({ params }) {
    return <DetailAsset id={params.id} />;
}
```

## Migration Notes

### From Old Component
The old `detail-asset.tsx` focused primarily on maintenance and fuel records for vehicles. The new component:

1. **Expands scope** to all asset types
2. **Adds missing stages** (purchasing, assessment, disposal)
3. **Separates concerns** with type-specific sub-components
4. **Improves UX** with workflow-oriented tabs

### Database Requirements
Ensure your database has:
- `extra_specs` JSON column in assets table for storing type-specific specs
- Purchase order linkage to assets
- Assessment records linked to assets
- Disposal tracking fields

## Future Enhancements

Potential additions:
- [ ] Inline editing of specifications
- [ ] Document attachment upload
- [ ] Transfer request initiation
- [ ] Maintenance schedule prediction
- [ ] Depreciation calculator
- [ ] QR code generation
- [ ] Export to PDF report

## File Structure

```
src/components/assetmgmt/
├── detail-asset-revised.tsx          # Main component
└── type-specs/
    ├── computer-specs.tsx            # Computer specifications
    ├── vehicle-specs.tsx             # Vehicle specifications
    ├── equipment-specs.tsx           # Equipment specifications
    ├── machinery-specs.tsx           # Machinery specifications
    └── office-equipment-specs.tsx    # Office equipment specifications
```

## Technical Stack

- **Framework**: Next.js 15 with App Router
- **UI Library**: Shadcn/ui + Radix UI
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **State Management**: React hooks
- **API Client**: Axios (authenticatedApi)

---

**Last Updated**: November 2025
**Component Status**: ✅ Ready for Testing
