"use client";

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/auth-client';
import useSWR, { mutate } from 'swr';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search, Pill, Printer, LayoutList, TableIcon, ChevronLeft, ChevronRight,
  Pencil, CheckCircle2, Loader2,
} from 'lucide-react';
import IssuePrescription from '@/components/veterinarian/prescriptions/issue-prescriptions';
import PrintPrescription from '@/components/veterinarian/prescriptions/print-prescription';

async function authedFetch(path: string, init?: RequestInit) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  return fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}

// items shown per page per view mode
const itemsList = 20;
const itemsTable = 20;

const fetcher = (url: string) => fetch(url).then(res => res.json());

function StatusBadge({ dispensedDate }: { dispensedDate: string | null }) {
  return (
    <Badge
      variant={dispensedDate ? 'default' : 'secondary'}
      className={`text-xs ${dispensedDate ? 'bg-green-600 hover:bg-green-600' : 'bg-amber-500 hover:bg-amber-500'}`}
    >
      {dispensedDate ? 'Dispensed' : 'Pending'}
    </Badge>
  );
}

export default function PrescriptionsPage() {
  const { data: prescriptions = [], isLoading } = useSWR(
    "/api/veterinarian/prescriptions",
    fetcher,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  const [page, setPage] = useState(1);
  const [selectedRx, setSelectedRx] = useState<any>(null);
  const [editRx, setEditRx] = useState<any>(null);
  const [editForm, setEditForm] = useState({ medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [dispensing, setDispensing] = useState<string | null>(null);

  const openEdit = (rx: any) => {
    setEditRx(rx);
    setEditForm({
      medication_name: rx.medication_name ?? '',
      dosage: rx.dosage ?? '',
      frequency: rx.frequency ?? '',
      duration: rx.duration ?? '',
      instructions: rx.instructions ?? '',
    });
  };

  const handleEditSave = async () => {
    if (!editRx) return;
    setEditSaving(true);
    try {
      const res = await authedFetch('/api/veterinarian/prescriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editRx.id, ...editForm }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditRx(null);
      mutate('/api/veterinarian/prescriptions');
    } catch (err) {
      console.error('[Prescriptions] edit error', err);
    } finally {
      setEditSaving(false);
    }
  };

  const handleMarkDispensed = async (rxId: string) => {
    setDispensing(rxId);
    try {
      const res = await authedFetch('/api/veterinarian/prescriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rxId, mark_dispensed: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      mutate('/api/veterinarian/prescriptions');
    } catch (err) {
      console.error('[Prescriptions] dispense error', err);
    } finally {
      setDispensing(null);
    }
  };

  const resetPage = () => setPage(1);
  const itemsPerPage = viewMode === 'list' ? itemsList : itemsTable;

  const filteredList = useMemo(() => {
    if (!Array.isArray(prescriptions)) return [];
    return prescriptions.filter((rx: any) => {
      const petName = rx.pets?.name || '';
      const ownerName = rx.pets?.owners
        ? `${rx.pets.owners.first_name} ${rx.pets.owners.last_name}`.trim()
        : '';
      const term = searchTerm.toLowerCase();
      return (
        rx.medication_name?.toLowerCase().includes(term) ||
        petName.toLowerCase().includes(term) ||
        ownerName.toLowerCase().includes(term)
      );
    });
  }, [prescriptions, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filteredList.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage,
  );

  const Pagination = () => {
    if (filteredList.length <= itemsPerPage) return null;
    return (
      <div className="flex items-center justify-between pt-3 border-t">
        <p className="text-sm text-muted-foreground">
          Showing {(safePage - 1) * itemsPerPage + 1}–
          {Math.min(safePage * itemsPerPage, filteredList.length)} of {filteredList.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={safePage === 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2">{safePage} / {totalPages}</span>
          <Button
            variant="outline"
            size="icon"
            disabled={safePage >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prescriptions</h1>
          <p className="text-sm text-muted-foreground">Manage and issue medical prescriptions</p>
        </div>
        <IssuePrescription
          onPrescriptionIssued={() => mutate("prescriptions-list")}
        />
      </div>

      {/* Search + View toggle */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by medication, pet name, or owner..."
            className="pl-10 h-9"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); resetPage(); }}
          />
        </div>

        {/* View toggle */}
        <div className="flex border border-border rounded-md overflow-hidden h-9 shrink-0">
          <button
            className={`px-3 flex items-center gap-1.5 text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted text-foreground'
            }`}
            onClick={() => { setViewMode('list'); resetPage(); }}
          >
            <LayoutList className="h-4 w-4" />
            List
          </button>
          <button
            className={`px-3 flex items-center gap-1.5 text-sm font-medium border-l border-border transition-colors ${
              viewMode === 'table'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted text-foreground'
            }`}
            onClick={() => { setViewMode('table'); resetPage(); }}
          >
            <TableIcon className="h-4 w-4" />
            Table
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Loading prescriptions...</div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-10 bg-muted/50 rounded-lg border border-dashed">
          <Pill className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
          <h3 className="text-base font-medium">No prescriptions found</h3>
          <p className="text-sm text-muted-foreground">Issue a new prescription to see it here.</p>
        </div>
      ) : viewMode === 'list' ? (

        /* ── LIST VIEW ── */
        <div className="space-y-2">
          {paginated.map((rx: any) => (
            <Card key={rx.id} className="hover:border-primary/50 transition-all">
              <CardContent className="px-4 py-3 flex items-center gap-4">

                {/* Icon */}
                <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Pill size={16} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{rx.medication_name}</span>
                    <span className="text-xs text-muted-foreground">({rx.dosage})</span>
                    <StatusBadge dispensedDate={rx.dispensed_date} />
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0 text-xs text-muted-foreground mt-0.5">
                    <span><span className="text-foreground font-medium">{rx.pets?.name || '—'}</span> · Patient</span>
                    <span>{rx.pets?.species || '—'}</span>
                    <span>
                      {rx.pets?.owners
                        ? `${rx.pets.owners.first_name} ${rx.pets.owners.last_name}`
                        : '—'} · Owner
                    </span>
                    <span>{rx.frequency} for {rx.duration}</span>
                  </div>
                </div>

                {/* Date + Print */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">
                      {new Date(rx.created_at).toLocaleDateString()}
                    </p>
                    {rx.dispensed_date && (
                      <p className="text-xs text-muted-foreground">
                        Dispensed {new Date(rx.dispensed_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!rx.dispensed_date && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0"
                            disabled={dispensing === rx.id}
                            onClick={() => handleMarkDispensed(rx.id)}>
                            {dispensing === rx.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} className="text-green-600" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Mark as Dispensed</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEdit(rx)}>
                          <Pencil size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit Prescription</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedRx(rx)}>
                          <Printer size={15} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Print Prescription</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Pagination />
        </div>

      ) : (

        /* ── TABLE VIEW ── */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Species</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Sig</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="text-right">Print</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((rx: any) => (
                  <TableRow key={rx.id} className="hover:bg-muted/40">
                    <TableCell className="font-semibold text-sm">{rx.medication_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{rx.dosage || '—'}</TableCell>
                    <TableCell className="text-sm">{rx.pets?.name || '—'}</TableCell>
                    <TableCell className="text-sm capitalize">{rx.pets?.species || '—'}</TableCell>
                    <TableCell className="text-sm">
                      {rx.pets?.owners
                        ? `${rx.pets.owners.first_name} ${rx.pets.owners.last_name}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {rx.frequency} · {rx.duration}
                    </TableCell>
                    <TableCell>
                      <StatusBadge dispensedDate={rx.dispensed_date} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(rx.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!rx.dispensed_date && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" className="h-8 w-8"
                                disabled={dispensing === rx.id} onClick={() => handleMarkDispensed(rx.id)}>
                                {dispensing === rx.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} className="text-green-600" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Mark as Dispensed</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(rx)}>
                              <Pencil size={14} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Prescription</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedRx(rx)}>
                              <Printer size={15} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Print Prescription</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 pb-4">
              <Pagination />
            </div>
          </CardContent>
        </Card>
      )}

      <PrintPrescription
        rx={selectedRx}
        open={!!selectedRx}
        onOpenChange={(open: boolean) => !open && setSelectedRx(null)}
      />

      {/* Edit Prescription Dialog */}
      <Dialog open={!!editRx} onOpenChange={(open) => !open && setEditRx(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Prescription</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Medication Name</Label>
              <Input value={editForm.medication_name} onChange={e => setEditForm(f => ({ ...f, medication_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Dosage</Label>
                <Input value={editForm.dosage} onChange={e => setEditForm(f => ({ ...f, dosage: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Frequency</Label>
                <Input value={editForm.frequency} onChange={e => setEditForm(f => ({ ...f, frequency: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Duration</Label>
              <Input value={editForm.duration} onChange={e => setEditForm(f => ({ ...f, duration: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Instructions</Label>
              <Input value={editForm.instructions} onChange={e => setEditForm(f => ({ ...f, instructions: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRx(null)} disabled={editSaving}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
