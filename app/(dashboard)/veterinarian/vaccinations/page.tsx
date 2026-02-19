'use client';

import { useState, useEffect } from 'react';
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
import { Syringe, Calendar, ShieldCheck, Search, AlertCircle, Check } from 'lucide-react';
import { format, addYears, addMonths } from 'date-fns';
import { create } from 'domain';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function VaccinationsPage() {
  const { data = {}, isLoading } = useSWR('/api/vaccinations', fetcher);

  const history = data?.history || [];
  const petsList = data?.pets || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
      const response = await fetch('/api/vaccinations', {
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
      mutate('api/vaccinations');
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
                   <Label className="text-green-700 font-semibold">Next Due Date</Label>
                   <Input type="date" 
                     className="bg-green-50 border-green-200"
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
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search pet or vaccine..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {/* 1. Check isLoading first */}
              {isLoading ? (
                <div className="p-8 text-center text-gray-400">Loading records...</div>
              ) : history.length === 0 ? (
                /* 2. Then check if list is empty */
                <div className="p-8 text-center text-gray-400 border border-dashed rounded-lg bg-gray-50">
                  No vaccination records found.
                </div>
              ) : (
                /* 3. Finally, render the list */
                <div className="rounded-md border">
                  <div className="grid grid-cols-12 gap-4 p-4 font-medium text-sm bg-gray-50 border-b text-gray-600">
                    <div className="col-span-3">Patient</div>
                    <div className="col-span-3">Vaccine</div>
                    <div className="col-span-3">Date Given</div>
                    <div className="col-span-3">Next Due</div>
                  </div>
                  {history.map((rec: any) => (
                    <div key={rec.id} className="grid grid-cols-12 gap-4 p-4 text-sm items-center hover:bg-gray-50 border-b last:border-0 transition-colors">
                      <div className="col-span-3">
                        <div className="font-bold text-gray-800">{rec.pets?.name}</div>
                        <div className="text-xs text-gray-500">{rec.pets?.species}</div>
                      </div>
                      <div className="col-span-3">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {rec.vaccine_name}
                        </Badge>
                        {rec.batch_number && (
                          <div className="text-[10px] text-gray-400 mt-1">Lot: {rec.batch_number}</div>
                        )}
                      </div>
                      <div className="col-span-3 text-gray-600">
                        {format(new Date(rec.administered_date), 'MMM dd, yyyy')}
                      </div>
                      <div className="col-span-3 flex items-center gap-2">
                        {rec.next_due_date ? (
                          <span className="text-green-700 bg-green-50 px-2 py-1 rounded text-xs font-medium">
                            {format(new Date(rec.next_due_date), 'MMM dd, yyyy')}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 2: DUE SOON (Simplified Placeholder) --- */}
        <TabsContent value="due">
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-12 text-center text-orange-800">
              <ShieldCheck size={48} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold">Booster Reminders</h3>
              <p className="text-sm opacity-80 mt-2">
                This feature will show all pets who are due for shots in the next 30 days.
                <br/>(Requires backend logic to filter by `next_due_date`)
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}