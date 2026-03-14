'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/auth-client';
import useSWR, { mutate } from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Syringe, Calendar, ShieldCheck, Search, AlertCircle, Check, ChevronLeft, ChevronRight, AlertTriangle, Clock } from 'lucide-react';
import { format, addYears, addMonths, addDays } from 'date-fns';

function BoosterTab({ history, isLoading }: { history: any[]; isLoading: boolean }) {
  const today = new Date();
  const in30Days = addDays(today, 30);

  const overdue = history.filter((r: any) => r.next_due_date && new Date(r.next_due_date) < today);
  const upcoming = history.filter((r: any) => {
    if (!r.next_due_date) return false;
    const d = new Date(r.next_due_date);
    return d >= today && d <= in30Days;
  });

  const Row = ({ rec, badge }: { rec: any; badge: React.ReactNode }) => (
    <div className="grid grid-cols-12 gap-4 p-4 text-sm items-center hover:bg-muted/40 border-b last:border-0 transition-colors">
      <div className="col-span-3">
        <div className="font-bold text-foreground">{rec.pets?.name}</div>
        <div className="text-xs text-muted-foreground capitalize">{rec.pets?.species}</div>
      </div>
      <div className="col-span-3">
        <span className="font-medium">{rec.vaccine_name}</span>
        {rec.batch_number && <div className="text-[10px] text-muted-foreground">Lot: {rec.batch_number}</div>}
      </div>
      <div className="col-span-3 text-muted-foreground">
        Last given: {format(new Date(rec.administered_date), 'MMM dd, yyyy')}
      </div>
      <div className="col-span-2">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          overdue.includes(rec) ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
        }`}>
          {format(new Date(rec.next_due_date), 'MMM dd, yyyy')}
        </span>
      </div>
      <div className="col-span-1 flex justify-end">{badge}</div>
    </div>
  );

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (overdue.length === 0 && upcoming.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/40">
        <ShieldCheck size={48} className="mx-auto mb-4 opacity-40" />
        <h3 className="text-lg font-bold">All caught up!</h3>
        <p className="text-sm mt-1">No pets are overdue or due within the next 30 days.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <div className="rounded-md border border-red-200 dark:border-red-800 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700 dark:text-red-400">Overdue — {overdue.length} record{overdue.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/40 border-b">
            <div className="col-span-3">Patient</div><div className="col-span-3">Vaccine</div>
            <div className="col-span-3">Last Given</div><div className="col-span-2">Due Date</div><div className="col-span-1" />
          </div>
          {overdue.map((rec: any) => (
            <Row key={rec.id} rec={rec} badge={<AlertTriangle className="h-4 w-4 text-red-500" />} />
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="rounded-md border border-amber-200 dark:border-amber-800 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Due within 30 days — {upcoming.length} record{upcoming.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/40 border-b">
            <div className="col-span-3">Patient</div><div className="col-span-3">Vaccine</div>
            <div className="col-span-3">Last Given</div><div className="col-span-2">Due Date</div><div className="col-span-1" />
          </div>
          {upcoming.map((rec: any) => (
            <Row key={rec.id} rec={rec} badge={<Clock className="h-4 w-4 text-amber-500" />} />
          ))}
        </div>
      )}
    </div>
  );
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function VaccinationsPage() {
  const { data = {}, isLoading } = useSWR('/api/veterinarian/vaccinations', fetcher);

  const history = data?.history || [];
  const petsList = data?.pets || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // filtered history by search, then paginated
  const itemsPerPage = 20;
  const filteredHistory = useMemo(() =>
    history.filter((rec: any) =>
      rec.pets?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.vaccine_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [history, searchTerm]
  );
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedHistory = filteredHistory.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage,
  );

  // Form State
  const [formData, setFormData] = useState({
    pet_id: '',
    vaccine_name: '',
    vaccine_type: 'Core', // Core or Non-Core
    batch_number: '',
    administered_date: new Date().toISOString().split('T')[0],
    next_due_date: format(addYears(new Date(), 1), 'yyyy-MM-dd'), // Default to 1 year later
    notes: ''
  });

  // Handle Form Submit
  const handleLogVaccine = async () => {
    if (!formData.pet_id || !formData.vaccine_name) return;
    setIsSaving(true);

    try {
      const response = await fetch('/api/veterinarian/vaccinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
      });
      
      const result = await response.json();

      if(!response.ok){
        throw new Error(result.error || 'Failed to log vaccination');
      }
      
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSaving(false);
      mutate('/api/veterinarian/vaccinations');
    }
  };
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Syringe className="text-green-600 h-8 w-8" /> Immunizations
          </h1>
          <p className="text-muted-foreground">Track vaccines and schedule boosters</p>
        </div>

        {/* --- ADD NEW VACCINE DIALOG --- */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 gap-2">
              <Syringe size={18} /> Log Vaccination
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Log New Vaccination</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              
              <div className="space-y-2">
                <Label>Select Patient</Label>
                <Select 
                  onValueChange={(val) => setFormData({...formData, pet_id: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Search for a pet..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {petsList.map((pet: any) => (
                      <SelectItem key={pet.id} value={pet.id}>
                        {pet.name} ({pet.species}) - {pet.client_profiles?.[0]?.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label>Vaccine Name</Label>
                   <Input 
                     placeholder="e.g. Rabies, DHPP" 
                     value={formData.vaccine_name}
                     onChange={e => setFormData({...formData, vaccine_name: e.target.value})}
                   />
                </div>
                <div className="space-y-2">
                   <Label>Type</Label>
                   <Select 
                     defaultValue="Core"
                     onValueChange={(val) => setFormData({...formData, vaccine_type: val})}
                   >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Core">Core (Essential)</SelectItem>
                      <SelectItem value="Non-Core">Non-Core (Lifestyle)</SelectItem>
                    </SelectContent>
                   </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Batch / Lot Number</Label>
                <Input 
                  placeholder="Lot #12345" 
                  value={formData.batch_number}
                  onChange={e => setFormData({...formData, batch_number: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label>Date Administered</Label>
                   <Input type="date" 
                     value={formData.administered_date}
                     onChange={e => setFormData({...formData, administered_date: e.target.value})}
                   />
                </div>
                <div className="space-y-2">
                   <Label className="text-green-600 font-semibold">Next Due Date</Label>
                   <Input type="date"
                     className="border-green-500/40 focus-visible:ring-green-500/40"
                     value={formData.next_due_date}
                     onChange={e => setFormData({...formData, next_due_date: e.target.value})}
                   />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes / Side Effects</Label>
                <Input 
                   placeholder="e.g. Mild swelling at injection site"
                   value={formData.notes}
                   onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>

            </div>
            <DialogFooter>
              <Button disabled={isSaving} onClick={handleLogVaccine} className="bg-green-600">
                {isSaving ? 'Saving...' : 'Save Record'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="history">Recent History</TabsTrigger>
          <TabsTrigger value="due">Due for Boosters</TabsTrigger>
        </TabsList>

        {/* --- TAB 1: HISTORY --- */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Vaccination Log</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search pet or vaccine..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
              </div>
            </CardHeader>
            <CardContent>
              {/* 1. Check isLoading first */}
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading records...</div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/40">
                  No vaccination records found.
                </div>
              ) : (
                <>
                <div className="rounded-md border">
                  <div className="grid grid-cols-12 gap-4 p-4 font-medium text-sm bg-muted/40 border-b text-muted-foreground">
                    <div className="col-span-3">Patient</div>
                    <div className="col-span-3">Vaccine</div>
                    <div className="col-span-3">Date Given</div>
                    <div className="col-span-3">Next Due</div>
                  </div>
                  {paginatedHistory.map((rec: any) => (
                    <div key={rec.id} className="grid grid-cols-12 gap-4 p-4 text-sm items-center hover:bg-muted/40 border-b last:border-0 transition-colors">
                      <div className="col-span-3">
                        <div className="font-bold text-foreground">{rec.pets?.name}</div>
                        <div className="text-xs text-muted-foreground">{rec.pets?.species}</div>
                      </div>
                      <div className="col-span-3">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {rec.vaccine_name}
                        </Badge>
                        {rec.batch_number && (
                          <div className="text-[10px] text-muted-foreground mt-1">Lot: {rec.batch_number}</div>
                        )}
                      </div>
                      <div className="col-span-3 text-muted-foreground">
                        {format(new Date(rec.administered_date), 'MMM dd, yyyy')}
                      </div>
                      <div className="col-span-3 flex items-center gap-2">
                        {rec.next_due_date ? (
                          <span className="text-green-700 bg-green-500/10 px-2 py-1 rounded text-xs font-medium">
                            {format(new Date(rec.next_due_date), 'MMM dd, yyyy')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">N/A</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {/* pagination controls */}
                {filteredHistory.length > itemsPerPage && (
                  <div className="flex items-center justify-between pt-3 border-t mt-2">
                    <p className="text-sm text-muted-foreground">
                      Showing {(safePage - 1) * itemsPerPage + 1}–{Math.min(safePage * itemsPerPage, filteredHistory.length)} of {filteredHistory.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium px-2">{safePage} / {totalPages}</span>
                      <Button variant="outline" size="icon" disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 2: DUE FOR BOOSTERS --- */}
        <TabsContent value="due">
          <BoosterTab history={history} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}