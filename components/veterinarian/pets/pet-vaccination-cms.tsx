'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/auth-client';
import { format, addYears } from 'date-fns';
import { Plus, Pencil, Trash2, Syringe, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CORE_ESSENTIAL_VACCINES, getCoreVaccineByName, type CoreVaccine } from '@/lib/core-vaccines';

interface VaccinationRecord {
  id: string;
  pet_id: string;
  vaccine_name: string;
  vaccine_type: 'Core' | 'Non-Core';
  batch_number?: string;
  administered_date: string;
  next_due_date?: string;
  side_effects_noted?: string;
}

const EMPTY_FORM = {
  vaccine_name: '',
  vaccine_type: 'Core' as 'Core' | 'Non-Core',
  batch_number: '',
  administered_date: new Date().toISOString().split('T')[0],
  next_due_date: format(addYears(new Date(), 1), 'yyyy-MM-dd'),
  notes: '',
};

async function authedFetch(path: string, init?: RequestInit) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  return fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}

export function PetVaccinationCMS({ petId }: { petId: string }) {
  const [records, setRecords] = useState<VaccinationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<VaccinationRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VaccinationRecord | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [selectedCoreVaccine, setSelectedCoreVaccine] = useState<CoreVaccine | null>(null);
  const [seriesDates, setSeriesDates] = useState<string[]>([]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authedFetch(`/api/veterinarian/vaccinations?pet_id=${petId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecords(data.history ?? []);
    } catch (err) {
      console.error('[PetVaccinationCMS]', err);
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function openAdd() {
    setEditRecord(null);
    setForm(EMPTY_FORM);
    setError('');
    setSelectedCoreVaccine(null);
    setSeriesDates([]);
    setFormOpen(true);
  }

  function openEdit(rec: VaccinationRecord) {
    setEditRecord(rec);
    setForm({
      vaccine_name: rec.vaccine_name,
      vaccine_type: rec.vaccine_type,
      batch_number: rec.batch_number ?? '',
      administered_date: rec.administered_date,
      next_due_date: rec.next_due_date ?? '',
      notes: rec.side_effects_noted ?? '',
    });
    // Restore series state if editing a core vaccine
    const coreVaccine = rec.vaccine_type === 'Core' ? getCoreVaccineByName(rec.vaccine_name) : undefined;
    setSelectedCoreVaccine(coreVaccine ?? null);
    setSeriesDates(coreVaccine ? Array(coreVaccine.doseLabels.length).fill('') : []);
    setError('');
    setFormOpen(true);
  }

  function handleVaccineTypeChange(val: string) {
    setForm(f => ({ ...f, vaccine_type: val as 'Core' | 'Non-Core', vaccine_name: '' }));
    setSelectedCoreVaccine(null);
    setSeriesDates([]);
    setError('');
  }

  function handleCoreVaccineSelect(name: string) {
    const vaccine = getCoreVaccineByName(name);
    setSelectedCoreVaccine(vaccine ?? null);
    setForm(f => ({ ...f, vaccine_name: name }));
    setSeriesDates(vaccine ? Array(vaccine.doseLabels.length).fill('') : []);
    setError('');
  }

  function handleSeriesDateChange(index: number, value: string) {
    setSeriesDates(prev => prev.map((d, i) => (i === index ? value : d)));
  }

  async function handleSubmit() {
    if (!form.vaccine_name.trim()) { setError('Vaccine name is required.'); return; }
    if (!form.administered_date) { setError('Administered date is required.'); return; }

    // Validate all series dates when a core vaccine is selected (add mode)
    if (!editRecord && selectedCoreVaccine) {
      const emptyIndex = seriesDates.findIndex(d => !d);
      if (emptyIndex !== -1) {
        setError(`"${selectedCoreVaccine.doseLabels[emptyIndex]}" is required.`);
        return;
      }
    }

    // Build next_due_date and encode full series schedule into notes
    let nextDueDate = form.next_due_date;
    let combinedNotes = form.notes;

    if (!editRecord && selectedCoreVaccine && seriesDates.length > 0) {
      nextDueDate = seriesDates[0];
      if (seriesDates.length > 1) {
        const scheduleLines = seriesDates
          .slice(1)
          .map((d, i) => `${selectedCoreVaccine.doseLabels[i + 1]}: ${format(new Date(d), 'MMM d, yyyy')}`)
          .join(', ');
        const seriesNote = `[Series: ${selectedCoreVaccine.doseLabels[0]}: ${format(new Date(seriesDates[0]), 'MMM d, yyyy')}, ${scheduleLines}]`;
        combinedNotes = [seriesNote, form.notes].filter(Boolean).join(' ');
      }
    }

    setSaving(true); setError('');
    try {
      const isEdit = Boolean(editRecord);
      const payload = { ...form, next_due_date: nextDueDate, notes: combinedNotes };
      const body = isEdit ? { id: editRecord!.id, ...payload } : { pet_id: petId, ...payload };
      const res = await authedFetch('/api/veterinarian/vaccinations', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      setFormOpen(false);
      await fetchRecords();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await authedFetch('/api/veterinarian/vaccinations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDeleteOpen(false);
      setDeleteTarget(null);
      await fetchRecords();
    } catch (err) {
      console.error('[PetVaccinationCMS] delete error', err);
    } finally {
      setDeleting(false);
    }
  }

  const isOverdue = (d?: string) => d ? new Date(d) <= new Date() : false;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{records.length} record{records.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Log Vaccination
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
          <Syringe className="h-8 w-8" />
          <p className="text-sm">No vaccination records yet.</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vaccine</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Batch #</TableHead>
                <TableHead>Date Given</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="font-medium">{rec.vaccine_name}</TableCell>
                  <TableCell>
                    <Badge variant={rec.vaccine_type === 'Core' ? 'default' : 'secondary'}>{rec.vaccine_type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{rec.batch_number || '—'}</TableCell>
                  <TableCell className="text-sm">{rec.administered_date ? format(new Date(rec.administered_date), 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell className="text-sm">
                    {rec.next_due_date ? (
                      <span className={isOverdue(rec.next_due_date) ? 'text-red-600 font-medium' : ''}>
                        {format(new Date(rec.next_due_date), 'MMM d, yyyy')}
                        {isOverdue(rec.next_due_date) && <AlertTriangle className="inline h-3 w-3 ml-1 text-red-500" />}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{rec.side_effects_noted || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(rec)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => { setDeleteTarget(rec); setDeleteOpen(true); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRecord ? 'Edit Vaccination Record' : 'Log Vaccination'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">

            {/* Vaccine Type */}
            <div className="space-y-1">
              <Label>Vaccine Type</Label>
              <Select value={form.vaccine_type} onValueChange={handleVaccineTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Core">Core (Essential)</SelectItem>
                  <SelectItem value="Non-Core">Non-Core (Lifestyle)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Vaccine Name — dropdown for Core, free text for Non-Core */}
            <div className="space-y-1">
              <Label>Vaccine Name <span className="text-destructive">*</span></Label>
              {form.vaccine_type === 'Core' ? (
                <Select value={form.vaccine_name} onValueChange={handleCoreVaccineSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a core vaccine…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CORE_ESSENTIAL_VACCINES.map(v => (
                      <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder="e.g. Bordetella, Lyme" value={form.vaccine_name}
                  onChange={(e) => setForm(f => ({ ...f, vaccine_name: e.target.value }))} />
              )}
            </div>

            {/* Batch / Lot */}
            <div className="space-y-1">
              <Label>Batch / Lot Number</Label>
              <Input placeholder="Optional" value={form.batch_number}
                onChange={(e) => setForm(f => ({ ...f, batch_number: e.target.value }))} />
            </div>

            {/* Date Administered */}
            <div className="space-y-1">
              <Label>
                {selectedCoreVaccine && !editRecord ? '1st Dose Date (Administered Today)' : 'Date Administered'}
                <span className="text-destructive"> *</span>
              </Label>
              <Input type="date" value={form.administered_date}
                onChange={(e) => setForm(f => ({ ...f, administered_date: e.target.value }))} />
            </div>

            {/* Series due dates — Core Essential new records only */}
            {selectedCoreVaccine && !editRecord ? (
              <div className="space-y-3 rounded-md border border-green-500/30 bg-green-500/5 p-3">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
                  Series Schedule — {selectedCoreVaccine.totalDoses} doses total
                </p>
                {selectedCoreVaccine.doseLabels.map((label, i) => (
                  <div key={i} className="space-y-1">
                    <Label className="text-sm">
                      {label} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="date"
                      className="border-green-500/40 focus-visible:ring-green-500/40"
                      value={seriesDates[i] ?? ''}
                      onChange={e => handleSeriesDateChange(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* Single next due date for Non-Core or edit mode */
              <div className="space-y-1">
                <Label>Next Due Date</Label>
                <Input type="date" value={form.next_due_date}
                  onChange={(e) => setForm(f => ({ ...f, next_due_date: e.target.value }))} />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <Label>Notes / Side Effects</Label>
              <Input placeholder="Optional" value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editRecord ? 'Save Changes' : 'Log Vaccination'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Vaccination Record?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Permanently delete the <span className="font-medium text-foreground">{deleteTarget?.vaccine_name}</span> record
            administered on {deleteTarget?.administered_date ? format(new Date(deleteTarget.administered_date), 'MMM d, yyyy') : ''}. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
