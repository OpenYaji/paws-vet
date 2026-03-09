'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth-client';
import {
  Receipt,
  PawPrint,
  CalendarDays,
  CreditCard,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Types
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type AppointmentPaymentStatus = 'unpaid' | 'paid' | 'waived' | 'refunded';
type AppointmentPaymentMethod = 'gcash' | 'maya' | 'cash' | 'card' | 'other' | null;

interface PaymentRecord {
  id: string;
  appointment_number: string;
  appointment_type_detail: string | null;
  scheduled_start: string;
  appointment_status: string;
  payment_amount: number;
  payment_status: AppointmentPaymentStatus;
  payment_method: AppointmentPaymentMethod;
  payment_reference: string | null;
  paid_at: string | null;
  is_aspin_puspin: boolean;
  pet: {
    name: string;
    species: string;
    breed: string | null;
  } | null;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BADGE: Record<AppointmentPaymentStatus, { label: string; cls: string }> = {
  unpaid:   { label: 'Awaiting Payment', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  paid:     { label: 'Paid',             cls: 'bg-primary/10 text-primary' },
  waived:   { label: 'Free / Waived',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  refunded: { label: 'Refunded',         cls: 'bg-muted text-muted-foreground' },
};

const METHOD_LABEL: Record<string, string> = {
  gcash: 'GCash',
  maya:  'Maya',
  cash:  'Cash',
  card:  'Card',
  other: 'Other',
};

function StatusBadge({ status }: { status: AppointmentPaymentStatus }) {
  const b = BADGE[status] ?? BADGE.unpaid;
  return (
    <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${b.cls}`}>
      {b.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string | null }) {
  const isOutreach = type === 'outreach';
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        isOutreach
          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
          : 'bg-accent text-primary'
      }`}
    >
      {isOutreach ? 'Outreach' : 'Regular'}
    </span>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Component
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ClientTransactionsPage() {
  const [records, setRecords]     = useState<PaymentRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Session expired. Please log in again.');

      const { data, error: qErr } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_number,
          appointment_type_detail,
          scheduled_start,
          appointment_status,
          payment_amount,
          payment_status,
          payment_method,
          payment_reference,
          paid_at,
          is_aspin_puspin,
          pets!appointments_pet_id_fkey (
            name,
            species,
            breed
          )
        `)
        .eq('booked_by', user.id)
        .order('scheduled_start', { ascending: false });

      if (qErr) throw qErr;

      const rows = (data ?? []).map((row: any) => ({
        id:                      row.id,
        appointment_number:      row.appointment_number,
        appointment_type_detail: row.appointment_type_detail,
        scheduled_start:         row.scheduled_start,
        appointment_status:      row.appointment_status,
        payment_amount:          row.payment_amount ?? 0,
        payment_status:          (row.payment_status ?? 'unpaid') as AppointmentPaymentStatus,
        payment_method:          row.payment_method as AppointmentPaymentMethod,
        payment_reference:       row.payment_reference ?? null,
        paid_at:                 row.paid_at ?? null,
        is_aspin_puspin:         row.is_aspin_puspin ?? false,
        pet: Array.isArray(row.pets) ? (row.pets[0] ?? null) : (row.pets ?? null),
      })) as PaymentRecord[];

      setRecords(rows);
      setTotalPaid(
        rows.filter(r => r.payment_status === 'paid').reduce((s, r) => s + r.payment_amount, 0),
      );
    } catch (e: any) {
      setError(e.message ?? 'Failed to load payment history.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 size={36} className="animate-spin text-primary" />
          <p className="text-sm font-medium">Loading payment historyâ€¦</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-sm w-full">
          <AlertCircle size={36} className="text-destructive mx-auto mb-4" />
          <p className="font-semibold text-destructive mb-2">Unable to load</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw size={14} /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const paidCount    = records.filter(r => r.payment_status === 'paid').length;
  const pendingCount = records.filter(r => r.payment_status === 'unpaid').length;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">

      <div className="pt-2">
        <h1 className="text-3xl font-bold">My Transactions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track payment status for all your appointments
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Total Paid',
            value: `â‚±${totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
            icon: <CreditCard size={16} className="text-primary" />,
          },
          {
            label: 'Confirmed',
            value: String(paidCount),
            icon: <Receipt size={16} className="text-primary" />,
          },
          {
            label: 'Pending',
            value: String(pendingCount),
            icon: <CalendarDays size={16} className="text-primary" />,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-1"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </p>
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
                {stat.icon}
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {records.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-16 text-center">
          <div className="text-5xl mb-4">ðŸ¾</div>
          <p className="font-semibold text-foreground">No transactions yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your appointment payment records will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => {
            const referenceSubmitted =
              rec.payment_status === 'unpaid' &&
              (rec.payment_method === 'gcash' || rec.payment_method === 'maya') &&
              !!rec.payment_reference;

            return (
              <div
                key={rec.id}
                className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-foreground">
                      #{rec.appointment_number}
                    </span>
                    <TypeBadge type={rec.appointment_type_detail} />
                  </div>
                  <StatusBadge status={rec.payment_status} />
                </div>

                {/* Pet + date */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {rec.pet && (
                    <span className="flex items-center gap-1.5">
                      <PawPrint size={13} className="text-primary" />
                      <span className="font-medium text-foreground">{rec.pet.name}</span>
                      <span className="capitalize">
                        ({rec.pet.species}{rec.pet.breed ? `, ${rec.pet.breed}` : ''})
                      </span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={13} />
                    {format(new Date(rec.scheduled_start), 'PPP')}
                  </span>
                </div>

                {/* Payment cells */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <PayCell
                    label="Amount"
                    value={
                      rec.payment_amount === 0
                        ? 'Free'
                        : `â‚±${rec.payment_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                    }
                    highlight={rec.payment_amount > 0}
                  />
                  <PayCell
                    label="Method"
                    value={rec.payment_method ? METHOD_LABEL[rec.payment_method] : 'â€”'}
                  />
                  <PayCell
                    label="Reference"
                    value={rec.payment_reference ?? 'â€”'}
                    mono
                  />
                  <PayCell
                    label="Paid on"
                    value={rec.paid_at ? format(new Date(rec.paid_at), 'PPP') : 'â€”'}
                  />
                </div>

                {/* Pending verification notice */}
                {referenceSubmitted && (
                  <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                    <span>
                      Reference submitted â€”{' '}
                      <strong>awaiting verification by the PAWS team</strong>. Your booking will be
                      confirmed once payment is verified.
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end pb-2">
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sub-component
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PayCell({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="bg-accent/50 rounded-xl p-3 space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className={[
          'text-sm font-semibold truncate',
          highlight ? 'text-primary' : 'text-foreground',
          mono ? 'font-mono' : '',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  );
}
