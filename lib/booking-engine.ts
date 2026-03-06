/**
 * booking-engine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Core booking utility functions for PawsVet (PAWS – Philippine Animal Welfare
 * Society). Used by both Regular and Outreach appointment booking flows.
 *
 * Capacity model
 *   • Vet works 8 hours → 480 minutes of bookable time per day
 *   • Male pet   → 10-minute appointment
 *   • Female pet → 15-minute appointment
 *   • A slot is FULL when total minutes used ≥ 480
 *
 * Pricing model
 *   • Regular appointment                : ₱500
 *   • Outreach – aspin / puspin (mixed)  : ₱0   (waived)
 *   • Outreach – pure breed              : ₱500
 */

import { supabase } from "@/lib/auth-client";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the clinic operating-hour date range for a given date in Philippine
 * Standard Time (PST UTC+8). Clinic hours: 08:00 → 17:00 PST.
 *
 * @param date - ISO date string (YYYY-MM-DD).
 */
function toManilaMidnight(date: string): { dayStart: string; dayEnd: string } {
  return {
    dayStart: `${date}T08:00:00+08:00`,
    dayEnd:   `${date}T17:00:00+08:00`,
  };
}

/** Extract a YYYY-MM-DD date string from any ISO timestamp, in Manila time. */
export function toManilaDateString(isoString: string): string {
  return new Date(isoString).toLocaleDateString("sv-SE", {
    timeZone: "Asia/Manila",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Total bookable minutes in a single clinic day (8 hours). */
const DAILY_CAPACITY_MINUTES = 480;

/** Duration in minutes for a male-pet appointment. */
const DURATION_MALE_MINUTES = 10;

/** Duration in minutes for a female-pet appointment. */
const DURATION_FEMALE_MINUTES = 15;

/** Standard appointment fee in Philippine Pesos. */
const STANDARD_FEE_PHP = 500;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AppointmentType = "regular" | "outreach";
export type PetGender = "male" | "female";

/** Shape returned by {@link getSlotAvailability}. */
export interface SlotAvailability {
  /** Total minutes already consumed by non-cancelled appointments. */
  minutesUsed: number;
  /** Minutes still available for new bookings (0 when full). */
  minutesRemaining: number;
  /** True when minutesUsed ≥ DAILY_CAPACITY_MINUTES. */
  isFull: boolean;
  /**
   * Conservative estimate: floor(minutesRemaining / 10).
   * Uses the shortest slot (male = 10 min) so we never over-promise.
   */
  estimatedSlotsRemaining: number;
  /** Head-count of male-pet bookings on this date + type. */
  maleBookings: number;
  /** Head-count of female-pet bookings on this date + type. */
  femaleBookings: number;
}

/** Shape returned by {@link getOpenOutreachPrograms}. */
export interface OutreachProgram {
  id: string;
  title: string;
  description: string | null;
  program_date: string;
  registration_start: string | null;
  registration_end: string | null;
  max_capacity: number;
  current_bookings: number;
  is_open: boolean;
  is_full: boolean;
  created_at: string;
}

/** Parameters accepted by {@link calculatePaymentAmount}. */
export interface PaymentAmountParams {
  appointmentType: AppointmentType;
  isAspinPuspin: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. getSlotAvailability
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate real-time minute-based slot availability for a given date and
 * appointment type by aggregating non-cancelled appointments.
 *
 * @param date - ISO date string (YYYY-MM-DD) of the day to check.
 * @param type - `'regular'` or `'outreach'`.
 * @returns {@link SlotAvailability} with usage counters and full-flag,
 *          or `null` if the query fails.
 *
 * @example
 * const avail = await getSlotAvailability('2026-04-05', 'regular');
 * if (avail && !avail.isFull) {
 *   // show date as bookable
 * }
 */
export async function getSlotAvailability(
  date: string,
  type: AppointmentType,
): Promise<SlotAvailability | null> {
  try {
    // Build clinic-hour range in Philippine Standard Time (PST UTC+8): 08:00–17:00.
    const { dayStart, dayEnd } = toManilaMidnight(date);

    const { data, error } = await supabase
      .from("appointments")
      .select("pet_gender_at_booking, appointment_status")
      .eq("appointment_type_detail", type)
      .neq("appointment_status", "cancelled")
      .gte("scheduled_start", dayStart)
      .lte("scheduled_start", dayEnd);

    if (error) {
      console.error("[booking-engine] getSlotAvailability query error:", error.message);
      return null;
    }

    const rows = data ?? [];
    let minutesUsed  = 0;
    let maleBookings  = 0;
    let femaleBookings = 0;

    for (const row of rows) {
      const gender = row.pet_gender_at_booking as PetGender | null;
      if (gender === "male") {
        minutesUsed += DURATION_MALE_MINUTES;
        maleBookings++;
      } else if (gender === "female") {
        minutesUsed += DURATION_FEMALE_MINUTES;
        femaleBookings++;
      } else {
        // Unknown gender — conservative default: shortest slot (10 min)
        minutesUsed += DURATION_MALE_MINUTES;
      }
    }

    const minutesRemaining         = Math.max(DAILY_CAPACITY_MINUTES - minutesUsed, 0);
    const isFull                   = minutesUsed >= DAILY_CAPACITY_MINUTES;
    const estimatedSlotsRemaining  = Math.floor(minutesRemaining / DURATION_MALE_MINUTES);

    return {
      minutesUsed,
      minutesRemaining,
      isFull,
      estimatedSlotsRemaining,
      maleBookings,
      femaleBookings,
    };
  } catch (err) {
    console.error("[booking-engine] getSlotAvailability unexpected error:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. isDateAvailable
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quick boolean check for whether a specific date still has bookable capacity.
 * Uses {@link getSlotAvailability} internally.
 *
 * @param date - ISO date string (YYYY-MM-DD).
 * @param type - `'regular'` or `'outreach'`.
 * @returns `true` if at least 10 contiguous minutes remain; `false` otherwise.
 *          Returns `false` on query failure (fail-safe).
 *
 * @example
 * if (await isDateAvailable('2026-04-05', 'regular')) {
 *   // allow the user to select this date
 * }
 */
export async function isDateAvailable(
  date: string,
  type: AppointmentType,
): Promise<boolean> {
  try {
    const avail = await getSlotAvailability(date, type);
    if (!avail) return false;
    // "Available" means we can fit at least the shortest slot (10 min).
    return avail.minutesRemaining >= DURATION_MALE_MINUTES;
  } catch (err) {
    console.error("[booking-engine] isDateAvailable unexpected error:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2b. getNextAvailableTime
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine the next available start time on a given date by looking at
 * existing non-cancelled appointments and returning the `scheduled_end` of the
 * last one. If no appointments exist yet, returns `08:00 AM` (clinic open).
 *
 * @param date - ISO date string (YYYY-MM-DD).
 * @param type - `'regular'` or `'outreach'`.
 * @returns ISO 8601 timestamp string for the next available start time,
 *          or `null` on query failure.
 *
 * @example
 * const start = await getNextAvailableTime('2026-04-05', 'regular');
 * // → '2026-04-05T08:10:00+08:00' (if one 10-min male appt exists)
 */
export async function getNextAvailableTime(
  date: string,
  type: AppointmentType,
): Promise<string | null> {
  try {
    const { dayStart, dayEnd } = toManilaMidnight(date);
    const clinicEnd = new Date(`${date}T17:00:00+08:00`);

    const { data, error } = await supabase
      .from("appointments")
      .select("scheduled_end")
      .eq("appointment_type_detail", type)
      .neq("appointment_status", "cancelled")
      .gte("scheduled_start", dayStart)
      .lte("scheduled_start", dayEnd)
      .order("scheduled_end", { ascending: false })
      .limit(1);

    if (error) {
      console.error("[booking-engine] getNextAvailableTime query error:", error.message);
      return null;
    }

    if (data && data.length > 0) {
      const nextStart = data[0].scheduled_end as string;
      // Guard: if the last appointment already ends at or after clinic close, no more slots
      if (new Date(nextStart) >= clinicEnd) {
        return null;
      }
      return nextStart;
    }

    // No appointments yet — clinic opens at 08:00 PST
    return `${date}T08:00:00+08:00`;
  } catch (err) {
    console.error("[booking-engine] getNextAvailableTime unexpected error:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2c. checkDuplicateBooking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether a specific pet already has a non-cancelled appointment on
 * a given date, preventing duplicate bookings.
 *
 * @param petId - UUID of the pet to check.
 * @param date  - ISO date string (YYYY-MM-DD) to check against.
 * @returns `true` if a duplicate booking exists; `false` otherwise.
 *          Returns `false` on query failure (fail-safe).
 *
 * @example
 * if (await checkDuplicateBooking(petId, '2026-04-05')) {
 *   alert('This pet already has an appointment on this date.');
 * }
 */
export async function checkDuplicateBooking(
  petId: string,
  date: string,
): Promise<boolean> {
  try {
    const { dayStart, dayEnd } = toManilaMidnight(date);

    const { data, error } = await supabase
      .from("appointments")
      .select("id")
      .eq("pet_id", petId)
      .neq("appointment_status", "cancelled")
      .gte("scheduled_start", dayStart)
      .lte("scheduled_start", dayEnd)
      .limit(1);

    if (error) {
      console.error("[booking-engine] checkDuplicateBooking query error:", error.message);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (err) {
    console.error("[booking-engine] checkDuplicateBooking unexpected error:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. calculateDuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the appointment duration (in minutes) based on the pet's gender.
 *
 * | Gender  | Duration |
 * |---------|----------|
 * | male    | 10 min   |
 * | female  | 15 min   |
 *
 * @param gender - `'male'` or `'female'`.
 * @returns Duration in minutes.
 *
 * @example
 * const duration = calculateDuration('female'); // → 15
 */
export function calculateDuration(gender: PetGender): number {
  return gender === "male" ? DURATION_MALE_MINUTES : DURATION_FEMALE_MINUTES;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. calculatePaymentAmount
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine the PHP payment amount for an appointment.
 *
 * | Scenario                           | Amount  |
 * |------------------------------------|---------|
 * | Regular (any breed)                | ₱500    |
 * | Outreach – aspin / puspin (mixed)  | ₱0      |
 * | Outreach – pure breed              | ₱500    |
 *
 * @param params - `{ appointmentType, isAspinPuspin }`
 * @returns Payment amount in Philippine Pesos.
 *
 * @example
 * calculatePaymentAmount({ appointmentType: 'outreach', isAspinPuspin: true });  // → 0
 * calculatePaymentAmount({ appointmentType: 'outreach', isAspinPuspin: false }); // → 500
 * calculatePaymentAmount({ appointmentType: 'regular',  isAspinPuspin: true });  // → 500
 */
export function calculatePaymentAmount(params: PaymentAmountParams): number {
  const { appointmentType, isAspinPuspin } = params;

  if (appointmentType === "outreach" && isAspinPuspin) {
    return 0;
  }

  // Regular appointments always cost ₱500.
  // Outreach pure-breed appointments also cost ₱500.
  return STANDARD_FEE_PHP;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. getAvailableDates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return all bookable dates in a given month.
 *
 * **Regular:** every weekday (Mon–Fri) in the month that is not fully booked
 * and not manually closed in `appointment_slots`.
 *
 * **Outreach:** only dates that have an open (is_open = true, is_full = false)
 * `outreach_program` record, regardless of day-of-week.
 *
 * Dates are checked in parallel via `Promise.allSettled` to avoid slow serial
 * requests when a month has many workdays.
 *
 * @param type  - `'regular'` or `'outreach'`.
 * @param month - 1-indexed month (1 = January … 12 = December).
 * @param year  - 4-digit year (e.g. 2026).
 * @returns Array of available ISO date strings (YYYY-MM-DD), sorted ascending.
 *
 * @example
 * const dates = await getAvailableDates('regular', 4, 2026);
 * // → ['2026-04-01', '2026-04-02', '2026-04-06', ...]
 */
export async function getAvailableDates(
  type: AppointmentType,
  month: number,
  year: number,
): Promise<string[]> {
  try {
    const pad = (n: number) => String(n).padStart(2, "0");

    // All calendar days in the requested month
    const daysInMonth = new Date(year, month, 0).getDate();
    const allDates: string[] = Array.from({ length: daysInMonth }, (_, i) => {
      return `${year}-${pad(month)}-${pad(i + 1)}`;
    });

    if (type === "outreach") {
      // For outreach, only dates with an open, not-full outreach program count.
      const monthStart = `${year}-${pad(month)}-01`;
      const monthEnd   = `${year}-${pad(month)}-${pad(daysInMonth)}`;

      const { data: programs, error } = await supabase
        .from("outreach_programs")
        .select("program_date")
        .eq("is_open", true)
        .eq("is_full", false)
        .gte("program_date", monthStart)
        .lte("program_date", monthEnd);

      if (error) {
        console.error("[booking-engine] getAvailableDates outreach query error:", error.message);
        return [];
      }

      return (programs ?? [])
        .map((p) => p.program_date as string)
        .sort();
    }

    // Regular: check weekdays (Mon=1 … Fri=5; skip Sat=6, Sun=0)
    const monthStart = `${year}-${pad(month)}-01`;
    const monthEnd   = `${year}-${pad(month)}-${pad(daysInMonth)}`;

    // Fetch both closed dates and already-full dates in parallel
    const [closedDatesSet, fullDatesSet] = await Promise.all([
      getClosedRegularDates(monthStart, monthEnd),
      getFullRegularDates(monthStart, monthEnd),
    ]);

    const weekdays = allDates.filter((d) => {
      const dow = new Date(d).getUTCDay(); // 0 = Sun, 6 = Sat
      return dow !== 0 && dow !== 6;
    });

    // Check capacity for all weekdays concurrently.
    // Skip dates already known to be closed or full (fast pre-filter).
    const results = await Promise.allSettled(
      weekdays.map(async (d) => {
        if (closedDatesSet.has(d)) return null;
        if (fullDatesSet.has(d)) return null;
        const available = await isDateAvailable(d, "regular");
        return available ? d : null;
      }),
    );

    return results
      .filter(
        (r): r is PromiseFulfilledResult<string> =>
          r.status === "fulfilled" && r.value !== null,
      )
      .map((r) => r.value)
      .sort();
  } catch (err) {
    console.error("[booking-engine] getAvailableDates unexpected error:", err);
    return [];
  }
}

/**
 * Internal helper: fetch the set of regular-slot dates that have been manually
 * closed (`is_closed = true`) within a date range.
 */
async function getClosedRegularDates(
  from: string,
  to: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("appointment_slots")
    .select("slot_date")
    .eq("appointment_type", "regular")
    .eq("is_closed", true)
    .gte("slot_date", from)
    .lte("slot_date", to);

  if (error) {
    console.error("[booking-engine] getClosedRegularDates query error:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((r) => r.slot_date as string));
}

/**
 * Internal helper: fetch the set of regular-slot dates that are already marked
 * as full (`is_full = true`) within a date range. Used as a fast pre-filter
 * so we skip expensive real-time availability checks for known-full dates.
 */
async function getFullRegularDates(
  from: string,
  to: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("appointment_slots")
    .select("slot_date")
    .eq("appointment_type", "regular")
    .eq("is_full", true)
    .gte("slot_date", from)
    .lte("slot_date", to);

  if (error) {
    console.error("[booking-engine] getFullRegularDates query error:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((r) => r.slot_date as string));
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. checkAndUpdateSlotStatus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recalculate and synchronise the `is_full` flag on the matching
 * `appointment_slots` row after any appointment is created, updated, or
 * cancelled.
 *
 * - Calls {@link getSlotAvailability} to get the current minute usage.
 * - Upserts the `appointment_slots` row (creates it on first booking).
 * - Sets `is_full = true` when `minutesUsed ≥ 480`, otherwise `false`.
 *
 * This allows cancelled appointments to automatically re-open a previously
 * full date without any manual intervention.
 *
 * @param date - ISO date string (YYYY-MM-DD) of the affected appointment.
 * @param type - The appointment type string (`'regular'` or `'outreach'`).
 * @returns `true` if the update succeeded, `false` on failure.
 *
 * @example
 * // Call after inserting or cancelling an appointment
 * await checkAndUpdateSlotStatus('2026-04-05', 'regular');
 */
export async function checkAndUpdateSlotStatus(
  date: string,
  type: string,
): Promise<boolean> {
  try {
    const avail = await getSlotAvailability(date, type as AppointmentType);
    if (!avail) return false;

    // Check if a slot row already exists for this date + type.
    // We use select-then-insert/update instead of upsert because the
    // unique indexes are partial (WHERE outreach_program_id IS [NOT] NULL)
    // and PostgreSQL ON CONFLICT doesn't match partial indexes via the
    // Supabase JS client.
    const { data: existing } = await supabase
      .from("appointment_slots")
      .select("id")
      .eq("slot_date", date)
      .eq("appointment_type", type)
      .is("outreach_program_id", null)
      .maybeSingle();

    let error;
    if (existing) {
      // Update existing row
      ({ error } = await supabase
        .from("appointment_slots")
        .update({
          is_full:         avail.isFull,
          is_closed:       avail.isFull,
          male_bookings:   avail.maleBookings,
          female_bookings: avail.femaleBookings,
        })
        .eq("id", existing.id));
    } else {
      // Insert new row
      ({ error } = await supabase
        .from("appointment_slots")
        .insert({
          slot_date:        date,
          appointment_type: type,
          is_full:          avail.isFull,
          is_closed:        avail.isFull,
          male_bookings:    avail.maleBookings,
          female_bookings:  avail.femaleBookings,
        }));
    }

    if (error) {
      console.error("[booking-engine] checkAndUpdateSlotStatus error:", error.message);
      return false;
    }

    // For outreach appointments, also sync the outreach_programs record so that
    // cancellations automatically re-open the program.
    if (type === "outreach") {
      const { data: progs } = await supabase
        .from("outreach_programs")
        .select("id, max_capacity")
        .eq("program_date", date);

      if (progs && progs.length > 0) {
        for (const prog of progs) {
          const { count: activeCount } = await supabase
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("outreach_program_id", prog.id)
            .neq("appointment_status", "cancelled");

          const currentCount = activeCount ?? 0;
          const progFull = currentCount >= prog.max_capacity;
          await supabase
            .from("outreach_programs")
            .update({
              current_bookings: currentCount,
              is_full:          progFull,
              is_open:          progFull ? false : true,
            })
            .eq("id", prog.id);
        }
      }
    }

    return true;
  } catch (err) {
    console.error("[booking-engine] checkAndUpdateSlotStatus unexpected error:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. getOpenOutreachPrograms
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all outreach programs that are currently open for booking and have
 * remaining capacity.
 *
 * A program is returned only when:
 *   - `is_open  = true`  (manually enabled by vet/admin)
 *   - `is_full  = false` (current_bookings < max_capacity)
 *
 * Results are ordered by `program_date` ascending so the soonest upcoming
 * event appears first.
 *
 * @returns Array of {@link OutreachProgram} objects, or an empty array on
 *          failure.
 *
 * @example
 * const programs = await getOpenOutreachPrograms();
 * programs.forEach(p => console.log(p.title, p.program_date));
 */
export async function getOpenOutreachPrograms(): Promise<OutreachProgram[]> {
  try {
    const { data, error } = await supabase
      .from("outreach_programs")
      .select(
        `id,
         title,
         description,
         program_date,
         registration_start,
         registration_end,
         max_capacity,
         current_bookings,
         is_open,
         is_full,
         created_at`,
      )
      .eq("is_open", true)
      .eq("is_full", false)
      .order("program_date", { ascending: true });

    if (error) {
      console.error("[booking-engine] getOpenOutreachPrograms query error:", error.message);
      return [];
    }

    return (data ?? []) as OutreachProgram[];
  } catch (err) {
    console.error("[booking-engine] getOpenOutreachPrograms unexpected error:", err);
    return [];
  }
}
