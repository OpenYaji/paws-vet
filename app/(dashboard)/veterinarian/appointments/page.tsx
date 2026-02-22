'use client';

import { useSWRConfig } from 'swr';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';

// Simple fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AppointmentsPage() {
  const { data: appointments = [], isLoading } = useSWR('/api/appointments', fetcher);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const router = useRouter();
  const supabase = createClient();
  const { mutate } = useSWRConfig();
  const { toast } = useToast();
  
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState<'noshow' | 'reschedule' | 'triage' | null>(null);

  // Auto-check for no-shows when page loads and periodically
  useEffect(() => {
    const checkNoShows = async () => {
      try {
        console.log('Checking for missed appointments...');
        const response = await fetch('/api/appointments/check-no-shows', {
          method: 'POST',
        });

        if (response.ok) {
          const result = await response.json();
          console.log('No-show check result:', result);
          
          // If any appointments were updated, refresh the list
          if (result.updated && result.updated > 0) {
            console.log(`Auto-marked ${result.updated} appointment(s) as no-show`);
            mutate('/api/appointments');
            
            // Optional: Show toast notification
            toast({
              title: "Appointments Updated",
              description: `${result.updated} appointment(s) automatically marked as no-show`,
            });
          }
        }
      } catch (error) {
        console.error('Error checking for no-shows:', error);
        // Silently fail - don't show error to user as this is a background task
      }
    };

    // Run check on mount
    checkNoShows();

    // Set up interval to check periodically (every 5 minutes)
    const interval = setInterval(checkNoShows, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [mutate, toast]);

  const appointmentDates = appointments.map((app: any) => parseISO(app.scheduled_start));

  // Helper function to get access token for server-side API calls (if needed)
  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if(!token) throw new Error("No access token found");
    return token;
  }

  const selectedDateAppointments = appointments.filter((app: any) => {
    if (!date) return false;
    
    const appointmentDate = parseISO(app.scheduled_start);
    const isSameDayResult = isSameDay(appointmentDate, date);
    const statusMatch = ['pending', 'confirmed'].includes(app.appointment_status);
    
    // Debug logging
    if (isSameDayResult) {
      console.log('Found appointment on selected date:', {
        id: app.id,
        pet: app.pet?.name,
        scheduled_start: app.scheduled_start,
        appointment_status: app.appointment_status,
        statusMatch,
        date: date?.toISOString()
      });
    }
    
    return isSameDayResult && statusMatch;
  });

  console.log('All appointments:', appointments.map((a: any) => ({ 
    id: a.id, 
    pet: a.pet?.name, 
    scheduled_start: a.scheduled_start,
    status: a.appointment_status
  })));

  const handleNoShow = async () => {
    if(!selectedAppt || isProcessing) return;

    setIsProcessing(true);
    setActionType('noshow');

    try{
      const { error } = await supabase
        .from('appointments')
        .update({ appointment_status: 'no_show' })
        .eq('id', selectedAppt.id);

      if(error){
        console.error('Error marking no-show:', error);
        toast({
          title: "Error",
          description: "Failed to update appointment status",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Appointment marked as no-show",
      });

      await mutate('/api/appointments');
      setSelectedAppt(null);
    }
    catch(error: any){
      console.error('Error updating appointment status:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
    finally{
      setIsProcessing(false);
      setActionType(null);
    }
  }

  const handleReschedule = async () => {
    if(!selectedAppt || isProcessing) return;

    const currentDateOnly = format(parseISO(selectedAppt.scheduled_start), 'yyyy-MM-dd');

    const newDateStr = prompt("Enter new date (YYYY-MM-DDTHH:MM)", currentDateOnly);
    if (!newDateStr) return;

    const newDate = new Date(newDateStr);
    if(isNaN(newDate.getTime())){
      toast({
        title: "Invalid Date",
        description: "Please use YYYY-MM-DDTHH:MM format",
        variant: "destructive"
      });
      return;
    }

    const originalStart = parseISO(selectedAppt.scheduled_start);
    const originalEnd = parseISO(selectedAppt.scheduled_end);
    const durationMs = originalEnd.getTime() - originalStart.getTime();

    const newEndDate = new Date(newDate.getTime() + durationMs);

    setIsProcessing(true);
    setActionType('reschedule');

    try{
      const { error } = await supabase
        .from('appointments')
        .update({ 
          scheduled_start: newDate.toISOString(),
          scheduled_end: newEndDate.toISOString(),
          appointment_status: 'pending'
        })
        .eq('id', selectedAppt.id);

      if(error){
        console.error('Error rescheduling appointment:', error);
        toast({
          title: "Error",
          description: "Failed to reschedule appointment",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Success",
        description: `Appointment rescheduled to ${format(newDate, 'MMM do, yyyy at h:mm a')}`,
      });

      await mutate('/api/appointments');
      setSelectedAppt(null);
    }
    catch(error: any){
      console.error('Error updating appointment date:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
    finally{
      setIsProcessing(false);
      setActionType(null);
    }
  }

  const handleGoToTriage = async () => {
    if(!selectedAppt || isProcessing) return;

    setIsProcessing(true);
    setActionType('triage');

    const checkInTime = new Date().toISOString();

    try{
      // Use API endpoint to bypass RLS issues
      const response = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAppt.id,
          appointment_status: 'in_progress',
          checked_in_at: checkInTime
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || 'Failed to check in patient');
      }

      const data = await response.json();
      console.log('Update successful! Response:', data);
      console.log('Patient checked in successfully:', selectedAppt.id, selectedAppt.pet?.name);

      toast({
        title: "Success",
        description: `${selectedAppt.pet?.name} checked in for triage`,
      });

      // Refresh appointments list and navigate after short delay to ensure DB updates propagate
      await mutate('/api/appointments');
      
      // Small delay to ensure database replication
      console.log('Waiting 500ms for DB replication...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Navigating to triage page...');
      router.push('/veterinarian/triage');
    }
    catch(error: any){
      console.error('Error updating appointment status:', error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
      setIsProcessing(false);
      setActionType(null);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Schedule</h1>
        <p className="text-muted-foreground">Manage your patient appointments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
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
                return (
                  <Card 
                    key={app.id} 
                    className="group hover:border-green-400 transition-colors cursor-pointer shadow-sm hover:shadow-md"
                    onClick={() => setSelectedAppt(app)}
                  >
                    <CardContent className="p-5 flex flex-col md:flex-row gap-6 items-center">
                      <div className="flex flex-col items-center justify-center min-w-[80px] p-2 bg-green-50 text-green-700 rounded-lg">
                        <Clock size={18} className="mb-1" />
                        <span className="font-bold text-lg">
                          {format(parseISO(app.scheduled_start), 'h:mm a')}
                        </span>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-xl text-gray-800">{app.pet?.name || 'Unknown Pet'}</h3>
                          <Badge variant="outline">{app.pet?.species}</Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <User size={14} />
                          <span>Owner: {app.client?.first_name} {app.client?.last_name}</span>
                        </div>
                        <div className="mt-2 text-sm bg-gray-50 p-2 rounded inline-block text-gray-700">
                           Reason: {app.reason_for_visit}
                        </div>
                      </div>

                      <Badge className={
                         app.appointment_status === 'confirmed' ? 'bg-green-600' : 
                         app.appointment_status === 'pending' ? 'bg-orange-500' : 'bg-gray-400'
                      }>
                        {app.appointment_status || 'Scheduled'}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
                  <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                     <div className="flex-1">
                        <div className="font-bold text-lg">{selectedAppt.pet?.name}</div>
                        <div className="text-sm text-gray-500">{selectedAppt.pet?.species} • {selectedAppt.pet?.breed}</div>
                     </div>
                     <Link href={`/veterinarian/pets/${selectedAppt.pet?.id}`}>
                        <Button size="sm" variant="outline" className="gap-2">
                           <Eye size={14}/> View Profile
                        </Button>
                     </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Owner</label>
                        <div className="text-sm font-medium">
                           {selectedAppt.client?.first_name} {selectedAppt.client?.last_name}
                        </div>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Contact</label>
                        <div className="text-sm font-medium">
                           {selectedAppt.client?.phone || 'N/A'}
                        </div>
                     </div>
                  </div>

                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Reason for Visit</label>
                      <div className="p-3 mt-1 bg-white border rounded-md text-sm">
                         {selectedAppt.reason_for_visit}
                      </div>
                  </div>
               </div>

               <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                 <Button 
                   variant="outline" 
                   onClick={() => setSelectedAppt(null)}
                   disabled={isProcessing}
                 >
                   Close
                 </Button>

                 <Button 
                   className="bg-green-600 hover:bg-green-700"
                   onClick={handleGoToTriage}
                   disabled={isProcessing}
                 >
                   {isProcessing && actionType === 'triage' ? 'Checking In...' : 'Go to Triage'}
                 </Button>
               </DialogFooter>
             </>
           )}
        </DialogContent>
      </Dialog>

    </div>
  );
}