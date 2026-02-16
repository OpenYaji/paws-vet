'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Filter, Eye, Phone, Mail } from 'lucide-react';
import { Appointment } from '@/types/appointments';

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
  checkup: 'Checkup',
  consultation: 'Consultation',
  vaccination: 'Vaccination',
  surgery: 'Surgery',
  emergency: 'Emergency',
  dental: 'Dental',
  grooming: 'Grooming',
  followup: 'Follow-up',
};

const SLOTS_PER_DAY = 17; // 9:00–17:00 in 30-min increments
const ROWS_PER_PAGE = 7;

export default function AppointmentsPage() {
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [veterinarians, setVeterinarians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Calendar & date
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Filters for table
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vetFilter, setVetFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch all appointments for the month (broad fetch)
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (vetFilter) params.append('veterinarian', vetFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/appointments?${params.toString()}`);
      if (!response.ok) {
        setAllAppointments([]);
        setLoading(false);
        return;
      }
      const data = await response.json();
      setAllAppointments(Array.isArray(data) ? data : []);
    } catch {
      setAllAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, vetFilter, searchQuery]);

  const fetchVeterinarians = useCallback(async () => {
    try {
      const response = await fetch('/api/veterinarians');
      const data = await response.json();
      setVeterinarians(Array.isArray(data) ? data : []);
    } catch {
      setVeterinarians([]);
    }
  }, []);

  useEffect(() => {
    fetchVeterinarians();
  }, [fetchVeterinarians]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // --- Derived data ---

  // Heatmap counts: { "2025-01-15": 4 }
  const appointmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allAppointments.forEach((apt) => {
      if (!apt.scheduled_start) return;
      const dateKey = new Date(apt.scheduled_start).toISOString().split('T')[0];
      counts[dateKey] = (counts[dateKey] || 0) + 1;
    });
    return counts;
  }, [allAppointments]);

  // Appointments for selected date
  const selectedDateAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return allAppointments.filter((apt) => {
      if (!apt.scheduled_start) return false;
      const dateKey = new Date(apt.scheduled_start).toISOString().split('T')[0];
      return dateKey === selectedDate;
    });
  }, [allAppointments, selectedDate]);

  // Stats
  const appointmentsToday = useMemo(() => {
    return allAppointments.filter((apt) => {
      if (!apt.scheduled_start) return false;
      return new Date(apt.scheduled_start).toISOString().split('T')[0] === todayStr;
    }).length;
  }, [allAppointments, todayStr]);

  const upcoming7Days = useMemo(() => {
    const now = new Date();
    const in7 = new Date(now);
    in7.setDate(in7.getDate() + 7);
    return allAppointments.filter((apt) => {
      if (!apt.scheduled_start) return false;
      const d = new Date(apt.scheduled_start);
      return d >= now && d <= in7;
    }).length;
  }, [allAppointments]);

  const { monthlyBooked, monthlyCapacity } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Count only weekdays for capacity (Mon–Sat = 6 days/week)
    let workDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, month, d).getDay();
      if (day !== 0) workDays++; // exclude Sunday
    }

    const booked = allAppointments.filter((apt) => {
      if (!apt.scheduled_start) return false;
      const d = new Date(apt.scheduled_start);
      return d.getFullYear() === year && d.getMonth() === month;
    }).length;

    return {
      monthlyBooked: booked,
      monthlyCapacity: workDays * SLOTS_PER_DAY,
    };
  }, [allAppointments]);

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(allAppointments.length / ROWS_PER_PAGE));
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return allAppointments.slice(start, start + ROWS_PER_PAGE);
  }, [allAppointments, currentPage]);

  // --- Helpers ---

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetails(true);
  };

  const handleAddWalkIn = (date: string, time: string) => {
    // Placeholder: you can wire this to a creation dialog or API
    alert(`Add walk-in for ${date} at ${time}`);
  };

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
{/* ═══════════ HEADER SECTION ═══════════ */}
{/* ═══════════ APPOINTMENTS HEADER ═══════════ */}
<div className="flex items-center gap-3 mb-6">
  {/* Icon Container using theme variables */}
  <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
    <Calendar className="h-5 w-5 text-primary-foreground" />
  </div>
  
  <div>
    <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
    <p className="text-sm text-muted-foreground">
      View and manage all pet clinic schedules and visits
    </p>
  </div>
</div>
      {/* Stats Dashboard */}
      <StatsDashboard
        appointmentsToday={appointmentsToday}
        upcoming7Days={upcoming7Days}
        monthlyBooked={monthlyBooked}
        monthlyCapacity={monthlyCapacity}
      />

      {/* Calendar + Daily Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap Calendar — 2 cols */}
        <div className="lg:col-span-2">
          <HeatmapCalendar
            appointmentCounts={appointmentCounts}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        </div>

        {/* Daily Detail Panel — 1 col */}
        <div className="lg:col-span-1 min-h-[400px]">
          <DailyDetailPanel
            selectedDate={selectedDate}
            appointments={selectedDateAppointments}
            onAddWalkIn={handleAddWalkIn}
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
                        {appointment.client?.first_name} {appointment.client?.last_name}
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
            <DialogDescription>
              Appointment #{selectedAppointment?.appointment_number}
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-6">
              {/* Status and Type */}
              <div className="flex gap-2 flex-wrap">
                <Badge className={statusColors[selectedAppointment.appointment_status]}>
                  {selectedAppointment.appointment_status.replace('_', ' ')}
                </Badge>
                <Badge variant="outline">
                  {appointmentTypes[selectedAppointment.appointment_type] ||
                    selectedAppointment.appointment_type}
                </Badge>
                {selectedAppointment.is_emergency && (
                  <Badge variant="destructive">Emergency</Badge>
                )}
              </div>

              {/* Pet Information */}
              <div>
                <h4 className="font-semibold mb-2">Pet Information</h4>
                <div className="bg-secondary/20 rounded-xl p-4 space-y-2">
                  <p>
                    <span className="font-medium">Name:</span> {selectedAppointment.pet?.name}
                  </p>
                  <p>
                    <span className="font-medium">Species:</span>{' '}
                    {selectedAppointment.pet?.species}
                  </p>
                  {selectedAppointment.pet?.breed && (
                    <p>
                      <span className="font-medium">Breed:</span>{' '}
                      {selectedAppointment.pet.breed}
                    </p>
                  )}
                </div>
              </div>

              {/* Owner Information */}
              <div>
                <h4 className="font-semibold mb-2">Owner Information</h4>
                <div className="bg-secondary/20 rounded-xl p-4 space-y-2">
                  <p>
                    <span className="font-medium">Name:</span>{' '}
                    {selectedAppointment.client?.first_name}{' '}
                    {selectedAppointment.client?.last_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{selectedAppointment.client?.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{selectedAppointment.client?.email}</span>
                  </div>
                </div>
              </div>

              {/* Veterinarian */}
              <div>
                <h4 className="font-semibold mb-2">Assigned Veterinarian</h4>
                <div className="bg-secondary/20 rounded-xl p-4">
                  <p className="font-medium">
                    Dr. {selectedAppointment.veterinarian?.first_name}{' '}
                    {selectedAppointment.veterinarian?.last_name}
                  </p>
                  {selectedAppointment.veterinarian?.specializations && (
                    <p className="text-sm text-muted-foreground">
                      Specializations:{' '}
                      {selectedAppointment.veterinarian.specializations.join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Appointment Details */}
              <div>
                <h4 className="font-semibold mb-2">Appointment Details</h4>
                <div className="bg-secondary/20 rounded-xl p-4 space-y-2">
                  <p>
                    <span className="font-medium">Scheduled:</span>{' '}
                    {formatDate(selectedAppointment.scheduled_start)} at{' '}
                    {formatTime(selectedAppointment.scheduled_start)}
                  </p>
                  <p>
                    <span className="font-medium">Duration:</span>{' '}
                    {formatTime(selectedAppointment.scheduled_start)} –{' '}
                    {formatTime(selectedAppointment.scheduled_end)}
                  </p>
                  <p>
                    <span className="font-medium">Reason:</span>{' '}
                    {selectedAppointment.reason_for_visit}
                  </p>
                  {selectedAppointment.special_instructions && (
                    <p>
                      <span className="font-medium">Special Instructions:</span>{' '}
                      {selectedAppointment.special_instructions}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">
                  Edit
                </Button>
                <Button variant="outline" className="flex-1">
                  Cancel Appointment
                </Button>
                <Button className="flex-1 bg-primary">Check In</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}