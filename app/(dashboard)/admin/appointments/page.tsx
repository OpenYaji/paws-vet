'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Calendar, Search, Filter, Eye, Phone, Mail } from 'lucide-react';
import { Appointment } from '@/types/appointments';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-800',
};

const appointmentTypes = {
  checkup: 'Checkup',
  consultation: 'Consultation',
  vaccination: 'Vaccination',
  surgery: 'Surgery',
  emergency: 'Emergency',
  dental: 'Dental',
  grooming: 'Grooming',
  followup: 'Follow-up',
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [veterinarians, setVeterinarians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [vetFilter, setVetFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchVeterinarians();
    fetchAppointments();
  }, [statusFilter, dateFilter, vetFilter, searchQuery]);

  const fetchVeterinarians = async () => {
    try {
      const response = await fetch('/api/veterinarians');
      const data = await response.json();
      setVeterinarians(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching veterinarians:', error);
      setVeterinarians([]);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFilter) params.append('date', dateFilter);
      if (vetFilter) params.append('veterinarian', vetFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/appointments?${params.toString()}`);
      
      if (!response.ok) {
        console.error('Failed to fetch appointments:', response.status);
        setAppointments([]);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Fetched appointments:', data);
      setAppointments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetails(true);
  };

  const stats = {
    total: Array.isArray(appointments) ? appointments.length : 0,
    pending: Array.isArray(appointments) ? appointments.filter(a => a?.appointment_status === 'pending').length : 0,
    confirmed: Array.isArray(appointments) ? appointments.filter(a => a?.appointment_status === 'confirmed').length : 0,
    completed: Array.isArray(appointments) ? appointments.filter(a => a?.appointment_status === 'completed').length : 0,
  };

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">View and manage all appointments</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Confirmed</p>
          <p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
            <label className="text-sm font-medium mb-2 block">Date</label>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
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
              setDateFilter('');
              setVetFilter('');
              setSearchQuery('');
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
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
            ) : appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No appointments found
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => (
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
                      {appointmentTypes[appointment.appointment_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{formatDate(appointment.scheduled_start)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(appointment.scheduled_start)} - {formatTime(appointment.scheduled_end)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        Dr. {appointment.veterinarian?.first_name} {appointment.veterinarian?.last_name}
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
              <div className="flex gap-2">
                <Badge className={statusColors[selectedAppointment.appointment_status]}>
                  {selectedAppointment.appointment_status.replace('_', ' ')}
                </Badge>
                <Badge variant="outline">
                  {appointmentTypes[selectedAppointment.appointment_type as keyof typeof appointmentTypes] || selectedAppointment.appointment_type}
                </Badge>
                {selectedAppointment.is_emergency && (
                  <Badge variant="destructive">Emergency</Badge>
                )}
              </div>

              {/* Pet Information */}
              <div>
                <h4 className="font-semibold mb-2">Pet Information</h4>
                <div className="bg-secondary/20 rounded-lg p-4 space-y-2">
                  <p><span className="font-medium">Name:</span> {selectedAppointment.pet?.name}</p>
                  <p><span className="font-medium">Species:</span> {selectedAppointment.pet?.species}</p>
                  {selectedAppointment.pet?.breed && (
                    <p><span className="font-medium">Breed:</span> {selectedAppointment.pet.breed}</p>
                  )}
                </div>
              </div>

              {/* Owner Information */}
              <div>
                <h4 className="font-semibold mb-2">Owner Information</h4>
                <div className="bg-secondary/20 rounded-lg p-4 space-y-2">
                  <p><span className="font-medium">Name:</span> {selectedAppointment.client?.first_name} {selectedAppointment.client?.last_name}</p>
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
                <div className="bg-secondary/20 rounded-lg p-4">
                  <p className="font-medium">
                    Dr. {selectedAppointment.veterinarian?.first_name} {selectedAppointment.veterinarian?.last_name}
                  </p>
                  {selectedAppointment.veterinarian?.specializations && (
                    <p className="text-sm text-muted-foreground">
                      Specializations: {selectedAppointment.veterinarian.specializations.join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Appointment Details */}
              <div>
                <h4 className="font-semibold mb-2">Appointment Details</h4>
                <div className="bg-secondary/20 rounded-lg p-4 space-y-2">
                  <p><span className="font-medium">Scheduled:</span> {formatDate(selectedAppointment.scheduled_start)} at {formatTime(selectedAppointment.scheduled_start)}</p>
                  <p><span className="font-medium">Duration:</span> {formatTime(selectedAppointment.scheduled_start)} - {formatTime(selectedAppointment.scheduled_end)}</p>
                  <p><span className="font-medium">Reason:</span> {selectedAppointment.reason_for_visit}</p>
                  {selectedAppointment.special_instructions && (
                    <p><span className="font-medium">Special Instructions:</span> {selectedAppointment.special_instructions}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">Edit</Button>
                <Button variant="outline" className="flex-1">Cancel Appointment</Button>
                <Button className="flex-1 bg-primary">Check In</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}