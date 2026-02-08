-- =====================================================
-- PAWS VETERINARY CLINIC - SUPABASE DATABASE SCHEMA
-- =====================================================
-- A comprehensive, normalized database design (3NF+)
-- with Row Level Security (RLS) for role-based access
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE user_role AS ENUM ('client', 'veterinarian', 'admin');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE appointment_type AS ENUM ('wellness', 'emergency', 'follow_up', 'surgery', 'vaccination', 'dental', 'consultation');
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE employment_status AS ENUM ('full_time', 'part_time', 'contract', 'terminated');
CREATE TYPE gender AS ENUM ('male', 'female', 'unknown');
CREATE TYPE payment_status AS ENUM ('unpaid', 'partially_paid', 'paid', 'overdue', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash', 'credit_card', 'debit_card', 'online', 'insurance', 'check');
CREATE TYPE notification_type AS ENUM ('appointment_reminder', 'test_results', 'payment_due', 'appointment_confirmed', 'appointment_cancelled', 'general');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed');
CREATE TYPE communication_preference AS ENUM ('email', 'sms', 'phone', 'any');
CREATE TYPE action_type AS ENUM ('create', 'update', 'delete', 'view', 'login', 'logout');

-- =====================================================
-- CORE USER MANAGEMENT TABLES
-- =====================================================

-- Base users table (authentication and role management)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role NOT NULL,
    account_status account_status DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Client profiles (pet owners)
CREATE TABLE client_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    country VARCHAR(50) DEFAULT 'USA',
    communication_preference communication_preference DEFAULT 'email',
    registration_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_phone CHECK (phone ~* '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT valid_zip CHECK (zip_code ~* '^\d{5}(-\d{4})?$')
);

-- Veterinarian profiles
CREATE TABLE veterinarian_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    specializations TEXT[], -- Array of specializations
    certifications TEXT[], -- Array of certifications
    years_of_experience INTEGER CHECK (years_of_experience >= 0),
    biography TEXT,
    consultation_fee DECIMAL(10,2) CHECK (consultation_fee >= 0),
    employment_status employment_status DEFAULT 'full_time',
    hire_date DATE NOT NULL,
    termination_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_termination CHECK (termination_date IS NULL OR termination_date >= hire_date)
);

-- Administrator profiles
CREATE TABLE admin_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100) NOT NULL,
    access_level INTEGER DEFAULT 1 CHECK (access_level BETWEEN 1 AND 10),
    hire_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency contacts for clients
CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
    contact_name VARCHAR(200) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    email VARCHAR(255),
    priority_order INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_priority CHECK (priority_order > 0)
);

-- =====================================================
-- PET MANAGEMENT TABLES
-- =====================================================

-- Pets table
CREATE TABLE pets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    species VARCHAR(50) NOT NULL,
    breed VARCHAR(100),
    date_of_birth DATE,
    gender gender,
    color VARCHAR(50),
    weight DECIMAL(6,2) CHECK (weight > 0), -- in kg or lbs
    microchip_number VARCHAR(50) UNIQUE,
    is_spayed_neutered BOOLEAN DEFAULT FALSE,
    special_needs TEXT,
    behavioral_notes TEXT,
    current_medical_status TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

-- Pet insurance information
CREATE TABLE pet_insurance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    provider_name VARCHAR(200) NOT NULL,
    policy_number VARCHAR(100) UNIQUE NOT NULL,
    coverage_details TEXT,
    effective_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    requires_preauth BOOLEAN DEFAULT FALSE,
    preauth_phone VARCHAR(20),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_policy_dates CHECK (expiration_date > effective_date)
);

-- =====================================================
-- SERVICE MANAGEMENT TABLES
-- =====================================================

-- Available veterinary services
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(200) NOT NULL,
    service_category VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    duration_minutes INTEGER CHECK (duration_minutes > 0),
    requires_specialist BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- APPOINTMENT MANAGEMENT TABLES
-- =====================================================

-- Appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_number VARCHAR(50) UNIQUE NOT NULL,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
    veterinarian_id UUID NOT NULL REFERENCES veterinarian_profiles(id) ON DELETE RESTRICT,
    booked_by UUID NOT NULL REFERENCES users(id),
    appointment_type appointment_type NOT NULL,
    appointment_status appointment_status DEFAULT 'pending',
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    reason_for_visit TEXT NOT NULL,
    special_instructions TEXT,
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMPTZ,
    is_emergency BOOLEAN DEFAULT FALSE,
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    CONSTRAINT valid_appointment_time CHECK (scheduled_end > scheduled_start),
    CONSTRAINT valid_actual_time CHECK (actual_end IS NULL OR actual_start IS NULL OR actual_end >= actual_start),
    CONSTRAINT cancelled_requires_reason CHECK (
        (appointment_status != 'cancelled') OR 
        (cancellation_reason IS NOT NULL AND cancelled_by IS NOT NULL)
    )
);

-- Junction table for appointment services (many-to-many)
CREATE TABLE appointment_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    actual_price DECIMAL(10,2) NOT NULL CHECK (actual_price >= 0),
    performed_by UUID REFERENCES veterinarian_profiles(id),
    service_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(appointment_id, service_id)
);

-- =====================================================
-- MEDICAL RECORDS TABLES
-- =====================================================

-- Medical records (examination records)
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_number VARCHAR(50) UNIQUE NOT NULL,
    appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
    veterinarian_id UUID NOT NULL REFERENCES veterinarian_profiles(id) ON DELETE RESTRICT,
    visit_date DATE NOT NULL,
    chief_complaint TEXT NOT NULL,
    examination_findings TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    follow_up_instructions TEXT,
    next_appointment_recommended DATE,
    record_created_by UUID NOT NULL REFERENCES veterinarian_profiles(id),
    record_approved_by UUID REFERENCES veterinarian_profiles(id),
    approved_at TIMESTAMPTZ,
    is_confidential BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

-- Prescriptions/Medications
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medical_record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE RESTRICT,
    medication_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    form VARCHAR(50), -- tablet, liquid, injection, etc.
    frequency VARCHAR(100) NOT NULL, -- twice daily, every 8 hours, etc.
    duration VARCHAR(100), -- 7 days, 2 weeks, etc.
    quantity DECIMAL(8,2),
    instructions TEXT NOT NULL,
    prescribed_by UUID NOT NULL REFERENCES veterinarian_profiles(id),
    approved_by UUID REFERENCES admin_profiles(id),
    dispensed_date DATE,
    dispensed_by UUID REFERENCES users(id),
    refills_allowed INTEGER DEFAULT 0 CHECK (refills_allowed >= 0),
    is_controlled_substance BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vaccination records
CREATE TABLE vaccination_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
    medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
    vaccine_name VARCHAR(200) NOT NULL,
    vaccine_type VARCHAR(100) NOT NULL,
    administered_date DATE NOT NULL,
    administered_by UUID NOT NULL REFERENCES veterinarian_profiles(id),
    next_due_date DATE,
    batch_number VARCHAR(100),
    lot_number VARCHAR(100),
    manufacturer VARCHAR(200),
    expiration_date DATE,
    injection_site VARCHAR(100),
    side_effects_noted TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_due_date CHECK (next_due_date IS NULL OR next_due_date > administered_date)
);

-- Medical test results
CREATE TABLE medical_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medical_record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE RESTRICT,
    test_type VARCHAR(100) NOT NULL,
    test_name VARCHAR(200) NOT NULL,
    test_date DATE NOT NULL,
    ordered_by UUID NOT NULL REFERENCES veterinarian_profiles(id),
    results TEXT,
    findings TEXT,
    interpretation_notes TEXT,
    file_attachments TEXT[], -- URLs or paths to files
    is_abnormal BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES veterinarian_profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- BILLING & FINANCIAL TABLES
-- =====================================================

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE RESTRICT,
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    tax_amount DECIMAL(10,2) DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    amount_paid DECIMAL(10,2) DEFAULT 0 CHECK (amount_paid >= 0),
    payment_status payment_status DEFAULT 'unpaid',
    notes TEXT,
    created_by UUID NOT NULL REFERENCES admin_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id),
    CONSTRAINT valid_due_date CHECK (due_date >= issue_date),
    CONSTRAINT valid_total CHECK (total_amount = subtotal + tax_amount - discount_amount)
);

-- Invoice line items
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(8,2) DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    line_total DECIMAL(10,2) NOT NULL CHECK (line_total >= 0),
    is_taxable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_line_total CHECK (line_total = quantity * unit_price)
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    payment_date DATE DEFAULT CURRENT_DATE,
    amount_paid DECIMAL(10,2) NOT NULL CHECK (amount_paid > 0),
    payment_method payment_method NOT NULL,
    transaction_reference VARCHAR(200),
    payment_gateway_response TEXT,
    processed_by UUID NOT NULL REFERENCES admin_profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SCHEDULING TABLES
-- =====================================================

-- Clinic schedule (general operating hours)
CREATE TABLE clinic_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    opening_time TIME NOT NULL,
    closing_time TIME NOT NULL,
    break_start_time TIME,
    break_end_time TIME,
    is_emergency_hours BOOLEAN DEFAULT FALSE,
    is_closed BOOLEAN DEFAULT FALSE,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_hours CHECK (closing_time > opening_time),
    CONSTRAINT valid_break CHECK (
        (break_start_time IS NULL AND break_end_time IS NULL) OR
        (break_end_time > break_start_time AND 
         break_start_time > opening_time AND 
         break_end_time < closing_time)
    )
);

-- Holiday closures
CREATE TABLE holiday_closures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    holiday_name VARCHAR(200) NOT NULL,
    closure_date DATE NOT NULL,
    is_emergency_available BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES admin_profiles(id)
);

-- Veterinarian availability
CREATE TABLE veterinarian_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    veterinarian_id UUID NOT NULL REFERENCES veterinarian_profiles(id) ON DELETE CASCADE,
    availability_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    unavailability_reason VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    CONSTRAINT valid_availability_time CHECK (end_time > start_time),
    CONSTRAINT unavailable_requires_reason CHECK (
        is_available = TRUE OR unavailability_reason IS NOT NULL
    ),
    UNIQUE(veterinarian_id, availability_date, start_time)
);

-- =====================================================
-- NOTIFICATION & AUDIT TABLES
-- =====================================================

-- Notification logs
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    subject VARCHAR(200),
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivery_status notification_status DEFAULT 'pending',
    delivery_attempted_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    error_message TEXT,
    related_entity_type VARCHAR(50), -- 'appointment', 'invoice', etc.
    related_entity_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type action_type NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(account_status);

-- Client profile indexes
CREATE INDEX idx_client_profiles_user_id ON client_profiles(user_id);
CREATE INDEX idx_client_profiles_name ON client_profiles(last_name, first_name);
CREATE INDEX idx_client_profiles_phone ON client_profiles(phone);

-- Veterinarian profile indexes
CREATE INDEX idx_vet_profiles_user_id ON veterinarian_profiles(user_id);
CREATE INDEX idx_vet_profiles_license ON veterinarian_profiles(license_number);
CREATE INDEX idx_vet_profiles_status ON veterinarian_profiles(employment_status);

-- Pet indexes
CREATE INDEX idx_pets_owner ON pets(owner_id);
CREATE INDEX idx_pets_name ON pets(name);
CREATE INDEX idx_pets_species ON pets(species);
CREATE INDEX idx_pets_microchip ON pets(microchip_number) WHERE microchip_number IS NOT NULL;
CREATE INDEX idx_pets_name_trgm ON pets USING gin(name gin_trgm_ops); -- Full-text search

-- Appointment indexes
CREATE INDEX idx_appointments_pet ON appointments(pet_id);
CREATE INDEX idx_appointments_vet ON appointments(veterinarian_id);
CREATE INDEX idx_appointments_date ON appointments(scheduled_start);
CREATE INDEX idx_appointments_status ON appointments(appointment_status);
CREATE INDEX idx_appointments_booked_by ON appointments(booked_by);
CREATE INDEX idx_appointments_number ON appointments(appointment_number);

-- Medical record indexes
CREATE INDEX idx_medical_records_pet ON medical_records(pet_id);
CREATE INDEX idx_medical_records_vet ON medical_records(veterinarian_id);
CREATE INDEX idx_medical_records_appointment ON medical_records(appointment_id);
CREATE INDEX idx_medical_records_date ON medical_records(visit_date);
CREATE INDEX idx_medical_records_diagnosis_trgm ON medical_records USING gin(diagnosis gin_trgm_ops);

-- Prescription indexes
CREATE INDEX idx_prescriptions_medical_record ON prescriptions(medical_record_id);
CREATE INDEX idx_prescriptions_prescribed_by ON prescriptions(prescribed_by);

-- Vaccination indexes
CREATE INDEX idx_vaccinations_pet ON vaccination_records(pet_id);
CREATE INDEX idx_vaccinations_next_due ON vaccination_records(next_due_date);

-- Invoice indexes
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_appointment ON invoices(appointment_id);
CREATE INDEX idx_invoices_status ON invoices(payment_status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- Payment indexes
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- Notification indexes
CREATE INDEX idx_notifications_recipient ON notification_logs(recipient_id);
CREATE INDEX idx_notifications_status ON notification_logs(delivery_status);
CREATE INDEX idx_notifications_sent_at ON notification_logs(sent_at);

-- Audit log indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_profiles_updated_at BEFORE UPDATE ON client_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vet_profiles_updated_at BEFORE UPDATE ON veterinarian_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_profiles_updated_at BEFORE UPDATE ON admin_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON pets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER FOR INVOICE STATUS AUTOMATION
-- =====================================================

CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(10,2);
    invoice_total DECIMAL(10,2);
BEGIN
    -- Calculate total amount paid for this invoice
    SELECT COALESCE(SUM(amount_paid), 0) INTO total_paid
    FROM payments
    WHERE invoice_id = NEW.invoice_id;
    
    -- Get invoice total
    SELECT total_amount INTO invoice_total
    FROM invoices
    WHERE id = NEW.invoice_id;
    
    -- Update invoice status and amount_paid
    UPDATE invoices
    SET 
        amount_paid = total_paid,
        payment_status = CASE
            WHEN total_paid = 0 THEN 'unpaid'::payment_status
            WHEN total_paid < invoice_total THEN 'partially_paid'::payment_status
            WHEN total_paid >= invoice_total THEN 'paid'::payment_status
        END,
        updated_at = NOW()
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_status_on_payment
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

-- =====================================================
-- TRIGGER FOR OVERDUE INVOICE MARKING
-- =====================================================

CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS void AS $$
BEGIN
    UPDATE invoices
    SET payment_status = 'overdue'::payment_status
    WHERE payment_status IN ('unpaid', 'partially_paid')
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- This function should be called via a scheduled job (pg_cron or external scheduler)

-- =====================================================
-- TRIGGER FOR APPOINTMENT NUMBER GENERATION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_appointment_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.appointment_number IS NULL THEN
        NEW.appointment_number := 'APT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                                  LPAD(NEXTVAL('appointment_number_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE appointment_number_seq;

CREATE TRIGGER set_appointment_number
    BEFORE INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION generate_appointment_number();

-- =====================================================
-- TRIGGER FOR INVOICE NUMBER GENERATION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                             LPAD(NEXTVAL('invoice_number_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE invoice_number_seq;

CREATE TRIGGER set_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION generate_invoice_number();

-- =====================================================
-- TRIGGER FOR MEDICAL RECORD NUMBER GENERATION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_medical_record_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.record_number IS NULL THEN
        NEW.record_number := 'MR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                            LPAD(NEXTVAL('medical_record_number_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE medical_record_number_seq;

CREATE TRIGGER set_medical_record_number
    BEFORE INSERT ON medical_records
    FOR EACH ROW
    EXECUTE FUNCTION generate_medical_record_number();

-- =====================================================
-- TRIGGER FOR PAYMENT NUMBER GENERATION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_number IS NULL THEN
        NEW.payment_number := 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                             LPAD(NEXTVAL('payment_number_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE payment_number_seq;

CREATE TRIGGER set_payment_number
    BEFORE INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION generate_payment_number();

-- =====================================================
-- TRIGGER FOR AUDIT LOGGING
-- =====================================================

CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (user_id, action_type, table_name, record_id, old_values)
        VALUES (
            NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID,
            'delete',
            TG_TABLE_NAME,
            OLD.id,
            row_to_json(OLD)::jsonb
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_id, action_type, table_name, record_id, old_values, new_values)
        VALUES (
            NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID,
            'update',
            TG_TABLE_NAME,
            NEW.id,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, action_type, table_name, record_id, new_values)
        VALUES (
            NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID,
            'create',
            TG_TABLE_NAME,
            NEW.id,
            row_to_json(NEW)::jsonb
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit logging to sensitive tables
CREATE TRIGGER audit_medical_records
    AFTER INSERT OR UPDATE OR DELETE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_prescriptions
    AFTER INSERT OR UPDATE OR DELETE ON prescriptions
    FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_invoices
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE veterinarian_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccination_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE veterinarian_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
    SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if current user is veterinarian
CREATE OR REPLACE FUNCTION is_veterinarian()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'veterinarian'
    );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if current user is client
CREATE OR REPLACE FUNCTION is_client()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'client'
    );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Get current user's client profile ID
CREATE OR REPLACE FUNCTION current_client_profile_id()
RETURNS UUID AS $$
    SELECT id FROM client_profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Get current user's veterinarian profile ID
CREATE OR REPLACE FUNCTION current_vet_profile_id()
RETURNS UUID AS $$
    SELECT id FROM veterinarian_profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES - USERS TABLE
-- =====================================================

-- Users can view their own record
CREATE POLICY users_select_own ON users
    FOR SELECT
    USING (id = auth.uid());

-- Admins can view all users
CREATE POLICY users_select_admin ON users
    FOR SELECT
    USING (is_admin());

-- Users can update their own non-sensitive fields
CREATE POLICY users_update_own ON users
    FOR UPDATE
    USING (id = auth.uid());

-- Admins can manage all users
CREATE POLICY users_all_admin ON users
    FOR ALL
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - CLIENT PROFILES
-- =====================================================

-- Clients can view and update their own profile
CREATE POLICY client_profiles_own ON client_profiles
    FOR ALL
    USING (user_id = auth.uid());

-- Admins can manage all client profiles
CREATE POLICY client_profiles_admin ON client_profiles
    FOR ALL
    USING (is_admin());

-- Veterinarians can view client profiles for their appointments
CREATE POLICY client_profiles_vet_view ON client_profiles
    FOR SELECT
    USING (
        is_veterinarian() AND EXISTS (
            SELECT 1 FROM appointments a
            JOIN pets p ON a.pet_id = p.id
            WHERE p.owner_id = client_profiles.id
            AND a.veterinarian_id = current_vet_profile_id()
        )
    );

-- =====================================================
-- RLS POLICIES - VETERINARIAN PROFILES
-- =====================================================

-- Veterinarians can view and update their own profile
CREATE POLICY vet_profiles_own ON veterinarian_profiles
    FOR ALL
    USING (user_id = auth.uid());

-- Everyone can view active veterinarian profiles (for booking)
CREATE POLICY vet_profiles_public_view ON veterinarian_profiles
    FOR SELECT
    USING (employment_status IN ('full_time', 'part_time', 'contract'));

-- Admins can manage all veterinarian profiles
CREATE POLICY vet_profiles_admin ON veterinarian_profiles
    FOR ALL
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - ADMIN PROFILES
-- =====================================================

-- Admins can view all admin profiles
CREATE POLICY admin_profiles_select ON admin_profiles
    FOR SELECT
    USING (is_admin());

-- Admins can update their own profile
CREATE POLICY admin_profiles_update_own ON admin_profiles
    FOR UPDATE
    USING (user_id = auth.uid());

-- High-level admins can manage all (access_level check would be in application logic)
CREATE POLICY admin_profiles_all ON admin_profiles
    FOR ALL
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - PETS
-- =====================================================

-- Clients can manage their own pets
CREATE POLICY pets_client_own ON pets
    FOR ALL
    USING (owner_id = current_client_profile_id());

-- Veterinarians can view pets they have appointments with
CREATE POLICY pets_vet_view ON pets
    FOR SELECT
    USING (
        is_veterinarian() AND EXISTS (
            SELECT 1 FROM appointments
            WHERE appointments.pet_id = pets.id
            AND appointments.veterinarian_id = current_vet_profile_id()
        )
    );

-- Admins can manage all pets
CREATE POLICY pets_admin ON pets
    FOR ALL
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - APPOINTMENTS
-- =====================================================

-- Clients can view their pets' appointments
CREATE POLICY appointments_client_view ON appointments
    FOR SELECT
    USING (
        is_client() AND EXISTS (
            SELECT 1 FROM pets
            WHERE pets.id = appointments.pet_id
            AND pets.owner_id = current_client_profile_id()
        )
    );

-- Clients can create appointments for their pets
CREATE POLICY appointments_client_create ON appointments
    FOR INSERT
    WITH CHECK (
        is_client() AND EXISTS (
            SELECT 1 FROM pets
            WHERE pets.id = appointments.pet_id
            AND pets.owner_id = current_client_profile_id()
        )
    );

-- Clients can update/cancel their own appointments (before they're completed)
CREATE POLICY appointments_client_update ON appointments
    FOR UPDATE
    USING (
        is_client() 
        AND appointment_status NOT IN ('completed', 'in_progress')
        AND EXISTS (
            SELECT 1 FROM pets
            WHERE pets.id = appointments.pet_id
            AND pets.owner_id = current_client_profile_id()
        )
    );

-- Veterinarians can view their own appointments
CREATE POLICY appointments_vet_view ON appointments
    FOR SELECT
    USING (
        is_veterinarian() 
        AND veterinarian_id = current_vet_profile_id()
    );

-- Veterinarians can update their own appointments (for check-in, notes, etc.)
CREATE POLICY appointments_vet_update ON appointments
    FOR UPDATE
    USING (
        is_veterinarian() 
        AND veterinarian_id = current_vet_profile_id()
    );

-- Admins can manage all appointments
CREATE POLICY appointments_admin ON appointments
    FOR ALL
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - MEDICAL RECORDS
-- =====================================================

-- Clients can view their pets' medical records
CREATE POLICY medical_records_client_view ON medical_records
    FOR SELECT
    USING (
        is_client() AND EXISTS (
            SELECT 1 FROM pets
            WHERE pets.id = medical_records.pet_id
            AND pets.owner_id = current_client_profile_id()
        )
    );

-- Veterinarians can view medical records for their appointments
CREATE POLICY medical_records_vet_view ON medical_records
    FOR SELECT
    USING (
        is_veterinarian() AND (
            veterinarian_id = current_vet_profile_id() OR
            EXISTS (
                SELECT 1 FROM appointments
                WHERE appointments.pet_id = medical_records.pet_id
                AND appointments.veterinarian_id = current_vet_profile_id()
            )
        )
    );

-- Veterinarians can create medical records for their appointments
CREATE POLICY medical_records_vet_create ON medical_records
    FOR INSERT
    WITH CHECK (
        is_veterinarian() 
        AND veterinarian_id = current_vet_profile_id()
    );

-- Veterinarians can update their own medical records
CREATE POLICY medical_records_vet_update ON medical_records
    FOR UPDATE
    USING (
        is_veterinarian() 
        AND record_created_by = current_vet_profile_id()
        AND record_approved_by IS NULL -- Can't update after approval
    );

-- Admins can manage all medical records
CREATE POLICY medical_records_admin ON medical_records
    FOR ALL
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - INVOICES
-- =====================================================

-- Clients can view their own invoices
CREATE POLICY invoices_client_view ON invoices
    FOR SELECT
    USING (
        is_client() 
        AND client_id = current_client_profile_id()
    );

-- Admins can manage all invoices
CREATE POLICY invoices_admin ON invoices
    FOR ALL
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - PAYMENTS
-- =====================================================

-- Clients can view their own payments
CREATE POLICY payments_client_view ON payments
    FOR SELECT
    USING (
        is_client() AND EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = payments.invoice_id
            AND invoices.client_id = current_client_profile_id()
        )
    );

-- Admins can manage all payments
CREATE POLICY payments_admin ON payments
    FOR ALL
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - SERVICES (PUBLIC READ)
-- =====================================================

-- Everyone can view active services
CREATE POLICY services_public_view ON services
    FOR SELECT
    USING (is_active = TRUE);

-- Admins can manage services
CREATE POLICY services_admin ON services
    FOR ALL
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - SCHEDULES (PUBLIC READ)
-- =====================================================

-- Everyone can view clinic schedule
CREATE POLICY clinic_schedule_public ON clinic_schedule
    FOR SELECT
    USING (TRUE);

-- Admins can manage clinic schedule
CREATE POLICY clinic_schedule_admin ON clinic_schedule
    FOR ALL
    USING (is_admin());

-- Everyone can view holiday closures
CREATE POLICY holiday_closures_public ON holiday_closures
    FOR SELECT
    USING (TRUE);

-- Admins can manage holiday closures
CREATE POLICY holiday_closures_admin ON holiday_closures
    FOR ALL
    USING (is_admin());

-- Everyone can view veterinarian availability
CREATE POLICY vet_availability_public ON veterinarian_availability
    FOR SELECT
    USING (TRUE);

-- Veterinarians can manage their own availability
CREATE POLICY vet_availability_own ON veterinarian_availability
    FOR ALL
    USING (
        is_veterinarian() 
        AND veterinarian_id = current_vet_profile_id()
    );

-- Admins can manage all availability
CREATE POLICY vet_availability_admin ON veterinarian_availability
    FOR ALL
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - NOTIFICATIONS
-- =====================================================

-- Users can view their own notifications
CREATE POLICY notifications_own ON notification_logs
    FOR SELECT
    USING (recipient_id = auth.uid());

-- Admins can view all notifications
CREATE POLICY notifications_admin ON notification_logs
    FOR ALL
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - AUDIT LOGS
-- =====================================================

-- Only admins can view audit logs
CREATE POLICY audit_logs_admin ON audit_logs
    FOR SELECT
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - PRESCRIPTIONS
-- =====================================================

-- Clients can view prescriptions for their pets
CREATE POLICY prescriptions_client_view ON prescriptions
    FOR SELECT
    USING (
        is_client() AND EXISTS (
            SELECT 1 FROM medical_records mr
            JOIN pets p ON mr.pet_id = p.id
            WHERE mr.id = prescriptions.medical_record_id
            AND p.owner_id = current_client_profile_id()
        )
    );

-- Veterinarians can manage prescriptions for their medical records
CREATE POLICY prescriptions_vet ON prescriptions
    FOR ALL
    USING (
        is_veterinarian() AND EXISTS (
            SELECT 1 FROM medical_records
            WHERE medical_records.id = prescriptions.medical_record_id
            AND medical_records.record_created_by = current_vet_profile_id()
        )
    );

-- Admins can manage all prescriptions
CREATE POLICY prescriptions_admin ON prescriptions
    FOR ALL
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - VACCINATIONS
-- =====================================================

-- Clients can view vaccinations for their pets
CREATE POLICY vaccinations_client_view ON vaccination_records
    FOR SELECT
    USING (
        is_client() AND EXISTS (
            SELECT 1 FROM pets
            WHERE pets.id = vaccination_records.pet_id
            AND pets.owner_id = current_client_profile_id()
        )
    );

-- Veterinarians can create vaccinations for appointments
CREATE POLICY vaccinations_vet_create ON vaccination_records
    FOR INSERT
    WITH CHECK (is_veterinarian());

-- Veterinarians can view vaccinations for their patients
CREATE POLICY vaccinations_vet_view ON vaccination_records
    FOR SELECT
    USING (
        is_veterinarian() AND EXISTS (
            SELECT 1 FROM appointments
            WHERE appointments.pet_id = vaccination_records.pet_id
            AND appointments.veterinarian_id = current_vet_profile_id()
        )
    );

-- Admins can manage all vaccinations
CREATE POLICY vaccinations_admin ON vaccination_records
    FOR ALL
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - MEDICAL TEST RESULTS
-- =====================================================

-- Clients can view test results for their pets
CREATE POLICY test_results_client_view ON medical_test_results
    FOR SELECT
    USING (
        is_client() AND EXISTS (
            SELECT 1 FROM medical_records mr
            JOIN pets p ON mr.pet_id = p.id
            WHERE mr.id = medical_test_results.medical_record_id
            AND p.owner_id = current_client_profile_id()
        )
    );

-- Veterinarians can manage test results for their medical records
CREATE POLICY test_results_vet ON medical_test_results
    FOR ALL
    USING (
        is_veterinarian() AND (
            ordered_by = current_vet_profile_id() OR
            EXISTS (
                SELECT 1 FROM medical_records
                WHERE medical_records.id = medical_test_results.medical_record_id
                AND medical_records.record_created_by = current_vet_profile_id()
            )
        )
    );

-- Admins can manage all test results
CREATE POLICY test_results_admin ON medical_test_results
    FOR ALL
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - EMERGENCY CONTACTS
-- =====================================================

-- Clients can manage their own emergency contacts
CREATE POLICY emergency_contacts_own ON emergency_contacts
    FOR ALL
    USING (
        is_client() 
        AND client_id = current_client_profile_id()
    );

-- Admins can view emergency contacts
CREATE POLICY emergency_contacts_admin ON emergency_contacts
    FOR SELECT
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - PET INSURANCE
-- =====================================================

-- Clients can manage insurance for their pets
CREATE POLICY pet_insurance_client ON pet_insurance
    FOR ALL
    USING (
        is_client() AND EXISTS (
            SELECT 1 FROM pets
            WHERE pets.id = pet_insurance.pet_id
            AND pets.owner_id = current_client_profile_id()
        )
    );

-- Admins can view all insurance
CREATE POLICY pet_insurance_admin ON pet_insurance
    FOR SELECT
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - APPOINTMENT SERVICES
-- =====================================================

-- Clients can view services for their appointments
CREATE POLICY appointment_services_client_view ON appointment_services
    FOR SELECT
    USING (
        is_client() AND EXISTS (
            SELECT 1 FROM appointments a
            JOIN pets p ON a.pet_id = p.id
            WHERE a.id = appointment_services.appointment_id
            AND p.owner_id = current_client_profile_id()
        )
    );

-- Veterinarians can manage services for their appointments
CREATE POLICY appointment_services_vet ON appointment_services
    FOR ALL
    USING (
        is_veterinarian() AND EXISTS (
            SELECT 1 FROM appointments
            WHERE appointments.id = appointment_services.appointment_id
            AND appointments.veterinarian_id = current_vet_profile_id()
        )
    );

-- Admins can manage all appointment services
CREATE POLICY appointment_services_admin ON appointment_services
    FOR ALL
    USING (is_admin());

-- =====================================================
-- RLS POLICIES - INVOICE LINE ITEMS
-- =====================================================

-- Clients can view line items for their invoices
CREATE POLICY invoice_items_client_view ON invoice_line_items
    FOR SELECT
    USING (
        is_client() AND EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_line_items.invoice_id
            AND invoices.client_id = current_client_profile_id()
        )
    );

-- Admins can manage all line items
CREATE POLICY invoice_items_admin ON invoice_line_items
    FOR ALL
    USING (is_admin());

-- =====================================================
-- USEFUL VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for upcoming appointments
CREATE VIEW upcoming_appointments AS
SELECT 
    a.id,
    a.appointment_number,
    a.scheduled_start,
    a.scheduled_end,
    a.appointment_status,
    a.appointment_type,
    p.name AS pet_name,
    p.species,
    c.first_name || ' ' || c.last_name AS client_name,
    c.phone AS client_phone,
    v.first_name || ' ' || v.last_name AS vet_name
FROM appointments a
JOIN pets p ON a.pet_id = p.id
JOIN client_profiles c ON p.owner_id = c.id
JOIN veterinarian_profiles v ON a.veterinarian_id = v.id
WHERE a.scheduled_start >= NOW()
    AND a.appointment_status NOT IN ('cancelled', 'completed')
ORDER BY a.scheduled_start;

-- View for unpaid/overdue invoices
CREATE VIEW outstanding_invoices AS
SELECT 
    i.id,
    i.invoice_number,
    i.issue_date,
    i.due_date,
    i.total_amount,
    i.amount_paid,
    (i.total_amount - i.amount_paid) AS balance_due,
    i.payment_status,
    c.first_name || ' ' || c.last_name AS client_name,
    c.phone AS client_phone,
    c.email
FROM invoices i
JOIN client_profiles c ON i.client_id = c.id
JOIN users u ON c.user_id = u.id
WHERE i.payment_status IN ('unpaid', 'partially_paid', 'overdue')
ORDER BY i.due_date;

-- View for veterinarian workload
CREATE VIEW vet_workload AS
SELECT 
    v.id,
    v.first_name || ' ' || v.last_name AS vet_name,
    COUNT(CASE WHEN a.scheduled_start::date = CURRENT_DATE THEN 1 END) AS today_appointments,
    COUNT(CASE WHEN a.scheduled_start::date = CURRENT_DATE + 1 THEN 1 END) AS tomorrow_appointments,
    COUNT(CASE WHEN a.scheduled_start >= NOW() AND a.scheduled_start < NOW() + INTERVAL '7 days' THEN 1 END) AS week_appointments
FROM veterinarian_profiles v
LEFT JOIN appointments a ON v.id = a.veterinarian_id
    AND a.appointment_status NOT IN ('cancelled', 'no_show')
WHERE v.employment_status IN ('full_time', 'part_time', 'contract')
GROUP BY v.id, v.first_name, v.last_name;

-- View for pet medical history summary
CREATE VIEW pet_medical_summary AS
SELECT 
    p.id AS pet_id,
    p.name AS pet_name,
    p.species,
    p.breed,
    COUNT(DISTINCT mr.id) AS total_visits,
    MAX(mr.visit_date) AS last_visit_date,
    COUNT(DISTINCT pr.id) AS active_prescriptions,
    COUNT(DISTINCT vr.id) AS vaccination_count,
    MAX(vr.next_due_date) AS next_vaccination_due
FROM pets p
LEFT JOIN medical_records mr ON p.id = mr.pet_id AND mr.deleted_at IS NULL
LEFT JOIN prescriptions pr ON mr.id = pr.medical_record_id
LEFT JOIN vaccination_records vr ON p.id = vr.pet_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.species, p.breed;

-- =====================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- =====================================================

-- Function to check veterinarian availability for booking
CREATE OR REPLACE FUNCTION check_vet_availability(
    p_vet_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    -- Check for conflicting appointments
    SELECT COUNT(*) INTO conflict_count
    FROM appointments
    WHERE veterinarian_id = p_vet_id
        AND appointment_status NOT IN ('cancelled', 'no_show')
        AND (
            (scheduled_start, scheduled_end) OVERLAPS (p_start_time, p_end_time)
        );
    
    RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get available appointment slots
CREATE OR REPLACE FUNCTION get_available_slots(
    p_vet_id UUID,
    p_date DATE,
    p_duration_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (
    slot_start TIMESTAMPTZ,
    slot_end TIMESTAMPTZ
) AS $$
DECLARE
    clinic_open TIME;
    clinic_close TIME;
    current_slot TIMESTAMPTZ;
    slot_duration INTERVAL;
BEGIN
    slot_duration := (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Get clinic hours for the day
    SELECT opening_time, closing_time INTO clinic_open, clinic_close
    FROM clinic_schedule
    WHERE day_of_week = EXTRACT(DOW FROM p_date)
        AND NOT is_closed
        AND (effective_from IS NULL OR effective_from <= p_date)
        AND (effective_until IS NULL OR effective_until >= p_date)
    LIMIT 1;
    
    IF clinic_open IS NULL THEN
        RETURN;
    END IF;
    
    current_slot := p_date + clinic_open;
    
    WHILE current_slot + slot_duration <= p_date + clinic_close LOOP
        IF check_vet_availability(p_vet_id, current_slot, current_slot + slot_duration) THEN
            slot_start := current_slot;
            slot_end := current_slot + slot_duration;
            RETURN NEXT;
        END IF;
        current_slot := current_slot + slot_duration;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE users IS 'Base authentication table for all system users with role-based access';
COMMENT ON TABLE client_profiles IS 'Extended profile information for pet owners/clients';
COMMENT ON TABLE veterinarian_profiles IS 'Extended profile information for veterinarians';
COMMENT ON TABLE admin_profiles IS 'Extended profile information for clinic administrators';
COMMENT ON TABLE pets IS 'Pet information linked to owners';
COMMENT ON TABLE appointments IS 'Appointment bookings for veterinary services';
COMMENT ON TABLE medical_records IS 'Detailed medical examination records per visit';
COMMENT ON TABLE invoices IS 'Billing information for services rendered';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for sensitive operations';

-- =====================================================
-- SAMPLE DATA INSERTION (OPTIONAL - FOR TESTING)
-- =====================================================

-- Note: In production, user authentication would be handled by Supabase Auth
-- This is just to demonstrate the structure

-- Insert sample admin user
-- INSERT INTO users (id, email, role) VALUES 
--     ('00000000-0000-0000-0000-000000000001', 'admin@pawsclinic.com', 'admin');

-- INSERT INTO admin_profiles (user_id, first_name, last_name, employee_id, phone, position, hire_date) VALUES
--     ('00000000-0000-0000-0000-000000000001', 'Sarah', 'Johnson', 'EMP001', '+1-555-0100', 'Clinic Manager', '2020-01-15');

-- =====================================================
-- MAINTENANCE QUERIES
-- =====================================================

-- Query to find double-booked appointments (should return 0 rows if constraints work)
-- SELECT veterinarian_id, scheduled_start, COUNT(*)
-- FROM appointments
-- WHERE appointment_status NOT IN ('cancelled', 'no_show')
-- GROUP BY veterinarian_id, scheduled_start
-- HAVING COUNT(*) > 1;

-- Query to mark overdue invoices (run daily via cron)
-- SELECT mark_overdue_invoices();

-- =====================================================
-- END OF SCHEMA
-- =====================================================
