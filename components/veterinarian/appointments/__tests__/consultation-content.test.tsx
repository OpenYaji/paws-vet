import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConsultationContent from '../consultation-content';

const user = userEvent.setup({ pointerEventsCheck: 0 });
const mockToast = jest.fn();

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
  mutate: jest.fn(),
}));

jest.mock('@/lib/fetcher', () => ({
  Fetcher: jest.fn(),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

jest.mock('@/lib/auth-client', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

global.fetch = jest.fn();

const mockQueue = [
  {
    id: 'appt-1',
    reason_for_visit: 'Limping on left paw',
    appointment_status: 'in_progress',
    scheduled_start: new Date().toISOString(),
    pets: {
      id: 'pet-1',
      name: 'Max',
      species: 'Dog',
      breed: 'Labrador',
      gender: 'male',
      weight: 12.5,
      client_profiles: { first_name: 'Alice', last_name: 'Smith' },
    },
  },
];

function setupMocks(queue = mockQueue) {
  jest.resetAllMocks();
  mockToast.mockClear();

  const useSWR = require('swr').default;
  useSWR.mockImplementation((key: string) => {
    if (key === '/api/veterinarian/consultations') return { data: queue };
    return { data: [] };
  });

  const { supabase } = require('@/lib/auth-client');
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'vet-user-1' } } });
  supabase.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { id: 'vet-profile-1' }, error: null }),
  });
}

describe('ConsultationContent', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('renders the consultation queue heading', () => {
    render(<ConsultationContent />);
    expect(screen.getByText(/ready for exam/i)).toBeInTheDocument();
  });

  it('renders a patient from the queue', () => {
    render(<ConsultationContent />);
    expect(screen.getByText('Max')).toBeInTheDocument();
  });

  it('shows empty state when no patients', () => {
    setupMocks([]);
    render(<ConsultationContent />);
    expect(screen.queryByText('Max')).not.toBeInTheDocument();
  });

  it('opens the consultation form when a patient is selected', async () => {
    render(<ConsultationContent />);
    await user.click(screen.getByText('Max'));
    await waitFor(() => {
      // Weight input (no label association, use placeholder)
      expect(screen.getByPlaceholderText('0.0')).toBeInTheDocument();
    });
  });

  it('pre-fills weight from pet data when patient is selected', async () => {
    render(<ConsultationContent />);
    await user.click(screen.getByText('Max'));
    await waitFor(() => {
      const weightInput = screen.getByPlaceholderText('0.0') as HTMLInputElement;
      expect(weightInput.value).toBe('12.5');
    });
  });

  it('pre-fills chief complaint from reason for visit', async () => {
    render(<ConsultationContent />);
    await user.click(screen.getByText('Max'));
    await waitFor(() => {
      // Chief complaint textarea - find by placeholder
      const textarea = screen.getByPlaceholderText(/why is the patient here/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe('Limping on left paw');
    });
  });

  it('opens confirm dialog when Finalize Record is clicked', async () => {
    render(<ConsultationContent />);
    await user.click(screen.getByText('Max'));
    await waitFor(() => screen.getByRole('button', { name: /finalize record/i }));
    await user.click(screen.getByRole('button', { name: /finalize record/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('calls API when consultation is finalized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'record-1' }),
    });

    render(<ConsultationContent />);
    await user.click(screen.getByText('Max'));
    await waitFor(() => screen.getByRole('button', { name: /finalize record/i }));
    await user.click(screen.getByRole('button', { name: /finalize record/i }));
    await waitFor(() => screen.getByRole('dialog'));

    // Click "Yes, Finalize" in the confirm dialog
    await user.click(screen.getByRole('button', { name: /yes, finalize/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/veterinarian/consultations',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
