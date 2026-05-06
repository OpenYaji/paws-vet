import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppointmentsContent from '../appointments-content';

const mockToast = jest.fn();
const mockMutate = jest.fn();

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
  useSWRConfig: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/lib/auth-client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

jest.mock('../appointment-report-dialog', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="report-dialog">Report Dialog</div> : null,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) =>
    open ? <div role="dialog" onClick={() => onOpenChange?.(false)}>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

global.fetch = jest.fn();

const today = new Date().toISOString();

const mockAppointments = [
  {
    id: 'appt-1',
    scheduled_start: today,
    appointment_status: 'confirmed',
    reason_for_visit: 'Annual checkup',
    pet: { id: 'pet-1', name: 'Buddy', species: 'Dog' },
    client: { first_name: 'Jane', last_name: 'Doe', phone: '1234567890' },
  },
];

function setupMockSWR(data = mockAppointments, loading = false) {
  const useSWR = require('swr').default;
  useSWR.mockImplementation((key: string) => {
    if (key === '/api/appointments') {
      return { data, isLoading: loading };
    }
    return { data: [], isLoading: false };
  });
}

function setupMocks() {
  jest.resetAllMocks();
  mockToast.mockClear();
  setupMockSWR();
  const { supabase } = require('@/lib/auth-client');
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  });
}

describe('AppointmentsContent', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('renders the calendar', () => {
    render(<AppointmentsContent />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('shows "Scheduled for" label with current date', () => {
    render(<AppointmentsContent />);
    expect(screen.getByText(/Scheduled for/i)).toBeInTheDocument();
  });

  it('shows loading state when fetching appointments', () => {
    setupMockSWR([], true);
    render(<AppointmentsContent />);
    expect(document.querySelector('.animate-spin') || screen.queryByText(/loading/i)).toBeTruthy();
  });

  it('renders appointments for the selected date', () => {
    render(<AppointmentsContent />);
    expect(screen.getByText('Buddy')).toBeInTheDocument();
  });

  it('shows appointment details dialog when patient is clicked', async () => {
    render(<AppointmentsContent />);
    await userEvent.click(screen.getByText('Buddy'));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('calls PATCH API when "Send to Triage" is clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    render(<AppointmentsContent />);
    await userEvent.click(screen.getByText('Buddy'));
    await waitFor(() => screen.getByText(/Send to Triage/i));
    await userEvent.click(screen.getByText(/Send to Triage/i));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/appointments',
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  it('shows success toast after sending to triage', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    render(<AppointmentsContent />);
    await userEvent.click(screen.getByText('Buddy'));
    await waitFor(() => screen.getByText(/Send to Triage/i));
    await userEvent.click(screen.getByText(/Send to Triage/i));
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Patient Sent to Triage' })
      );
    });
  });

  it('shows error toast when triage send fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Triage failed' }),
    });
    render(<AppointmentsContent />);
    await userEvent.click(screen.getByText('Buddy'));
    await waitFor(() => screen.getByText(/Send to Triage/i));
    await userEvent.click(screen.getByText(/Send to Triage/i));
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error', variant: 'destructive' })
      );
    });
  });
});
