# Project Management Module Overview

## Introduction

The Project Management module is a comprehensive enterprise-grade project tracking and management system built on Next.js 15 with TypeScript. It enables teams to register initiatives, track ownership, manage modules (work packages), and visualize progress through multiple views including card, table, Kanban, Gantt timeline, and burnup charts.

**Key Hierarchy:** `Project → Modules (Deliverables) → Features & Tasks (Checklist Items) → Checklist Details`

---

## Architecture & Structure

### 1. **Project-Level Management**

A **Project** represents a high-level initiative with comprehensive metadata:

#### Project Core Properties
```typescript
interface ProjectRecord {
  id: string;                    // Unique identifier
  code: string;                  // Normalized code (e.g., "CS-OPS-001")
  name: string;                  // Project title
  description?: string;          // Detailed description
  projectType?: 'dev' | 'it';   // Classification
  assignmentType: 'project' | 'support' | 'ad_hoc';
  priority?: string;             // Priority level
  status: ProjectStatus;         // Current state
  startDate: string;             // Timeline start (ISO 8601)
  dueDate: string;              // Timeline end (ISO 8601)
  durationDays: number;         // Calculated business days
  percentComplete: number;      // 0-100 progress tracking
  createdAt: string;
  updatedAt: string;
  
  // Relationships
  assignments: ProjectAssignment[];      // Team members
  milestones: ProjectMilestone[];        // Checkpoints
  progressLogs: ProjectProgressLog[];    // Historical tracking
  supportShifts: ProjectSupportShift[]; // Support coverage (for support projects)
  tags: ProjectTagLink[];                // Business categorization
  deliverables: ProjectDeliverable[];    // Scopes/Modules
}
```

#### Project Status Types
- `not_started`: Project hasn't begun (0% complete or before start date)
- `in_progress`: Active project execution (between 0-100% with valid dates)
- `completed`: Project finished (≥100% complete)
- `at_risk`: Delayed project (overdue with <80% completion or critical deadline)

#### Assignment Types
- **Project**: Full initiative ownership with dedicated team members
- **Support**: Ongoing support assignments with shift coverage tracking
- **Ad-hoc**: Short-term, ad-hoc work assignments

---

### 2. **Modules (Deliverables)**

Modules are the primary work breakdown structure within a project. Each represents a logical phase or component with specific dates, team ownership, and progress tracking. The term "module" is used interchangeably with "deliverable" in the codebase.

#### Deliverable Properties
```typescript
interface ProjectDeliverable {
  // Unique identifiers
  id: string;                    // Client-side unique ID (for new modules)
  serverId?: string | number;    // Server-persisted ID when editing existing module
  
  // Module Information
  name: string;                  // Module title/name
  type: DeliverableType;         // Category (see Module Types below)
  description?: string;          // Detailed scope description
  
  // Timeline Planning
  startDate: string;             // Planned start (ISO 8601)
  endDate: string;              // Planned end (ISO 8601)
  
  // Attachments & Files
  attachments: ProjectDeliverableAttachment[];
  fileBlobs?: File[];            // For API upload construction
  
  // Progress Tracking
  progress?: number;             // 0-100 completion percentage
  status?: MilestoneStatus;      // Current state (not_started, in_progress, completed, at_risk)
  mandays?: number;              // Planned effort in business days
  
  // Actual Execution Data
  actualStartDate?: string;      // When work actually started
  actualEndDate?: string;        // When work actually finished
  actualMandays?: number;        // Actual effort consumed
  
  // Downstream Enrichments
  taskGroups?: string[];         // Legacy task group references
  assignee?: string;             // Team member responsible for module
#### Module Types
Six standard deliverable types define the nature of the work:

| Type | Purpose | Example |
|------|---------|---------|
| **discovery** | Research and requirement gathering | "Ticket Journey Discovery" |
| **design** | Architecture, design, and planning | "Workflow Design, Data Model" |
| **development** | Implementation and feature build | "Automation Build, API Development" |
| **testing** | QA, UAT, and validation | "Integration Testing, UAT & Cutover" |
| **deployment** | Release, migration, and go-live | "Production Rollout, Data Migration" |
| **documentation** | Documentation and knowledge transfer | "API Docs, User Guides" |
| **training** | Training and capability building | "Team Training, User Enablement" |

#### Milestone Status (same as Project Status)
- `not_started`
- `in_progress`
- `completed`
- `at_risk`

---

### 3. **Checklist Items & Details** (Features & Tasks)

Within each deliverable, teams can define granular **checklist items**—representing specific features, tasks, or acceptance criteria. This layer enables detailed work breakdown and tracking.

#### Checklist Structure
```typescript
type ChecklistItem = {
  id: number;           // Server-provided identifier
  name: string;         // Feature/Task name
};

type ChecklistDetail = {
  id: string;           // References ChecklistItem.id
  name: string;         // Inherited or custom name
  remarks: string;      // Notes, acceptance criteria, special handling
  expectedMandays: number | '';  // Estimated effort
};
```

#### Key Features
- **Dynamic Binding**: Checklist items are linked to scopes via `featureKeys` array
- **Effort Estimation**: Individual tasks can have expected mandays which roll up to scope totals
- **Remarks Field**: Captures acceptance criteria, special considerations, or implementation notes
- **Server Integration**: Checklists are fetched from `/api/projects/checklists` endpoint

---

## User Interface Components

### 1. **Dashboard Views**

#### Card View (`ProjectDashCardView`)
- **Purpose**: High-level overview of active projects
- **Display**: Grid of project cards showing:
  - Project name, code, and status
  - Team member count and primary assignees
  - Timeline and duration
  - Progress bar with percentage
  - Priority indicator
- **Interactions**: Click to navigate to project details

#### Table View (`ProjectDashTableView`)
- **Purpose**: Detailed spreadsheet-style project listing
- **Columns**: Project name, assignment type, priority, team, duration, progress, status
- **Features**:
  - Sortable columns
  - Inline progress updates
  - Filtering by assignment type and project type
  - Row actions (edit, delete)
- **Performance**: Custom DataGrid component for large datasets

#### Kanban View (`ProjectKanban`)
- **Purpose**: Status-based visual workflow
- **Columns**: Not Started → In Progress → Completed → At Risk
- **Interactions**: Drag-drop to change status
- **Features**: Real-time updates on drag-drop completion

#### Reports View (`ProjectReports`)
- **Purpose**: Aggregate analytics and insights
- **Metrics**:
  - Project count by status
  - Average progress percentage
  - Support assignment coverage
  - Timeline health (on-track vs. at-risk)
  - Team utilization by role

---

### 2. **Project Details Page**

The detailed project view provides comprehensive management of a single project. Accessible via `/projectmgmt/[projectId]`.

#### Sub-Views

##### Table View (`ModulesTableView`)
Displays all modules in structured format:

| Column | Content |
|--------|---------|
| **#** | Index counter |
| **Modules** | Module name + assignee |
| **Tasks** | Task group references (legacy field) |
| **Planned** | Start → End dates + total mandays |
| **Actual** | Actual start → end + actual mandays |
| **Progress/Status** | Inline range slider + status badge |

**Features**:
- Real-time progress slider (updates immediately when in edit mode)
- Drag-drop reordering with `@dnd-kit` library
- Inline edit and delete actions
- Sorting arrows for manual reordering
- Progress indicator colors:
  - Amber: In-progress modules
  - Green: Completed modules
  - Gray: Not-started modules

##### Timeline View (Gantt Chart) (`ModuleTimelineView`)
Visual Gantt representation of module schedules:

**Features**:
- Horizontal timeline spanning project duration
- Bars represent module spans (color-coded by delivery type)
- Progress visualization (amber filled, blue outline)
- Week-based grid columns with date headers
- Navigation: Previous/Next week arrows
- Drag-drop task reordering
- Embedded actions: Edit, Delete, Move Up/Down

**Color Palette** (8 distinct colors):
```
#3b82f6 (blue), #ef4444 (red), #10b981 (emerald), #f59e0b (amber),
#8b5cf6 (violet), #06b6d4 (cyan), #f97316 (orange), #84cc16 (lime)
```

##### Burnup Chart View (`ModuleBurnupChartView`)
Tracks actual vs. planned effort over time:

**Axes**:
- **X-axis**: Weekly time intervals from project start to end
- **Y-axis**: Cumulative mandays completed

**Lines**:
- **Blue (Planned)**: Expected cumulative completion (linear or scope-based)
- **Orange (Actual)**: Realized cumulative effort completed

**Modes**:
- **Planned Mode**: 
  - `linear`: Straight line from 0 to total mandays
  - `scope`: Steps align with scope completion milestones
- **Completion Mode**: 
  - `actual`: Uses actual completion dates
  - `planned`: Uses planned completion dates

**Metrics Displayed**:
- Completion percentage (101 days remaining)
- Performance SPI (0.00 = Behind schedule)
- Velocity (mandays/week)
- Projected End date (On schedule, 303 days behind)

**Interactive Controls**:
- Toggle Planned/Actual visibility
- Show/Hide values on chart
- Switch between planned modes
- Switch between completion modes

---

### 3. **Scope Form** (`ModuleForm`)

Dialog-based form for creating and editing modules:

#### Key Fields
1. **Name**: Auto-populated from selected checklist items
2. **Type**: Dropdown (discovery, design, development, testing, deployment, documentation, training)
3. **Description**: Rich textarea for scope details
4. **Date Range**: Start & End dates (auto-validates endDate ≥ startDate)
5. **Assignee**: Combobox dropdown with team member list
6. **Progress**: Percentage (0-100)
7. **Checklist Selection**: Multi-select from available checklist items
8. **Checklist Details Table**: Dynamic fields for each selected item:
   - Name (read-only, from checklist)
   - Remarks (custom notes/criteria)
   - Expected Mandays (effort estimation)
9. **File Attachments**: Upload supporting documents
10. **Actual Dates**: Captured when deliverable executes
11. **Status Override**: Can manually set to not_started, in_progress, completed, at_risk

#### Calculated Fields
- **Planned Mandays**: Business days (excluding weekends) between start and end
- **Total Expected Mandays**: Sum of all checklist item expectedMandays
- **Auto-naming**: Concatenates checklist names with " • " separator

---

## Data Flow & Integration

### 1. **Form Submission** → **Project Creation**

When creating a new project via `project-details.tsx`:

```
Form (ProjectFormValues)
  ↓ handleSubmit
  ↓ hydrateRecord() [builds ProjectRecord from form]
  ↓ POST /api/projects
  ↓ Server generates ID and persists
  ↓ navigate() to project details
```

### 2. **Scope Management** → **Project Updates**

When adding/editing a scope within a project:

```
ScopeForm.onSubmit()
  ↓ POST /api/projects/{projectId}/scopes
  ↓ Server assigns serverId to deliverable
  ↓ syncProjectMetaFromScopes() [recalculates project-level metrics]
  ↓ PUT /api/projects/{projectId} [updates project percentComplete]
```

### 3. **Inline Progress Updates**

When user adjusts scope progress slider:

```
handleInlineProgressChange(index, value)
  ↓ Validate & calculate overall project progress
  ↓ PUT /api/projects/{projectId}/scopes/{serverId}
  ↓ { progress: value, status: 'in_progress|completed|...', overall_progress: newTotal }
  ↓ Update form state
  ↓ Toast notification
```

### 4. **Reordering Scopes**

When dragging scopes to new positions:

```
handleReorder(from, to)
  ↓ Local array.splice() reorder
  ↓ PUT /api/projects/{projectId}/reorder
  ↓ Payload: { project_id, scopes: [...reordered] }
  ↓ Visual feedback with drag-drop animation
```

### 5. **Export Timeline**

When exporting timeline as Excel:

```
exportTimelineExcel()
  ↓ Create ExcelJS workbook
  ↓ Build headers with week columns
  ↓ Map scopes to rows, colorize cells by progress
  ↓ Download as .xlsx file
```

### 6. **Burnup Chart Data**

Data aggregation for burnup visualization:

```
calculateBurnupData()
  ↓ Iterate each week from project start to end
  ↓ Aggregate deliverables active in each week
  ↓ Calculate planned vs. actual cumulative mandays
  ↓ Return array for Recharts LineChart
```

---

## Key Business Logic

### 1. **Project Status Inference**

Automatically determined from project state:

```typescript
inferStatus({startDate, dueDate, percentComplete}) → ProjectStatus
  
  if (percentComplete >= 100) → 'completed'
  if (dueDate < today && percentComplete < 100) → 'at_risk'
  if (percentComplete < 80 && daysRemaining ≤ 2) → 'at_risk'
  if (today < startDate && percentComplete === 0) → 'not_started'
  else → 'in_progress'
```

### 2. **Progress Rollup**

Project-level progress computed from scope-level progress:

```typescript
computeOverallProgress(deliverables: ProjectDeliverable[])
  → sum(deliverable.progress) / count(deliverables)
  → Reflects average scope completion
```

### 3. **Manday Calculation**

Business days (weekdays only, no public holidays):

```typescript
calculateBusinessDays(startDate, endDate)
  ← Excludes weekends (Sat, Sun)
  ← Excludes cached public holidays (currently empty for speed)
  → Count of working days
```

### 4. **Duration Inference**

When project timeline isn't explicitly set, it's derived from deliverables:

```typescript
deriveTimelineFromDeliverables(deliverables)
  → startDate = min(deliverable.startDate)
  → endDate = max(deliverable.endDate)
  → Used if not manually specified
```

---

## Theming & Styling

### Color System

**Status Colors** (`STATUS_PROGRESS_COLORS`):
- **Not Started**: Muted gray (indicator: `bg-muted-foreground/30`, track: `bg-muted`)
- **In Progress**: Amber (indicator: `bg-amber-500`, track: `bg-amber-100`)
- **Completed**: Emerald (indicator: `bg-emerald-500`, track: `bg-emerald-100`)
- **At Risk**: Amber-600 (indicator: `bg-amber-600`, track: `bg-amber-100`)

**Badge Classes** (`STATUS_META`):
- Not Started: `bg-red-500 text-white`
- In Progress: `bg-amber-400/70`
- Completed: `bg-emerald-100 text-emerald-700`
- At Risk: `bg-amber-100 text-amber-700`

### UI Components Used

- **Form Controls**: `react-hook-form` + `yup` validation
- **Date Input**: `date-fns` for parsing and formatting (ISO 8601 throughout)
- **Drag-Drop**: `@dnd-kit/core` + `@dnd-kit/sortable` for Gantt and scope reordering
- **Charts**: `recharts` for Gantt timeline and burnup visualization
- **Tables**: Custom `CustomDataGrid` component for scopes table
- **Modals**: `Dialog` from shadcn/ui
- **Dropdowns**: `Select`, `Dropdown Menu` from shadcn/ui
- **Notifications**: `sonner` toast library
- **Dates**: `date-fns` (parseISO, format, differenceInCalendarDays, etc.)

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/projects` | POST | Create new project |
| `/api/projects` | GET | Fetch all projects (paginated) |
| `/api/projects/{id}` | GET | Fetch single project with all relationships |
| `/api/projects/{id}` | PUT | Update project metadata |
| `/api/projects/{id}/modules` | POST | Add new module to project |
| `/api/projects/{id}/modules/{moduleId}` | PUT | Update module progress/status |
| `/api/projects/{id}/modules/{moduleId}` | DELETE | Remove module |
| `/api/projects/{id}/reorder-modules` | PUT | Reorder modules |
| `/api/projects/checklists` | GET | Fetch available checklist templates |

---

## Component File Structure

```
src/components/projectmgmt/
├── index.ts                          # Entry point (exports ProjectMain)
├── types.ts                          # TypeScript interfaces
├── project-dash.tsx                  # Main dashboard & layout
├── project-dash-cardview.tsx         # Card view component
├── project-dash-tableview.tsx        # Table view component
├── project-kanban.tsx                # Kanban board view
├── project-reports.tsx               # Analytics/reports
├── project-details.tsx               # Project detail page
├── module-form.tsx                   # Add/edit module modal
├── ModulesTableView.tsx              # Modules table in project details
├── ModuleTimelineView.tsx            # Gantt chart visualization
├── ModuleBurnupChartView.tsx         # Burnup chart visualization
├── project-dash-helpers.ts           # Utility functions (business days, status meta)
├── project-dash-constants.ts         # Static data (assignors, assignees, tags)
├── PROJECTMGMT_OVERVIEW.md           # Module documentation
└── PROJECTMGMT_ENHANCEMENT.md        # Enhancement tracking log

src/app/(defaults)/projectmgmt/
├── page.tsx                          # Dashboard page
└── [projectId]/
    └── page.tsx                      # Project details page

src/app/(blank)/projectmgmt/
└── scope-editor/
    └── [scopeId]/
        └── page.tsx                  # Inline scope editor (optional)
```

---

## Key Features Summary

| Feature | Location | Status |
|---------|----------|--------|
| **Multi-view Dashboard** | ProjectDash + CardView, TableView, Kanban | ✅ Implemented |
| **Project Creation** | ProjectDetails form | ✅ Implemented |
| **Scope/Deliverable Management** | ProjectDetails → ScopeForm | ✅ Implemented |
| **Inline Progress Tracking** | ScopesTableView slider | ✅ Implemented |
| **Gantt Timeline** | ScopeTimelineView | ✅ Implemented |
| **Burnup Chart** | ScopeBurnupChartView | ✅ Implemented |
| **Reordering Scopes** | Drag-drop (ScopesTableView, ScopeTimelineView) | ✅ Implemented |
| **Excel Export** | ProjectDetails → exportTimelineExcel() | ✅ Implemented |
| **Checklist Integration** | ScopeForm → featureKeys + checklistDetails | ✅ Implemented |
| **Team Assignments** | ProjectAssignment[] with roles | ✅ Implemented |
| **Tag Categorization** | ProjectTags, tag-based filtering | ✅ Implemented |
| **Support Shifts Tracking** | ProjectSupportShift[] for support projects | ✅ Implemented |
| **Progress Logging** | ProjectProgressLog[] for history | ✅ Implemented |
| **Real-time Sync** | Socket.IO integration (if socket-server running) | ⚠️ Optional |

---

## Performance Considerations

1. **Memoization**: Heavy use of `useMemo()` and `useCallback()` to prevent re-renders
2. **Lazy Loading**: Checklists fetched only when ScopeForm opens
3. **Pagination**: Project list supports pagination (server-side)
4. **Excel Export**: Uses streaming buffer construction to handle large datasets
5. **Business Days Caching**: Public holidays cached in memory (`cachedHolidays`)
6. **Chart Optimization**: Recharts memoizes data transformation for burnup

---

## Future Enhancement Opportunities

1. **Real-time Collaboration**: WebSocket integration for live scope updates
2. **Advanced Filtering**: Multi-criteria project search and filtering
3. **Budget Tracking**: Cost allocation and budget burn alongside manday burn
4. **Resource Leveling**: Identify over-allocated team members
5. **Dependency Management**: Cross-project scope dependencies
6. **Document Management**: Enhanced attachment versioning and full-text search
7. **Notifications**: Alerts for scope delays or status changes
8. **Mobile View**: Responsive optimizations for tablet/phone access
9. **Historical Analytics**: Trend analysis across multiple project cycles
10. **Integration**: Jira, Azure DevOps, Slack webhooks

---

## Support & Documentation

- **Issue Reporting**: Use GitHub Issues with label `projectmgmt`
- **Feature Requests**: Discuss in project team meetings
- **Code Style**: Follows existing TypeScript + React conventions
- **Testing**: Unit tests for utility functions, E2E tests for workflows
- **Deployment**: Included in standard Next.js build and PM2 deployment process

---

**Last Updated**: December 2025  
**Maintained By**: ADMS4 Development Team
