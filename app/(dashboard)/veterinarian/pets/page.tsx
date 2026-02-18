'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye, Edit, FileText } from 'lucide-react';
import Link from 'next/link';
import AddNewPet from '@/components/veterinarian/pets/add-new-pet';
import useSWR, { mutate } from 'swr';

// 1. Define Fetcher (Keep this outside or import it)
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: string;
  color?: string; // Added optional field based on your UI usage
  microchip_number?: string;
  owner_id: string;
  created_at: string;
  client_profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
  }[];
}

export default function PatientsPage() {
  // 2. FIX: Use the URL as the key for SWR
  // The 'data' will be undefined initially, so we default to [] to prevent crashes
  const { data: pets = [], isLoading } = useSWR('/api/pets', fetcher, {
    revalidateOnFocus: false,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // 3. Logic safe to run now that pets defaults to []
  const petsArray = Array.isArray(pets) ? pets : [];
  const filteredPets = petsArray
    .filter((pet: Pet) => {
      const petOwner = pet.client_profiles?.[0];
      
      const ownerName = petOwner
        ? `${petOwner.first_name} ${petOwner.last_name}`
        : 'Unknown';

      const matchesSearch =
        pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pet.breed && pet.breed.toLowerCase().includes(searchTerm.toLowerCase())) ||
        ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pet.microchip_number && pet.microchip_number.includes(searchTerm));

      const matchesSpecies =
        speciesFilter === 'all' ||
        pet.species.toLowerCase() === speciesFilter.toLowerCase();

      return matchesSearch && matchesSpecies;
    })
    .sort((a: Pet, b: Pet) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return 0;
    });

  function getSpeciesEmoji(species: string): string {
    const emojiMap: Record<string, string> = {
      dog: '🐕',
      cat: '🐱',
      bird: '🐦',
      rabbit: '🐰',
      hamster: '🐹',
      fish: '🐠',
      reptile: '🦎',
      other: '🐾',
    };
    return emojiMap[species.toLowerCase()] || '🐾';
  }

  // Refreshes the list manually (e.g. via the Refresh button or after adding a pet)
  const refreshData = () => {
    mutate('/api/pets'); // FIX: Must match the key used in useSWR
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading pets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/veterinarian/dashboard" className="hover:text-primary">
            Dashboard
          </Link>
          <span>›</span>
          <span>Pet Records</span>
        </div>
        <div className="flex justify-between items-center">
             <div>
                <h1 className="text-3xl font-bold">Pet Records</h1>
                <p className="text-muted-foreground">
                Comprehensive database of all registered pets
                </p>
             </div>
             {/* Pass the refresh function to your AddNewPet component */}
             <AddNewPet onPetAdded={refreshData} />
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by pet name, breed, owner, or microchip number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Species</label>
              <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Species</SelectItem>
                  <SelectItem value="dog">Dog</SelectItem>
                  <SelectItem value="cat">Cat</SelectItem>
                  <SelectItem value="bird">Bird</SelectItem>
                  <SelectItem value="rabbit">Rabbit</SelectItem>
                  <SelectItem value="hamster">Hamster</SelectItem>
                  <SelectItem value="fish">Fish</SelectItem>
                  <SelectItem value="reptile">Reptile</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={refreshData} variant="outline" className="w-full">
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-primary">
              {filteredPets.length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredPets.length === pets.length
                ? 'Total Pets'
                : 'Filtered Results'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">
              {new Set(filteredPets.map((p: Pet) => p.species)).size}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Species Types</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">
              {new Set(filteredPets.map((p: Pet) => p.owner_id)).size}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Pet Owners</p>
          </CardContent>
        </Card>
      </div>

      {/* Patient Records Grid */}
      <div className="space-y-4">
        {filteredPets.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <div className="text-6xl mb-4 opacity-30">🔍</div>
              <h3 className="text-xl font-semibold mb-2">No Pets found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPets.map((pet: Pet, index: number) => (
            <Card
              key={pet.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              style={{
                animation: `fadeIn 0.3s ease ${index * 0.05}s both`,
              }}
            >
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 items-center">
                  {/* Avatar */}
                  <div className="flex justify-center md:justify-start">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-4xl">
                      {getSpeciesEmoji(pet.species)}
                    </div>
                  </div>

                  {/* Pet Information */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-2xl font-bold">{pet.name}</h3>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        {pet.species}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                          Breed
                        </p>
                        <p className="text-sm font-medium mt-1">{pet.breed}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                          Color
                        </p>
                        <p className="text-sm font-medium mt-1">
                          {pet.color || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                          Weight
                        </p>
                        <p className="text-sm font-medium mt-1">
                          {pet.weight || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                          Owner
                        </p>
                        <p className="text-sm font-medium mt-1">
                          {pet.client_profiles?.[0]
                            ? `${pet.client_profiles[0].first_name} ${pet.client_profiles[0].last_name}`
                            : 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {pet.microchip_number && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">Microchip:</span>
                        <span className="font-mono">
                          {pet.microchip_number}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-center md:justify-end">
                    <Button
                      variant="outline"
                      size="icon"
                      title="View Details"
                      onClick={() => console.log('View details:', pet.id)}
                    >
                      <Link href={`/veterinarian/pets/${pet.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Edit Record"
                      onClick={() => console.log('Edit record:', pet.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Medical History"
                      onClick={() => console.log('View history:', pet.id)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}