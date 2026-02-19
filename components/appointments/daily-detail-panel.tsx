    'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Syringe, ClipboardList, Plus, Clock, User, PawPrint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types/appointments';

interface DailyDetailPanelProps {
  selectedDate: string;
  appointments: Appointment[];
  onAddWalkIn?: (date: string, time: string) => void;
}

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00',
];

const typeIcons: Record<string, React.ReactNode> = {
  vaccination: <Syringe className="w-4 h-4 text-blue-600" />,
  checkup: <ClipboardList className="w-4 h-4 text-green-600" />,
  dental: <span className="text-sm">🦷</span>,
  consultation: <ClipboardList className="w-4 h-4 text-purple-600" />,
  surgery: <ClipboardList className="w-4 h-4 text-red-600" />,
  emergency: <ClipboardList className="w-4 h-4 text-red-600" />,
  grooming: <PawPrint className="w-4 h-4 text-amber-600" />,
  followup: <ClipboardList className="w-4 h-4 text-teal-600" />,
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-800',
};

function formatSlotTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function DailyDetailPanel({
  selectedDate,
  appointments,
  onAddWalkIn,
}: DailyDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'taken' | 'available'>('taken');

  const today = new Date().toISOString().split('T')[0];
  const isPast = selectedDate < today;

  const dateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Determine which slots are taken
  const takenSlots = new Set<string>();
  appointments.forEach((apt) => {
    const start = new Date(apt.scheduled_start);
    const hh = start.getHours().toString().padStart(2, '0');
    const mm = start.getMinutes().toString().padStart(2, '0');
    takenSlots.add(`${hh}:${mm}`);
    // Also mark the next 30-min slot if appointment spans it
    const end = new Date(apt.scheduled_end);
    const diffMin = (end.getTime() - start.getTime()) / 60000;
    if (diffMin > 30) {
      const next = new Date(start.getTime() + 30 * 60000);
      const nhh = next.getHours().toString().padStart(2, '0');
      const nmm = next.getMinutes().toString().padStart(2, '0');
      takenSlots.add(`${nhh}:${nmm}`);
    }
  });

  const availableSlots = TIME_SLOTS.filter((s) => !takenSlots.has(s));

  const activeAppointments = appointments.filter(
    (a) => a.appointment_status !== 'cancelled'
  );

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Daily Schedule</h3>
          {isPast && (
            <Badge variant="outline" className="text-xs opacity-60">
              Past Date
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>

        {/* Summary */}
        <div className="flex gap-3 mt-3">
          <div className="flex items-center gap-1.5 text-sm">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">{activeAppointments.length} Booked</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">{availableSlots.length} Open</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('taken')}
          className={cn(
            'flex-1 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'taken'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Taken Slots ({activeAppointments.length})
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={cn(
            'flex-1 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'available'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Available ({availableSlots.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === 'taken' ? (
          activeAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No appointments for this date.
            </div>
          ) : (
            activeAppointments.map((apt) => {
              const startTime = new Date(apt.scheduled_start).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });
              return (
                <div
                  key={apt.id}
                  className="border border-border rounded-xl p-3 space-y-2 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{startTime}</span>
                    </div>
                    <Badge className={cn('text-xs', statusColors[apt.appointment_status])}>
                      {apt.appointment_status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {typeIcons[apt.appointment_type] || (
                        <ClipboardList className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {apt.pet?.name}{' '}
                        <span className="text-muted-foreground font-normal">
                          ({apt.appointment_type})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {apt.client?.first_name} {apt.client?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dr. {apt.veterinarian?.first_name} {apt.veterinarian?.last_name}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {availableSlots.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">
                No available slots for this date.
              </div>
            ) : (
              availableSlots.map((slot) => (
                <div
                  key={slot}
                  className="flex items-center justify-between border border-border rounded-xl px-3 py-2.5 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">{formatSlotTime(slot)}</span>
                  </div>
                  {onAddWalkIn && !isPast && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onAddWalkIn(selectedDate, slot)}
                      title="Add walk-in appointment"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
