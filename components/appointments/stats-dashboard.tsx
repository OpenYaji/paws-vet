'use client';

import { Calendar, TrendingUp, BarChart3 } from 'lucide-react';

interface StatsDashboardProps {
  appointmentsToday: number;
  upcoming7Days: number;
  monthlyBooked: number;
  monthlyCapacity: number;
}

export default function StatsDashboard({
  appointmentsToday,
  upcoming7Days,
  monthlyBooked,
  monthlyCapacity,
}: StatsDashboardProps) {
  const capacityPercent =
    monthlyCapacity > 0 ? Math.round((monthlyBooked / monthlyCapacity) * 100) : 0;

  const capacityColor =
    capacityPercent >= 80
      ? 'bg-red-500'
      : capacityPercent >= 50
        ? 'bg-amber-500'
        : 'bg-green-500';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Today */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-5 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-blue-50">
          <Calendar className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Appointments Today</p>
          <p className="text-3xl font-bold">{appointmentsToday}</p>
        </div>
      </div>

      {/* Upcoming */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-5 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-purple-50">
          <TrendingUp className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Upcoming (7 Days)</p>
          <p className="text-3xl font-bold">{upcoming7Days}</p>
        </div>
      </div>

      {/* Monthly Capacity */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 rounded-xl bg-amber-50">
            <BarChart3 className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Monthly Capacity</p>
            <p className="text-xl font-bold">{capacityPercent}%</p>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5">
          <div
            className={`${capacityColor} h-2.5 rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(capacityPercent, 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {monthlyBooked} / {monthlyCapacity} slots booked
        </p>
      </div>
    </div>
  );
}
