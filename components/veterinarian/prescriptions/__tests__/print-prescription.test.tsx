import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PrintPrescription from '../print-prescription';

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

const mockRx = {
  id: 'rx-1',
  pet_id: 'pet-1',
  medication_name: 'Amoxicillin',
  dosage: '250mg',
  frequency: 'Twice daily',
  duration: '7 days',
  notes: 'With food',
  created_at: new Date('2024-06-01').toISOString(),
  pets: { name: 'Buddy', species: 'Dog' },
};

function setupSupabaseMocks() {
  const { supabase } = require('@/lib/auth-client');
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'vet-1' } } });

  const vetChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: { first_name: 'Jane', last_name: 'Smith', license_number: 'VET001', dea_number: 'DEA123' },
      error: null,
    }),
  };
  const petChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: {
        name: 'Buddy', species: 'Dog', age: 3,
        owners: { first_name: 'Alice', last_name: 'Brown', address: '1 Main St', city: 'QC', province: 'Metro Manila' },
      },
      error: null,
    }),
  };
  supabase.from.mockImplementation((table: string) =>
    table === 'veterinarian_profiles' ? vetChain : petChain
  );
}

describe('PrintPrescription', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    setupSupabaseMocks();
  });

  it('renders nothing when rx is null', () => {
    render(<PrintPrescription rx={null} open={true} onOpenChange={jest.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when open with valid rx', async () => {
    render(<PrintPrescription rx={mockRx} open={true} onOpenChange={jest.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the prescription preview title', async () => {
    render(<PrintPrescription rx={mockRx} open={true} onOpenChange={jest.fn()} />);
    expect(screen.getByText(/prescription preview/i)).toBeInTheDocument();
  });

  it('displays the medication name and dosage', async () => {
    render(<PrintPrescription rx={mockRx} open={true} onOpenChange={jest.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByText(/amoxicillin/i).length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText(/250mg/i).length).toBeGreaterThan(0);
  });

  it('displays pet name from rx prop', async () => {
    render(<PrintPrescription rx={mockRx} open={true} onOpenChange={jest.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByText(/buddy/i).length).toBeGreaterThan(0);
  });

  it('calls window.print when Print Prescription is clicked', async () => {
    render(<PrintPrescription rx={mockRx} open={true} onOpenChange={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: /print prescription/i }));
    expect(window.print).toHaveBeenCalled();
  });

  it('calls onOpenChange when Cancel is clicked', async () => {
    const onOpenChange = jest.fn();
    render(<PrintPrescription rx={mockRx} open={true} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
