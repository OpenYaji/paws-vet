'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  PawPrint, Search, ChevronDown, X, Phone, User, 
  Camera, Loader2, Calendar, Activity, Info, Plus
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DonutChart } from '@/components/dashboard/donut-chart';
import { supabase } from '@/lib/auth-client';

interface Pet {
  id: string;
  name: string;
  species?: string;
  breed?: string;
  gender?: string;
  date_of_birth?: string;
  weight?: number;
  image_url?: string;
  microchip_number?: string;
  owner?: { first_name: string; last_name: string; phone: string };
  vaccinations?: any[];
  medical_records?: any[];
  appointments?: any[];
}

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchPets(); }, [speciesFilter, searchQuery]);

  const fetchPets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (speciesFilter !== 'all') params.append('species', speciesFilter);
      if (searchQuery) params.append('search', searchQuery);
      const res = await fetch(`/api/admin/pets?${params.toString()}`);
      const data = await res.json();
      setPets(Array.isArray(data) ? data : []);
    } catch (e) { 
      console.error('Error fetching pets:', e); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleViewProfile = (pet: Pet) => {
    setSelectedPet(pet);
    setShowProfile(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, petId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileName = `${petId}-${Date.now()}.${file.name.split('.').pop()}`;
      
      // 1. Upload to public bucket
      const { error: upErr } = await supabase.storage.from('pet-images').upload(fileName, file);
      if (upErr) throw upErr;

      // 2. Get the full public link
      const { data: { publicUrl } } = supabase.storage.from('pet-images').getPublicUrl(fileName);

      // 3. Update the database using correct 'photo_url' column
      const { error: dbError } = await supabase
        .from('pets')
        .update({ photo_url: publicUrl })
        .eq('id', petId);

      if (dbError) throw dbError;

      if (selectedPet?.id === petId) setSelectedPet({ ...selectedPet, image_url: publicUrl });
      fetchPets();
    } catch (err: any) { 
      alert("Update failed: " + err.message); 
    } finally { 
      setIsUploading(false); 
    }
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return 'N/A';
    const age = Math.floor((new Date().getTime() - new Date(dob).getTime()) / 31557600000);
    return age > 0 ? `${age} yr` : 'Young';
  };

  const demographicSegments = [
    { label: 'Dogs', value: pets.filter(p => p.species?.toLowerCase() === 'dog').length, color: 'var(--chart-1)' },
    { label: 'Cats', value: pets.filter(p => p.species?.toLowerCase() === 'cat').length, color: 'var(--chart-2)' },
    { label: 'Others', value: pets.filter(p => !['dog', 'cat'].includes(p.species?.toLowerCase() || '')).length, color: 'var(--chart-3)' },
  ].filter(s => s.value > 0);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto min-h-screen bg-background text-foreground">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <PawPrint className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Pets Registry</h1>
            <p className="text-sm text-muted-foreground font-medium">Manage clinical records and patient history</p>
          </div>
        </div>
      </div>

      {/* ANALYTICS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-sm flex items-center gap-10">
          <DonutChart segments={demographicSegments} size={110} />
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Species</h3>
            {demographicSegments.map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs font-semibold">{s.label}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 flex flex-col justify-center text-center">
            <p className="text-xs font-bold text-muted-foreground uppercase">Registered</p>
            <p className="text-4xl font-black text-primary">{pets.length}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 flex flex-col justify-center text-center">
            <p className="text-xs font-bold text-muted-foreground uppercase">Active Histories</p>
            <p className="text-4xl font-black">{pets.length}</p>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, breed, or owner..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-11 bg-background border-border rounded-xl font-medium"
          />
        </div>
        <div className="flex gap-2">
            {['all', 'dog', 'cat'].map((spec) => (
                <Button 
                  key={spec} 
                  variant={speciesFilter === spec ? 'default' : 'outline'} 
                  className="capitalize rounded-xl h-11 px-6 font-bold" 
                  onClick={() => setSpeciesFilter(spec)}
                >
                  {spec}
                </Button>
            ))}
        </div>
      </div>

      {/* PET GRID */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {pets.map((pet) => (
            <div 
              key={pet.id} 
              className="bg-card rounded-2xl border border-border overflow-hidden cursor-pointer hover:border-primary hover:shadow-xl transition-all group relative"
            >
              <div className="aspect-square bg-muted relative overflow-hidden" onClick={() => handleViewProfile(pet)}>
                {pet.image_url ? (
                  <img src={pet.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl opacity-30 font-black uppercase">
                    {pet.species?.charAt(0) || '🐾'}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="p-4" onClick={() => handleViewProfile(pet)}>
                <h3 className="font-bold text-sm truncate mb-1">{pet.name}</h3>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tight">{pet.breed || pet.species}</p>
                <div className="pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground truncate">{pet.owner?.last_name}</span>
                    <span className="text-[10px] font-black text-primary">{calculateAge(pet.date_of_birth)}</span>
                </div>
              </div>

              <button 
                className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-primary hover:text-white"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.setAttribute('data-pet-id', pet.id); fileInputRef.current?.click(); }}
              >
                <Camera size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* GLOBAL HIDDEN FILE INPUT */}
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
          const id = fileInputRef.current?.getAttribute('data-pet-id');
          if(id) handleImageUpload(e, id);
      }} />

      {/* PROFILE MODAL */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-[700px] p-0 overflow-hidden rounded-[2rem] border-none bg-card shadow-2xl">
          <DialogHeader className="p-6 border-b border-border flex flex-row items-center justify-between bg-card">
            <div className="flex items-center gap-2">
                <PawPrint className="text-primary h-5 w-5" />
                <DialogTitle className="text-xl font-bold">Patient Profile: {selectedPet?.name}</DialogTitle>
            </div>
            <button onClick={() => setShowProfile(false)}><X className="h-5 w-5" /></button>
          </DialogHeader>

          {selectedPet && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
              <div className="space-y-6">
                <div className="relative aspect-square rounded-[2rem] bg-muted overflow-hidden border-2 border-dashed border-border group cursor-pointer"
                  onClick={() => { fileInputRef.current?.setAttribute('data-pet-id', selectedPet.id); fileInputRef.current?.click(); }}>
                  {selectedPet.image_url ? <img src={selectedPet.image_url} className="w-full h-full object-cover" alt="" /> : 
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Camera size={32} strokeWidth={1.5} />
                      <p className="text-[10px] font-black mt-2 uppercase">Replace Photo</p>
                    </div>}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {isUploading ? <Loader2 className="animate-spin text-white" /> : <Camera className="text-white" />}
                  </div>
                </div>
                <div className="bg-muted/30 rounded-2xl p-5 border border-border grid grid-cols-2 gap-4">
                  <div><p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Sex</p><p className="text-xs font-bold uppercase">{selectedPet.gender || '---'}</p></div>
                  <div><p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Weight</p><p className="text-xs font-bold">{selectedPet.weight || '---'} KG</p></div>
                </div>
              </div>

              <div className="space-y-6">
                  <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
                      <h3 className="text-xs font-black text-primary uppercase mb-3 tracking-widest">Owner</h3>
                      <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                            {selectedPet.owner?.first_name?.charAt(0)}
                          </div>
                          <div>
                              <p className="text-sm font-bold">{selectedPet.owner?.first_name} {selectedPet.owner?.last_name}</p>
                              <p className="text-[10px] text-muted-foreground font-bold">{selectedPet.owner?.phone || 'No Contact'}</p>
                          </div>
                      </div>
                  </div>
                  <div className="bg-muted/30 rounded-2xl p-5 border border-border h-[180px] overflow-y-auto">
                      <h3 className="text-xs font-black uppercase text-muted-foreground mb-4">Visit History</h3>
                      {selectedPet.medical_records?.length ? selectedPet.medical_records.map((r, i) => (
                          <div key={i} className="border-l-2 border-primary/30 pl-3 mb-4">
                              <p className="text-xs font-bold">{r.chief_complaint}</p>
                              <p className="text-[10px] text-muted-foreground font-medium">{new Date(r.visit_date).toLocaleDateString()}</p>
                          </div>
                      )) : <p className="text-xs text-muted-foreground italic font-medium">No prior visits in registry.</p>}
                  </div>
              </div>
            </div>
          )}
          <div className="px-8 pb-8 flex gap-3">
             <Button className="flex-1 rounded-2xl h-12 font-black uppercase tracking-tighter" onClick={() => setShowProfile(false)}>Close Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}