'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, Calendar, Award, Briefcase, Clock } from 'lucide-react';

export default function VetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVetDetails();
  }, [params.id]);

  async function loadVetDetails() {
    try {
      const response = await fetch(`/api/user/veterinarian/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch veterinarian details');
      const vetData = await response.json();
      setData(vetData);
    } catch (error) {
      console.error('Error loading veterinarian details:', error);
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

  if (!data) {
    return <div>Veterinarian not found</div>;
  }

  const { user, profile, upcomingAppointments } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            Dr. {profile?.first_name} {profile?.last_name}
          </h1>
          <p className="text-muted-foreground">Veterinarian Profile</p>
        </div>
        <Badge variant={profile?.employment_status === 'full_time' ? 'default' : 'secondary'}>
          {profile?.employment_status?.replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Award className="text-muted-foreground mt-1" size={18} />
              <div>
                <p className="text-sm text-muted-foreground">License Number</p>
                <p className="font-medium">{profile?.license_number}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Briefcase className="text-muted-foreground mt-1" size={18} />
              <div>
                <p className="text-sm text-muted-foreground">Experience</p>
                <p className="font-medium">{profile?.years_of_experience} years</p>
              </div>
            </div>
            {profile?.specializations?.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Specializations</p>
                <div className="flex flex-wrap gap-2">
                  {profile.specializations.map((spec: string) => (
                    <Badge key={spec} variant="outline">{spec}</Badge>
                  ))}
                </div>
              </div>
            )}
            {profile?.consultation_fee && (
              <div>
                <p className="text-sm text-muted-foreground">Consultation Fee</p>
                <p className="font-medium text-lg">${profile.consultation_fee}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming Appointments ({upcomingAppointments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No upcoming appointments</p>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((apt: any) => (
                  <Card key={apt.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-muted-foreground" />
                            <p className="font-medium">
                              {new Date(apt.scheduled_start).toLocaleString()}
                            </p>
                          </div>
                          <p className="text-sm">
                            <span className="font-medium">Pet:</span> {apt.pet?.name} ({apt.pet?.species})
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Owner:</span>{' '}
                            {apt.client?.first_name} {apt.client?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{apt.reason_for_visit}</p>
                        </div>
                        <Badge variant={apt.is_emergency ? 'destructive' : 'default'}>
                          {apt.is_emergency ? 'Emergency' : apt.appointment_type}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
