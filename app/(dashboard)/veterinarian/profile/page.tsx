'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Award, Stethoscope, Save, Loader2, Calendar } from 'lucide-react';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '', // Read-only from Auth
    phone: '',
    license_number: '',
    specializations: '', // We'll convert Array <-> String
    biography: '',
    consultation_fee: '',
    hire_date: '',
  });

  // 1. Fetch Profile Data on Load
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('veterinarian_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error if new user

        if (data) {
          setProfile({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            email: user.email || '',
            phone: data.phone || '',
            license_number: data.license_number || '',
            // Convert Array ['Surgery', 'Cats'] -> String "Surgery, Cats"
            specializations: data.specializations ? data.specializations.join(', ') : '',
            biography: data.biography || '',
            consultation_fee: data.consultation_fee || '',
            hire_date: data.hire_date || '',
          });
        } else {
            // Pre-fill email if no profile exists yet
            setProfile(prev => ({...prev, email: user.email || ''}));
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // 2. Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      if (!profile.hire_date) {
        throw new Error("Date Hired is required.");
      }

      // --- STEP 1: FIX THE FOREIGN KEY ERROR ---
      // Check if this user exists in the 'public.users' table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      // If they don't exist yet, create them!
      if (!existingUser) {
        const { error: userError } = await supabase
          .from('users')
          .insert([{
            id: user.id,           // Link to Supabase Auth ID
            email: user.email,
            role: 'veterinarian',  // Important: Must match your DB Enum
            account_status: 'active'
          }]);
        
        if (userError) {
            console.error("User Sync Error:", userError);
            throw new Error("Could not initialize user record. Check console.");
        }
      }
      // -----------------------------------------

      // --- STEP 2: NOW SAVE THE PROFILE ---
      const specsArray = profile.specializations
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const updates = {
        user_id: user.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        license_number: profile.license_number,
        specializations: specsArray,
        biography: profile.biography,
        consultation_fee: Number(profile.consultation_fee),
        hire_date: profile.hire_date,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('veterinarian_profiles')
        .upsert(updates, { onConflict: 'user_id' });

      if (error) throw error;
      alert("Profile updated successfully!");

    } catch (error: any) {
      console.error(error); // Check console for detailed SQL errors
      alert("Error saving profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
        <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
          <AvatarImage src="" /> {/* Placeholder for now */}
          <AvatarFallback className="bg-green-600 text-white text-2xl font-bold">
            {profile.first_name?.[0]}{profile.last_name?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-900">
            Dr. {profile.first_name} {profile.last_name}
          </h1>
          <div className="flex items-center justify-center md:justify-start gap-2 text-gray-500 mt-1">
            <Award size={16} />
            <span>{profile.license_number || 'No License Added'}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
             {profile.specializations.split(',').filter(s => s.trim()).map((spec, i) => (
               <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                 {spec.trim()}
               </Badge>
             ))}
          </div>
        </div>
      </div>

      {/* FORM SECTION */}
      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Main Info */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your contact details and biography</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input 
                        className="pl-9" 
                        value={profile.first_name}
                        onChange={e => setProfile({...profile, first_name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input 
                      value={profile.last_name}
                      onChange={e => setProfile({...profile, last_name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email (Account)</Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input className="pl-9 bg-gray-50" value={profile.email} disabled />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input 
                         className="pl-9"
                         placeholder="+1 234 567 890"
                         value={profile.phone}
                         onChange={e => setProfile({...profile, phone: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Biography</Label>
                  <Textarea 
                    className="min-h-[120px]" 
                    placeholder="Tell clients about your experience and background..."
                    value={profile.biography}
                    onChange={e => setProfile({...profile, biography: e.target.value})}
                  />
                </div>

              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Professional Details */}
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Professional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                <div className="space-y-2">
                  <Label>License Number</Label>
                  <div className="relative">
                    <Award className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input 
                      className="pl-9 font-mono" 
                      placeholder="VET-12345"
                      value={profile.license_number}
                      onChange={e => setProfile({...profile, license_number: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Consultation Fee</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₱</span>
                    <Input 
                      type="number" 
                      className="pl-7" 
                      placeholder="0.00"
                      value={profile.consultation_fee}
                      onChange={e => setProfile({...profile, consultation_fee: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Specializations</Label>
                  <div className="relative">
                    <Stethoscope className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input 
                      className="pl-9" 
                      placeholder="e.g. Surgery, Dermatology (comma separated)"
                      value={profile.specializations}
                      onChange={e => setProfile({...profile, specializations: e.target.value})}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Separate multiple skills with commas.</p>
                </div>

                <div className="space-y-2">
                  <Label>Date Hired</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input 
                      className="pl-9"  
                      placeholder="e.g. 2020-05-15"
                      value={profile.hire_date}
                      onChange={e => setProfile({...profile, hire_date: e.target.value})}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={saving} 
                  className="w-full bg-green-600 hover:bg-green-700 mt-4"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </>
                  )}
                </Button>

              </CardContent>
            </Card>
          </div>

        </div>
      </form>
    </div>
  );
}