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
    <div className="page">
      <div className="loading-state"><div className="spinner" /><span>Loading client…</span></div>
    </div>
  );

  if (!client) return (
    <div className="page">
      <div className="alert alert-error" style={{ maxWidth: 400, margin: '60px auto' }}>
        <AlertTriangle size={18} /> Client not found
      </div>
    </div>
  );

  const Field = ({ label, id, required, error, children }: {
    label: string; id: string; required?: boolean; error?: string; children: React.ReactNode;
  }) => (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
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

      <style>{`
        .form-input.error { border-color: var(--red); }
        .form-input.error:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button className="btn btn-outline btn-sm btn-icon" onClick={() => router.back()}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 750, margin: 0, letterSpacing: '-0.5px' }}>
            Edit Client Profile
          </h1>
          <p style={{ margin: 0, marginTop: 4, fontSize: 14, color: 'var(--slate)' }}>
            {client.first_name} {client.last_name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Personal Info */}
        <div className="card animate-in">
          <div className="card-header"><h2 className="card-title">Personal Information</h2></div>
          <div className="card-body">
            <div className="grid-2">
              <Field label="First Name" id="firstName" required error={errors.firstName}>
                <input
                  id="firstName" className={`form-input ${errors.firstName ? 'error' : ''}`}
                  value={firstName}
                  onChange={e => { setFirstName(e.target.value); if (errors.firstName) setErrors(ev => ({ ...ev, firstName: '' })); }}
                  required
                />
              </Field>
              <Field label="Last Name" id="lastName" required error={errors.lastName}>
                <input
                  id="lastName" className={`form-input ${errors.lastName ? 'error' : ''}`}
                  value={lastName}
                  onChange={e => { setLastName(e.target.value); if (errors.lastName) setErrors(ev => ({ ...ev, lastName: '' })); }}
                  required
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="card animate-in animate-in-delay-1">
          <div className="card-header"><h2 className="card-title">Contact Information</h2></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Email (Read-only)" id="email">
              <input
                id="email" type="email" className="form-input"
                value={email} disabled
              />
              <span className="form-hint">Email cannot be changed from this interface</span>
            </Field>
            <Field label="Phone Number" id="phone" required error={errors.phone}>
              <input
                id="phone" type="tel" className={`form-input ${errors.phone ? 'error' : ''}`}
                value={phone} placeholder="+15551234567"
                onChange={e => { setPhone(e.target.value); if (errors.phone) setErrors(ev => ({ ...ev, phone: '' })); }}
                required
              />
              <span className="form-hint">Format: +[country code][number], e.g. +15551234567</span>
            </Field>
            <Field label="Communication Preference" id="commPref">
              <select
                id="commPref" className="form-input" style={{ maxWidth: 240 }}
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
        <div className="card animate-in animate-in-delay-1">
          <div className="card-header"><h2 className="card-title">Address</h2></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Address Line 1" id="addr1" required error={errors.addressLine1}>
              <input
                id="addr1" className={`form-input ${errors.addressLine1 ? 'error' : ''}`}
                value={addressLine1} placeholder="Street address"
                onChange={e => { setAddressLine1(e.target.value); if (errors.addressLine1) setErrors(ev => ({ ...ev, addressLine1: '' })); }}
                required
              />
            </Field>
            <Field label="Address Line 2" id="addr2">
              <input
                id="addr2" className="form-input"
                value={addressLine2} placeholder="Apt, suite, etc. (optional)"
                onChange={e => setAddressLine2(e.target.value)}
              />
            </Field>
            <div className="grid-3">
              <Field label="City" id="city" required error={errors.city}>
                <input
                  id="city" className={`form-input ${errors.city ? 'error' : ''}`}
                  value={city}
                  onChange={e => { setCity(e.target.value); if (errors.city) setErrors(ev => ({ ...ev, city: '' })); }}
                  required
                />
              </Field>
              <Field label="State" id="state" required error={errors.state}>
                <input
                  id="state" className={`form-input ${errors.state ? 'error' : ''}`}
                  value={state} placeholder="CA"
                  onChange={e => { setState(e.target.value); if (errors.state) setErrors(ev => ({ ...ev, state: '' })); }}
                  required
                />
              </Field>
              <Field label="ZIP Code" id="zip" required error={errors.zipCode}>
                <input
                  id="zip" className={`form-input ${errors.zipCode ? 'error' : ''}`}
                  value={zipCode} placeholder="12345"
                  onChange={e => { setZipCode(e.target.value); if (errors.zipCode) setErrors(ev => ({ ...ev, zipCode: '' })); }}
                  required
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="card animate-in animate-in-delay-2">
          <div className="card-header"><h2 className="card-title">Account Settings</h2></div>
          <div className="card-body">
            <Field label="Account Status" id="accStatus">
              <select
                id="accStatus" className="form-input" style={{ maxWidth: 200 }}
                value={accountStatus}
                onChange={e => setAccountStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
              <span className="form-hint">Setting to inactive will prevent the user from logging in</span>
            </Field>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="button" className="btn btn-outline" onClick={() => router.back()} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
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
