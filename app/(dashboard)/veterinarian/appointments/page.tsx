'use client';

import { useState } from 'react';
import { supabase } from '@/lib/auth-client';
import useSWR from 'swr';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar as CalendarIcon, User, FileText, MapPin } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';

// 1. Improved Fetcher that handles your Schema Relationships
const fetcher = async () => {
  // A. Get the current Logged-In User
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // B. IMPORTANT: Get the 'veterinarian_profile' ID for this user
  // (Because appointments table uses profile ID, not auth user ID)
  const { data: vetProfile } = await supabase
    .from('veterinarian_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!vetProfile) return [];

  // C. Fetch Appointments for this Vet Profile
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_start,
      scheduled_end,
      appointment_status,
      reason_for_visit,
      pets (
        name,
        species,
        breed,
        client_profiles (
          first_name,
          last_name
        )
      )
    `)
    .eq('veterinarian_id', vetProfile.id)
    .order('scheduled_start', { ascending: true });

  if (error) throw error;
  return data;
};

export default function AppointmentsPage() {
  const { data: appointments = [], isLoading } = useSWR('my-appointments', fetcher);
  
  const [date, setDate] = useState<Date | undefined>(new Date());

  // 2. Parse Dates using 'scheduled_start'
  const appointmentDates = appointments.map((app: any) => parseISO(app.scheduled_start));

  // 3. Filter for Selected Date
  const selectedDateAppointments = appointments.filter((app: any) => 
    date && isSameDay(parseISO(app.scheduled_start), date)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
        <p className="text-gray-500">Manage your patient appointments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Calendar */}
        <div className="md:col-span-4 lg:col-span-3 space-y-4">
          <Card>
            <CardContent className="p-4 flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border shadow-sm"
                classNames={{
                   today: `border-2 border-green-500 text-green-700 font-bold hover:bg-green-50` 
                }}
                modifiers={{
                  hasAppointment: appointmentDates
                }}
                modifiersClassNames={{
                  hasAppointment: "bg-green-100 text-green-900 font-bold hover:bg-green-200"
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Scheduled for {date ? format(date, 'MMM do') : 'Selected Date'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedDateAppointments.length}
              </div>
              <p className="text-xs text-muted-foreground">Patients</p>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: List */}
        <div className="md:col-span-8 lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CalendarIcon className="text-green-600 h-5 w-5" />
              {date ? format(date, 'EEEE, MMMM do, yyyy') : 'Select a date'}
            </h2>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-gray-400">Loading schedule...</div>
          ) : selectedDateAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
              <div className="bg-gray-50 p-4 rounded-full mb-3">
                <CalendarIcon className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No appointments scheduled.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {selectedDateAppointments.map((app: any) => {
                // Helper to get owner name safely
                const owner = app.pets?.client_profiles;
                const ownerName = owner ? `${owner.first_name} ${owner.last_name}` : 'Unknown Owner';

                return (
                  <Card key={app.id} className="group hover:border-green-400 transition-colors">
                    <CardContent className="p-5 flex flex-col md:flex-row gap-6 items-start md:items-center">
                      
                      {/* Time Slot */}
                      <div className="flex flex-col items-center justify-center min-w-[80px] p-2 bg-green-50 text-green-700 rounded-lg">
                        <Clock size={18} className="mb-1" />
                        <span className="font-bold text-lg">
                          {format(parseISO(app.scheduled_start), 'h:mm a')}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-xl text-gray-800">{app.pets?.name}</h3>
                          <Badge variant="outline" className="text-xs font-normal bg-gray-50">
                            {app.pets?.species} • {app.pets?.breed}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <User size={14} />
                            <span>Owner: {ownerName}</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-md text-sm text-gray-700">
                          <FileText size={16} className="mt-0.5 text-gray-400 shrink-0" />
                          <p>{app.reason_for_visit || 'Routine Checkup'}</p>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex flex-col items-end gap-2">
                         <Badge className={`
                           ${app.appointment_status === 'confirmed' ? 'bg-green-600' : 
                             app.appointment_status === 'pending' ? 'bg-orange-500' : 
                             app.appointment_status === 'completed' ? 'bg-blue-600' : 'bg-gray-400'}
                         `}>
                           {app.appointment_status}
                         </Badge>
                      </div>

                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}