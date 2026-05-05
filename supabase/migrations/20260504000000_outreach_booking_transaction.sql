-- Serialize outreach booking creation so the final slot cannot be double-booked.

alter table public.appointments
  add column if not exists payment_sender_name text,
  add column if not exists payment_verified_by uuid references public.users(id),
  add column if not exists payment_verified_at timestamp with time zone;

create or replace function public.book_outreach_appointment_transaction(
  p_pet_id uuid,
  p_booked_by uuid,
  p_veterinarian_id uuid,
  p_outreach_program_id uuid,
  p_scheduled_start timestamp with time zone,
  p_scheduled_end timestamp with time zone,
  p_appointment_type public.appointment_type default 'kapon'::public.appointment_type,
  p_reason_for_visit text default null,
  p_special_instructions text default null,
  p_appointment_status public.appointment_status default 'pending'::public.appointment_status,
  p_pet_gender_at_booking text default null,
  p_duration_minutes integer default null,
  p_is_aspin_puspin boolean default false,
  p_payment_amount numeric default 0,
  p_payment_status text default 'unpaid',
  p_payment_method text default null,
  p_payment_reference text default null,
  p_payment_sender_name text default null,
  p_is_emergency boolean default false
)
returns table (
  id uuid,
  appointment_number character varying
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program public.outreach_programs%rowtype;
  v_live_count integer;
  v_duplicate_count integer;
  v_created public.appointments%rowtype;
begin
  select *
  into v_program
  from public.outreach_programs
  where outreach_programs.id = p_outreach_program_id
  for update;

  if not found then
    raise exception 'program_not_found';
  end if;

  select count(*)
  into v_live_count
  from public.appointments
  where appointments.outreach_program_id = p_outreach_program_id
    and appointments.appointment_status <> 'cancelled';

  if not v_program.is_open
    or coalesce(v_program.is_full, false)
    or v_live_count >= v_program.max_capacity then
    update public.outreach_programs
    set current_bookings = v_live_count,
        is_full = true,
        is_open = false,
        updated_at = now()
    where outreach_programs.id = p_outreach_program_id
      and v_live_count >= v_program.max_capacity;

    raise exception 'program_full_or_closed';
  end if;

  select count(*)
  into v_duplicate_count
  from public.appointments
  where appointments.pet_id = p_pet_id
    and appointments.outreach_program_id = p_outreach_program_id
    and appointments.appointment_type_detail = 'outreach'
    and appointments.appointment_status <> 'cancelled';

  if v_duplicate_count > 0 then
    raise exception 'duplicate_booking';
  end if;

  insert into public.appointments (
    pet_id,
    booked_by,
    veterinarian_id,
    appointment_type,
    appointment_type_detail,
    outreach_program_id,
    scheduled_start,
    scheduled_end,
    reason_for_visit,
    special_instructions,
    appointment_status,
    pet_gender_at_booking,
    duration_minutes,
    is_aspin_puspin,
    payment_amount,
    payment_status,
    payment_method,
    payment_reference,
    payment_sender_name,
    is_emergency
  )
  values (
    p_pet_id,
    p_booked_by,
    p_veterinarian_id,
    p_appointment_type,
    'outreach',
    p_outreach_program_id,
    p_scheduled_start,
    p_scheduled_end,
    coalesce(p_reason_for_visit, 'Outreach - ' || v_program.title),
    p_special_instructions,
    p_appointment_status,
    p_pet_gender_at_booking,
    p_duration_minutes,
    p_is_aspin_puspin,
    coalesce(p_payment_amount, 0),
    coalesce(p_payment_status, 'unpaid'),
    p_payment_method,
    p_payment_reference,
    p_payment_sender_name,
    coalesce(p_is_emergency, false)
  )
  returning *
  into v_created;

  v_live_count := v_live_count + 1;

  update public.outreach_programs
  set current_bookings = v_live_count,
      is_full = v_live_count >= max_capacity,
      is_open = case when v_live_count >= max_capacity then false else is_open end,
      updated_at = now()
  where outreach_programs.id = p_outreach_program_id;

  id := v_created.id;
  appointment_number := v_created.appointment_number;
  return next;
end;
$$;

revoke all on function public.book_outreach_appointment_transaction(
  uuid, uuid, uuid, uuid, timestamp with time zone, timestamp with time zone,
  public.appointment_type, text, text, public.appointment_status, text, integer,
  boolean, numeric, text, text, text, text, boolean
) from public;

grant execute on function public.book_outreach_appointment_transaction(
  uuid, uuid, uuid, uuid, timestamp with time zone, timestamp with time zone,
  public.appointment_type, text, text, public.appointment_status, text, integer,
  boolean, numeric, text, text, text, text, boolean
) to service_role;
