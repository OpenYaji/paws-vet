import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import NeuterContent from '../neuter-content';

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

global.fetch = jest.fn();

const mockQueue = [
  {
    id: 'appt-1',
    scheduled_start: new Date().toISOString(),
    reason_for_visit: 'Kapon procedure',
    appointment_status: 'confirmed',
    appointment_services: [{ actual_price: 500 }],
    pets: {
      id: 'pet-1',
      name: 'Rocky',
      species: 'Dog',
      breed: 'Labrador',
      gender: 'male',
      client_profiles: { first_name: 'John', last_name: 'Doe' },
    },
    medical_records: [],
  },
];

function setupMocks(queue = mockQueue, loading = false) {
  jest.resetAllMocks();
  mockToast.mockClear();
  const useSWR = require('swr').default;
  useSWR.mockImplementation((key: string) => {
    if (key === '/api/veterinarian/neuter') {
      return { data: queue, isLoading: loading, error: null };
    }
    return { data: [], isLoading: false, error: null };
  });
}

describe('NeuterContent', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('renders the waiting room heading', () => {
    render(<NeuterContent />);
    expect(screen.getAllByText(/waiting room/i)[0]).toBeInTheDocument();
  });

  it('renders a patient in the queue', () => {
    render(<NeuterContent />);
    expect(screen.getByText('Rocky')).toBeInTheDocument();
  });

  it('shows empty state when queue is empty', () => {
    setupMocks([]);
    render(<NeuterContent />);
    expect(screen.queryByText('Rocky')).not.toBeInTheDocument();
    expect(screen.getByText(/no surgery patients waiting/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    setupMocks([], true);
    render(<NeuterContent />);
    expect(screen.getByText(/loading queue/i)).toBeInTheDocument();
  });

  it('shows "No Patient Selected" placeholder when nothing is selected', () => {
    render(<NeuterContent />);
    expect(screen.getByText(/no patient selected/i)).toBeInTheDocument();
  });

  it('shows the workflow panel when a patient is clicked', async () => {
    render(<NeuterContent />);
    await user.click(screen.getByText('Rocky'));
    await waitFor(() => {
      expect(screen.getByText(/kapon procedure workflow/i)).toBeInTheDocument();
    });
  });

  it('shows consultation required alert when no medical record exists', async () => {
    render(<NeuterContent />);
    await user.click(screen.getByText('Rocky'));
    await waitFor(() => {
      expect(screen.getByText(/consultation required/i)).toBeInTheDocument();
    });
  });

  it('shows blood test form when medical record exists', async () => {
    const queueWithRecord = [{
      ...mockQueue[0],
      medical_records: [{ id: 'rec-1', medical_test_results: [] }],
    }];
    setupMocks(queueWithRecord);
    render(<NeuterContent />);
    await user.click(screen.getByText('Rocky'));
    await waitFor(() => {
      expect(screen.getByText(/step 1 — record blood test results/i)).toBeInTheDocument();
    });
  });

  it('calls blood test API when blood test form is submitted', async () => {
    const queueWithRecord = [{
      ...mockQueue[0],
      medical_records: [{ id: 'rec-1', medical_test_results: [] }],
    }];
    setupMocks(queueWithRecord);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    const useSWR = require('swr');
    useSWR.mutate.mockResolvedValue([]);

    render(<NeuterContent />);
    await user.click(screen.getByText('Rocky'));
    await waitFor(() => screen.getByText(/save blood test/i));

    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/veterinarian/medical-test-results',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
