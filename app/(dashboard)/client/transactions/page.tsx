'use client';

import { supabase } from '@/lib/auth-client';
import useSWR, { useSWRConfig } from 'swr';
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
  payment_sender_name?: string | null;
  payment_verified_at?: string | null;
  pet: {
    name: string;
    species: string;
    breed: string | null;
  } | null;
}



const BADGE: Record<AppointmentPaymentStatus, { label: string; cls: string }> = {
  unpaid:   { label: 'Awaiting Payment', cls: 'bg-amber-700 text-white dark:bg-amber-500 dark:text-white' },
  paid:     { label: 'Paid',             cls: 'bg-emerald-700 text-white dark:bg-emerald-500 dark:text-white' },
  waived:   { label: 'Free / Waived',   cls: 'bg-blue-700 text-white dark:bg-blue-500 dark:text-white' },
  refunded: { label: 'Refunded',         cls: 'bg-slate-700 text-white dark:bg-slate-500 dark:text-white' },
};

const METHOD_LABEL: Record<string, string> = {
  gcash: 'GCash',
  maya:  'Maya',
  cash:  'Cash',
  card:  'Card',
  other: 'Other',
};

const STATUS_BORDER: Record<AppointmentPaymentStatus, string> = {
  paid:     'border-l-emerald-500',
  unpaid:   'border-l-amber-500',
  waived:   'border-l-blue-500',
  refunded: 'border-l-muted-foreground',
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
          ? 'bg-violet-700 text-white dark:bg-violet-500 dark:text-white'
          : 'bg-blue-700 text-white dark:bg-blue-500 dark:text-white'
      }`}
    >
      {isOutreach ? 'Outreach' : 'Regular'}
    </span>
  );
}

const fetchTransactions = async () => {
  const { data: { user }, error: authErr } =
    await supabase.auth.getUser();
  if (authErr || !user)
    throw new Error('Session expired.');

  const { data, error } = await supabase
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
      payment_sender_name,
      payment_verified_at,
      is_aspin_puspin,
      pets!appointments_pet_id_fkey (
        name, species, breed
      )
    `)
    .eq('booked_by', user.id)
    .order('scheduled_start', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []).map((row: any) => ({
    id: row.id,
    appointment_number: row.appointment_number,
    appointment_type_detail: row.appointment_type_detail,
    scheduled_start: row.scheduled_start,
    appointment_status: row.appointment_status,
    payment_amount: row.payment_amount ?? 0,
    payment_status: (row.payment_status ?? 'unpaid') as AppointmentPaymentStatus,
    payment_method: (row.payment_method ?? null) as AppointmentPaymentMethod,
    payment_reference: row.payment_reference ?? null,
    paid_at: row.paid_at ?? null,
    payment_sender_name: row.payment_sender_name ?? null,
    payment_verified_at: row.payment_verified_at ?? null,
    is_aspin_puspin: row.is_aspin_puspin ?? false,
    pet: Array.isArray(row.pets)
      ? (row.pets[0] ?? null)
      : (row.pets ?? null),
  }));

  const totalPaid = rows
    .filter(r => r.payment_status === 'paid')
    .reduce((s, r) => s + r.payment_amount, 0);

  return { records: rows, totalPaid };
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ClientTransactionsPage() {
  const { mutate } = useSWRConfig();
  const { data, isLoading: loading, error: swrError } =
    useSWR(
      'client-transactions',
      fetchTransactions,
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60000,
      }
    );

  const records = (data?.records ?? []) as PaymentRecord[];
  const totalPaid = data?.totalPaid ?? 0;
  const error = swrError?.message ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 size={36} className="animate-spin text-primary" />
          <p className="text-sm font-medium">Loading payment history…</p>
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
          <Button variant="outline" onClick={() => mutate('client-transactions')} className="gap-2">
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

      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Receipt className="w-7 h-7 text-primary" />
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">My Transactions</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track payment status for all your appointments
          </p>
        </div>
        <button
          onClick={() => mutate('client-transactions')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Total Paid',
            value: `\u20B1${totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
            icon: <CreditCard size={16} className="text-primary" />,
            accent: 'border-l-primary',
          },
          {
            label: 'Confirmed',
            value: String(paidCount),
            icon: <Receipt size={16} className="text-emerald-500" />,
            accent: 'border-l-emerald-500',
          },
          {
            label: 'Pending',
            value: String(pendingCount),
            icon: <CalendarDays size={16} className="text-amber-500" />,
            accent: 'border-l-amber-500',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`bg-card rounded-2xl border border-border border-l-4 ${stat.accent} shadow-sm p-4 flex flex-col gap-1`}
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
          <Receipt size={48} className="text-muted-foreground mx-auto mb-4" />
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
                className={`bg-card rounded-2xl border border-border border-l-4 ${STATUS_BORDER[rec.payment_status]} shadow-sm p-5 space-y-4`}
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
                      <span className="text-sm">{rec.pet.species === 'cat' ? '🐱' : rec.pet.species === 'dog' ? '🐕' : '🐾'}</span>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                  <PayCell
                    label="Amount"
                    value={
                      rec.payment_amount === 0
                        ? 'Free'
                        : `\u20B1${rec.payment_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                    }
                    highlight={rec.payment_amount > 0}
                  />
                  <PayCell
                    label="Method"
                    value={rec.payment_method ? METHOD_LABEL[rec.payment_method] : '—'}
                  />
                  <PayCell
                    label="Reference"
                    value={rec.payment_reference ?? '—'}
                    mono
                  />
                  <PayCell
                    label="Paid on"
                    value={rec.paid_at ? format(new Date(rec.paid_at), 'PPP') : '—'}
                  />

                  {rec.payment_sender_name && (
                    <PayCell
                      label="Sender Name"
                      value={rec.payment_sender_name}
                    />
                  )}

                  {rec.payment_status === 'paid' && rec.payment_verified_at && (
                    <PayCell
                      label="Verified On"
                      value={format(new Date(rec.payment_verified_at), 'PPP')}
                    />
                  )}
                </div>

                {/* Pending verification notice */}
                {referenceSubmitted && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-600 bg-amber-600 px-4 py-2.5 text-sm font-semibold leading-relaxed text-white dark:border-amber-500 dark:bg-amber-700 dark:text-white">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-white" />
                    <span>
                      Reference submitted —{' '}
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component
// ─────────────────────────────────────────────────────────────────────────────

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
