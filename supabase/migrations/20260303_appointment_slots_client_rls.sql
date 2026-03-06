-- Allow any authenticated user (including clients) to insert/update
-- appointment_slots rows. This is needed because the booking engine
-- updates slot capacity counts after a client books an appointment.

DROP POLICY IF EXISTS appointment_slots_client_insert ON public.appointment_slots;
CREATE POLICY appointment_slots_client_insert
    ON public.appointment_slots
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS appointment_slots_client_update ON public.appointment_slots;
CREATE POLICY appointment_slots_client_update
    ON public.appointment_slots
    FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
