"use client";

import React from "react";

interface PerformanceTabProps {
  employee: any;
}

function generateMockMetrics(emp: any) {
  const hash = ((emp.first_name || "") + (emp.last_name || ""))
    .split("")
    .reduce((a: number, c: string) => a + c.charCodeAt(0), 0);

  const patientsThisMonth = 18 + (hash % 30);
  const avgConsultation = 20 + (hash % 25);
  const rating = 3.5 + (hash % 15) / 10;
  const revenue = patientsThisMonth * (emp.consultation_fee || 500);

  const weeklyAppointments = Array.from({ length: 7 }, (_, i) =>
    Math.max(0, 2 + Math.floor(Math.sin(hash + i * 1.5) * 4 + (hash % 3)))
  );

  const monthlyTrend = Array.from({ length: 12 }, (_, i) =>
    Math.max(0, Math.floor(15 + Math.sin(hash / 10 + i) * 12 + (hash % 5)))
  );

  return {
    patientsThisMonth,
    avgConsultation,
    rating: Math.min(5, rating),
    revenue,
    weeklyAppointments,
    monthlyTrend,
    completionRate: 85 + (hash % 15),
    followUpRate: 40 + (hash % 40),
  };
}

export function PerformanceTab({ employee }: PerformanceTabProps) {
  const metrics = generateMockMetrics(employee);

  if (employee.role !== "veterinarian") {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">Performance metrics are available for veterinarians only.</p>
      </div>
    );
  }

  const stars = Array.from({ length: 5 }, (_, i) => i + 1);

  return (
    <div className="space-y-5">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Patients This Month"
          value={metrics.patientsThisMonth}
          suffix="patients"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          }
          variant="primary"
        />
        <MetricCard
          label="Avg. Consultation"
          value={`${metrics.avgConsultation}m`}
          suffix="minutes"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
          }
          variant="muted"
        />
        <MetricCard
          label="Revenue Generated"
          value={`₱${metrics.revenue.toLocaleString()}`}
          suffix="this month"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                clipRule="evenodd"
              />
            </svg>
          }
          variant="primary"
        />
        <MetricCard
          label="Completion Rate"
          value={`${metrics.completionRate}%`}
          suffix="appointments"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          }
          variant="muted"
        />
      </div>

      {/* Rating */}
      <div className="bg-muted/50 rounded-xl p-4 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient Rating</span>
          <span className="text-lg font-bold text-foreground">{metrics.rating.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1">
          {stars.map((s) => (
            <svg
              key={s}
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 ${s <= Math.round(metrics.rating) ? "text-orange-400" : "text-muted"}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
          <span className="text-xs text-muted-foreground ml-2">Based on patient feedback</span>
        </div>
      </div>

      {/* Weekly trend */}
      <div className="bg-muted/50 rounded-xl p-4 border border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            7-Day Appointment Trend
          </span>
          <span className="text-xs text-muted-foreground">
            {metrics.weeklyAppointments.reduce((a: number, b: number) => a + b, 0)} total
          </span>
        </div>
        <div className="flex items-end gap-1.5 h-16">
          {metrics.weeklyAppointments.map((count: number, i: number) => {
            const max = Math.max(...metrics.weeklyAppointments, 1);
            const height = (count / max) * 100;
            const days = ["M", "T", "W", "T", "F", "S", "S"];
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative" style={{ height: "48px" }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-md bg-primary hover:bg-primary/80 transition"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${days[i]}: ${count} appointments`}
                  />
                </div>
                <span className="text-[9px] font-medium text-muted-foreground">{days[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Follow-up rate */}
      <div className="bg-muted/50 rounded-xl p-4 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Follow-up Rate</span>
          <span className="text-sm font-bold text-foreground">{metrics.followUpRate}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${metrics.followUpRate}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">Percentage of patients with scheduled follow-ups</p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  icon,
  variant,
}: {
  label: string;
  value: string | number;
  suffix: string;
  icon: React.ReactNode;
  variant: "primary" | "muted";
}) {
  return (
    <div className="bg-muted/50 rounded-xl p-3.5 border border-border">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`h-7 w-7 rounded-lg flex items-center justify-center ${
            variant === "primary" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
          {label}
        </span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{suffix}</p>
    </div>
  );
}
