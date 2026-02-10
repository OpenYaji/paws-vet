-- Run this in Supabase SQL Editor to see valid appointment_type values
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'appointment_type'
ORDER BY e.enumsortorder;
