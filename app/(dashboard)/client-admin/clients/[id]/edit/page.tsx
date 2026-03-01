'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/auth-client';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';

interface ClientProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip_code: string;
  communication_preference: string;
}

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [email, setEmail] = useState('');
  const [accountStatus, setAccountStatus] = useState('active');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [communicationPreference, setCommunicationPreference] = useState('email');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchClientData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError || !clientData) {
        showToast('Client not found', 'error');
        router.push('/client-admin');
        return;
      }
      setClient(clientData);
      setFirstName(clientData.first_name);
      setLastName(clientData.last_name);
      setPhone(clientData.phone);
      setAddressLine1(clientData.address_line1);
      setAddressLine2(clientData.address_line2 || '');
      setCity(clientData.city);
      setState(clientData.state);
      setZipCode(clientData.zip_code);
      setCommunicationPreference(clientData.communication_preference);

      const { data: user } = await supabase
        .from('users')
        .select('email, account_status')
        .eq('id', clientData.user_id)
        .single();
      if (user) {
        setEmail(user.email);
        setAccountStatus(user.account_status);
      }
    } catch {
      showToast('Failed to load client', 'error');
    } finally {
      setLoading(false);
    }
  }, [clientId, router]);

  useEffect(() => {
    if (clientId) fetchClientData();
  }, [clientId, fetchClientData]);

  // BUG FIX: Added proper client-side validation with per-field error messages
  // instead of generic alert() popups
  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim()) e.lastName = 'Last name is required';
    if (!phone.trim()) e.phone = 'Phone number is required';
    // BUG FIX: DB has CHECK constraint for phone format
    if (phone.trim() && !/^\+?[1-9]\d{1,14}$/.test(phone.trim())) {
      e.phone = 'Phone must be in E.164 format, e.g. +15551234567';
    }
    if (!addressLine1.trim()) e.addressLine1 = 'Address is required';
    if (!city.trim()) e.city = 'City is required';
    if (!state.trim()) e.state = 'State is required';
    if (!zipCode.trim()) e.zipCode = 'ZIP code is required';
    // BUG FIX: DB has CHECK constraint for zip_code format
    if (zipCode.trim() && !/^\d{5}(-\d{4})?$/.test(zipCode.trim())) {
      e.zipCode = 'ZIP code must be 5 digits or 5+4 format (e.g. 12345 or 12345-6789)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !validate()) return;

    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from('client_profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          address_line1: addressLine1.trim(),
          address_line2: addressLine2.trim() || null,
          city: city.trim(),
          state: state.trim(),
          zip_code: zipCode.trim(),
          communication_preference: communicationPreference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId);

      if (profileError) {
        showToast(profileError.message || 'Failed to update profile', 'error');
        return;
      }

      const { error: userError } = await supabase
        .from('users')
        .update({ account_status: accountStatus, updated_at: new Date().toISOString() })
        .eq('id', client.user_id);

      if (userError) {
        showToast('Profile saved, but failed to update account status', 'error');
        return;
      }

      showToast('Client profile updated!');
      // BUG FIX: was using router.push which navigates away before toast shows
      setTimeout(() => router.push(`/client-admin/clients/${clientId}`), 800);
    } catch {
      showToast('Failed to update client profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <span>Loading client…</span>
      </div>
    </div>
  );

  if (!client) return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-xl p-4 flex items-start gap-3 max-w-sm mx-auto mt-16">
        <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> Client not found
      </div>
    </div>
  );

  const Field = ({ label, id, required, error, children }: {
    label: string; id: string; required?: boolean; error?: string; children: React.ReactNode;
  }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold" htmlFor={id}>
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <span className="text-xs text-destructive flex items-center gap-1"><AlertTriangle size={11} />{error}</span>}
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-destructive'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-7">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Client Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">{client.first_name} {client.last_name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Personal Info */}
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[17px] font-bold">Personal Information</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First Name" id="firstName" required error={errors.firstName}>
                <input
                  id="firstName"
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${errors.firstName ? 'border-destructive' : 'border-border'}`}
                  value={firstName}
                  onChange={e => { setFirstName(e.target.value); if (errors.firstName) setErrors(ev => ({ ...ev, firstName: '' })); }}
                  required
                />
              </Field>
              <Field label="Last Name" id="lastName" required error={errors.lastName}>
                <input
                  id="lastName"
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${errors.lastName ? 'border-destructive' : 'border-border'}`}
                  value={lastName}
                  onChange={e => { setLastName(e.target.value); if (errors.lastName) setErrors(ev => ({ ...ev, lastName: '' })); }}
                  required
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[17px] font-bold">Contact Information</h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <Field label="Email (Read-only)" id="email">
              <input
                id="email" type="email"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted text-muted-foreground cursor-not-allowed"
                value={email} disabled
              />
              <span className="text-xs text-muted-foreground">Email cannot be changed from this interface</span>
            </Field>
            <Field label="Phone Number" id="phone" required error={errors.phone}>
              <input
                id="phone" type="tel"
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${errors.phone ? 'border-destructive' : 'border-border'}`}
                value={phone} placeholder="+15551234567"
                onChange={e => { setPhone(e.target.value); if (errors.phone) setErrors(ev => ({ ...ev, phone: '' })); }}
                required
              />
              <span className="text-xs text-muted-foreground">Format: +[country code][number], e.g. +15551234567</span>
            </Field>
            <Field label="Communication Preference" id="commPref">
              <select
                id="commPref"
                className="w-full max-w-[240px] px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                value={communicationPreference}
                onChange={e => setCommunicationPreference(e.target.value)}
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="sms">SMS</option>
                <option value="both">Email & Phone</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Address */}
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[17px] font-bold">Address</h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <Field label="Address Line 1" id="addr1" required error={errors.addressLine1}>
              <input
                id="addr1"
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${errors.addressLine1 ? 'border-destructive' : 'border-border'}`}
                value={addressLine1} placeholder="Street address"
                onChange={e => { setAddressLine1(e.target.value); if (errors.addressLine1) setErrors(ev => ({ ...ev, addressLine1: '' })); }}
                required
              />
            </Field>
            <Field label="Address Line 2" id="addr2">
              <input
                id="addr2"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                value={addressLine2} placeholder="Apt, suite, etc. (optional)"
                onChange={e => setAddressLine2(e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="City" id="city" required error={errors.city}>
                <input
                  id="city"
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${errors.city ? 'border-destructive' : 'border-border'}`}
                  value={city}
                  onChange={e => { setCity(e.target.value); if (errors.city) setErrors(ev => ({ ...ev, city: '' })); }}
                  required
                />
              </Field>
              <Field label="State" id="state" required error={errors.state}>
                <input
                  id="state"
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${errors.state ? 'border-destructive' : 'border-border'}`}
                  value={state} placeholder="CA"
                  onChange={e => { setState(e.target.value); if (errors.state) setErrors(ev => ({ ...ev, state: '' })); }}
                  required
                />
              </Field>
              <Field label="ZIP Code" id="zip" required error={errors.zipCode}>
                <input
                  id="zip"
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${errors.zipCode ? 'border-destructive' : 'border-border'}`}
                  value={zipCode} placeholder="12345"
                  onChange={e => { setZipCode(e.target.value); if (errors.zipCode) setErrors(ev => ({ ...ev, zipCode: '' })); }}
                  required
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[17px] font-bold">Account Settings</h2>
          </div>
          <div className="p-6">
            <Field label="Account Status" id="accStatus">
              <select
                id="accStatus"
                className="w-full max-w-[200px] px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                value={accountStatus}
                onChange={e => setAccountStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
              <span className="text-xs text-muted-foreground">Setting to inactive will prevent the user from logging in</span>
            </Field>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
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
              <><Loader2 size={16} className="animate-spin" /> Saving…</>
            ) : (
              <><Save size={15} /> Save Changes</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
