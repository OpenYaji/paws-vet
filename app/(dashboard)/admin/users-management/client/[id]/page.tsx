'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, User, Heart, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClientDetails();
  }, [params.id]);

  async function loadClientDetails() {
    try {
      const response = await fetch(`/api/user/client/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch client details');
      const clientData = await response.json();
      setData(clientData);
    } catch (error) {
      console.error('Error loading client details:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data || !data.user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Client Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This user does not exist or does not have a client profile.
            </p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { user, profile, pets, emergencyContacts, recentAppointments } = data;

  if (!profile) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{user.email}</h1>
            <p className="text-muted-foreground">Client Profile</p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Profile Not Created</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This user exists but hasn't completed their client profile yet.
            </p>
            <Button>Create Profile</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {profile?.first_name} {profile?.last_name}
          </h1>
          <p className="text-muted-foreground">Client Profile</p>
        </div>
        <Badge variant={user.account_status === 'active' ? 'default' : 'secondary'}>
          {user.account_status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="text-muted-foreground mt-1" size={18} />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="text-muted-foreground mt-1" size={18} />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{profile?.phone || 'N/A'}</p>
              </div>
            </div>
            {profile?.alternate_phone && (
              <div className="flex items-start gap-3">
                <Phone className="text-muted-foreground mt-1" size={18} />
                <div>
                  <p className="text-sm text-muted-foreground">Alternate Phone</p>
                  <p className="font-medium">{profile.alternate_phone}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <MapPin className="text-muted-foreground mt-1" size={18} />
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">
                  {profile?.address_line1}<br />
                  {profile?.address_line2 && <>{profile.address_line2}<br /></>}
                  {profile?.city}, {profile?.state} {profile?.zip_code}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="text-muted-foreground mt-1" size={18} />
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium">
                  {new Date(profile?.registration_date || user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <Tabs defaultValue="pets" className="w-full">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pets">
                  <Heart className="mr-2" size={16} />
                  Pets ({pets.length})
                </TabsTrigger>
                <TabsTrigger value="appointments">
                  <Calendar className="mr-2" size={16} />
                  Appointments
                </TabsTrigger>
                <TabsTrigger value="emergency">
                  <AlertCircle className="mr-2" size={16} />
                  Emergency Contacts
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="pets" className="space-y-4">
                {pets.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No registered pets</p>
                ) : (
                  pets.map((pet: any) => (
                    <Card key={pet.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <h3 className="font-semibold text-lg">{pet.name}</h3>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p><span className="font-medium">Species:</span> {pet.species}</p>
                              <p><span className="font-medium">Breed:</span> {pet.breed || 'N/A'}</p>
                              <p><span className="font-medium">Gender:</span> {pet.gender || 'N/A'}</p>
                              {pet.date_of_birth && (
                                <p><span className="font-medium">Age:</span> {
                                  Math.floor((new Date().getTime() - new Date(pet.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                                } years</p>
                              )}
                              {pet.weight && <p><span className="font-medium">Weight:</span> {pet.weight} kg</p>}
                              {pet.microchip_number && (
                                <p><span className="font-medium">Microchip:</span> {pet.microchip_number}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant={pet.is_spayed_neutered ? 'secondary' : 'outline'}>
                            {pet.is_spayed_neutered ? 'Spayed/Neutered' : 'Intact'}
                          </Badge>
                        </div>
                        {pet.special_needs && (
                          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                            <p className="text-sm font-medium text-amber-900">Special Needs:</p>
                            <p className="text-sm text-amber-700">{pet.special_needs}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="appointments" className="space-y-4">
                {recentAppointments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No appointments found</p>
                ) : (
                  recentAppointments.map((apt: any) => (
                    <Card key={apt.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{apt.appointment_type}</h3>
                              <Badge variant={
                                apt.appointment_status === 'completed' ? 'default' :
                                apt.appointment_status === 'cancelled' ? 'destructive' :
                                'secondary'
                              }>
                                {apt.appointment_status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(apt.scheduled_start).toLocaleString()}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Veterinarian:</span>{' '}
                              Dr. {apt.veterinarian?.first_name} {apt.veterinarian?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{apt.reason_for_visit}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="emergency" className="space-y-4">
                {emergencyContacts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No emergency contacts</p>
                ) : (
                  emergencyContacts.map((contact: any) => (
                    <Card key={contact.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{contact.contact_name}</h3>
                            <Badge variant="outline">Priority {contact.priority_order}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                          <div className="space-y-1 text-sm">
                            <p><Phone className="inline mr-2" size={14} />{contact.phone}</p>
                            {contact.alternate_phone && (
                              <p><Phone className="inline mr-2" size={14} />{contact.alternate_phone}</p>
                            )}
                            {contact.email && (
                              <p><Mail className="inline mr-2" size={14} />{contact.email}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
