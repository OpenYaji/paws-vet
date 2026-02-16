'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Search, ChevronDown, X } from 'lucide-react';
import { DonutChart } from '@/components/dashboard/donut-chart';

interface Owner {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  address_line1?: string;
  city?: string;
  state?: string;
}

interface Pet {
  id: string;
  name: string;
  species?: string;
  breed?: string;
  gender?: string;
  date_of_birth?: string;
  weight?: number;
  color?: string;
  image_url?: string;
  microchip_number?: string;
  is_spayed_neutered?: boolean;
  special_needs?: string;
  behavioral_notes?: string;
  current_medical_status?: string;
  owner_id?: string;
  owner?: Owner;
  vaccinations?: Array<{
    id: string;
    vaccine_name: string;
    date_administered: string;
  }>;
  medical_records?: Array<{
    id: string;
    title: string;
    description?: string;
    date: string;
    vet_name?: string;
  }>;
  appointments?: Array<{
    id: string;
    scheduled_start: string;
    appointment_status: string;
    service_type?: string;
  }>;
}

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

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

  const handleViewProfile = async (pet: Pet) => {
    setSelectedPet(pet);
    setShowProfile(true);
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
    if (years === 0) return `${months} mo`;
    if (months === 0) return `${years} yr`;
    return `${years} yr ${months} mo`;
  };

  const formatDate = (d?: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  // Stats
  const totalPets = pets.length;
  const dogs = pets.filter((p) => p.species?.toLowerCase() === 'dog').length;
  const cats = pets.filter((p) => p.species?.toLowerCase() === 'cat').length;
  const birds = pets.filter((p) => p.species?.toLowerCase() === 'bird').length;
  const others = pets.filter(
    (p) => !['dog', 'cat', 'bird'].includes(p.species?.toLowerCase() || '')
  ).length;

  const demographicSegments = [
    { label: 'Dogs', value: dogs, color: '#7FA650' },
    { label: 'Cats', value: cats, color: '#D4C5A9' },
    { label: 'Birds', value: birds, color: '#48BB78' },
    { label: 'Others', value: others, color: '#A0AEC0' },
  ].filter((s) => s.value > 0);

  const todayAppointments = pets.reduce((count, pet) => {
    const today = new Date().toDateString();
    const appts = pet.appointments?.filter(
      (a) => new Date(a.scheduled_start).toDateString() === today
    );
    return count + (appts?.length || 0);
  }, 0);

  const getPetImage = (pet: Pet) => {
    if (pet.image_url) return pet.image_url;
    return null;
  };

  const speciesEmoji: Record<string, string> = {
    dog: '🐕',
    cat: '🐈',
    rabbit: '🐰',
    bird: '🐦',
  };

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'dog', label: 'Dogs' },
    { value: 'cat', label: 'Cats' },
    { value: 'bird', label: 'Birds' },
    { value: 'rabbit', label: 'Rabbits' },
    { value: 'other', label: 'Others' },
  ];

  // Appointment progress for modal
  const getUpcomingAppointments = (pet: Pet) => {
    if (!pet.appointments) return [];
    const now = new Date();
    return pet.appointments
      .filter((a) => new Date(a.scheduled_start) >= now && a.appointment_status !== 'cancelled')
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
  };

  const getCompletedAppointments = (pet: Pet) => {
    if (!pet.appointments) return 0;
    return pet.appointments.filter((a) => a.appointment_status === 'completed').length;
  };

  return (
    <div
      className="space-y-4 max-w-[1400px] mx-auto p-6"
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        backgroundColor: '#F7FAFC',
        minHeight: '100vh',
      }}
    >
      {/* ROW 1: Pet Demographic + Appointments Today + Total Pets */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Pet Demographic - Donut */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1A202C] mb-3">Pet Demographic</h2>
          <div className="flex items-center gap-6">
            <DonutChart segments={demographicSegments} size={110} />
            <div className="space-y-1.5">
              {demographicSegments.map((seg) => {
                const pct = totalPets > 0 ? Math.round((seg.value / totalPets) * 100) : 0;
                return (
                  <div key={seg.label} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-[11px] text-[#4A5568]">
                      {pct}% {seg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Appointments Today */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm flex flex-col items-center justify-center">
          <p className="text-xs font-medium text-[#4A5568] mb-1">Appointments today</p>
          <div className="text-[36px] font-bold text-[#1A202C] leading-tight">
            {todayAppointments}
          </div>
          <p className="text-[10px] text-[#A0AEC0] mt-1">Pets with Appointments</p>
        </div>

        {/* Total Pets */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm flex flex-col items-center justify-center">
          <p className="text-xs font-medium text-[#4A5568] mb-1">Total Pets</p>
          <div className="text-[36px] font-bold text-[#1A202C] leading-tight">{totalPets}</div>
          <p className="text-[10px] text-[#A0AEC0] mt-1">Registered Pets</p>
        </div>
      </div>

      {/* ROW 2: Search + Filter */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0AEC0]" />
            <Input
              placeholder="Search by name, breed, species"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm border-[#E2E8F0] rounded-lg bg-[#F7FAFC]"
            />
          </div>

          {/* Filter Category Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2 h-9 px-4 text-sm border border-[#E2E8F0] rounded-lg bg-[#F7FAFC] text-[#4A5568] hover:bg-[#EDF2F7] transition-colors min-w-[160px]"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <span>Filter Category</span>
              <ChevronDown className="w-3.5 h-3.5 ml-auto" />
            </button>
            {showFilterDropdown && (
              <div className="absolute right-0 top-10 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-10 min-w-[160px]">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-[#F7FAFC] transition-colors ${
                      speciesFilter === opt.value
                        ? 'text-[#7FA650] font-medium bg-[#7FA650]/5'
                        : 'text-[#4A5568]'
                    }`}
                    onClick={() => {
                      setSpeciesFilter(opt.value);
                      setShowFilterDropdown(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Label */}
      <div className="px-1">
        <p className="text-sm font-medium text-[#1A202C]">
          Category:{' '}
          <span className="text-[#7FA650]">
            {filterOptions.find((o) => o.value === speciesFilter)?.label || 'All'}
          </span>
        </p>
      </div>

      {/* ROW 3: Pet Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="aspect-square bg-gray-200 animate-pulse"></div>
              <div className="p-3 space-y-2">
                <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-3 w-28 bg-gray-200 animate-pulse rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : pets.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 shadow-sm text-center">
          <p className="text-[#A0AEC0] text-sm">No pets found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {pets.map((pet) => (
            <div
              key={pet.id}
              className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-[#7FA650]/40 transition-all"
              onClick={() => handleViewProfile(pet)}
            >
              {/* Pet Image */}
              <div className="aspect-square bg-[#F7FAFC] flex items-center justify-center overflow-hidden">
                {getPetImage(pet) ? (
                  <img
                    src={getPetImage(pet)!}
                    alt={pet.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl">
                    {speciesEmoji[pet.species?.toLowerCase() || ''] || '🐾'}
                  </span>
                )}
              </div>

              {/* Pet Info */}
              <div className="p-3">
                <p className="text-[13px] font-semibold text-[#1A202C] truncate">{pet.name}</p>
                <p className="text-[11px] text-[#A0AEC0] truncate">
                  {pet.breed || pet.species}
                </p>
                {pet.owner && (
                  <p className="text-[10px] text-[#718096] truncate mt-0.5">
                    {pet.owner.first_name} {pet.owner.last_name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PET PROFILE MODAL */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-[750px] p-0 overflow-hidden rounded-2xl border-0">
          {selectedPet && (
            <div className="bg-white">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <h2 className="text-lg font-bold text-[#1A202C]">Pet Profile</h2>
                <button
                  onClick={() => setShowProfile(false)}
                  className="w-7 h-7 rounded-full bg-[#F7FAFC] flex items-center justify-center hover:bg-[#EDF2F7] transition-colors"
                >
                  <X className="w-4 h-4 text-[#4A5568]" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6">
                {/* LEFT COLUMN */}
                <div className="space-y-4">
                  {/* Pet Details Card */}
                  <div className="bg-[#F7FAFC] rounded-xl p-4 space-y-2.5">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wide">Species</p>
                        <p className="text-[12px] font-medium text-[#1A202C]">
                          {selectedPet.species || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wide">CPN#</p>
                        <p className="text-[12px] font-medium text-[#1A202C]">
                          {selectedPet.microchip_number || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wide">Sex</p>
                        <p className="text-[12px] font-medium text-[#1A202C]">
                          {selectedPet.gender
                            ? selectedPet.gender.charAt(0).toUpperCase() + selectedPet.gender.slice(1)
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wide">Breed</p>
                        <p className="text-[12px] font-medium text-[#1A202C]">
                          {selectedPet.breed || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wide">DOB</p>
                        <p className="text-[12px] font-medium text-[#1A202C]">
                          {formatDate(selectedPet.date_of_birth) || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wide">Age</p>
                        <p className="text-[12px] font-medium text-[#1A202C]">
                          {calculateAge(selectedPet.date_of_birth)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wide">Weight</p>
                        <p className="text-[12px] font-medium text-[#1A202C]">
                          {selectedPet.weight ? `${selectedPet.weight} kg` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wide">Color</p>
                        <p className="text-[12px] font-medium text-[#1A202C]">
                          {selectedPet.color || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Appointments Card */}
                  <div className="bg-[#F7FAFC] rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      {/* Circular Progress */}
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <svg viewBox="0 0 36 36" className="w-full h-full">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#E2E8F0"
                            strokeWidth="3"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#7FA650"
                            strokeWidth="3"
                            strokeDasharray={`${
                              selectedPet.appointments && selectedPet.appointments.length > 0
                                ? (getCompletedAppointments(selectedPet) /
                                    selectedPet.appointments.length) *
                                  100
                                : 0
                            }, 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-[#1A202C]">
                            {selectedPet.appointments?.length || 0}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-[#1A202C]">Appointments</p>
                        <p className="text-[11px] text-[#A0AEC0]">
                          Upcoming: {getUpcomingAppointments(selectedPet).length}
                        </p>
                        {getUpcomingAppointments(selectedPet).length > 0 && (
                          <p className="text-[10px] text-[#718096] mt-0.5">
                            Next:{' '}
                            {formatDate(getUpcomingAppointments(selectedPet)[0]?.scheduled_start)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-3 bg-[#7FA650] hover:bg-[#6B8F42] text-white text-xs h-8 rounded-lg"
                    >
                      View
                    </Button>
                  </div>

                  {/* Pet Image + Owner */}
                  <div className="bg-[#F7FAFC] rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-[#E2E8F0] overflow-hidden flex items-center justify-center flex-shrink-0">
                        {getPetImage(selectedPet) ? (
                          <img
                            src={getPetImage(selectedPet)!}
                            alt={selectedPet.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-3xl">
                            {speciesEmoji[selectedPet.species?.toLowerCase() || ''] || '🐾'}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#1A202C]">
                          {selectedPet.name}
                        </p>
                        <p className="text-[11px] text-[#A0AEC0] truncate">
                          Owner: {selectedPet.owner?.first_name} {selectedPet.owner?.last_name}
                        </p>
                        {selectedPet.owner?.phone && (
                          <p className="text-[10px] text-[#718096]">
                            📞 {selectedPet.owner.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-4">
                  {/* Vaccination History */}
                  <div className="bg-[#F7FAFC] rounded-xl p-4">
                    <h3 className="text-[13px] font-semibold text-[#1A202C] mb-3">
                      Vaccination History
                    </h3>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto">
                      {selectedPet.vaccinations && selectedPet.vaccinations.length > 0 ? (
                        selectedPet.vaccinations.map((vax) => (
                          <div
                            key={vax.id}
                            className="flex items-center justify-between py-1.5 border-b border-[#E2E8F0] last:border-0"
                          >
                            <div>
                              <p className="text-[12px] font-medium text-[#1A202C]">
                                {vax.vaccine_name}
                              </p>
                              <p className="text-[10px] text-[#A0AEC0]">
                                - Date: {formatDate(vax.date_administered)}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex items-center justify-between py-1.5 border-b border-[#E2E8F0]">
                            <div>
                              <p className="text-[12px] font-medium text-[#1A202C]">Anti-Rabies</p>
                              <p className="text-[10px] text-[#A0AEC0]">- Date: --/--/----</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between py-1.5 border-b border-[#E2E8F0]">
                            <div>
                              <p className="text-[12px] font-medium text-[#1A202C]">DHPP</p>
                              <p className="text-[10px] text-[#A0AEC0]">- Date: --/--/----</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between py-1.5 border-b border-[#E2E8F0]">
                            <div>
                              <p className="text-[12px] font-medium text-[#1A202C]">Leptospirosis</p>
                              <p className="text-[10px] text-[#A0AEC0]">- Date: --/--/----</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between py-1.5 border-b border-[#E2E8F0]">
                            <div>
                              <p className="text-[12px] font-medium text-[#1A202C]">Bordetella</p>
                              <p className="text-[10px] text-[#A0AEC0]">- Date: --/--/----</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between py-1.5">
                            <div>
                              <p className="text-[12px] font-medium text-[#1A202C]">Anti-Rabies</p>
                              <p className="text-[10px] text-[#A0AEC0]">- Date: --/--/----</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Medical Record Timeline */}
                  <div className="bg-[#F7FAFC] rounded-xl p-4">
                    <h3 className="text-[13px] font-semibold text-[#1A202C] mb-3">
                      Medical record Timeline
                    </h3>
                    <div className="space-y-0 max-h-[200px] overflow-y-auto">
                      {selectedPet.medical_records && selectedPet.medical_records.length > 0 ? (
                        selectedPet.medical_records.map((rec, idx) => (
                          <div key={rec.id} className="flex gap-3">
                            {/* Timeline dot and line */}
                            <div className="flex flex-col items-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#7FA650] flex-shrink-0 mt-1"></div>
                              {idx < (selectedPet.medical_records?.length || 0) - 1 && (
                                <div className="w-0.5 flex-1 bg-[#E2E8F0] my-0.5"></div>
                              )}
                            </div>
                            {/* Content */}
                            <div className="pb-3">
                              <p className="text-[12px] font-medium text-[#1A202C]">{rec.title}</p>
                              {rec.description && (
                                <p className="text-[10px] text-[#718096]">{rec.description}</p>
                              )}
                              <p className="text-[10px] text-[#A0AEC0]">{formatDate(rec.date)}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <>
                          {[
                            { title: 'Minor Injury', desc: 'Treatment: Observation', date: '03/24/26' },
                            { title: 'Minor Injury', desc: '', date: '03/24/26' },
                            { title: 'Minor Injury', desc: '', date: '03/24/26' },
                            { title: 'Minor Injury', desc: '', date: '03/24/26' },
                            { title: 'Minor Injury', desc: '', date: '03/24/26' },
                          ].map((rec, idx, arr) => (
                            <div key={idx} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#7FA650] flex-shrink-0 mt-1"></div>
                                {idx < arr.length - 1 && (
                                  <div className="w-0.5 flex-1 bg-[#E2E8F0] my-0.5"></div>
                                )}
                              </div>
                              <div className="pb-3">
                                <p className="text-[12px] font-medium text-[#1A202C]">
                                  {rec.title}
                                </p>
                                {rec.desc && (
                                  <p className="text-[10px] text-[#718096]">{rec.desc}</p>
                                )}
                                <p className="text-[10px] text-[#A0AEC0]">{rec.date}</p>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Pet Image in modal */}
                  <div className="flex justify-end">
                    <div className="w-24 h-24 rounded-xl bg-[#E2E8F0] overflow-hidden">
                      {getPetImage(selectedPet) ? (
                        <img
                          src={getPetImage(selectedPet)!}
                          alt={selectedPet.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl">
                            {speciesEmoji[selectedPet.species?.toLowerCase() || ''] || '🐾'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Back Button */}
              <div className="px-6 pb-5">
                <Button
                  variant="outline"
                  className="w-full h-9 text-sm border-[#E2E8F0] rounded-lg"
                  onClick={() => setShowProfile(false)}
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
