"use client";

import React from "react";

interface BulkActionsProps {
  selectedIds: Set<string>;
  employees: any[];
  onClearSelection: () => void;
}

export function BulkActions({ selectedIds, employees, onClearSelection }: BulkActionsProps) {
  const count = selectedIds.size;

  const exportCSV = () => {
    const selected = employees.filter((e: any) => selectedIds.has(e.user_id || e.id));
    const headers = [
      "First Name", "Last Name", "Email", "Phone", "Role",
      "Position", "Status", "Hire Date", "License Number",
    ];
    const rows = selected.map((e: any) => [
      e.first_name, e.last_name, e.email, e.phone, e.role,
      e.position || "", e.account_status, e.hire_date || "", e.license_number || "",
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c: string) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendBulkEmail = () => {
    const selected = employees.filter((e: any) => selectedIds.has(e.user_id || e.id));
    const emails = selected.map((e: any) => e.email).join(",");
    window.open(`mailto:${emails}?subject=Staff Notification`);
  };

  if (count === 0) return null;

  return (
    <div className="bg-primary text-primary-foreground rounded-2xl px-5 py-3 flex items-center justify-between mb-4 shadow-lg transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
          <span className="text-sm font-bold">{count}</span>
        </div>
        <span className="text-sm font-medium">
          {count === 1 ? "1 employee selected" : `${count} employees selected`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-foreground/15 hover:bg-primary-foreground/25 rounded-lg text-xs font-medium transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
        <button
          onClick={sendBulkEmail}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-foreground/15 hover:bg-primary-foreground/25 rounded-lg text-xs font-medium transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Send Email
        </button>
        <button
          onClick={onClearSelection}
          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-primary-foreground/20 transition"
          title="Clear selection"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
