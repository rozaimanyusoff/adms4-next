"use client";

import React, { useMemo } from "react";
import { CustomDataGrid, ColumnDef } from "@/components/ui/DataGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

type PcAssessmentRow = {
  id: number;
  assessmentYear: string;
  assessmentDate: string;
  deviceType: "Laptop" | "Desktop" | "Tablet";
  assignedUser: string;
  location: string;
  department: string;
  os: string;
  encryption: boolean;
  issues: number;
};

const PcAssessmentRecord: React.FC = () => {
  const router = useRouter();

  const handleCreate = () => {
    router.push("/compliance/pc-assessment-form");
  };

  // Placeholder dataset until backend endpoint is ready
  const data = useMemo<PcAssessmentRow[]>(
    () => [
      {
        id: 1021,
        assessmentYear: String(new Date().getFullYear()),
        assessmentDate: new Date().toISOString().slice(0, 10),
        deviceType: "Laptop",
        assignedUser: "Unassigned",
        location: "—",
        department: "IT",
        os: "—",
        encryption: true,
        issues: 0,
      },
      {
        id: 1018,
        assessmentYear: String(new Date().getFullYear() - 1),
        assessmentDate: `${new Date().getFullYear() - 1}-10-06`,
        deviceType: "Desktop",
        assignedUser: "Jane Smith",
        location: "HQ-2",
        department: "Finance",
        os: "Windows 10 Pro",
        encryption: false,
        issues: 1,
      },
      {
        id: 1009,
        assessmentYear: String(new Date().getFullYear() - 1),
        assessmentDate: `${new Date().getFullYear() - 1}-04-18`,
        deviceType: "Tablet",
        assignedUser: "Mark Lee",
        location: "Site-A",
        department: "Operations",
        os: "iPadOS 17",
        encryption: true,
        issues: 0,
      },
    ],
    []
  );

  const columns: ColumnDef<PcAssessmentRow>[] = [
    { key: "id", header: "ID", sortable: true },
    {
      key: "assessmentYear",
      header: "Year",
      sortable: true,
      filter: "singleSelect",
      filterParams: { options: Array.from(new Set(data.map((d) => d.assessmentYear))) },
    },
    {
      key: "assessmentDate",
      header: "Date",
      sortable: true,
      render: (row) => row.assessmentDate || "-",
    },
    {
      key: "deviceType",
      header: "Device",
      sortable: true,
      filter: "singleSelect",
    },
    {
      key: "assignedUser",
      header: "Assigned User",
      filter: "input",
      sortable: true,
    },
    { key: "location", header: "Location", filter: "input" },
    { key: "department", header: "Dept", filter: "input" },
    { key: "os", header: "OS / Version", filter: "input" },
    {
      key: "encryption",
      header: "Encryption",
      filter: "singleSelect",
      filterParams: {
        options: [true, false],
        labelMap: { true: "Yes", false: "No" } as Record<string | number, string>,
      },
      render: (row) => (
        <Badge variant={row.encryption ? "secondary" : "destructive"}>
          {row.encryption ? "Enabled" : "Not Enabled"}
        </Badge>
      ),
    },
    {
      key: "issues",
      header: "Issues",
      sortable: true,
      render: (row) =>
        row.issues > 0 ? (
          <Badge variant="destructive">{row.issues} open</Badge>
        ) : (
          <Badge variant="outline">Clear</Badge>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:text-blue-800"
          onClick={handleCreate}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Compliance / IT Hardware
          </p>
          <h1 className="text-xl font-semibold">PC Assessment Record</h1>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </div>
      <CustomDataGrid
        data={data}
        columns={columns}
        pageSize={10}
        pagination={false}
        inputFilter={false}
        dataExport={false}
      />
    </div>
  );
};

export default PcAssessmentRecord;
