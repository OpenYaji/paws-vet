'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Filter, Eye, Phone, Mail, MapPin, Calendar, Weight, Heart } from 'lucide-react';
import { Pet } from '@/types/pets';

const speciesColors: Record<string, string> = {
  dog: 'bg-blue-100 text-blue-800 border-blue-200',
  cat: 'bg-orange-100 text-orange-800 border-orange-200',
  rabbit: 'bg-pink-100 text-pink-800 border-pink-200',
  bird: 'bg-sky-100 text-sky-800 border-sky-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
};

const genderIcons: Record<string, string> = {
  male: '♂',
  female: '♀',
  unknown: '?',
};

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Filters
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPets();
  }, [speciesFilter, searchQuery]);

  const fetchPets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (speciesFilter !== 'all') params.append('species', speciesFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/pets?${params.toString()}`);
      const data = await response.json();
      setPets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching pets:', error);
      setPets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (pet: Pet) => {
    setSelectedPet(pet);
    setShowDetails(true);
  };

  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return 'Unknown';
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (years === 0) {
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    }
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  };

  const stats = {
    total: pets.length,
    dogs: pets.filter(p => p.species?.toLowerCase() === 'dog').length,
    cats: pets.filter(p => p.species?.toLowerCase() === 'cat').length,
    others: pets.filter(p => !['dog', 'cat'].includes(p.species?.toLowerCase())).length,
  };

  const getPetImage = (pet: Pet) => {
    if (pet.image_url) return pet.image_url;
    
    // Default placeholder images based on species
    const placeholders: Record<string, string> = {
      dog: '🐕',
      cat: '🐈',
      rabbit: '🐰',
      bird: '🐦',
      other: '🐾',
    };
    
    return placeholders[pet.species?.toLowerCase()] || placeholders.other;
  };

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Registered Pets</h1>
          <p className="text-muted-foreground">View and manage all registered pets</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dogs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.dogs}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{stats.cats}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Others</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{stats.others}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-lg">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pet name, breed, microchip..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Species</label>
              <select
                value={speciesFilter}
                onChange={(e) => setSpeciesFilter(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="all">All Species</option>
                <option value="dog">Dogs</option>
                <option value="cat">Cats</option>
                <option value="rabbit">Rabbits</option>
                <option value="bird">Birds</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSpeciesFilter('all');
              setSearchQuery('');
            }}
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* Pets Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading pets...</p>
        </div>
      ) : pets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No pets found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pets.map((pet) => (
            <Card
              key={pet.id}
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-2"
              onClick={() => handleViewDetails(pet)}
            >
              <div className="aspect-square bg-muted flex items-center justify-center text-6xl">
                {typeof getPetImage(pet) === 'string' && getPetImage(pet).startsWith('http') ? (
                  <img
                    src={getPetImage(pet)}
                    alt={pet.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{getPetImage(pet)}</span>
                )}
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{pet.name}</CardTitle>
                    <CardDescription className="truncate">
                      {pet.owner?.first_name} {pet.owner?.last_name}
                    </CardDescription>
                  </div>
                  {pet.gender && (
                    <span className="text-2xl flex-shrink-0">
                      {genderIcons[pet.gender]}
                    </span>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={speciesColors[pet.species?.toLowerCase()] || speciesColors.other}>
                    {pet.species}
                  </Badge>
                  {pet.breed && (
                    <span className="text-xs text-muted-foreground truncate">
                      {pet.breed}
                    </span>
                  )}
                </div>
                
                {pet.date_of_birth && (
                  <p className="text-sm text-muted-foreground">
                    Age: {calculateAge(pet.date_of_birth)}
                  </p>
                )}
                
                {pet.is_spayed_neutered && (
                  <Badge variant="outline" className="text-xs">
                    Spayed/Neutered
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pet Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pet Profile</DialogTitle>
            <DialogDescription>
              Complete information about {selectedPet?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedPet && (
            <div className="space-y-6">
              {/* Pet Image and Basic Info */}
              <div className="flex gap-6">
                <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center text-5xl flex-shrink-0 border-2">
                  {typeof getPetImage(selectedPet) === 'string' && getPetImage(selectedPet).startsWith('http') ? (
                    <img
                      src={getPetImage(selectedPet)}
                      alt={selectedPet.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span>{getPetImage(selectedPet)}</span>
                  )}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">{selectedPet.name}</h3>
                      <p className="text-muted-foreground">
                        {selectedPet.breed || selectedPet.species}
                      </p>
                    </div>
                    {selectedPet.gender && (
                      <span className="text-3xl">
                        {genderIcons[selectedPet.gender]}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={speciesColors[selectedPet.species?.toLowerCase()] || speciesColors.other}>
                      {selectedPet.species}
                    </Badge>
                    {selectedPet.is_spayed_neutered && (
                      <Badge variant="outline">
                        <Heart className="w-3 h-3 mr-1" />
                        Spayed/Neutered
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Pet Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pet Information</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  {selectedPet.date_of_birth && (
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Age</p>
                        <p className="text-sm text-muted-foreground">
                          {calculateAge(selectedPet.date_of_birth)} old
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Born: {new Date(selectedPet.date_of_birth).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {selectedPet.weight && (
                    <div className="flex items-start gap-3">
                      <Weight className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Weight</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedPet.weight} lbs
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {selectedPet.color && (
                    <div>
                      <p className="text-sm font-medium">Color</p>
                      <p className="text-sm text-muted-foreground">{selectedPet.color}</p>
                    </div>
                  )}
                  
                  {selectedPet.microchip_number && (
                    <div>
                      <p className="text-sm font-medium">Microchip</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {selectedPet.microchip_number}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Owner Information */}
              {selectedPet.owner && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Owner Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Name</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPet.owner.first_name} {selectedPet.owner.last_name}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={`tel:${selectedPet.owner.phone}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {selectedPet.owner.phone}
                      </a>
                    </div>
                    
                    {selectedPet.owner.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <a
                          href={`mailto:${selectedPet.owner.email}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {selectedPet.owner.email}
                        </a>
                      </div>
                    )}
                    
                    {selectedPet.owner.address_line1 && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="text-sm text-muted-foreground">
                          <p>{selectedPet.owner.address_line1}</p>
                          {selectedPet.owner.city && selectedPet.owner.state && (
                            <p>
                              {selectedPet.owner.city}, {selectedPet.owner.state}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Medical Notes */}
              {(selectedPet.special_needs || selectedPet.behavioral_notes || selectedPet.current_medical_status) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Medical & Behavioral Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedPet.special_needs && (
                      <div>
                        <p className="text-sm font-medium">Special Needs</p>
                        <p className="text-sm text-muted-foreground">{selectedPet.special_needs}</p>
                      </div>
                    )}
                    
                    {selectedPet.behavioral_notes && (
                      <div>
                        <p className="text-sm font-medium">Behavioral Notes</p>
                        <p className="text-sm text-muted-foreground">{selectedPet.behavioral_notes}</p>
                      </div>
                    )}
                    
                    {selectedPet.current_medical_status && (
                      <div>
                        <p className="text-sm font-medium">Current Medical Status</p>
                        <p className="text-sm text-muted-foreground">{selectedPet.current_medical_status}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">
                  Edit Profile
                </Button>
                <Button variant="outline" className="flex-1">
                  Medical History
                </Button>
                <Button className="flex-1 bg-primary">
                  Book Appointment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
