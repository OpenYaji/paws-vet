'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Clock, Calendar as CalendarIcon, User, FileText, MapPin, Eye } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

// Fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AppointmentsPage() {
  const { data: appointments = [], isLoading } = useSWR('/api/appointments', fetcher);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const router = useRouter();
  const supabase = createClient();
  
  // State for the selected appointment (to show in Modal)
  const [selectedAppt, setSelectedAppt] = useState<any>(null);

  // Parse Dates
  const appointmentDates = appointments.map((app: any) => parseISO(app.scheduled_start));

  // Filter for Selected Date
  const selectedDateAppointments = appointments.filter((app: any) => 
    date && isSameDay(parseISO(app.scheduled_start), date)
  );

  const handleNoShow = async () => {
    if(!selectedAppt) return;

    try{
      const { error } = await supabase
        .from('appointments')
        .update({ appointment_status: 'no-show' })
        .eq('id', selectedAppt.id);

      if(error){
        console.error('Error marking no-show:', error);
        alert('Failed to update appointment status');
        return;
      }
    }
    catch(error: any){
      console.error('Error updating appointment status:', error);
    }
  }

  const handleChangeDate = async (newDate: Date) => {
    if(!selectedAppt) return;

    try{
      const { error } = await supabase
        .from('appointments')
        .update({ scheduled_start: newDate.toISOString() })
        .eq('id', selectedAppt.id);

      if(error){
        console.error('Error rescheduling appointment:', error);
        alert('Failed to reschedule appointment');
        return;
      }
    }
    catch(error: any){
      console.error('Error updating appointment date:', error);
    }
  }
  const handleGoToTriage = async () => {
    if(!selectedAppt) return;

    try{
      const { error } = await supabase
        .from('appointments')
        .update({ appointment_status: 'completed' })
        .eq('id', selectedAppt.id);
      
      if (error) {
        console.error('Error checking in:', error);
        alert('Failed to check in patient');
        return;
      }

      router.push(`/veterinarian/triage?id=${selectedAppt.id}`);
    }
    catch(error: any){
      console.error('Error updating appointment status:', error);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Schedule</h1>
        <p className="text-muted-foreground">Manage your patient appointments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* LEFT: Calendar */}
        <div className="md:col-span-4 lg:col-span-3 space-y-4">
          <Card>
            <CardContent className="p-4 flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border shadow-sm"
                modifiers={{ hasAppointment: appointmentDates }}
                modifiersClassNames={{ hasAppointment: "bg-green-100 text-green-900 font-bold" }}
              />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: List */}
        <div className="md:col-span-8 lg:col-span-9 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CalendarIcon className="text-green-600 h-5 w-5" />
            {date ? format(date, 'EEEE, MMMM do, yyyy') : 'Select a date'}
          </h2>

          {isLoading ? (
            <div className="text-center py-12 text-gray-400">Loading schedule...</div>
          ) : selectedDateAppointments.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">No appointments.</div>
          ) : (
            <div className="grid gap-4">
              {selectedDateAppointments.map((app: any) => {
                const owner = app.pets?.client_profiles;
                const ownerName = owner ? `${owner.first_name} ${owner.last_name}` : 'Unknown Owner';

                return (
                  <Card 
                    key={app.id} 
                    className="group hover:border-green-400 transition-colors cursor-pointer shadow-sm hover:shadow-md"
                    onClick={() => setSelectedAppt(app)} // <--- CLICK HANDLER
                  >
                    <CardContent className="p-5 flex flex-col md:flex-row gap-6 items-center">
                      {/* Time */}
                      <div className="flex flex-col items-center justify-center min-w-[80px] p-2 bg-green-50 text-green-700 rounded-lg">
                        <Clock size={18} className="mb-1" />
                        <span className="font-bold text-lg">
                          {format(parseISO(app.scheduled_start), 'h:mm a')}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-xl text-gray-800">{app.pets?.name || 'Unknown Pet'}</h3>
                          <Badge variant="outline">{app.pets?.species}</Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <User size={14} />
                          <span>Owner: {app.pets?.client_profiles?.first_name} {app.pets?.client_profiles?.last_name}</span>
                        </div>
                        <div className="mt-2 text-sm bg-gray-50 p-2 rounded inline-block text-gray-700">
                           Reason: {app.reason_for_visit}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <Badge className={
                         app.status === 'confirmed' ? 'bg-green-600' : 
                         app.status === 'pending' ? 'bg-orange-500' : 'bg-gray-400'
                      }>
                        {app.status || 'Scheduled'}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- DETAILS MODAL --- */}
      <Dialog open={!!selectedAppt} onOpenChange={(open) => !open && setSelectedAppt(null)}>
        <DialogContent className="sm:max-w-[500px]">
           {selectedAppt && (
             <>
               <DialogHeader>
                 <DialogTitle>Appointment Details</DialogTitle>
                 <DialogDescription>
                   Scheduled for {format(parseISO(selectedAppt.scheduled_start), 'MMMM do, yyyy')} at {format(parseISO(selectedAppt.scheduled_start), 'h:mm a')}
                 </DialogDescription>
               </DialogHeader>

               <div className="grid gap-4 py-4">
                  {/* Patient Info Block */}
                  <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                     <div className="flex-1">
                        <div className="font-bold text-lg">{selectedAppt.pets?.name}</div>
                        <div className="text-sm text-gray-500">{selectedAppt.pets?.species} • {selectedAppt.pets?.breed}</div>
                     </div>
                     <Link href={`/veterinarian/pets/${selectedAppt.pets?.id}`}>
                        <Button size="sm" variant="outline" className="gap-2">
                           <Eye size={14}/> View Profile
                        </Button>
                     </Link>
                  </div>

                  {/* Owner Info */}
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Owner</label>
                        <div className="text-sm font-medium">
                           {selectedAppt.pets?.client_profiles?.first_name} {selectedAppt.pets?.client_profiles?.last_name}
                        </div>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Contact</label>
                        <div className="text-sm font-medium">
                           {selectedAppt.pets?.client_profiles?.phone || 'N/A'}
                        </div>
                     </div>
                  </div>

                  {/* Visit Reason */}
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Reason for Visit</label>
                      <div className="p-3 mt-1 bg-white border rounded-md text-sm">
                         {selectedAppt.reason_for_visit}
                      </div>
                  </div>
               </div>

               <DialogFooter>
                 <Button variant="outline" onClick={() => setSelectedAppt(null)}>Close</Button>
                 {/* You can add actions here later like 'Complete' or 'Reschedule' */}
                 <Button 
                    className="bg-green-600"
                    onClick={handleGoToTriage}
                  >
                    Go to Triage
                  </Button>

                  <Button 
                    className="bg-green-600"
                    onClick={() => handleChangeDate(new Date())}
                  >
                    Change Date
                  </Button>

                  <Button className="bg-red-600" 
                  onClick={handleNoShow}
                  >
                    Mark No-Show
                  </Button>
               </DialogFooter>
             </>
           )}
        </DialogContent>
      </Dialog>

    </div>
  );
}