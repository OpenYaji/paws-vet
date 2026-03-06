-- ============================================================
-- Migration: 20260303_outreach_programs_and_slots.sql
-- Project:   PawsVet – Philippine Animal Welfare Society (PAWS)
--
-- Purpose:
--   • Extends appointment_type enum with 'regular' and 'outreach'
--   • Adds outreach_programs table (event-level outreach tracking)
--   • Adds appointment_slots table (date-level capacity tracking)
--   • Extends appointments with outreach linkage + payment columns
--   • Adds calculate_slot_availability() database function
--   • Adds RLS policies for both new tables
--
-- Safety: additive only — no existing tables, columns, or data
--         are dropped or modified.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Update appointment_type enum
--    Adds 'regular' and 'outreach' if not already present.
--    IF NOT EXISTS for ADD VALUE requires PostgreSQL ≥ 12
--    (Supabase runs PostgreSQL 15+).
-- ------------------------------------------------------------

ALTER TYPE public.appointment_type ADD VALUE IF NOT EXISTS 'regular';
ALTER TYPE public.appointment_type ADD VALUE IF NOT EXISTS 'outreach';


-- ------------------------------------------------------------
-- 2. Create outreach_programs table
--    Represents a single PAWS outreach event day. Controls when
--    clients can register, how many slots are available, and
--    whether the program is currently accepting bookings.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.outreach_programs (
    id                  uuid                     PRIMARY KEY DEFAULT uuid_generate_v4(),
    title               text                     NOT NULL,
    description         text,

    -- The actual date of the outreach event
    program_date        date                     NOT NULL,

    -- Optional window during which online registration is accepted
    registration_start  timestamp with time zone,
    registration_end    timestamp with time zone,

    -- Capacity tracking
    max_capacity        integer                  NOT NULL DEFAULT 16,
    current_bookings    integer                  NOT NULL DEFAULT 0,

    -- is_open  : manually toggled by vet/admin to open registration
    -- is_full  : auto-set when current_bookings >= max_capacity
    is_open             boolean                  NOT NULL DEFAULT false,
    is_full             boolean                  NOT NULL DEFAULT false,

    created_by          uuid                     REFERENCES public.users(id),
    created_at          timestamp with time zone NOT NULL DEFAULT now(),
    updated_at          timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.outreach_programs IS
    'PAWS outreach events available for client booking.';
COMMENT ON COLUMN public.outreach_programs.is_open IS
    'Manually toggled by vet/admin to open or close registration.';
COMMENT ON COLUMN public.outreach_programs.is_full IS
    'Auto-set to true when current_bookings >= max_capacity.';
COMMENT ON COLUMN public.outreach_programs.registration_start IS
    'Timestamp when online booking opens; NULL means open immediately.';
COMMENT ON COLUMN public.outreach_programs.registration_end IS
    'Timestamp when online booking closes; NULL means no auto-close.';

-- Auto-update updated_at on every row change
DROP TRIGGER IF EXISTS update_outreach_programs_updated_at ON public.outreach_programs;
CREATE TRIGGER update_outreach_programs_updated_at
    BEFORE UPDATE ON public.outreach_programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------
-- 3. Create appointment_slots table
--    Tracks minute-based capacity per calendar date for BOTH
--    regular and outreach appointment types.
--
--    Capacity model:
--      • Total daily capacity : 480 minutes (8-hour clinic day)
--      • Male pet slot        : 10 minutes each
--      • Female pet slot      : 15 minutes each
--
--    outreach_program_id is nullable — only set when
--    appointment_type = 'outreach'.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.appointment_slots (
    id                  uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_date           date    NOT NULL,

    -- 'regular' or 'outreach'
    appointment_type    text    NOT NULL
                                CHECK (appointment_type IN ('regular', 'outreach')),

    -- Only populated for outreach-type slots
    outreach_program_id uuid    REFERENCES public.outreach_programs(id),

    -- Capacity expressed as a head-count ceiling (separate from
    -- the minute-based function — useful for hard caps)
    total_capacity      integer NOT NULL DEFAULT 16,

    -- Running counts of bookings by pet gender (for quick queries
    -- without re-aggregating the appointments table)
    male_bookings       integer NOT NULL DEFAULT 0,   -- 10 min each
    female_bookings     integer NOT NULL DEFAULT 0,   -- 15 min each

    -- is_full   : set when minute capacity is exhausted
    -- is_closed : manually closed by admin or vet
    is_full             boolean NOT NULL DEFAULT false,
    is_closed           boolean NOT NULL DEFAULT false,

    created_at          timestamp with time zone NOT NULL DEFAULT now(),
    updated_at          timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.appointment_slots IS
    'Per-date slot capacity for regular and outreach appointments.';
COMMENT ON COLUMN public.appointment_slots.male_bookings IS
    'Count of male-pet bookings for this slot (each consumes 10 min).';
COMMENT ON COLUMN public.appointment_slots.female_bookings IS
    'Count of female-pet bookings for this slot (each consumes 15 min).';
COMMENT ON COLUMN public.appointment_slots.is_closed IS
    'Manually closed by admin or vet regardless of remaining capacity.';
COMMENT ON COLUMN public.appointment_slots.outreach_program_id IS
    'Nullable: only set when appointment_type = ''outreach''.';

-- Prevent duplicate slot rows for the same date + type combination
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointment_slots_date_type
    ON public.appointment_slots (slot_date, appointment_type)
    WHERE outreach_program_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_appointment_slots_date_outreach
    ON public.appointment_slots (slot_date, appointment_type, outreach_program_id)
    WHERE outreach_program_id IS NOT NULL;

-- Auto-update updated_at on every row change
DROP TRIGGER IF EXISTS update_appointment_slots_updated_at ON public.appointment_slots;
CREATE TRIGGER update_appointment_slots_updated_at
    BEFORE UPDATE ON public.appointment_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------
-- 4. Add new columns to appointments table
--    All statements use ADD COLUMN IF NOT EXISTS so this
--    migration is safe to re-run.
-- ------------------------------------------------------------

-- 4a. Outreach linkage & type detail
--     appointment_type_detail mirrors the enum as plain text for
--     easier application-level filtering without enum casting.
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS appointment_type_detail text,
    ADD COLUMN IF NOT EXISTS outreach_program_id     uuid
        REFERENCES public.outreach_programs(id);

-- 4b. Pet gender snapshot and derived duration
--     Captured at booking time so slot math stays correct even if
--     the pet record is later updated.
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS pet_gender_at_booking text
        CHECK (pet_gender_at_booking IN ('male', 'female')),
    ADD COLUMN IF NOT EXISTS duration_minutes      integer;

-- 4c. Breed / pricing classification
--     aspin / puspin (mixed-breed) pets receive a waived fee at
--     outreach events; pure-breed pets still pay 500 PHP.
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS is_aspin_puspin boolean NOT NULL DEFAULT false;

-- 4d. Appointment-level payment fields
--     Kept on appointments (not only invoices) so outreach walk-in
--     payments can be recorded without a full billing workflow.
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS payment_amount    numeric  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_status    text     NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'waived')),
    ADD COLUMN IF NOT EXISTS payment_reference text,
    ADD COLUMN IF NOT EXISTS payment_method    text
        CHECK (payment_method IN ('gcash', 'maya', 'cash', 'card', 'other')),
    ADD COLUMN IF NOT EXISTS paid_at           timestamp with time zone;

COMMENT ON COLUMN public.appointments.appointment_type_detail IS
    'Text mirror of appointment_type enum (''regular'' or ''outreach'') for easier filtering.';
COMMENT ON COLUMN public.appointments.outreach_program_id IS
    'FK to outreach_programs; only populated for outreach appointments.';
COMMENT ON COLUMN public.appointments.pet_gender_at_booking IS
    'Snapshot of pet gender captured at booking time; drives slot duration (male=10 min, female=15 min).';
COMMENT ON COLUMN public.appointments.duration_minutes IS
    'Auto-calculated from pet_gender_at_booking: male = 10 min, female = 15 min.';
COMMENT ON COLUMN public.appointments.is_aspin_puspin IS
    'True if the pet is a mixed breed / aspin / puspin; affects outreach pricing (fee waived).';
COMMENT ON COLUMN public.appointments.payment_amount IS
    'PHP amount due: 500 for regular; 0 for aspin/puspin outreach; 500 for pure-breed outreach.';
COMMENT ON COLUMN public.appointments.payment_status IS
    'Appointment-level payment tracking independent of the invoices table.';
COMMENT ON COLUMN public.appointments.payment_reference IS
    'External transaction reference, e.g. GCash or Maya confirmation number.';
COMMENT ON COLUMN public.appointments.paid_at IS
    'Timestamp when payment was confirmed/received.';


-- ------------------------------------------------------------
-- 5. Database function: calculate_slot_availability
--
--    Returns real-time minute-based availability for a specific
--    date and appointment type by aggregating the appointments
--    table (excluding cancelled records).
--
--    Parameters:
--      p_slot_date  – the calendar date to check (date)
--      p_appt_type  – 'regular' or 'outreach' (text)
--
--    Returns a single row:
--      total_minutes_used        – minutes already consumed
--      minutes_remaining         – minutes still available
--      estimated_slots_remaining – floor(minutes_remaining / 10)
--                                  (conservative: assumes the
--                                   shortest slot = 10 min)
--      is_full                   – true when < 10 min remain
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.calculate_slot_availability(
    p_slot_date date,
    p_appt_type text
)
RETURNS TABLE (
    total_minutes_used        integer,
    minutes_remaining         integer,
    estimated_slots_remaining integer,
    is_full                   boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_capacity  integer := 480;  -- 8 hours × 60 minutes
    v_minutes_used    integer := 0;
    v_mins_remaining  integer;
    v_slots_remaining integer;
    v_is_full         boolean;
BEGIN
    -- Aggregate time consumed by all non-cancelled appointments
    -- for the requested date and appointment type.
    --   male pet   → 10 minutes
    --   female pet → 15 minutes
    --   unknown    → 10 minutes (conservative default)
    SELECT
        COALESCE(
            SUM(
                CASE
                    WHEN a.pet_gender_at_booking = 'male'   THEN 10
                    WHEN a.pet_gender_at_booking = 'female' THEN 15
                    ELSE 10
                END
            ),
            0
        )
    INTO v_minutes_used
    FROM public.appointments a
    WHERE a.scheduled_start::date = p_slot_date
      AND a.appointment_type_detail = p_appt_type
      AND a.appointment_status::text <> 'cancelled';

    v_mins_remaining  := GREATEST(v_total_capacity - v_minutes_used, 0);

    -- Estimated remaining slots: use 10-min basis (shortest slot)
    -- so we never over-promise capacity.
    v_slots_remaining := v_mins_remaining / 10;

    -- Full when fewer than 10 minutes remain (can't fit any slot)
    v_is_full := v_mins_remaining < 10;

    RETURN QUERY
    SELECT
        v_minutes_used,
        v_mins_remaining,
        v_slots_remaining,
        v_is_full;
END;
$$;

COMMENT ON FUNCTION public.calculate_slot_availability(date, text) IS
    'Returns minute-based slot availability for a given date and appointment type. '
    'Total daily capacity = 480 min (8 h). Male pets = 10 min, female = 15 min. '
    'Cancelled appointments are excluded from the calculation.';


-- ------------------------------------------------------------
-- 6. Row Level Security (RLS) policies
-- ------------------------------------------------------------

-- 6a. Enable RLS on the two new tables
ALTER TABLE public.outreach_programs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_slots  ENABLE ROW LEVEL SECURITY;


-- ── outreach_programs ────────────────────────────────────────

-- Public (unauthenticated) visitors can read open programs only
DROP POLICY IF EXISTS outreach_programs_public_select ON public.outreach_programs;
CREATE POLICY outreach_programs_public_select
    ON public.outreach_programs
    FOR SELECT
    USING (is_open = true);

-- Admins can read ALL programs regardless of is_open
DROP POLICY IF EXISTS outreach_programs_admin_select_all ON public.outreach_programs;
CREATE POLICY outreach_programs_admin_select_all
    ON public.outreach_programs
    FOR SELECT
    USING (is_admin());

-- Veterinarians can read ALL programs regardless of is_open
DROP POLICY IF EXISTS outreach_programs_vet_select_all ON public.outreach_programs;
CREATE POLICY outreach_programs_vet_select_all
    ON public.outreach_programs
    FOR SELECT
    USING (is_veterinarian());

-- Only admin and vet roles can create new outreach programs
DROP POLICY IF EXISTS outreach_programs_staff_insert ON public.outreach_programs;
CREATE POLICY outreach_programs_staff_insert
    ON public.outreach_programs
    FOR INSERT
    WITH CHECK (is_admin() OR is_veterinarian());

-- Only admin and vet roles can update outreach programs
DROP POLICY IF EXISTS outreach_programs_staff_update ON public.outreach_programs;
CREATE POLICY outreach_programs_staff_update
    ON public.outreach_programs
    FOR UPDATE
    USING      (is_admin() OR is_veterinarian())
    WITH CHECK (is_admin() OR is_veterinarian());

-- Only admin and vet roles can delete outreach programs
DROP POLICY IF EXISTS outreach_programs_staff_delete ON public.outreach_programs;
CREATE POLICY outreach_programs_staff_delete
    ON public.outreach_programs
    FOR DELETE
    USING (is_admin() OR is_veterinarian());


-- ── appointment_slots ─────────────────────────────────────────

-- Any authenticated user can read slot availability
-- (needed so clients can see whether a date is still open)
DROP POLICY IF EXISTS appointment_slots_authenticated_select ON public.appointment_slots;
CREATE POLICY appointment_slots_authenticated_select
    ON public.appointment_slots
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Only admin and vet roles can create slot records
DROP POLICY IF EXISTS appointment_slots_staff_insert ON public.appointment_slots;
CREATE POLICY appointment_slots_staff_insert
    ON public.appointment_slots
    FOR INSERT
    WITH CHECK (is_admin() OR is_veterinarian());

-- Only admin and vet roles can update slot records
-- (e.g. toggling is_closed, adjusting total_capacity)
DROP POLICY IF EXISTS appointment_slots_staff_update ON public.appointment_slots;
CREATE POLICY appointment_slots_staff_update
    ON public.appointment_slots
    FOR UPDATE
    USING      (is_admin() OR is_veterinarian())
    WITH CHECK (is_admin() OR is_veterinarian());
