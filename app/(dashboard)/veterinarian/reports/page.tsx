"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
// imported month functions for date calculation
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek,
  addMonths, subMonths, startOfMonth, endOfMonth
 } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart2, Calendar, ChevronLeft, ChevronRight, FileText,
<<<<<<< HEAD
  Pill, Syringe, AlertTriangle, Clock, TrendingUp, RefreshCw, Printer,
=======
  Pill, Syringe, AlertTriangle, Clock, TrendingUp, RefreshCw,
  Download
>>>>>>> 93b42aa9939f93e0223ce0e075524b9a3c205ca4
} from "lucide-react";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { PDFDownloadLink } from '@react-pdf/renderer';
import ReportDocument from './report-pdf';
import { useEffect } from 'react';

interface AppointmentReport {
  period: { start: string; end: string };
  total_appointments: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  by_day: Record<string, number>;
}

interface VetReport {
  period: { from: string; to: string };
  medical_records: {
    total_last_30_days: number;
    by_day: Record<string, number>;
    top_diagnoses: { name: string; count: number }[];
  };
  prescriptions: {
    total: number;
    by_status: Record<string, number>;
    top_medications: { name: string; count: number }[];
  };
  vaccinations: {
    total: number;
    overdue_count: number;
    upcoming_due_count: number;
    overdue: { vaccine_name: string; next_due_date: string; pet: { name?: string; species?: string } | null }[];
    upcoming_due: { vaccine_name: string; next_due_date: string; pet: { name?: string; species?: string } | null }[];
    top_vaccines: { name: string; count: number }[];
  };
}

// ---- Helpers ----

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-500",
  scheduled: "bg-blue-500",
  in_progress: "bg-yellow-500",
  cancelled: "bg-red-400",
  no_show: "bg-gray-400",
};

function BarRow({ label, value, max, color = "bg-primary" }: {
  label: string; value: number; max: number; color?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-36 truncate shrink-0 capitalize">{label.replace(/_/g, " ")}</span>
      <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold w-8 text-right">{value}</span>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Page ----

export default function VetReportsPage() {
  const [weekDate, setWeekDate] = useState(new Date());
  const [reportOpen, setReportOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrintReport = () => {
    const el = printRef.current;
    if (!el) return;
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    win.document.write(`
      <html><head><title>Weekly Report</title>
      <style>
        body { font-family: sans-serif; padding: 32px; color: #111; }
        h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
        h2 { font-size: 15px; font-weight: 600; margin: 20px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        .meta { font-size: 12px; color: #6b7280; margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
        .stat { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
        .stat-label { font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
        .stat-value { font-size: 28px; font-weight: 700; margin: 4px 0 2px; }
        .stat-sub { font-size: 11px; color: #9ca3af; }
        .row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 4px 0; border-bottom: 1px solid #f3f4f6; }
        .row:last-child { border-bottom: none; }
        .badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: #fee2e2; color: #dc2626; }
        .badge-warn { background: #fef3c7; color: #d97706; }
        ul { margin: 0; padding-left: 18px; font-size: 13px; line-height: 2; }
        @media print { body { padding: 16px; } }
      </style></head><body>${el.innerHTML}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };
  // replaced weekDate with a generic currentDate and added period state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [period, setPeriod] = useState<"week" | "month">("week");

  // dynamically format the label based on the selected period
  const dateLabel = period === "week"
    ? `${format(startOfWeek(currentDate), "MMM d")} – ${format(endOfWeek(currentDate), "MMM d, yyyy")}`
    : format(currentDate, "MMMM yyyy");

  // navigation handlers to support both weeks and months
  const handlePrevious = () => {
    setCurrentDate((d) => period === "week" ? subWeeks(d, 1) : subMonths(d, 1));
  };
  const handleNext = () => {
    setCurrentDate((d) => period === "week" ? addWeeks(d, 1) : addMonths(d, 1));
  };

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // updated api calls to include the period parameter
  const { data: apptReport, isLoading: apptLoading, mutate: mutateAppt } = useSWR<AppointmentReport>(
    `/api/veterinarian/appointments/appointment-reports?date=${format(currentDate, "yyyy-MM-dd")}&period=${period}`,
    fetcher
  );

  const { data: vetReport, isLoading: vetLoading, mutate: mutateVet } = useSWR<VetReport>(
    `/api/veterinarian/vet-reports?date=${format(currentDate, "yyyy-MM-dd")}&period=${period}`,
    fetcher
  );

  const maxByDay = apptReport
    ? Math.max(...Object.values(apptReport.by_day), 1)
    : 1;
  const maxByType = apptReport
    ? Math.max(...Object.values(apptReport.by_type), 1)
    : 1;
  const maxByStatus = apptReport
    ? Math.max(...Object.values(apptReport.by_status), 1)
    : 1;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart2 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-sm text-muted-foreground">
              Clinical activity overview
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* updated to pass the new dateLabel instead of weekLabel */}
          {isClient && apptReport && vetReport ? (
            <PDFDownloadLink
              document={
                <ReportDocument
                  apptData={apptReport}
                  vetData={vetReport}
                  dateLabel={dateLabel}
                  period={period} // <-- ADD THIS LINE
                />
              }
              fileName={`clinic-report-${format(new Date(), "yyyy-MM-dd")}.pdf`}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 mr-2"
            >
              {({ loading }) => (
                <>
                  <Download className="h-4 w-4" />
                  {loading ? "Preparing..." : "Download PDF"}
                </>
              )}
            </PDFDownloadLink>
          ) : (
            <Button variant="outline" size="sm" disabled className="mr-2">
              <Download className="h-4 w-4 mr-2" /> Loading PDF...
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              mutateAppt();
              mutateVet();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <div id="report-container" className="bg-background p-2 rounded-xl">
        {/* extracted navigation to sit above tabs so it controls the whole view */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-48 text-center">
              {dateLabel}
            </span>
            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-36">
            <Select
              value={period}
              onValueChange={(val: "week" | "month") => {
                setPeriod(val);
                setCurrentDate(new Date());
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Weekly View</SelectItem>
                <SelectItem value="month">Monthly View</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="appointments">
          <TabsList>
            <TabsTrigger value="appointments" className="gap-2">
              <Calendar className="h-4 w-4" /> Appointments
            </TabsTrigger>
            <TabsTrigger value="medical" className="gap-2">
              <FileText className="h-4 w-4" /> Medical Records
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="gap-2">
              <Pill className="h-4 w-4" /> Prescriptions
            </TabsTrigger>
            <TabsTrigger value="vaccinations" className="gap-2">
              <Syringe className="h-4 w-4" /> Vaccinations
            </TabsTrigger>
          </TabsList>

          {/* ── Appointments Tab ── */}
          <TabsContent value="appointments" className="space-y-5 mt-5">
            {apptLoading ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
                Loading...
              </div>
            ) : !apptReport ? (
              <div className="text-center py-16 text-muted-foreground">
                No data available.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* updated stat cards to use dynamic labels */}
                  <StatCard
                    icon={<Calendar className="h-5 w-5" />}
                    label="Total Appointments"
                    value={apptReport.total_appointments}
                    sub={dateLabel}
                  />
                  <StatCard
                    icon={<TrendingUp className="h-5 w-5" />}
                    label="Completed"
                    value={apptReport.by_status?.completed ?? 0}
                    sub={`this ${period}`}
                  />
                  <StatCard
                    icon={<AlertTriangle className="h-5 w-5" />}
                    label="Cancelled / No-show"
                    value={
                      (apptReport.by_status?.cancelled ?? 0) +
                      (apptReport.by_status?.no_show ?? 0)
                    }
                    sub={`this ${period}`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">By Day</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Object.entries(apptReport.by_day).map(([day, count]) => (
                        <BarRow
                          key={day}
                          label={day}
                          value={count}
                          max={maxByDay}
                        />
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        By Appointment Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Object.keys(apptReport.by_type).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No data</p>
                      ) : (
                        Object.entries(apptReport.by_type).map(
                          ([type, count]) => (
                            <BarRow
                              key={type}
                              label={type}
                              value={count}
                              max={maxByType}
                              color="bg-blue-500"
                            />
                          ),
                        )
                      )}
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">By Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Object.entries(apptReport.by_status).map(
                        ([status, count]) => (
                          <BarRow
                            key={status}
                            label={status}
                            value={count}
                            max={maxByStatus}
                            color={
                              STATUS_COLORS[status] ?? "bg-muted-foreground"
                            }
                          />
                        ),
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Medical Records Tab ── */}
          <TabsContent value="medical" className="space-y-5 mt-5">
            {vetLoading ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
                Loading...
              </div>
            ) : !vetReport ? (
              <div className="text-center py-16 text-muted-foreground">
                No data available.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StatCard
                    icon={<FileText className="h-5 w-5" />}
                    label={`Records (last ${period === "month" ? "30" : "7"} days)`}
                    value={vetReport.medical_records.total_last_30_days}
                    sub={`${vetReport.period.from} – ${vetReport.period.to}`}
                  />
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top Diagnoses</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {vetReport.medical_records.top_diagnoses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No diagnoses recorded yet.
                      </p>
                    ) : (
                      vetReport.medical_records.top_diagnoses.map(
                        ({ name, count }) => (
                          <BarRow
                            key={name}
                            label={name}
                            value={count}
                            max={
                              vetReport.medical_records.top_diagnoses[0]
                                ?.count ?? 1
                            }
                            color="bg-emerald-500"
                          />
                        ),
                      )
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ── Prescriptions Tab ── */}
          <TabsContent value="prescriptions" className="space-y-5 mt-5">
            {vetLoading ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
                Loading...
              </div>
            ) : !vetReport ? (
              <div className="text-center py-16 text-muted-foreground">
                No data available.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard
                    icon={<Pill className="h-5 w-5" />}
                    label="Total Prescriptions"
                    value={vetReport.prescriptions.total}
                  />
                  {Object.entries(vetReport.prescriptions.by_status).map(
                    ([status, count]) => (
                      <StatCard
                        key={status}
                        icon={<Pill className="h-5 w-5" />}
                        label={status}
                        value={count}
                      />
                    ),
                  )}
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Most Prescribed Medications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {vetReport.prescriptions.top_medications.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No prescriptions yet.
                      </p>
                    ) : (
                      vetReport.prescriptions.top_medications.map(
                        ({ name, count }) => (
                          <BarRow
                            key={name}
                            label={name}
                            value={count}
                            max={
                              vetReport.prescriptions.top_medications[0]
                                ?.count ?? 1
                            }
                            color="bg-violet-500"
                          />
                        ),
                      )
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ── Vaccinations Tab ── */}
          <TabsContent value="vaccinations" className="space-y-5 mt-5">
            {vetLoading ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
                Loading...
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Weekly Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" /> Weekly Overall Report
            </DialogTitle>
          </DialogHeader>

          <div ref={printRef} className="space-y-6 text-sm">
            {/* Report header */}
            <div>
              <h1 className="text-xl font-bold">PAWS Veterinary Clinic</h1>
              <p className="text-muted-foreground text-xs">
                Week of {weekLabel} &nbsp;·&nbsp; Generated {format(new Date(), "MMM d, yyyy h:mm a")}
              </p>
            </div>

            {/* Appointments summary */}
            <div>
              <h2 className="font-semibold text-base border-b pb-1 mb-3">Appointments</h2>
              {apptReport ? (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                      <p className="text-2xl font-bold">{apptReport.total_appointments}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Completed</p>
                      <p className="text-2xl font-bold">{apptReport.by_status?.completed ?? 0}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Cancelled / No-show</p>
                      <p className="text-2xl font-bold">
                        {(apptReport.by_status?.cancelled ?? 0) + (apptReport.by_status?.no_show ?? 0)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">By Day</p>
                      {Object.entries(apptReport.by_day).map(([day, count]) => (
                        <div key={day} className="flex justify-between py-0.5 border-b last:border-0">
                          <span className="capitalize">{day}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">By Status</p>
                      {Object.entries(apptReport.by_status).map(([status, count]) => (
                        <div key={status} className="flex justify-between py-0.5 border-b last:border-0">
                          <span className="capitalize">{status.replace(/_/g, " ")}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No appointment data for this week.</p>
              )}
            </div>

            {/* Medical Records */}
            <div>
              <h2 className="font-semibold text-base border-b pb-1 mb-3">Medical Records (Last 30 Days)</h2>
              {vetReport ? (
                <>
                  <div className="border rounded-lg p-3 inline-block mb-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Records</p>
                    <p className="text-2xl font-bold">{vetReport.medical_records.total_last_30_days}</p>
                  </div>
                  {vetReport.medical_records.top_diagnoses.length > 0 && (
                    <>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Top Diagnoses</p>
                      {vetReport.medical_records.top_diagnoses.map(({ name, count }) => (
                        <div key={name} className="flex justify-between py-0.5 border-b last:border-0">
                          <span>{name}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No data available.</p>
              )}
            </div>

            {/* Prescriptions */}
            <div>
              <h2 className="font-semibold text-base border-b pb-1 mb-3">Prescriptions</h2>
              {vetReport ? (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                      <p className="text-2xl font-bold">{vetReport.prescriptions.total}</p>
                    </div>
                    {Object.entries(vetReport.prescriptions.by_status).map(([status, count]) => (
                      <div key={status} className="border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide capitalize">{status}</p>
                        <p className="text-2xl font-bold">{count}</p>
                      </div>
                    ))}
                  </div>
                  {vetReport.prescriptions.top_medications.length > 0 && (
                    <>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Top Medications</p>
                      {vetReport.prescriptions.top_medications.map(({ name, count }) => (
                        <div key={name} className="flex justify-between py-0.5 border-b last:border-0">
                          <span>{name}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No data available.</p>
              )}
            </div>

            {/* Vaccinations */}
            <div>
              <h2 className="font-semibold text-base border-b pb-1 mb-3">Vaccinations</h2>
              {vetReport ? (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Records</p>
                      <p className="text-2xl font-bold">{vetReport.vaccinations.total}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Overdue</p>
                      <p className="text-2xl font-bold text-red-600">{vetReport.vaccinations.overdue_count}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Due in 90 Days</p>
                      <p className="text-2xl font-bold text-amber-600">{vetReport.vaccinations.upcoming_due_count}</p>
                    </div>
                  </div>
                  {vetReport.vaccinations.overdue.length > 0 && (
                    <>
                      <p className="text-xs font-semibold uppercase text-red-600 mb-1">Overdue Vaccinations</p>
                      {vetReport.vaccinations.overdue.map((v, i) => (
                        <div key={i} className="flex justify-between py-0.5 border-b last:border-0">
                          <span>{v.pet?.name ?? "—"} <span className="text-muted-foreground capitalize">({v.pet?.species ?? ""})</span> — {v.vaccine_name}</span>
                          <Badge variant="destructive" className="text-xs">{format(new Date(v.next_due_date), "MMM d")}</Badge>
                        </div>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No data available.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button onClick={handlePrintReport}>
              <Printer className="h-4 w-4 mr-2" /> Print Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
            ) : !vetReport ? (
              <div className="text-center py-16 text-muted-foreground">
                No data available.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    icon={<Syringe className="h-5 w-5" />}
                    label="Total Records"
                    value={vetReport.vaccinations.total}
                  />
                  <StatCard
                    icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                    label="Overdue"
                    value={vetReport.vaccinations.overdue_count}
                    sub="past due date"
                  />
                  <StatCard
                    icon={<Clock className="h-5 w-5 text-amber-500" />}
                    label="Due in 90 days"
                    value={vetReport.vaccinations.upcoming_due_count}
                    sub="upcoming"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Overdue list */}
                  {vetReport.vaccinations.overdue.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                          <AlertTriangle className="h-4 w-4" /> Overdue
                          Vaccinations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {vetReport.vaccinations.overdue.map((v, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-sm"
                          >
                            <div>
                              <span className="font-medium">
                                {v.pet?.name ?? "—"}
                              </span>
                              <span className="text-muted-foreground text-xs ml-1.5 capitalize">
                                ({v.pet?.species ?? ""})
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {v.vaccine_name}
                              </p>
                            </div>
                            <Badge variant="destructive" className="text-xs">
                              {format(new Date(v.next_due_date), "MMM d")}
                            </Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Upcoming due list */}
                  {vetReport.vaccinations.upcoming_due.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                          <Clock className="h-4 w-4" /> Due Soon
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {vetReport.vaccinations.upcoming_due.map((v, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-sm"
                          >
                            <div>
                              <span className="font-medium">
                                {v.pet?.name ?? "—"}
                              </span>
                              <span className="text-muted-foreground text-xs ml-1.5 capitalize">
                                ({v.pet?.species ?? ""})
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {v.vaccine_name}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-xs text-amber-600 border-amber-300"
                            >
                              {format(new Date(v.next_due_date), "MMM d")}
                            </Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Top vaccines bar chart */}
                  <Card
                    className={
                      vetReport.vaccinations.overdue.length > 0
                        ? ""
                        : "md:col-span-2"
                    }
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Most Administered Vaccines
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {vetReport.vaccinations.top_vaccines.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No vaccination data yet.
                        </p>
                      ) : (
                        vetReport.vaccinations.top_vaccines.map(
                          ({ name, count }) => (
                            <BarRow
                              key={name}
                              label={name}
                              value={count}
                              max={
                                vetReport.vaccinations.top_vaccines[0]?.count ??
                                1
                              }
                              color="bg-teal-500"
                            />
                          ),
                        )
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}