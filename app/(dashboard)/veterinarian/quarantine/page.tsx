'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/auth-client';
import useSWR, { mutate } from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  ShieldAlert, Search, Clock, AlertTriangle, CheckCircle2, Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { Fetcher } from '@/lib/fetcher';
import { Pet } from '@/types/pets';

type PetsResponse = {
  pets: Pet[];
}

interface QuarantineRecord {
  id: string;
  pet_id: string;
  reason: string;
  start_date: string;
  expected_end_date: string | null;
  status: 'active' | 'released' | 'extended';
  notes: string | null;
  created_at: string;
  pets: {
    id: string;
    name: string;
    species: string;
    breed: string;
    gender: string;
    client_profiles: {
      first_name: string;
      last_name: string;
    } | null;
  };
}

export default function QuarantinePage() {
  // Fetch quarantined pets
  const { data: quarantineRecords = [], error, isLoading } = useSWR<QuarantineRecord[]>(
    '/api/veterinarian/quarantine',
    Fetcher
  );

  // Fetch all pets for adding new quarantine
  useEffect(() => {
    const fetchPets = async () => {
      const { data, error: petsError } = await supabase
        .from('pets')
        .select(`
          id,
          name,
          species,
          breed,
          gender,
          client_profiles(
            id,
            first_name,
            last_name
            )
          `)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (petsError) {
        console.error('Error fetching all pets:', petsError);
      } else {
        setAllPets(data || []);
      }
    };

    fetchPets();
  }, []);

  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [allPets, setAllPets] = useState<any[]>([]);

  const safeRecords = Array.isArray(quarantineRecords) ? quarantineRecords : [];

  // New quarantine form state
  const [form, setForm] = useState({
    pet_id: '',
    reason: '',
    start_date: new Date().toISOString().split('T')[0],
    expected_end_date: '',
    notes: '',
  });

  // FIXED: Added an explicit check to exclude 'released' records from the active list
  const filteredRecords = safeRecords.filter((r: any) =>
    r.status !== 'released' && 
    (r.pets?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reason?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddQuarantine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pet_id) return;
    setIsSaving(true);

    try {
      const response = await fetch('/api/veterinarian/quarantine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add quarantine record');
      }

      mutate('/api/veterinarian/quarantine');
      setShowAddForm(false);
      setForm({
        pet_id: '', reason: '', start_date: new Date().toISOString().split('T')[0],
        expected_end_date: '', notes: ''
      });
    } catch (error: any) {
      alert('Error adding quarantine record: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRelease = async (recordId: string) => {
    // Optimistic UI update: immediately mark as released
    mutate('/api/veterinarian/quarantine', safeRecords.map(r => r.id === recordId ? { ...r, status: 'released' } : r), false);
    setSelectedRecord(null);
    try {
      const response = await fetch('/api/veterinarian/quarantine', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: recordId,
          status: 'released',
          end_date: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to release from quarantine');
      }

      // Final revalidation from the server
      mutate('/api/veterinarian/quarantine');
    } catch (error: any) {
      alert('Error releasing from quarantine: ' + error.message);
      // Revert optimistic update on error
      mutate('/api/veterinarian/quarantine');
    }
  };

  const getDaysInQuarantine = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quarantine</h1>
          <p className="text-muted-foreground">Manage quarantined patients and isolation protocols</p>
        </div>
        <Button onClick={() => { setShowAddForm(true); setSelectedRecord(null); }}>
          <Plus size={16} className="mr-2" /> Add Quarantine
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 h-full overflow-hidden">

        {/* --- LEFT: QUARANTINE LIST --- */}
        <div className="md:col-span-4 lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert size={18} className="text-destructive" /> Active ({filteredRecords.length})
          </h2>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading records...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-6 text-center border border-dashed rounded-lg bg-muted/50 text-muted-foreground">
              No quarantined patients.
            </div>
          ) : (
            filteredRecords.map((record: any) => (
              <div
                key={record.id}
                onClick={() => { setSelectedRecord(record); setShowAddForm(false); }}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  selectedRecord?.id === record.id
                    ? 'bg-destructive/10 border-destructive ring-1 ring-destructive'
                    : 'bg-card border-border hover:border-destructive/40'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-foreground">{record.pets?.name}</span>
                  <Badge
                    variant={record.status === 'extended' ? 'destructive' : 'secondary'}
                    className="text-[10px]"
                  >
                    {record.status === 'extended' ? 'Extended' : 'Active'}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-1">
                  {record.pets?.species} • {record.pets?.breed}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={12} /> Day {getDaysInQuarantine(record.start_date)}
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {record.reason}
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- RIGHT: DETAIL / ADD FORM --- */}
        <div className="md:col-span-8 lg:col-span-8 overflow-y-auto">
          {showAddForm ? (
            <Card className="border-t-4 border-t-primary">
              <CardHeader className="bg-muted/50 pb-4 border-b">
                <CardTitle className="text-xl">New Quarantine Record</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleAddQuarantine} className="space-y-6">
                  <div className="space-y-2">
                    <Label>Select Pet</Label>
                    <Select value={form.pet_id} onValueChange={(val) => setForm({...form, pet_id: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a pet..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allPets.map((pet: any) => (
                          <SelectItem key={pet.id} value={pet.id}>
                            {pet.name} — {pet.species} ({pet.client_profiles?.first_name} {pet.client_profiles?.last_name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Reason for Quarantine</Label>
                    <Textarea
                      placeholder="e.g. Suspected parvovirus, post-surgery isolation..."
                      value={form.reason}
                      onChange={(e) => setForm({...form, reason: e.target.value})}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={form.start_date}
                        onChange={(e) => setForm({...form, start_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expected End Date</Label>
                      <Input
                        type="date"
                        value={form.expected_end_date}
                        onChange={(e) => setForm({...form, expected_end_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea
                      placeholder="Special instructions, medications, monitoring requirements..."
                      value={form.notes}
                      onChange={(e) => setForm({...form, notes: e.target.value})}
                      className="min-h-[60px]"
                    />
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSaving} className="min-w-[160px]">
                      {isSaving ? 'Saving...' : 'Add to Quarantine'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : selectedRecord ? (
            <div className="space-y-6">
              {/* Patient Detail Card */}
              <Card className="bg-destructive/5 border-destructive/30">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{selectedRecord.pets?.name}</h2>
                      <p className="text-muted-foreground text-sm">
                        {selectedRecord.pets?.breed} • {selectedRecord.pets?.gender}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Owner: {selectedRecord.pets?.client_profiles?.first_name} {selectedRecord.pets?.client_profiles?.last_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="mb-2">
                        <ShieldAlert size={12} className="mr-1" /> Quarantined
                      </Badge>
                      <p className="text-sm font-semibold text-foreground">
                        Day {getDaysInQuarantine(selectedRecord.start_date)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quarantine Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle size={18} className="text-destructive" /> Quarantine Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Start Date</p>
                      <p className="font-semibold">{format(new Date(selectedRecord.start_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Expected End</p>
                      <p className="font-semibold">
                        {selectedRecord.expected_end_date
                          ? format(new Date(selectedRecord.expected_end_date), 'MMM dd, yyyy')
                          : 'TBD'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase mb-1">Reason</p>
                    <p className="text-foreground">{selectedRecord.reason}</p>
                  </div>

                  {selectedRecord.notes && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Notes</p>
                      <p className="text-foreground">{selectedRecord.notes}</p>
                    </div>
                  )}

                  <div className="pt-4 flex justify-end gap-3 border-t">
                    <Button
                      variant="outline"
                      onClick={() => handleRelease(selectedRecord.id)}
                      className="text-primary border-primary hover:bg-primary/10"
                    >
                      <CheckCircle2 size={16} className="mr-2" /> Release from Quarantine
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/30">
              <ShieldAlert size={48} className="mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">No Record Selected</h3>
              <p>Select a quarantine record or add a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}