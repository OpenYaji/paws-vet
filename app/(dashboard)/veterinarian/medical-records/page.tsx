"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText, Search, Eye, ChevronLeft, ChevronRight, LayoutList, TableIcon, Pencil, Loader2,
} from "lucide-react";
import { Fetcher } from "@/lib/fetcher";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mutate } from "swr";

interface MedicalRecord {
  id: string;
  record_number: string;
  visit_date: string;
  chief_complaint: string;
  diagnosis: string | null;
  treatment_plan: string | null;
  pets: { id: string; name: string; species: string } | null;
  veterinarian: { first_name: string; last_name: string } | null;
  appointments: { appointment_number: string; scheduled_start: string; reason_for_visit: string } | null;
}

const ITEMS_PER_PAGE = 20;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MedicalRecordsPage() {
  const { data: records = [], isLoading } = useSWR<MedicalRecord[]>(
    "/api/veterinarian/medical-records",
    fetcher
  );

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "table">("table");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return records.filter(
      (r) =>
        r.pets?.name?.toLowerCase().includes(term) ||
        r.record_number?.toLowerCase().includes(term) ||
        r.diagnosis?.toLowerCase().includes(term) ||
        r.chief_complaint?.toLowerCase().includes(term)
    );
  }, [records, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const [editRec, setEditRec] = useState<MedicalRecord | null>(null);
  const [editForm, setEditForm] = useState({ chief_complaint: '', diagnosis: '', treatment_plan: '' });
  const [editSaving, setEditSaving] = useState(false);

  const openEdit = (rec: MedicalRecord) => {
    setEditRec(rec);
    setEditForm({
      chief_complaint: rec.chief_complaint ?? '',
      diagnosis: rec.diagnosis ?? '',
      treatment_plan: rec.treatment_plan ?? '',
    });
  };

  const handleEditSave = async () => {
    if (!editRec) return;
    setEditSaving(true);
    try {
      const res = await fetch('/api/veterinarian/medical-records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editRec.id, ...editForm }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditRec(null);
      mutate('/api/veterinarian/medical-records');
    } catch (err) {
      console.error('[MedicalRecords] edit error', err);
    } finally {
      setEditSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading medical records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Medical Records</h1>
            <p className="text-muted-foreground text-sm">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("table")}
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by pet, record no., diagnosis..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Table View */}
      {viewMode === "table" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Record No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Chief Complaint</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Veterinarian</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No medical records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {rec.record_number}
                      </TableCell>
                      <TableCell className="text-sm">
                        {rec.visit_date
                          ? format(new Date(rec.visit_date), "MMM dd, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{rec.pets?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {rec.pets?.species ?? ""}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {rec.chief_complaint || "—"}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">
                        {rec.diagnosis ? (
                          <Badge variant="outline" className="text-xs font-normal">
                            {rec.diagnosis}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Pending</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {rec.veterinarian
                          ? `Dr. ${rec.veterinarian.first_name} ${rec.veterinarian.last_name}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" onClick={() => openEdit(rec)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Record</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" asChild>
                                <Link href={`/veterinarian/medical-records/${rec.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Record</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {paginated.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No medical records found.
            </div>
          ) : (
            paginated.map((rec) => (
              <Card key={rec.id} className="hover:bg-accent/30 transition-colors">
                <CardContent className="py-4 px-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{rec.pets?.name ?? "Unknown Pet"}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          ({rec.pets?.species ?? ""})
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          #{rec.record_number}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {rec.chief_complaint || "No chief complaint recorded"}
                      </div>
                      {rec.diagnosis && (
                        <Badge variant="outline" className="mt-1 text-xs font-normal">
                          {rec.diagnosis}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    <span className="text-xs text-muted-foreground">
                      {rec.visit_date
                        ? format(new Date(rec.visit_date), "MMM dd, yyyy")
                        : "—"}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEdit(rec)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/veterinarian/medical-records/${rec.id}`}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {safePage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Medical Record Dialog */}
      <Dialog open={!!editRec} onOpenChange={(open) => !open && setEditRec(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Medical Record <span className="font-mono text-sm text-muted-foreground">#{editRec?.record_number}</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Chief Complaint</Label>
              <Input value={editForm.chief_complaint}
                onChange={e => setEditForm(f => ({ ...f, chief_complaint: e.target.value }))}
                placeholder="Primary reason for visit" />
            </div>
            <div className="space-y-1">
              <Label>Diagnosis</Label>
              <Input value={editForm.diagnosis}
                onChange={e => setEditForm(f => ({ ...f, diagnosis: e.target.value }))}
                placeholder="Clinical diagnosis" />
            </div>
            <div className="space-y-1">
              <Label>Treatment Plan</Label>
              <Textarea value={editForm.treatment_plan}
                onChange={e => setEditForm(f => ({ ...f, treatment_plan: e.target.value }))}
                placeholder="Treatment notes and plan"
                className="min-h-24" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRec(null)} disabled={editSaving}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
