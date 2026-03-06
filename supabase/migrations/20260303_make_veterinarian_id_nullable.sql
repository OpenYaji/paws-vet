-- Allow appointments to be created without a veterinarian assigned yet.
-- Vets are assigned later by an admin after the client submits a booking.
ALTER TABLE appointments ALTER COLUMN veterinarian_id DROP NOT NULL;
