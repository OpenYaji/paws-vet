'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

type UserRole = 'client' | 'veterinarian' | 'admin';

interface ClientFormData {
  firstName: string;
  lastName: string;
  phone: string;
  alternatePhone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  communicationPreference: 'email' | 'sms' | 'phone' | 'any';
}

interface VeterinarianFormData {
  firstName: string;
  lastName: string;
  licenseNumber: string;
  phone: string;
  yearsOfExperience: number;
  consultationFee: number;
  hireDate: string;
}

interface AdminFormData {
  firstName: string;
  lastName: string;
  employeeId: string;
  phone: string;
  department?: string;
  position: string;
  hireDate: string;
}

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Client-specific fields
  const [clientData, setClientData] = useState<ClientFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    alternatePhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    communicationPreference: 'email',
  });

  // Veterinarian-specific fields
  const [vetData, setVetData] = useState<VeterinarianFormData>({
    firstName: '',
    lastName: '',
    licenseNumber: '',
    phone: '',
    yearsOfExperience: 0,
    consultationFee: 0,
    hireDate: new Date().toISOString().split('T')[0],
  });

  // Admin-specific fields
  const [adminData, setAdminData] = useState<AdminFormData>({
    firstName: '',
    lastName: '',
    employeeId: '',
    phone: '',
    department: '',
    position: '',
    hireDate: new Date().toISOString().split('T')[0],
  });

  function handleClientChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    
    // Format phone number on change
    if (name === 'phone' || name === 'alternatePhone') {
      // Remove all non-digit characters except +
      const cleaned = value.replace(/[^\d+]/g, '');
      setClientData((prev) => ({ ...prev, [name]: cleaned }));
    } else {
      setClientData((prev) => ({ ...prev, [name]: value }));
    }
  }

  function handleVetChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.target;
    
    // Format phone number on change
    if (name === 'phone') {
      const cleaned = value.replace(/[^\d+]/g, '');
      setVetData((prev) => ({ ...prev, phone: cleaned }));
    } else {
      setVetData((prev) => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value,
      }));
    }
  }

  function handleAdminChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    
    // Format phone number on change
    if (name === 'phone') {
      const cleaned = value.replace(/[^\d+]/g, '');
      setAdminData((prev) => ({ ...prev, phone: cleaned }));
    } else {
      setAdminData((prev) => ({ ...prev, [name]: value }));
    }
  }

  function validatePhone(phone: string): boolean {
    // Must match: ^\+?[1-9]\d{1,14}$
    // Starts with optional +, then 1-9, then 1-14 more digits
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Move to step 2 (profile information)
    setStep(2);
  }

  async function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // ✅ VALIDATE EVERYTHING FIRST - Before creating any database records
    
    // Validate phone numbers based on role
    if (role === 'client') {
      if (!clientData.firstName.trim() || !clientData.lastName.trim()) {
        setError('First name and last name are required');
        return;
      }
      if (!validatePhone(clientData.phone)) {
        setError('Phone number must be in format: +1234567890 (e.g., +12025551234)');
        return;
      }
      if (clientData.alternatePhone && !validatePhone(clientData.alternatePhone)) {
        setError('Alternate phone number must be in format: +1234567890');
        return;
      }
      if (!clientData.addressLine1.trim()) {
        setError('Street address is required');
        return;
      }
      if (!clientData.city.trim() || !clientData.state.trim()) {
        setError('City and state are required');
        return;
      }
      // Validate ZIP code format
      const zipRegex = /^\d{5}(-\d{4})?$/;
      if (!zipRegex.test(clientData.zipCode)) {
        setError('ZIP code must be in format: 12345 or 12345-6789');
        return;
      }
    } else if (role === 'veterinarian') {
      if (!vetData.firstName.trim() || !vetData.lastName.trim()) {
        setError('First name and last name are required');
        return;
      }
      if (!validatePhone(vetData.phone)) {
        setError('Phone number must be in format: +1234567890');
        return;
      }
      if (!vetData.licenseNumber.trim()) {
        setError('License number is required');
        return;
      }
    } else if (role === 'admin') {
      if (!adminData.firstName.trim() || !adminData.lastName.trim()) {
        setError('First name and last name are required');
        return;
      }
      if (!validatePhone(adminData.phone)) {
        setError('Phone number must be in format: +1234567890');
        return;
      }
      if (!adminData.employeeId.trim() || !adminData.position.trim()) {
        setError('Employee ID and position are required');
        return;
      }
    }

    setIsLoading(true);

    try {
      console.log('Starting signup process for role:', role);
      console.log('All validation passed, creating auth user...');

      // ✅ NOW create auth user - Only after all validation passes
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            role: role,
          },
        },
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Failed to create user account');
        setIsLoading(false);
        return;
      }

      console.log('Auth user created:', authData.user.id);

      // Step 2: Insert into users table
      const { error: userError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: email,
        role: role,
        account_status: 'active',
        email_verified: false,
      });

      if (userError) {
        console.error('User table error:', userError);
        // If user table fails, we should delete the auth user but Supabase doesn't allow that easily
        // Instead, show a clear error message
        setError('Account created but profile setup failed. Please contact support with this email: ' + email);
        setIsLoading(false);
        return;
      }

      console.log('User record created in users table');

      // Step 3: Create role-specific profile
      let profileError = null;

      if (role === 'client') {
        console.log('Creating client profile...');
        const { error } = await supabase.from('client_profiles').insert({
          user_id: authData.user.id,
          first_name: clientData.firstName.trim(),
          last_name: clientData.lastName.trim(),
          phone: clientData.phone,
          alternate_phone: clientData.alternatePhone || null,
          address_line1: clientData.addressLine1.trim(),
          address_line2: clientData.addressLine2?.trim() || null,
          city: clientData.city.trim(),
          state: clientData.state.trim(),
          zip_code: clientData.zipCode,
          communication_preference: clientData.communicationPreference,
        });
        profileError = error;
      } else if (role === 'veterinarian') {
        console.log('Creating veterinarian profile...');
        const { error } = await supabase.from('veterinarian_profiles').insert({
          user_id: authData.user.id,
          first_name: vetData.firstName.trim(),
          last_name: vetData.lastName.trim(),
          license_number: vetData.licenseNumber.trim(),
          phone: vetData.phone,
          years_of_experience: vetData.yearsOfExperience,
          consultation_fee: vetData.consultationFee,
          hire_date: vetData.hireDate,
          employment_status: 'full_time',
        });
        profileError = error;
      } else if (role === 'admin') {
        console.log('Creating admin profile...');
        const { error } = await supabase.from('admin_profiles').insert({
          user_id: authData.user.id,
          first_name: adminData.firstName.trim(),
          last_name: adminData.lastName.trim(),
          employee_id: adminData.employeeId.trim(),
          phone: adminData.phone,
          department: adminData.department?.trim() || null,
          position: adminData.position.trim(),
          hire_date: adminData.hireDate,
        });
        profileError = error;
      }

      if (profileError) {
        console.error('Profile creation error:', profileError);
        setError('Account created but profile setup failed: ' + profileError.message + '. Please contact support.');
        setIsLoading(false);
        return;
      }

      console.log('Profile created successfully. Redirecting...');

      // Success! Redirect based on role
      setTimeout(() => {
        if (role === 'client') {
          window.location.href = '/client/dashboard';
        } else if (role === 'veterinarian') {
          window.location.href = '/veterinarian/dashboard';
        } else if (role === 'admin') {
          window.location.href = '/admin/dashboard';
        }
      }, 500);
    } catch (err) {
      console.error('Unexpected signup error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Back to Home Button */}
        <div className="flex justify-start">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Logo */}
        <div className="flex justify-center">
          <Image src="/images/image.png" alt="PAWS Logo" width={80} height={80} className="rounded-full" />
        </div>

        <Card>
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl">Join PAWS</CardTitle>
            <CardDescription>
              {step === 1 ? 'Create your veterinary clinic account' : 'Complete your profile'}
            </CardDescription>
            <div className="flex justify-center gap-2 pt-2">
              <div className={`h-2 w-16 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`} />
              <div className={`h-2 w-16 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
            </div>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              // Step 1: Basic Account Info
              <form onSubmit={handleStep1Submit} className="space-y-4">
                {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium leading-none">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="role" className="text-sm font-medium leading-none">
                    I am a...
                  </label>
                  <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Pet Owner / Client</SelectItem>
                      <SelectItem value="veterinarian">Veterinarian</SelectItem>
                      <SelectItem value="admin">Clinic Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium leading-none">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full">
                  Continue
                </Button>
              </form>
            ) : (
              // Step 2: Profile Information
              <form onSubmit={handleStep2Submit} className="space-y-4">
                {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}

                {role === 'client' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="firstName" className="text-sm font-medium leading-none">
                          First Name
                        </label>
                        <Input
                          id="firstName"
                          name="firstName"
                          placeholder="John"
                          value={clientData.firstName}
                          onChange={handleClientChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="lastName" className="text-sm font-medium leading-none">
                          Last Name
                        </label>
                        <Input
                          id="lastName"
                          name="lastName"
                          placeholder="Doe"
                          value={clientData.lastName}
                          onChange={handleClientChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="phone" className="text-sm font-medium leading-none">
                          Phone Number *
                        </label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="+12025551234"
                          value={clientData.phone}
                          onChange={handleClientChange}
                          required
                        />
                        <p className="text-xs text-muted-foreground">Include country code: +1</p>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="alternatePhone" className="text-sm font-medium leading-none">
                          Alternate Phone (Optional)
                        </label>
                        <Input
                          id="alternatePhone"
                          name="alternatePhone"
                          type="tel"
                          placeholder="+12025551234"
                          value={clientData.alternatePhone}
                          onChange={handleClientChange}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="addressLine1" className="text-sm font-medium leading-none">
                        Street Address
                      </label>
                      <Input
                        id="addressLine1"
                        name="addressLine1"
                        placeholder="123 Main Street"
                        value={clientData.addressLine1}
                        onChange={handleClientChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="addressLine2" className="text-sm font-medium leading-none">
                        Apartment, Suite, etc. (Optional)
                      </label>
                      <Input
                        id="addressLine2"
                        name="addressLine2"
                        placeholder="Apt 4B"
                        value={clientData.addressLine2}
                        onChange={handleClientChange}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2 col-span-2">
                        <label htmlFor="city" className="text-sm font-medium leading-none">
                          City
                        </label>
                        <Input id="city" name="city" placeholder="New York" value={clientData.city} onChange={handleClientChange} required />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="state" className="text-sm font-medium leading-none">
                          State
                        </label>
                        <Input id="state" name="state" placeholder="NY" value={clientData.state} onChange={handleClientChange} required />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="zipCode" className="text-sm font-medium leading-none">
                          ZIP Code
                        </label>
                        <Input
                          id="zipCode"
                          name="zipCode"
                          placeholder="10001"
                          value={clientData.zipCode}
                          onChange={handleClientChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="communicationPreference" className="text-sm font-medium leading-none">
                          Contact Preference
                        </label>
                        <Select
                          value={clientData.communicationPreference}
                          onValueChange={(value) => setClientData((prev) => ({ ...prev, communicationPreference: value as any }))}
                        >
                          <SelectTrigger id="communicationPreference">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="any">Any</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {role === 'veterinarian' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="firstName" className="text-sm font-medium leading-none">
                          First Name
                        </label>
                        <Input
                          id="firstName"
                          name="firstName"
                          placeholder="Dr. Sarah"
                          value={vetData.firstName}
                          onChange={handleVetChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="lastName" className="text-sm font-medium leading-none">
                          Last Name
                        </label>
                        <Input
                          id="lastName"
                          name="lastName"
                          placeholder="Johnson"
                          value={vetData.lastName}
                          onChange={handleVetChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="licenseNumber" className="text-sm font-medium leading-none">
                          License Number
                        </label>
                        <Input
                          id="licenseNumber"
                          name="licenseNumber"
                          placeholder="VET-12345"
                          value={vetData.licenseNumber}
                          onChange={handleVetChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="phone" className="text-sm font-medium leading-none">
                          Phone Number
                        </label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="+1234567890"
                          value={vetData.phone}
                          onChange={handleVetChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="yearsOfExperience" className="text-sm font-medium leading-none">
                          Years of Experience
                        </label>
                        <Input
                          id="yearsOfExperience"
                          name="yearsOfExperience"
                          type="number"
                          min="0"
                          placeholder="5"
                          value={vetData.yearsOfExperience}
                          onChange={handleVetChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="consultationFee" className="text-sm font-medium leading-none">
                          Consultation Fee ($)
                        </label>
                        <Input
                          id="consultationFee"
                          name="consultationFee"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="75.00"
                          value={vetData.consultationFee}
                          onChange={handleVetChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="hireDate" className="text-sm font-medium leading-none">
                        Hire Date
                      </label>
                      <Input id="hireDate" name="hireDate" type="date" value={vetData.hireDate} onChange={handleVetChange} required />
                    </div>
                  </>
                )}

                {role === 'admin' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="firstName" className="text-sm font-medium leading-none">
                          First Name
                        </label>
                        <Input
                          id="firstName"
                          name="firstName"
                          placeholder="Jane"
                          value={adminData.firstName}
                          onChange={handleAdminChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="lastName" className="text-sm font-medium leading-none">
                          Last Name
                        </label>
                        <Input
                          id="lastName"
                          name="lastName"
                          placeholder="Smith"
                          value={adminData.lastName}
                          onChange={handleAdminChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="employeeId" className="text-sm font-medium leading-none">
                          Employee ID
                        </label>
                        <Input
                          id="employeeId"
                          name="employeeId"
                          placeholder="EMP-001"
                          value={adminData.employeeId}
                          onChange={handleAdminChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="phone" className="text-sm font-medium leading-none">
                          Phone Number
                        </label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="+1234567890"
                          value={adminData.phone}
                          onChange={handleAdminChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="department" className="text-sm font-medium leading-none">
                          Department (Optional)
                        </label>
                        <Input
                          id="department"
                          name="department"
                          placeholder="Administration"
                          value={adminData.department}
                          onChange={handleAdminChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="position" className="text-sm font-medium leading-none">
                          Position
                        </label>
                        <Input
                          id="position"
                          name="position"
                          placeholder="Clinic Manager"
                          value={adminData.position}
                          onChange={handleAdminChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="hireDate" className="text-sm font-medium leading-none">
                        Hire Date
                      </label>
                      <Input id="hireDate" name="hireDate" type="date" value={adminData.hireDate} onChange={handleAdminChange} required />
                    </div>
                  </>
                )}

                <div className="flex gap-4">
                  <Button type="button" variant="outline" className="w-full" onClick={() => setStep(1)} disabled={isLoading}>
                    Back
                  </Button>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}