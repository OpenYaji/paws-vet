import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PrintMedicalRecord from '../print-medical-record';

const user = userEvent.setup({ pointerEventsCheck: 0 });

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/lib/auth-client', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

window.print = jest.fn();

const mockRecord = {
  id: 'rec-1',
  record_number: 'MR-001',
  visit_date: new Date('2024-05-01').toISOString(),
  chief_complaint: 'Limping on left paw',
  diagnosis: 'Soft tissue injury',
  treatment_plan: 'Rest and anti-inflammatory medication',
  pets: { id: 'pet-1', name: 'Luna', species: 'Cat' },
  veterinarian: { first_name: 'Dr', last_name: 'Smith' },
  appointments: { appointment_number: 'APPT-0042' },
};

function setupMocks() {
  const { supabase } = require('@/lib/auth-client');
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'vet-1' } } });

  const vetChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: { first_name: 'Jane', last_name: 'Smith', license_number: 'VET001' },
      error: null,
    }),
  };
  const petChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: {
        breed: 'Domestic Shorthair',
        owners: { first_name: 'Alice', last_name: 'Brown', address: '1 Main St', city: 'QC', province: 'NCR' },
      },
      error: null,
    }),
  };
  supabase.from.mockImplementation((table: string) =>
    table === 'veterinarian_profiles' ? vetChain : petChain
  );
}

describe('PrintMedicalRecord', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    setupMocks();
  });

  it('renders the dialog when open', () => {
    render(<PrintMedicalRecord record={mockRecord} open={true} onOpenChange={jest.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<PrintMedicalRecord record={mockRecord} open={false} onOpenChange={jest.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the medical record preview title', () => {
    render(<PrintMedicalRecord record={mockRecord} open={true} onOpenChange={jest.fn()} />);
    expect(screen.getByText(/medical record preview/i)).toBeInTheDocument();
  });

  it('displays pet name and species from the record', () => {
    render(<PrintMedicalRecord record={mockRecord} open={true} onOpenChange={jest.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByText(/luna/i).length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText(/cat/i).length).toBeGreaterThan(0);
  });

  it('displays chief complaint', () => {
    render(<PrintMedicalRecord record={mockRecord} open={true} onOpenChange={jest.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByText(/limping on left paw/i).length).toBeGreaterThan(0);
  });

  it('displays the record number', () => {
    render(<PrintMedicalRecord record={mockRecord} open={true} onOpenChange={jest.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByText(/MR-001/).length).toBeGreaterThan(0);
  });

  it('calls window.print when Print Record is clicked', async () => {
    render(<PrintMedicalRecord record={mockRecord} open={true} onOpenChange={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: /print record/i }));
    expect(window.print).toHaveBeenCalled();
  });

  it('calls onOpenChange when Cancel is clicked', async () => {
    const onOpenChange = jest.fn();
    render(<PrintMedicalRecord record={mockRecord} open={true} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
