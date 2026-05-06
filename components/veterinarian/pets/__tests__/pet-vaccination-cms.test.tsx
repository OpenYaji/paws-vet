import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { PetVaccinationCMS } from '../pet-vaccination-cms';

const user = userEvent.setup({ pointerEventsCheck: 0 });

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectValue: ({ placeholder }: any) => <option value="">{placeholder}</option>,
}));

jest.mock('@/lib/auth-client', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
  },
}));

global.fetch = jest.fn();

const mockRecords = [
  {
    id: 'vac-1',
    pet_id: 'pet-1',
    vaccine_name: 'Rabies',
    vaccine_type: 'Core',
    batch_number: 'BATCH001',
    administered_date: '2024-01-15',
    next_due_date: '2025-01-15',
    side_effects_noted: '',
  },
];

function setupMocks(records = mockRecords) {
  jest.resetAllMocks();
  const { supabase } = require('@/lib/auth-client');
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  });
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ history: records }),
  });
}

describe('PetVaccinationCMS', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('shows a loading spinner while fetching', () => {
    setupMocks();
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // never resolves
    render(<PetVaccinationCMS petId="pet-1" />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders vaccination records after load', async () => {
    render(<PetVaccinationCMS petId="pet-1" />);
    await waitFor(() => {
      expect(screen.getByText('Rabies')).toBeInTheDocument();
    });
  });

  it('shows empty state when there are no records', async () => {
    setupMocks([]);
    render(<PetVaccinationCMS petId="pet-1" />);
    await waitFor(() => {
      expect(screen.getByText(/no vaccination records yet/i)).toBeInTheDocument();
    });
  });

  it('renders the Log Vaccination button', async () => {
    render(<PetVaccinationCMS petId="pet-1" />);
    await waitFor(() => screen.getByText('Rabies'));
    expect(screen.getByRole('button', { name: /log vaccination/i })).toBeInTheDocument();
  });

  it('opens the add vaccination dialog when Log Vaccination is clicked', async () => {
    render(<PetVaccinationCMS petId="pet-1" />);
    await waitFor(() => screen.getByRole('button', { name: /log vaccination/i }));
    await user.click(screen.getByRole('button', { name: /log vaccination/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('shows validation error when vaccine name is empty on submit', async () => {
    render(<PetVaccinationCMS petId="pet-1" />);
    await waitFor(() => screen.getByRole('button', { name: /log vaccination/i }));
    await user.click(screen.getAllByRole('button', { name: /log vaccination/i })[0]);
    await waitFor(() => screen.getByRole('dialog'));

    const dialog = screen.getByRole('dialog');

    // Switch to Non-Core and clear vaccine name
    const selects = within(dialog).getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'Non-Core' } });
    const vaccineNameInput = within(dialog).getByPlaceholderText(/bordetella/i);
    await user.clear(vaccineNameInput);

    const submitBtn = within(dialog).getByRole('button', { name: /^log vaccination$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/vaccine name is required/i)).toBeInTheDocument();
    });
  });

  it('calls POST API when a valid vaccination is submitted', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ history: mockRecords }) }) // initial fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // POST
      .mockResolvedValueOnce({ ok: true, json: async () => ({ history: mockRecords }) }); // refetch

    render(<PetVaccinationCMS petId="pet-1" />);
    await waitFor(() => screen.getByRole('button', { name: /log vaccination/i }));
    await user.click(screen.getAllByRole('button', { name: /log vaccination/i })[0]);
    await waitFor(() => screen.getByRole('dialog'));

    const dialog = screen.getByRole('dialog');

    // Switch to Non-Core and type vaccine name
    const selects = within(dialog).getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'Non-Core' } });
    const vaccineInput = within(dialog).getByPlaceholderText(/bordetella/i);
    await user.type(vaccineInput, 'Bordetella');

    await user.click(within(dialog).getByRole('button', { name: /^log vaccination$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/veterinarian/vaccinations',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('opens delete confirmation dialog when delete button is clicked', async () => {
    render(<PetVaccinationCMS petId="pet-1" />);
    await waitFor(() => screen.getByText('Rabies'));

    const deleteButtons = screen.getAllByRole('button');
    const deleteBtn = deleteButtons.find(b => b.querySelector('svg'));
    // Click the trash icon button (last icon button in the row)
    const trashBtn = deleteButtons.filter(b => b.classList.contains('text-destructive'))[0]
      || deleteButtons[deleteButtons.length - 1];
    if (trashBtn) await user.click(trashBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeNull();
    });
  });
});
