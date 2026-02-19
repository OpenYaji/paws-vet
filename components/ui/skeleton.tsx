"use client";

import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-muted rounded ${className}`}
    />
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="border-b border-border">
      <td className="px-3 py-4"><Skeleton className="h-4 w-4 rounded" /></td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-28 rounded-md" />
            <Skeleton className="h-3 w-36 rounded-md" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4"><Skeleton className="h-6 w-16 rounded-lg" /></td>
      <td className="px-4 py-4"><Skeleton className="h-3.5 w-24 rounded-md" /></td>
      <td className="px-4 py-4"><Skeleton className="h-6 w-20 rounded-md" /></td>
      <td className="px-4 py-4"><Skeleton className="h-3.5 w-28 rounded-md" /></td>
      <td className="px-4 py-4"><Skeleton className="h-3.5 w-20 rounded-md" /></td>
      <td className="px-4 py-4"><Skeleton className="h-6 w-16 rounded-lg" /></td>
      <td className="px-4 py-4">
        <div className="flex justify-end gap-1">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
      <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-16 rounded-md" />
        <Skeleton className="h-6 w-10 rounded-md" />
      </div>
    </div>
  );
}
