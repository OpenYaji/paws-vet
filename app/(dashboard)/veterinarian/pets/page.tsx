'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth-client';
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
import { Search, Eye, Edit, FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import AddNewPet from '@/components/veterinarian/pets/add-new-pet';
import useSWR, { mutate } from 'swr';

interface Pet {
    id: string;
    name: string;
    species: string;
    breed: string;
    age: number;
    weight: string;
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

    //Use fetcher to load the data faster
    const fetcher = async () => {
    const { data, error } = await supabase
        .from('pets')
        .select(`
            id,
            owner_id,
            name,
            species,
            breed,
            color,
            gender,
            weight,
            microchip_number,
            client_profiles (
                id,
                user_id,
                first_name,
                last_name,
                phone
            )
        `)
        .order('name', { ascending: true });

        if (error) throw error;
        return data;
    };

export default function PatientsPage() {
    const { data: pets = [], error, isLoading } = useSWR('pets-data', fetcher, {
        revalidateOnFocus: false,
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [speciesFilter, setSpeciesFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');

        const filteredPets = pets.filter((pet) => {
        
        const petOwner = pet.client_profiles?.[0];
        // Now 'pet' exists, so we can use it here:
        const ownerName = petOwner 
            ? `${petOwner.first_name} ${petOwner.last_name}` 
            : 'Unknown';
        
        const matchesSearch = 
            pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (pet.breed && pet.breed.toLowerCase().includes(searchTerm.toLowerCase())) || // Added safety check for breed
            ownerName.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesSpecies = speciesFilter === 'all' || pet.species.toLowerCase() === speciesFilter.toLowerCase();
        
        return matchesSearch && matchesSpecies;

    }).sort((a, b) => {
        // Your existing sort logic...
        // (If you want me to write this part too, let me know!)
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
            other: '🐾'
        };
        return emojiMap[species.toLowerCase()] || '🐾';
    }

    function formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    const refreshData = () => {
        mutate('pets-data');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Loading patients...</p>
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
            <span>Patient Records</span>
            </div>
            <h1 className="text-3xl font-bold">Patient Records</h1>
            <p className="text-muted-foreground">Comprehensive database of all registered pets</p>

            {/* Right Side: The Add Button */}
            <AddNewPet onPetAdded={fetcher} />
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
                    <SelectItem value="age">Age</SelectItem>
                    </SelectContent>
                </Select>
                </div>

                <div className="flex items-end">
                <Button onClick={fetcher} variant="outline" className="w-full">
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
                <div className="text-3xl font-bold text-primary">{filteredPets.length}</div>
                <p className="text-sm text-muted-foreground mt-1">
                {filteredPets.length === pets.length ? 'Total Patients' : 'Filtered Results'}
                </p>
            </CardContent>
            </Card>

            <Card>
            <CardContent className="pt-6">
                <div className="text-3xl font-bold">
                {new Set(filteredPets.map(p => p.species)).size}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Species Types</p>
            </CardContent>
            </Card>

            <Card>
            <CardContent className="pt-6">
                <div className="text-3xl font-bold">
                {new Set(filteredPets.map(p => p.owner_id)).size}
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
                <h3 className="text-xl font-semibold mb-2">No patients found</h3>
                <p className="text-muted-foreground">
                    Try adjusting your search or filters
                </p>
                </CardContent>
            </Card>
            ) : (
            filteredPets.map((pet, index) => (
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
                            {pet.color ? `${pet.color} years` : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                            Weight
                            </p>
                            <p className="text-sm font-medium mt-1">{pet.weight || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                            Owner
                            </p>
                            <p className="text-sm font-medium mt-1">
                            {pet.client_profiles?.[0] ? `${pet.client_profiles[0].first_name} ${pet.client_profiles[0].last_name}` : 'Unknown'}
                            </p>
                        </div>
                        </div>

                        {pet.microchip_number && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium">Microchip:</span>
                            <span className="font-mono">{pet.microchip_number}</span>
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
                        <Eye className="h-4 w-4" />
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

        {/* Add animation keyframes */}
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