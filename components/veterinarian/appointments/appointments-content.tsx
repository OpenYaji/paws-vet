'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { supabase } from '@/lib/auth-client';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Clock, Calendar as CalendarIcon, User, FileText, FileBarChart,
  Stethoscope, AlertTriangle, Phone, PawPrint, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { AppointmentWithRelations } from '@/types/appointments';
import AppointmentReportDialog from './appointment-report-dialog';
import { useToast } from '@/hooks/use-toast';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const STATUS_BADGE: Record<string, string> = {
  confirmed:   'bg-green-600',
  pending:     'bg-orange-500',
  completed:   'bg-blue-600',
  no_show:     'bg-red-600',
  cancelled:   'bg-gray-400',
  in_progress: 'bg-purple-600',
};

export default function AppointmentsContent() {
  const { data: appointments = [], isLoading } = useSWR<AppointmentWithRelations[]>('/api/appointments', fetcher);
  const { mutate } = useSWRConfig();
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [showReport, setShowReport] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [apptPage, setApptPage] = useState(1);

  const appointmentDates = appointments.map((app) => parseISO(app.scheduled_start));

  const selectedDateAppointments = appointments.filter((app) =>
    date && isSameDay(parseISO(app.scheduled_start), date)
  );

  // paginate the day's appointments
  const apptPerPage = 20;
  const apptTotalPages = Math.max(1, Math.ceil(selectedDateAppointments.length / apptPerPage));
  const apptSafePage = Math.min(apptPage, apptTotalPages);
  const paginatedDayAppts = selectedDateAppointments.slice(
    (apptSafePage - 1) * apptPerPage,
    apptSafePage * apptPerPage,
  );

  // reset page when the user picks a new date
  const handleDateSelect = (d: Date | undefined) => { setDate(d); setApptPage(1); };

  // API field is `pet` (aliased in query), type definition uses `pets`
  // Handle both for safety
  const getPet = (app: any) => app.pet ?? app.pets ?? null;
  const getOwner = (app: any) =>
    app.client ?? app.pet?.client ?? app.pets?.client_profiles ?? null;

  const handleSendToTriage = async () => {
    if (!selectedAppt || isSending) return;
    setIsSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: selectedAppt.id,
          appointment_status: 'in_progress',
          checked_in_at: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send to triage');
      }

      toast({
        title: 'Patient Sent to Triage',
        description: `${getPet(selectedAppt)?.name ?? 'Patient'} has been checked in and is now in the triage queue.`,
      });

      await mutate('/api/appointments');
      setSelectedAppt(null);
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'Could not send patient to triage',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* LEFT: Calendar */}
        <div className="md:col-span-4 lg:col-span-3 space-y-4">
          <Card>
            <CardContent className="p-4 flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                className="rounded-md border shadow-sm"
                classNames={{ today: 'border-2 border-green-500 text-green-600 dark:text-green-400 font-bold' }}
                modifiers={{ hasAppointment: appointmentDates }}
                modifiersClassNames={{ hasAppointment: 'border-2 border-green-500 dark:border-green-400 font-semibold' }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Scheduled for {date ? format(date, 'MMM do') : 'Selected Date'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedDateAppointments.length}</div>
              <p className="text-xs text-muted-foreground">Patients</p>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Appointment List */}
        <div className="md:col-span-8 lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CalendarIcon className="text-green-600 h-5 w-5" />
              {date ? format(date, 'EEEE, MMMM do, yyyy') : 'Select a date'}
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400"
              onClick={() => setShowReport(true)}
            >
              <FileBarChart className="h-4 w-4" />
              Weekly Report
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading schedule...</div>
          ) : selectedDateAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-card rounded-xl border border-dashed">
              <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-3">
                <CalendarIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-muted-foreground font-medium">No appointments scheduled.</p>
            </div>
          ) : (
            <>
            <div className="grid gap-4">
              {paginatedDayAppts.map((app: any) => {
                const pet = getPet(app);
                const owner = getOwner(app);
                const ownerName = owner
                  ? `${owner.first_name} ${owner.last_name}`
                  : 'Unknown Owner';
                const isActionable = ['pending', 'confirmed'].includes(app.appointment_status);

                return (
                  <Card
                    key={app.id}
                    className={`group transition-all cursor-pointer hover:shadow-md ${
                      isActionable
                        ? 'hover:border-green-400'
                        : 'opacity-75'
                    }`}
                    onClick={() => setSelectedAppt(app)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">

                      {/* Time */}
                      <div className="flex flex-col items-center justify-center w-20 h-20 shrink-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl">
                        <Clock size={16} className="mb-0.5" />
                        <span className="font-bold text-sm leading-tight text-center">
                          {format(parseISO(app.scheduled_start), 'h:mm a')}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-base text-foreground truncate">
                            {pet?.name ?? <span className="text-muted-foreground italic">Unknown</span>}
                          </h3>
                          {pet && (
                            <Badge variant="outline" className="text-xs font-normal shrink-0">
                              {pet.species} • {pet.breed}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                          <User size={12} />
                          <span>Owner: {ownerName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <FileText size={12} className="shrink-0" />
                          <span className="truncate">{app.reason_for_visit || 'Routine Checkup'}</span>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge className={`${STATUS_BADGE[app.appointment_status] ?? 'bg-gray-400'} text-xs`}>
                          {app.appointment_status.replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {app.appointment_type}
                        </Badge>
                        {isActionable && (
                          <span className="text-xs text-green-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Process →
                          </span>
                        )}
                      </div>

                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* pagination controls for day's appointments */}
            {selectedDateAppointments.length > apptPerPage && (
              <div className="flex items-center justify-between pt-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {(apptSafePage - 1) * apptPerPage + 1}–{Math.min(apptSafePage * apptPerPage, selectedDateAppointments.length)} of {selectedDateAppointments.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" disabled={apptSafePage === 1} onClick={() => setApptPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium px-2">{apptSafePage} / {apptTotalPages}</span>
                  <Button variant="outline" size="icon" disabled={apptSafePage >= apptTotalPages} onClick={() => setApptPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
      </div>
      </div>

      {/* ── Patient Action Dialog ── */}
      {selectedAppt && (() => {
        const pet   = getPet(selectedAppt);
        const owner = getOwner(selectedAppt);
        const ownerName = owner ? `${owner.first_name} ${owner.last_name}` : 'Unknown Owner';
        const isActionable = ['pending', 'confirmed'].includes(selectedAppt.appointment_status);
        return (
          <Dialog open={!!selectedAppt} onOpenChange={(o) => !o && setSelectedAppt(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <PawPrint className="h-5 w-5 text-green-600" />
                  {pet?.name ?? 'Patient Details'}
                </DialogTitle>
                <DialogDescription>
                  {format(parseISO(selectedAppt.scheduled_start), 'EEEE, MMMM do, yyyy · h:mm a')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Pet info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase font-medium">Species</p>
                    <p className="font-semibold mt-0.5">{pet?.species ?? '—'}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase font-medium">Breed</p>
                    <p className="font-semibold mt-0.5">{pet?.breed ?? '—'}</p>
                  </div>
                </div>

                <Separator />

                {/* Owner info */}
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{ownerName}</p>
                    {owner?.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {owner.phone}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Appointment details */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <Badge variant="outline" className="capitalize">{selectedAppt.appointment_type}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className={STATUS_BADGE[selectedAppt.appointment_status] ?? 'bg-gray-400'}>
                      {selectedAppt.appointment_status}
                    </Badge>
                  </div>
                </div>

                {/* Reason */}
                {selectedAppt.reason_for_visit && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Reason for Visit</p>
                    <p className="text-sm">{selectedAppt.reason_for_visit}</p>
                  </div>
                )}

                {/* Already in triage or done */}
                {!isActionable && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    This appointment cannot be sent to triage (status: {selectedAppt.appointment_status}).
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelectedAppt(null)}>
                  Close
                </Button>
                {isActionable && (
                  <Button
                    className="bg-green-600 hover:bg-green-700 gap-2"
                    onClick={handleSendToTriage}
                    disabled={isSending}
                  >
                    <Stethoscope className="h-4 w-4" />
                    {isSending ? 'Sending…' : 'Send to Triage'}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Weekly Report Dialog */}
      <AppointmentReportDialog open={showReport} onOpenChange={setShowReport} />
    </div>
  );
}