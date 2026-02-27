'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/auth-client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Archive, AlertTriangle } from 'lucide-react';

interface Pet {
  id: string;
  owner_id: string;
  name: string;
  species: string;
  breed: string;
  date_of_birth?: string;
  gender?: string;
  color?: string;
  weight?: number;
  microchip_number?: string;
  is_spayed_neutered: boolean;
  special_needs?: string;
  behavioral_notes?: string;
  current_medical_status?: string;
  is_active: boolean;
  photo_url?: string;
  created_at: string;
  deleted_at?: string;
}

interface Owner {
  id: string;
  first_name: string;
  last_name: string;
}

function calcAge(d?: string): string {
  if (!d) return '—';
  const today = new Date(), b = new Date(d);
  const y = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (y === 0) return `${m} months`;
  return m < 0 ? `${y - 1} yrs ${12 + m} mo` : `${y} yrs ${m} mo`;
}

// FIX: Field is defined OUTSIDE PetDetailPage so it's not recreated on every render
function Field({ label, id, required, error, hint, children }: {
  label: string; id: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold" htmlFor={id}>
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <span className="text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="text-xs text-destructive flex items-center gap-1"><AlertTriangle size={11} />{error}</span>}
    </div>
  );
}

export default function PetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const petId = params?.petId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pet, setPet] = useState<Pet | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [color, setColor] = useState('');
  const [weight, setWeight] = useState('');
  const [microchipNumber, setMicrochipNumber] = useState('');
  const [isSpayedNeutered, setIsSpayedNeutered] = useState(false);
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [behavioralNotes, setBehavioralNotes] = useState('');
  const [currentMedicalStatus, setCurrentMedicalStatus] = useState('');
  const [isActive, setIsActive] = useState(true);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPetData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pets')
        .select(`
          *,
          client_profiles!pets_owner_id_fkey (
            id, first_name, last_name
          )
        `)
        .eq('id', petId)
        .single();

      if (error || !data) {
        showToast('Pet not found', 'error');
        router.back();
        return;
      }

      setPet(data);
      setOwner(data.client_profiles);
      setName(data.name);
      setSpecies(data.species);
      setBreed(data.breed || '');
      setDateOfBirth(data.date_of_birth || '');
      setGender(data.gender || '');
      setColor(data.color || '');
      setWeight(data.weight?.toString() || '');
      setMicrochipNumber(data.microchip_number || '');
      setIsSpayedNeutered(data.is_spayed_neutered);
      setSpecialNeeds(data.special_needs || '');
      setBehavioralNotes(data.behavioral_notes || '');
      setCurrentMedicalStatus(data.current_medical_status || '');
      setIsActive(data.is_active);
    } catch {
      showToast('Failed to load pet data', 'error');
    } finally {
      setLoading(false);
    }
  }, [petId, router]);

  useEffect(() => {
    if (petId) fetchPetData();
  }, [petId, fetchPetData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Pet name is required';
    if (!species.trim()) e.species = 'Species is required';
    if (weight && (isNaN(parseFloat(weight)) || parseFloat(weight) <= 0)) {
      e.weight = 'Weight must be a positive number';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pet || !validate()) return;

    setSaving(true);
    try {
      const { data: { user: cu } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('pets')
        .update({
          name: name.trim(),
          species: species.trim(),
          breed: breed.trim() || null,
          date_of_birth: dateOfBirth || null,
          gender: gender || null,
          color: color.trim() || null,
          weight: weight ? parseFloat(weight) : null,
          microchip_number: microchipNumber.trim() || null,
          is_spayed_neutered: isSpayedNeutered,
          special_needs: specialNeeds.trim() || null,
          behavioral_notes: behavioralNotes.trim() || null,
          current_medical_status: currentMedicalStatus.trim() || null,
          is_active: isActive,
          updated_at: new Date().toISOString(),
          updated_by: cu?.id,
        })
        .eq('id', petId);

      if (error) {
        showToast(error.message || 'Failed to update pet', 'error');
        return;
      }

      showToast('Pet updated successfully!');
      setIsEditing(false);
      await fetchPetData();
    } catch {
      showToast('Failed to update pet', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleArchivePet = async () => {
    if (!pet || !confirm(`Archive ${pet.name}? This marks them as deleted.`)) return;
    try {
      const { data: { user: cu } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('pets')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: cu?.id,
          is_active: false,
        })
        .eq('id', petId);
      if (error) { showToast('Failed to archive pet', 'error'); return; }
      showToast('Pet archived');
      router.back();
    } catch {
      showToast('Failed to archive pet', 'error');
    }
  };

  if (loading) return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <span>Loading pet…</span>
      </div>
    </div>
  );

  if (!pet) return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-xl p-4 flex items-start gap-3 max-w-sm mx-auto mt-16">
        <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> Pet not found
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-destructive'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-7">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{pet.name}</h1>
            {owner && (
              <p className="mt-1 text-sm text-muted-foreground">
                Owner:{' '}
                <Link href={`/client-admin/clients/${owner.id}`} className="text-primary hover:underline font-medium">
                  {owner.first_name} {owner.last_name}
                </Link>
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2.5">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-150"
              >
                Edit Pet
              </button>
              {!pet.deleted_at && (
                <button
                  onClick={handleArchivePet}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-destructive hover:bg-destructive/90 text-white transition-all duration-150"
                >
                  <Archive size={14} /> Archive
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => { setIsEditing(false); fetchPetData(); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground transition-all duration-150"
            >
              Cancel Editing
            </button>
          )}
        </div>
      </div>

      {/* Archived warning */}
      {pet.deleted_at && (
        <div className="bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-xl p-4 flex items-start gap-3 mb-5">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          This pet is archived. Archived on {new Date(pet.deleted_at).toLocaleDateString()}.
        </div>
      )}

      {/* ── VIEW MODE ── */}
      {!isEditing && (
        <div className="flex flex-col gap-5">
          <div className="bg-card rounded-2xl border border-border shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-[17px] font-bold">Basic Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { label: 'Name', value: pet.name },
                  { label: 'Species', value: pet.species },
                  { label: 'Breed', value: pet.breed || '—' },
                  { label: 'Age', value: calcAge(pet.date_of_birth) },
                  { label: 'Gender', value: pet.gender ? pet.gender.charAt(0).toUpperCase() + pet.gender.slice(1) : '—' },
                  { label: 'Color', value: pet.color || '—' },
                  { label: 'Weight', value: pet.weight ? `${pet.weight} kg` : '—' },
                  { label: 'Spayed/Neutered', value: pet.is_spayed_neutered ? 'Yes' : 'No' },
                  { label: 'Microchip', value: pet.microchip_number || 'None' },
                  {
                    label: 'Status',
                    value: (
                      <span className={pet.is_active
                        ? 'rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700'
                        : 'rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground'}>
                        {pet.is_active ? 'Active' : 'Inactive'}
                      </span>
                    ),
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">{label}</span>
                    {typeof value === 'string' ? (
                      <span className="text-sm font-medium">{value}</span>
                    ) : value}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-[17px] font-bold">Medical & Behavioral Notes</h2>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {[
                { label: 'Special Needs', value: pet.special_needs },
                { label: 'Behavioral Notes', value: pet.behavioral_notes },
                { label: 'Current Medical Status', value: pet.current_medical_status },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground font-medium">{label}</span>
                  <span className={`text-sm font-medium ${value ? '' : 'text-muted-foreground italic'}`}>
                    {value || 'None recorded'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODE ── */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="bg-card rounded-2xl border border-border shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-[17px] font-bold">Basic Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name" id="name" required error={errors.name}>
                  <input
                    id="name"
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${errors.name ? 'border-destructive' : 'border-border'}`}
                    value={name}
                    onChange={e => { setName(e.target.value); if (errors.name) setErrors(ev => ({ ...ev, name: '' })); }}
                    required
                  />
                </Field>
                <Field label="Species" id="species" required error={errors.species}>
                  <select
                    id="species"
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${errors.species ? 'border-destructive' : 'border-border'}`}
                    value={species}
                    onChange={e => { setSpecies(e.target.value); if (errors.species) setErrors(ev => ({ ...ev, species: '' })); }}
                  >
                    <option value="">Select species</option>
                    {['Dog','Cat','Bird','Rabbit','Hamster','Guinea Pig','Reptile','Other'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Breed" id="breed">
                  <input id="breed" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" value={breed} onChange={e => setBreed(e.target.value)} />
                </Field>
                <Field label="Date of Birth" id="dob">
                  <input id="dob" type="date" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                </Field>
                <Field label="Gender" id="gender">
                  <select id="gender" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </Field>
                <Field label="Color/Markings" id="color">
                  <input id="color" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" value={color} onChange={e => setColor(e.target.value)} />
                </Field>
                <Field label="Weight (kg)" id="weight" error={errors.weight} hint="Must be greater than 0">
                  <input
                    id="weight" type="number" step="0.1" min="0.1"
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${errors.weight ? 'border-destructive' : 'border-border'}`}
                    value={weight}
                    onChange={e => { setWeight(e.target.value); if (errors.weight) setErrors(ev => ({ ...ev, weight: '' })); }}
                  />
                </Field>
                <Field label="Microchip Number" id="microchip">
                  <input id="microchip" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" value={microchipNumber} onChange={e => setMicrochipNumber(e.target.value)} />
                </Field>
                <div className="flex flex-col gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                    <input type="checkbox" checked={isSpayedNeutered} onChange={e => setIsSpayedNeutered(e.target.checked)} className="w-4 h-4 accent-primary cursor-pointer" />
                    Spayed / Neutered
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                    <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 accent-primary cursor-pointer" />
                    Active Patient
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-[17px] font-bold">Medical & Behavioral Notes</h2>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {[
                { label: 'Special Needs', id: 'specialNeeds', value: specialNeeds, set: setSpecialNeeds },
                { label: 'Behavioral Notes', id: 'behavioralNotes', value: behavioralNotes, set: setBehavioralNotes },
                { label: 'Current Medical Status', id: 'medStatus', value: currentMedicalStatus, set: setCurrentMedicalStatus },
              ].map(({ label, id, value, set }) => (
                <div key={id} className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold" htmlFor={id}>{label}</label>
                  <textarea
                    id={id} rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-vertical"
                    value={value} onChange={e => set(e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setIsEditing(false); fetchPetData(); }}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground transition-all duration-150 disabled:opacity-55 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-150 disabled:opacity-55 disabled:cursor-not-allowed active:scale-95"
            >
              {saving ? (
                <><Loader2 size={15} className="animate-spin" /> Saving…</>
              ) : (
                <><Save size={15} /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}