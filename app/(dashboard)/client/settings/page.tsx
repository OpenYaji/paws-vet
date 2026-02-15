'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/auth-client';
import { 
  Settings as SettingsIcon, 
  User, 
  Lock, 
  Bell, 
  Mail,
  Phone,
  MapPin,
  Save,
  Camera,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Home
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Philippine-specific Validation Schemas
const profileSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-ZñÑ\s'-]+$/i, 'First name contains invalid characters'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-ZñÑ\s'-]+$/i, 'Last name contains invalid characters'),
  phone: z.string()
    .regex(/^(\+63|0)\d{10}$/, 'Invalid Philippine mobile number (e.g., 09123456789 or +639123456789)'),
  alternatePhone: z.string()
    .regex(/^(\+63|0)?\d{10}$/, 'Invalid Philippine mobile number')
    .optional()
    .or(z.literal('')),
  addressLine1: z.string()
    .min(5, 'House/Building and Street required')
    .max(100, 'Address must be less than 100 characters'),
  addressLine2: z.string()
    .max(100, 'Address line 2 must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  barangay: z.string()
    .min(2, 'Barangay is required')
    .max(50, 'Barangay must be less than 50 characters'),
  city: z.string()
    .min(2, 'City/Municipality is required')
    .max(50, 'City must be less than 50 characters')
    .regex(/^[a-zA-ZñÑ\s.]+$/i, 'City contains invalid characters'),
  province: z.string()
    .min(2, 'Province is required')
    .max(50, 'Province must be less than 50 characters'),
  zipCode: z.string()
    .regex(/^\d{4}$/, 'Invalid ZIP code (4 digits required)'),
  country: z.literal('Philippines'),
  communicationPreference: z.enum(['email', 'phone', 'sms', 'zoom']),
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  appointmentReminders: z.boolean(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface ClientProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  alternate_phone: string | null;
  address_line1: string;
  address_line2: string | null;
  barangay: string;
  city: string;
  province: string;
  zip_code: string;
  country: string;
  communication_preference: string;
  notes: string | null;
  avatar_url: string | null;
}

export default function ClientSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    control: controlProfile,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting, isDirty: isProfileDirty },
    reset: resetProfile,
    watch: watchProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      alternatePhone: '',
      addressLine1: '',
      addressLine2: '',
      barangay: '',
      city: '',
      province: '',
      zipCode: '',
      country: 'Philippines',
      communicationPreference: 'email',
      notes: '',
      emailNotifications: true,
      smsNotifications: false,
      appointmentReminders: true,
    },
    mode: 'onBlur',
  });

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
    reset: resetPassword,
    watch: watchPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  const newPasswordValue = watchPassword('newPassword');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Auth error:', authError);
        toast.error('Failed to load user data');
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || '');

      const { data: profileData, error: profileError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        toast.error('Failed to load profile');
        return;
      }

      if (profileData) {
        setProfile(profileData);
        setAvatarUrl(profileData.avatar_url);
        
        // Reset form with fetched data
        resetProfile({
          firstName: profileData.first_name,
          lastName: profileData.last_name,
          phone: profileData.phone,
          alternatePhone: profileData.alternate_phone || '',
          addressLine1: profileData.address_line1,
          addressLine2: profileData.address_line2 || '',
          barangay: profileData.barangay,
          city: profileData.city,
          province: profileData.province,
          zipCode: profileData.zip_code,
          country: 'Philippines',
          communicationPreference: (profileData.communication_preference as any) || 'email',
          notes: profileData.notes || '',
          emailNotifications: true,
          smsNotifications: false,
          appointmentReminders: true,
        });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitProfile = async (data: ProfileFormData) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('client_profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          alternate_phone: data.alternatePhone || null,
          address_line1: data.addressLine1,
          address_line2: data.addressLine2 || null,
          barangay: data.barangay,
          city: data.city,
          province: data.province,
          zip_code: data.zipCode,
          country: 'Philippines',
          communication_preference: data.communicationPreference,
          notes: data.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
        return;
      }

      toast.success('Profile updated successfully!');
      await fetchUserData();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const onSubmitPassword = async (data: PasswordFormData) => {
    try {
      // First verify current password by attempting sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: data.currentPassword,
      });

      if (signInError) {
        toast.error('Current password is incorrect');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (error) {
        console.error('Error changing password:', error);
        toast.error('Failed to change password: ' + error.message);
        return;
      }

      toast.success('Password changed successfully!');
      resetPassword();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !profile) return;

    const file = e.target.files[0];
    
    // Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPG, PNG, GIF, or WebP)');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.user_id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('client-avatars')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload avatar');
        return;
      }

      const { data } = supabase.storage
        .from('client-avatars')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from('client_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) {
        console.error('Update error:', updateError);
        toast.error('Failed to update avatar');
        return;
      }

      setAvatarUrl(publicUrl);
      toast.success('Avatar updated successfully!');
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPasswordValue || '');
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = ['bg-red-500', 'bg-red-400', 'bg-yellow-400', 'bg-yellow-300', 'bg-green-400', 'bg-green-500'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <SettingsIcon className="w-12 h-12 mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary" />
          Account Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your profile, preferences, and security settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={avatarUrl || undefined} alt={watchProfile('firstName')} />
                  <AvatarFallback className="text-2xl">
                    {watchProfile('firstName')?.[0]}{watchProfile('lastName')?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Camera className="w-4 h-4" />
                      Change Avatar
                    </div>
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, GIF or WebP (max. 2MB)
                  </p>
                </div>
              </div>

              <Separator />

              {/* Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    {...registerProfile('firstName')}
                    className={cn(profileErrors.firstName && "border-red-500 focus-visible:ring-red-500")}
                    placeholder="Juan"
                  />
                  {profileErrors.firstName && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {profileErrors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    {...registerProfile('lastName')}
                    className={cn(profileErrors.lastName && "border-red-500 focus-visible:ring-red-500")}
                    placeholder="Dela Cruz"
                  />
                  {profileErrors.lastName && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {profileErrors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex gap-2">
                  <Mail className="w-5 h-5 text-muted-foreground mt-2" />
                  <Input
                    id="email"
                    value={userEmail}
                    disabled
                    className="bg-secondary/50"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              {/* Phone Numbers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number *</Label>
                  <div className="flex gap-2">
                    <Phone className="w-5 h-5 text-muted-foreground mt-2" />
                    <div className="flex-1">
                      <Input
                        id="phone"
                        {...registerProfile('phone')}
                        className={cn(profileErrors.phone && "border-red-500 focus-visible:ring-red-500")}
                        placeholder="09123456789"
                      />
                      {profileErrors.phone && (
                        <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          {profileErrors.phone.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alternatePhone">Alternate Mobile</Label>
                  <div className="flex gap-2">
                    <Phone className="w-5 h-5 text-muted-foreground mt-2" />
                    <div className="flex-1">
                      <Input
                        id="alternatePhone"
                        {...registerProfile('alternatePhone')}
                        className={cn(profileErrors.alternatePhone && "border-red-500 focus-visible:ring-red-500")}
                        placeholder="09987654321"
                      />
                      {profileErrors.alternatePhone && (
                        <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          {profileErrors.alternatePhone.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Home className="w-5 h-5 text-muted-foreground" />
                  <Label className="text-base font-semibold">Philippine Address</Label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="addressLine1">House/Building & Street *</Label>
                  <Input
                    id="addressLine1"
                    {...registerProfile('addressLine1')}
                    className={cn(profileErrors.addressLine1 && "border-red-500 focus-visible:ring-red-500")}
                    placeholder="123 Rizal Street"
                  />
                  {profileErrors.addressLine1 && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {profileErrors.addressLine1.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Apartment, Suite, Floor (Optional)</Label>
                  <Input
                    id="addressLine2"
                    {...registerProfile('addressLine2')}
                    className={cn(profileErrors.addressLine2 && "border-red-500 focus-visible:ring-red-500")}
                    placeholder="Unit 4B, 2nd Floor"
                  />
                  {profileErrors.addressLine2 && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {profileErrors.addressLine2.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="barangay">Barangay *</Label>
                    <Input
                      id="barangay"
                      {...registerProfile('barangay')}
                      className={cn(profileErrors.barangay && "border-red-500 focus-visible:ring-red-500")}
                      placeholder="Barangay Loyola Heights"
                    />
                    {profileErrors.barangay && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {profileErrors.barangay.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City/Municipality *</Label>
                    <Input
                      id="city"
                      {...registerProfile('city')}
                      className={cn(profileErrors.city && "border-red-500 focus-visible:ring-red-500")}
                      placeholder="Quezon City"
                    />
                    {profileErrors.city && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {profileErrors.city.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="province">Province *</Label>
                    <Input
                      id="province"
                      {...registerProfile('province')}
                      className={cn(profileErrors.province && "border-red-500 focus-visible:ring-red-500")}
                      placeholder="Metro Manila"
                    />
                    {profileErrors.province && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {profileErrors.province.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code *</Label>
                    <Input
                      id="zipCode"
                      {...registerProfile('zipCode')}
                      className={cn(profileErrors.zipCode && "border-red-500 focus-visible:ring-red-500")}
                      placeholder="1108"
                      maxLength={4}
                    />
                    {profileErrors.zipCode && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {profileErrors.zipCode.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    {...registerProfile('country')}
                    disabled
                    className="bg-secondary/50"
                    value="Philippines"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  {...registerProfile('notes')}
                  className={cn(profileErrors.notes && "border-red-500 focus-visible:ring-red-500")}
                  placeholder="Any additional information..."
                  rows={3}
                />
                <div className="flex justify-between">
                  {profileErrors.notes ? (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {profileErrors.notes.message}
                    </p>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {watchProfile('notes')?.length || 0}/500
                  </span>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isProfileSubmitting || !isProfileDirty} 
                className="w-full md:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                {isProfileSubmitting ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Communication Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Communication Preferences
            </CardTitle>
            <CardDescription>
              Choose how you want to receive notifications and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="communicationPreference">Preferred Contact Method</Label>
                <Controller
                  name="communicationPreference"
                  control={controlProfile}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={cn(profileErrors.communicationPreference && "border-red-500")}>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                        <SelectItem value="sms">SMS/Text</SelectItem>
                        <SelectItem value="zoom">Zoom Interview</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates via email
                    </p>
                  </div>
                  <Controller
                    name="emailNotifications"
                    control={controlProfile}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive text message alerts
                    </p>
                  </div>
                  <Controller
                    name="smsNotifications"
                    control={controlProfile}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Appointment Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminders before shelter visits
                    </p>
                  </div>
                  <Controller
                    name="appointmentReminders"
                    control={controlProfile}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isProfileSubmitting || !isProfileDirty} 
                className="w-full md:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password *</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...registerPassword('currentPassword')}
                  className={cn(passwordErrors.currentPassword && "border-red-500 focus-visible:ring-red-500")}
                  placeholder="Enter current password"
                />
                {passwordErrors.currentPassword && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {passwordErrors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password *</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    {...registerPassword('newPassword')}
                    className={cn("pr-10", passwordErrors.newPassword && "border-red-500 focus-visible:ring-red-500")}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {passwordErrors.newPassword.message}
                  </p>
                )}
                
                {/* Password Strength Indicator */}
                {newPasswordValue && (
                  <div className="space-y-2 mt-2">
                    <div className="flex gap-1 h-1">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex-1 rounded-full transition-all duration-300",
                            i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-gray-200"
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Strength: <span className={cn("font-medium", strengthColors[passwordStrength - 1]?.replace('bg-', 'text-'))}>
                        {strengthLabels[passwordStrength]}
                      </span>
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className={cn(newPasswordValue.length >= 8 && "text-green-600 flex items-center gap-1")}>
                        {newPasswordValue.length >= 8 ? <CheckCircle2 className="w-3 h-3" /> : '•'} At least 8 characters
                      </li>
                      <li className={cn(/[A-Z]/.test(newPasswordValue) && "text-green-600 flex items-center gap-1")}>
                        {/[A-Z]/.test(newPasswordValue) ? <CheckCircle2 className="w-3 h-3" /> : '•'} One uppercase letter
                      </li>
                      <li className={cn(/[a-z]/.test(newPasswordValue) && "text-green-600 flex items-center gap-1")}>
                        {/[a-z]/.test(newPasswordValue) ? <CheckCircle2 className="w-3 h-3" /> : '•'} One lowercase letter
                      </li>
                      <li className={cn(/[0-9]/.test(newPasswordValue) && "text-green-600 flex items-center gap-1")}>
                        {/[0-9]/.test(newPasswordValue) ? <CheckCircle2 className="w-3 h-3" /> : '•'} One number
                      </li>
                      <li className={cn(/[^A-Za-z0-9]/.test(newPasswordValue) && "text-green-600 flex items-center gap-1")}>
                        {/[^A-Za-z0-9]/.test(newPasswordValue) ? <CheckCircle2 className="w-3 h-3" /> : '•'} One special character
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...registerPassword('confirmPassword')}
                    className={cn("pr-10", passwordErrors.confirmPassword && "border-red-500 focus-visible:ring-red-500")}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {passwordErrors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isPasswordSubmitting}
                variant="default"
                className="w-full md:w-auto"
              >
                <Lock className="w-4 h-4 mr-2" />
                {isPasswordSubmitting ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}