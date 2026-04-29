'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Search, X, Plus, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Filter, Eye, Phone, Mail } from 'lucide-react';
import { AppointmentApiResponse as Appointment } from '@/types/appointments';

import HeatmapCalendar from '@/components/appointments/heatmap-calendar';
import DailyDetailPanel from '@/components/appointments/daily-detail-panel';
import StatsDashboard from '@/components/appointments/stats-dashboard';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-800',
};

const appointmentTypes: Record<string, string> = {
  wellness: 'Wellness',
  consultation: 'Consultation',
  vaccination: 'Vaccination',
  surgery: 'Surgery',
  emergency: 'Emergency',
  dental: 'Dental',
  follow_up: 'Follow-up',
};

const SLOTS_PER_DAY = 17;

export default function AppointmentsPage() {
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [veterinarians, setVeterinarians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editType, setEditType] = useState('consultation');
  const [editReason, setEditReason] = useState('');
  const [isSavingAction, setIsSavingAction] = useState(false);

  const toLocalDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = useMemo(() => toLocalDateStr(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vetFilter, setVetFilter] = useState('');

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (vetFilter) params.append('veterinarian', vetFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/appointments?${params.toString()}`);
      const data = await response.json();
      setAllAppointments(Array.isArray(data) ? data : []);
    } catch {
      setAllAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, vetFilter, searchQuery]);

  useEffect(() => {
    const fetchVets = async () => {
      const res = await fetch('/api/veterinarians');
      const data = await res.json();
      setVeterinarians(Array.isArray(data) ? data : []);
    };
    fetchVets();
    fetchAppointments();
  }, [fetchAppointments]);

  // --- Dynamic Stats Calculations ---
  const { appointmentsToday, upcoming7Days, monthlyBooked, monthlyCapacity } = useMemo(() => {
    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(now.getDate() + 7);
    
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let workDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month, d).getDay() !== 0) workDays++;
    }

    return {
      appointmentsToday: allAppointments.filter(apt => apt.scheduled_start && toLocalDateStr(new Date(apt.scheduled_start)) === todayStr).length,
      upcoming7Days: allAppointments.filter(apt => {
        if (!apt.scheduled_start) return false;
        const d = new Date(apt.scheduled_start);
        return d >= now && d <= in7Days;
      }).length,
      monthlyBooked: allAppointments.filter(apt => {
        if (!apt.scheduled_start) return false;
        const d = new Date(apt.scheduled_start);
        return d.getFullYear() === year && d.getMonth() === month;
      }).length,
      monthlyCapacity: workDays * SLOTS_PER_DAY
    };
  }, [allAppointments, todayStr]);

  const appointmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allAppointments.forEach((apt) => {
      if (!apt.scheduled_start) return;
      const dateKey = toLocalDateStr(new Date(apt.scheduled_start));
      counts[dateKey] = (counts[dateKey] || 0) + 1;
    });
    return counts;
  }, [allAppointments]);

  const selectedDateAppointments = useMemo(() => {
    return allAppointments.filter((apt) => 
      apt.scheduled_start && toLocalDateStr(new Date(apt.scheduled_start)) === selectedDate
    );
  }, [allAppointments, selectedDate]);

  const handleOpenAppointment = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setIsEditingDetails(false);
  };

  const updateAppointment = useCallback(
    async (appointmentId: string, updateData: Record<string, unknown>) => {
      setIsSavingAction(true);
      try {
        const response = await fetch('/api/appointments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: appointmentId, ...updateData }),
        });

        if (!response.ok) {
          throw new Error('Failed to update appointment');
        }

        const updated = await response.json();
        setSelectedAppointment((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
        await fetchAppointments();
        router.refresh();
      } finally {
        setIsSavingAction(false);
      }
    },
    [fetchAppointments, router],
  );

  const handleCheckIn = async () => {
    if (!selectedAppointment) return;
    await updateAppointment(selectedAppointment.id, {
      appointment_status: 'in_progress',
      checked_in_at: new Date().toISOString(),
    });
  };

  const handleStartEdit = () => {
    if (!selectedAppointment) return;
    setEditType(selectedAppointment.appointment_type || 'consultation');
    setEditReason(selectedAppointment.reason_for_visit || '');
    setIsEditingDetails(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAppointment) return;
    await updateAppointment(selectedAppointment.id, {
      appointment_type: editType,
      reason_for_visit: editReason,
    });
    setIsEditingDetails(false);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <main className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Appointments</h1>
            <p className="text-sm text-muted-foreground">Monitor and manage clinic schedules</p>
          </div>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> New Booking
        </Button>
      </div>

      <StatsDashboard
        appointmentsToday={appointmentsToday}
        upcoming7Days={upcoming7Days}
        monthlyBooked={monthlyBooked}
        monthlyCapacity={monthlyCapacity}
      />

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* HEATMAP CALENDAR (7/12) */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <div className="bg-card border rounded-xl shadow-sm p-5">
            <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b">
              <div className="relative flex-grow max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search pet or owner..." 
                  className="pl-9 h-9" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                className="h-9 px-3 border rounded-md text-sm bg-background"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
              </select>
              <select 
                className="h-9 px-3 border rounded-md text-sm bg-background"
                value={vetFilter}
                onChange={(e) => setVetFilter(e.target.value)}
              >
                <option value="">All Vets</option>
                {veterinarians.map(v => <option key={v.id} value={v.id}>Dr. {v.last_name}</option>)}
              </select>
              {(searchQuery || statusFilter !== 'all' || vetFilter) && (
                <Button variant="ghost" size="sm" onClick={() => {setSearchQuery(''); setStatusFilter('all'); setVetFilter('')}}>
                  <X className="w-4 h-4 mr-1" /> Reset
                </Button>
              )}
            </div>

            <HeatmapCalendar
              appointmentCounts={appointmentCounts}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          </div>
        </div>

        {/* DAILY SCHEDULE (5/12) */}
        <div className="col-span-12 lg:col-span-5">
          <DailyDetailPanel
            selectedDate={selectedDate}
            appointments={selectedDateAppointments}
            onAddWalkIn={(d, t) => console.log(d, t)}
            onSelectAppointment={handleOpenAppointment} 
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Appointment #, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Veterinarian</label>
            <select
              value={vetFilter}
              onChange={(e) => setVetFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="">All Veterinarians</option>
              {veterinarians.map((vet) => (
                <option key={vet.id} value={vet.id}>
                  Dr. {vet.first_name} {vet.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setVetFilter('');
              setSearchQuery('');
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Appointment #</TableHead>
              <TableHead>Pet & Owner</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Veterinarian</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading appointments...
                </TableCell>
              </TableRow>
            ) : allAppointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No appointments found
                </TableCell>
              </TableRow>
            ) : (
              paginatedAppointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="font-mono text-sm">
                    {appointment.appointment_number}
                    {appointment.is_emergency && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        Emergency
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{appointment.pet?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.pet?.client?.first_name} {appointment.pet?.client?.last_name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {appointmentTypes[appointment.appointment_type] || appointment.appointment_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{formatDate(appointment.scheduled_start)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(appointment.scheduled_start)} –{' '}
                        {formatTime(appointment.scheduled_end)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        Dr. {appointment.veterinarian?.first_name}{' '}
                        {appointment.veterinarian?.last_name}
                      </p>
                      {appointment.veterinarian?.specializations && (
                        <p className="text-xs text-muted-foreground">
                          {appointment.veterinarian.specializations[0]}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[appointment.appointment_status]}>
                      {appointment.appointment_status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(appointment)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {!loading && allAppointments.length > ROWS_PER_PAGE && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–
              {Math.min(currentPage * ROWS_PER_PAGE, allAppointments.length)} of{' '}
              {allAppointments.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>View and update booking information</DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-6">
              <div className="flex gap-2">
                <Badge className={statusColors[selectedAppointment.appointment_status]}>
                  {selectedAppointment.appointment_status.replace('_', ' ')}
                </Badge>
                <Badge variant="outline">{appointmentTypes[selectedAppointment.appointment_type]}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/20 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground">Pet Information</h4>
                  <p className="font-medium text-lg">{selectedAppointment.pet?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedAppointment.pet?.species} • {selectedAppointment.pet?.breed}</p>
                </div>
                <div className="bg-secondary/20 rounded-xl p-4 space-y-2">
                  <p>
                    <span className="font-medium">Name:</span>{' '}
                    {selectedAppointment.pet?.client?.first_name}{' '}
                    {selectedAppointment.pet?.client?.last_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{selectedAppointment.pet?.client?.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{selectedAppointment.pet?.client?.email?.email}</span>
                  </div>
                </div>
              </div>

              <div className="border rounded-xl p-4 bg-card space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Scheduled Time:</span>
                  <span className="font-semibold">{formatDate(selectedAppointment.scheduled_start!)} @ {formatTime(selectedAppointment.scheduled_start!)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Veterinarian:</span>
                  <span className="font-semibold">Dr. {selectedAppointment.veterinarian?.first_name} {selectedAppointment.veterinarian?.last_name}</span>
                </div>
                <div className="pt-2 border-t mt-2 space-y-2">
                  <span className="text-xs font-bold uppercase text-muted-foreground block">Reason for Visit</span>
                  {isEditingDetails ? (
                    <>
                      <select
                        className="h-9 px-3 border rounded-md text-sm bg-background w-full"
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        disabled={isSavingAction}
                      >
                        {Object.entries(appointmentTypes).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        placeholder="Reason for visit"
                        disabled={isSavingAction}
                      />
                    </>
                  ) : (
                    <p className="text-sm">{selectedAppointment.reason_for_visit}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {isEditingDetails ? (
                  <>
                    <Button variant="outline" className="flex-1" onClick={() => setIsEditingDetails(false)} disabled={isSavingAction}>Discard</Button>
                    <Button className="flex-1" onClick={handleSaveEdit} disabled={isSavingAction}>Save</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="flex-1" onClick={handleStartEdit} disabled={isSavingAction}>Edit</Button>
                    <Button variant="outline" className="flex-1 text-destructive" onClick={handleCloseDetails} disabled={isSavingAction}>Cancel</Button>
                    {selectedAppointment.appointment_status !== 'completed' && (
                      <Button className="flex-1" onClick={handleCheckIn} disabled={isSavingAction}>Check In</Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
