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

  // Form fields
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

  // BUG FIX: Added validation with per-field errors
  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Pet name is required';
    if (!species.trim()) e.species = 'Species is required';
    // BUG FIX: weight must be > 0 per DB CHECK constraint
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
    <div className="page">
      <div className="loading-state"><div className="spinner" /><span>Loading pet…</span></div>
    </div>
  );

  if (!pet) return (
    <div className="page">
      <div className="alert alert-error" style={{ maxWidth: 400, margin: '60px auto' }}>
        <AlertTriangle size={18} /> Pet not found
      </div>
    </div>
  );

  const Field = ({ label, id, required, error, hint, children }: {
    label: string; id: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
  }) => (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && !error && <span className="form-hint">{hint}</span>}
      {error && <span className="form-error"><AlertTriangle size={11} style={{ display: 'inline', marginRight: 3 }} />{error}</span>}
    </div>
  );

  return (
    <div className="page">
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? '#059669' : '#dc2626',
          color: 'white', padding: '12px 20px',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
          fontSize: 14, fontWeight: 600,
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-outline btn-sm btn-icon" onClick={() => router.back()}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 750, margin: 0, letterSpacing: '-0.5px' }}>{pet.name}</h1>
            {owner && (
              <p style={{ margin: 0, marginTop: 4, fontSize: 14, color: 'var(--slate)' }}>
                Owner:{' '}
                <Link href={`/client-admin/clients/${owner.id}`} className="link-blue">
                  {owner.first_name} {owner.last_name}
                </Link>
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!isEditing ? (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => setIsEditing(true)}>
                Edit Pet
              </button>
              {!pet.deleted_at && (
                <button className="btn btn-danger btn-sm" onClick={handleArchivePet}>
                  <Archive size={14} /> Archive
                </button>
              )}
            </>
          ) : (
            <button className="btn btn-outline btn-sm" onClick={() => { setIsEditing(false); fetchPetData(); }}>
              Cancel Editing
            </button>
          )}
        </div>
      </div>

      {/* Archived warning */}
      {pet.deleted_at && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <AlertTriangle size={16} />
          This pet is archived. Archived on {new Date(pet.deleted_at).toLocaleDateString()}.
        </div>
      )}

      {/* ── VIEW MODE ── */}
      {!isEditing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card animate-in">
            <div className="card-header"><h2 className="card-title">Basic Information</h2></div>
            <div className="card-body">
              <div className="grid-2" style={{ gap: 20 }}>
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
                      <span className={pet.is_active ? 'badge badge-green' : 'badge badge-gray'}>
                        {pet.is_active ? 'Active' : 'Inactive'}
                      </span>
                    ),
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="info-row">
                    <span className="info-label">{label}</span>
                    {typeof value === 'string' ? (
                      <span className="info-value">{value}</span>
                    ) : value}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card animate-in animate-in-delay-1">
            <div className="card-header"><h2 className="card-title">Medical & Behavioral Notes</h2></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Special Needs', value: pet.special_needs },
                { label: 'Behavioral Notes', value: pet.behavioral_notes },
                { label: 'Current Medical Status', value: pet.current_medical_status },
              ].map(({ label, value }) => (
                <div key={label} className="info-row">
                  <span className="info-label">{label}</span>
                  <span className="info-value" style={{ color: value ? 'var(--navy)' : 'var(--slate-light)' }}>
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div className="card animate-in">
            <div className="card-header"><h2 className="card-title">Basic Information</h2></div>
            <div className="card-body">
              <div className="grid-2" style={{ gap: 16 }}>
                <Field label="Name" id="name" required error={errors.name}>
                  <input
                    id="name" className={`form-input ${errors.name ? 'error' : ''}`}
                    value={name}
                    onChange={e => { setName(e.target.value); if (errors.name) setErrors(ev => ({ ...ev, name: '' })); }}
                    required
                  />
                </Field>

                <Field label="Species" id="species" required error={errors.species}>
                  <select
                    id="species" className={`form-input ${errors.species ? 'error' : ''}`}
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
                  <input id="breed" className="form-input" value={breed} onChange={e => setBreed(e.target.value)} />
                </Field>

                <Field label="Date of Birth" id="dob">
                  <input id="dob" type="date" className="form-input" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                </Field>

                <Field label="Gender" id="gender">
                  <select id="gender" className="form-input" value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </Field>

                <Field label="Color/Markings" id="color">
                  <input id="color" className="form-input" value={color} onChange={e => setColor(e.target.value)} />
                </Field>

                <Field label="Weight (kg)" id="weight" error={errors.weight} hint="Must be greater than 0">
                  <input
                    id="weight" type="number" step="0.1" min="0.1"
                    className={`form-input ${errors.weight ? 'error' : ''}`}
                    value={weight}
                    onChange={e => { setWeight(e.target.value); if (errors.weight) setErrors(ev => ({ ...ev, weight: '' })); }}
                  />
                </Field>

                <Field label="Microchip Number" id="microchip">
                  <input id="microchip" className="form-input" value={microchipNumber} onChange={e => setMicrochipNumber(e.target.value)} />
                </Field>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox" checked={isSpayedNeutered}
                      onChange={e => setIsSpayedNeutered(e.target.checked)}
                    />
                    Spayed / Neutered
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox" checked={isActive}
                      onChange={e => setIsActive(e.target.checked)}
                    />
                    Active Patient
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="card animate-in animate-in-delay-1">
            <div className="card-header"><h2 className="card-title">Medical & Behavioral Notes</h2></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Special Needs', id: 'specialNeeds', value: specialNeeds, set: setSpecialNeeds },
                { label: 'Behavioral Notes', id: 'behavioralNotes', value: behavioralNotes, set: setBehavioralNotes },
                { label: 'Current Medical Status', id: 'medStatus', value: currentMedicalStatus, set: setCurrentMedicalStatus },
              ].map(({ label, id, value, set }) => (
                <div key={id} className="form-group">
                  <label className="form-label" htmlFor={id}>{label}</label>
                  <textarea
                    id={id} className="form-input" rows={3}
                    value={value} onChange={e => set(e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button" className="btn btn-outline"
              onClick={() => { setIsEditing(false); fetchPetData(); }}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
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
