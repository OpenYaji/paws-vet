'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  FileBarChart, CheckCircle2, XCircle, Clock3, Ban, Clock,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  format, startOfWeek, endOfWeek, addWeeks, subWeeks,
} from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ReportData {
  period: { start: string; end: string };
  total_appointments: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  by_day: Record<string, number>;
  by_veterinarian: Record<string, number>;
  appointments: any[];
}

interface AppointmentReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  completed:   { label: 'Completed',   color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   icon: CheckCircle2 },
  no_show:     { label: 'No Show',     color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    icon: XCircle      },
  pending:     { label: 'Pending',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: Clock3       },
  cancelled:   { label: 'Cancelled',   color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200',   icon: Ban          },
  confirmed:   { label: 'Confirmed',   color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  icon: CheckCircle2 },
  in_progress: { label: 'In Progress', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: Clock        },
};

const KEY_STATUSES = ['completed', 'no_show', 'pending', 'cancelled'];
const DAYS_ORDER   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Component ──────────────────────────────────────────────────────────────────

export default function AppointmentReportDialog({ open, onOpenChange }: AppointmentReportDialogProps) {
  const [weekAnchor, setWeekAnchor] = useState<Date>(new Date());
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 0 });
  const weekEnd   = endOfWeek(weekAnchor,   { weekStartsOn: 0 });

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/appointments/appointment-reports?date=${format(weekAnchor, 'yyyy-MM-dd')}`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch report');
      }
      setReportData(await res.json());
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // slight delay so the dialog closes before resetting state
    setTimeout(() => {
      setReportData(null);
      setError(null);
      setWeekAnchor(new Date());
    }, 200);
  };

  const handleNewReport = () => {
    setReportData(null);
    setError(null);
    setWeekAnchor(new Date());
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileBarChart className="h-5 w-5 text-green-600" />
            Weekly Appointment Report
          </DialogTitle>
          <DialogDescription>
            Select any date within the week you want to report on (Sunday – Saturday).
          </DialogDescription>
        </DialogHeader>

        {!reportData ? (
          /* ── STEP 1: Week Picker ─────────────────────────────────────────── */
          <div className="space-y-6 py-2">

            {/* Week navigation arrows */}
            <div className="flex items-center justify-between px-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekAnchor(prev => subWeeks(prev, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <p className="font-semibold text-sm">
                  {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Selected week</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekAnchor(prev => addWeeks(prev, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar */}
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={weekAnchor}
                onSelect={(d) => d && setWeekAnchor(d)}
                modifiers={{ inWeek: (d) => d >= weekStart && d <= weekEnd }}
                modifiersClassNames={{
                  inWeek: 'bg-green-100 text-green-900 rounded-none first:rounded-l-md last:rounded-r-md',
                }}
                classNames={{ today: 'border-2 border-green-500 font-bold' }}
              />
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 gap-2"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <FileBarChart className="h-4 w-4" />
                {isGenerating ? 'Generating…' : 'Generate Report'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* ── STEP 2: Report Results ──────────────────────────────────────── */
          <div className="space-y-6 py-2">

            {/* Period & total */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Report period</p>
                <p className="font-semibold">
                  {format(new Date(reportData.period.start), 'MMM d')} – {format(new Date(reportData.period.end), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Appointments</p>
                <p className="text-3xl font-bold text-green-600">{reportData.total_appointments}</p>
              </div>
            </div>

            <Separator />

            {/* Key status cards */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Status Summary
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {KEY_STATUSES.map((key) => {
                  const cfg = STATUS_CONFIG[key];
                  const Icon = cfg.icon;
                  const count = reportData.by_status[key] ?? 0;
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-4 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}
                    >
                      <div className={`p-2 rounded-lg bg-white/60 ${cfg.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
                        <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Other statuses not in KEY_STATUSES */}
            {Object.entries(reportData.by_status).some(([k]) => !KEY_STATUSES.includes(k)) && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Other Statuses
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(reportData.by_status)
                    .filter(([k]) => !KEY_STATUSES.includes(k))
                    .map(([status, count]) => {
                      const cfg = STATUS_CONFIG[status];
                      return (
                        <div key={status} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium capitalize">{cfg?.label ?? status}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            <Separator />

            {/* By day bar chart */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                By Day of Week
              </h3>
              <div className="space-y-2">
                {DAYS_ORDER.map((day) => {
                  const count = reportData.by_day[day] ?? 0;
                  const max = Math.max(...Object.values(reportData.by_day), 1);
                  const pct = Math.round((count / max) * 100);
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <span className="text-sm w-24 font-medium text-gray-600">{day}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-5 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By appointment type */}
            {Object.keys(reportData.by_type).length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    By Appointment Type
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(reportData.by_type).map(([type, count]) => (
                      <div key={type} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                        <span className="text-sm capitalize">{type}</span>
                        <Badge variant="secondary" className="text-xs">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* By veterinarian */}
            {Object.keys(reportData.by_veterinarian).length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    By Veterinarian
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(reportData.by_veterinarian).map(([vet, count]) => (
                      <div key={vet} className="flex justify-between items-center p-2.5 bg-muted rounded-lg">
                        <span className="text-sm font-medium">{vet}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button variant="outline" onClick={handleNewReport} className="gap-1">
                <ChevronLeft className="h-3 w-3" />
                Pick Another Week
              </Button>
              <Button variant="outline" onClick={handleClose}>Close</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
