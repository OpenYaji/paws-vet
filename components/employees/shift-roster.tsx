"use client";

import React, { useState, useMemo } from "react";
import { BoringAvatar } from "@/components/ui/boring-avatar";

type ShiftStatus = "on-duty" | "on-break" | "off-duty" | "leave";

interface ShiftBlock {
  start: number; // hour 0-23
  end: number;
  status: ShiftStatus;
}

interface EmployeeShift {
  id: string;
  name: string;
  role: string;
  shifts: ShiftBlock[];
  isOnline: boolean;
}

const SHIFT_COLORS: Record<ShiftStatus, { bg: string; label: string }> = {
  "on-duty": { bg: "bg-primary", label: "On Duty" },
  "on-break": { bg: "bg-orange-400 dark:bg-orange-500", label: "On Break" },
  "off-duty": { bg: "bg-muted", label: "Off Duty" },
  "leave": { bg: "bg-muted-foreground/30", label: "Leave" },
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM

function generateMockShifts(employees: any[]): EmployeeShift[] {
  return employees
    .filter((e: any) => e.role === "veterinarian")
    .map((emp: any) => {
      const hash = (emp.first_name + emp.last_name).split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
      const startHour = 7 + (hash % 4);
      const breakHour = startHour + 3 + (hash % 2);
      const endHour = Math.min(startHour + 8, 19);

      const shifts: ShiftBlock[] = [
        { start: startHour, end: breakHour, status: "on-duty" },
        { start: breakHour, end: breakHour + 1, status: "on-break" },
        { start: breakHour + 1, end: endHour, status: "on-duty" },
      ];

      return {
        id: emp.id || emp.user_id,
        name: `${emp.first_name} ${emp.last_name}`,
        role: emp.role,
        shifts,
        isOnline: emp.account_status === "active" && hash % 3 !== 0,
      };
    });
}

interface ShiftRosterProps {
  employees: any[];
}

export function ShiftRoster({ employees }: ShiftRosterProps) {
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1; // Mon=0
  });

  const rosterData = useMemo(() => generateMockShifts(employees), [employees]);

  const totalHours = HOURS.length;

  if (rosterData.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground">No veterinarians scheduled</p>
        <p className="text-xs text-muted-foreground mt-1">Add veterinarians to see the shift roster</p>
      </div>
    );
  }

  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const todayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const isToday = selectedDay === todayIndex;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Shift Roster</h3>
            <p className="text-xs text-muted-foreground">Veterinarian schedule overview</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 mr-2">
          {Object.entries(SHIFT_COLORS).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${val.bg}`} />
              <span className="text-[10px] text-muted-foreground font-medium">{val.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day selector */}
      <div className="px-5 py-3 border-b border-border bg-muted/30">
        <div className="flex gap-1">
          {DAYS.map((day, i) => (
            <button
              key={day}
              onClick={() => setSelectedDay(i)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition
                ${selectedDay === i
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : i === todayIndex
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:bg-accent"
                }`}
            >
              {day}
              {i === todayIndex && selectedDay !== i && (
                <span className="block h-1 w-1 rounded-full bg-primary mx-auto mt-0.5" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Gantt area */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Time header */}
          <div className="flex border-b border-border">
            <div className="w-44 flex-shrink-0" />
            <div className="flex-1 flex">
              {HOURS.map((h) => (
                <div key={h} className="flex-1 px-1 py-2 text-center">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {h > 12 ? `${h - 12}PM` : h === 12 ? "12PM" : `${h}AM`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {rosterData.map((emp, idx) => (
            <div
              key={emp.id}
              className={`flex items-center border-b border-border hover:bg-accent/30 transition ${idx === rosterData.length - 1 ? "border-b-0" : ""}`}
            >
              {/* Employee info */}
              <div className="w-44 flex-shrink-0 px-4 py-3 flex items-center gap-2.5">
                <div className="relative">
                  <BoringAvatar name={emp.name} size={32} className="rounded-lg" />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${emp.isOnline ? "bg-green-500" : "bg-muted-foreground/40"}`}
                    title={emp.isOnline ? "Online" : "Offline"}
                  >
                    {emp.isOnline && (
                      <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-40" />
                    )}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{emp.name}</p>
                  <p className="text-[10px] text-muted-foreground">Veterinarian</p>
                </div>
              </div>

              {/* Shift bars */}
              <div className="flex-1 relative h-10 mx-2">
                {/* Grid lines */}
                <div className="absolute inset-0 flex">
                  {HOURS.map((h) => (
                    <div key={h} className="flex-1 border-l border-border/50 first:border-l-0" />
                  ))}
                </div>

                {/* Current time marker */}
                {isToday && currentHour >= HOURS[0] && currentHour <= HOURS[HOURS.length - 1] && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10"
                    style={{ left: `${((currentHour - HOURS[0]) / totalHours) * 100}%` }}
                  >
                    <div className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-destructive" />
                  </div>
                )}

                {/* Shift blocks */}
                {emp.shifts.map((shift, si) => {
                  const left = ((shift.start - HOURS[0]) / totalHours) * 100;
                  const width = ((shift.end - shift.start) / totalHours) * 100;
                  const colors = SHIFT_COLORS[shift.status];
                  return (
                    <div
                      key={si}
                      className={`absolute top-1.5 bottom-1.5 rounded-md ${colors.bg} opacity-80 hover:opacity-100 transition cursor-default`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${colors.label}: ${shift.start}:00 - ${shift.end}:00`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
