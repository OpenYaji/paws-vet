import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import TriageContent from '../triage-content';

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
  SelectValue: () => null,
}));

global.fetch = jest.fn();

const mockTriageQueue = [
  {
    id: 'appt-1',
    triage_level: 'Urgent',
    chief_complaint: 'Difficulty breathing',
    scheduled_start: new Date().toISOString(),
    checked_in_at: new Date().toISOString(),
    appointment_status: 'in_progress',
    reason_for_visit: 'Difficulty breathing',
    pets: { id: 'pet-1', name: 'Luna', species: 'Cat', breed: 'Persian', weight: 4.2, client_profiles: { first_name: 'Bob', last_name: 'Jones' } },
  },
];

function setupMockSWR(queue = mockTriageQueue, loading = false) {
  const useSWR = require('swr').default;
  useSWR.mockImplementation((key: string) => {
    if (key === '/api/veterinarian/triage') {
      return { data: queue, isLoading: loading, error: null };
    }
    // completed section returns empty
    return { data: [], isLoading: false, error: null, mutate: jest.fn() };
  });
}

describe('TriageContent', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockToast.mockClear();
    setupMockSWR();
  });

  it('renders the triage queue heading', () => {
    render(<TriageContent />);
    expect(screen.getAllByText(/waiting room/i)[0]).toBeInTheDocument();
  });

  it('renders a patient in the triage queue', () => {
    render(<TriageContent />);
    expect(screen.getByText('Luna')).toBeInTheDocument();
  });

  it('shows loading when data is being fetched', () => {
    setupMockSWR([], true);
    render(<TriageContent />);
    expect(screen.getByText(/loading queue/i)).toBeInTheDocument();
  });

  it('shows empty state when queue is empty', () => {
    setupMockSWR([]);
    render(<TriageContent />);
    expect(screen.queryByText('Luna')).not.toBeInTheDocument();
    expect(screen.getByText(/no patients in queue/i)).toBeInTheDocument();
  });

  it('shows "No Patient Selected" placeholder initially', () => {
    render(<TriageContent />);
    expect(screen.getByText(/no patient selected/i)).toBeInTheDocument();
  });

  it('shows the triage assessment panel when a patient is clicked', async () => {
    render(<TriageContent />);
    await user.click(screen.getByText('Luna'));
    await waitFor(() => {
      expect(screen.getByText(/triage assessment/i)).toBeInTheDocument();
    });
  });

  it('renders weight input when patient is selected', async () => {
    render(<TriageContent />);
    await user.click(screen.getByText('Luna'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('0.0')).toBeInTheDocument(); // weight field
    });
  });

  it('submits vitals and shows success toast', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    const useSWR = require('swr');
    useSWR.mutate.mockResolvedValue([]);

    render(<TriageContent />);
    await user.click(screen.getByText('Luna'));
    await waitFor(() => screen.getByText(/triage assessment/i));

    // Fill required weight and temperature fields
    const weightInput = screen.getByPlaceholderText('0.0');
    const tempInput = screen.getByPlaceholderText('38.0');
    await user.type(weightInput, '4.5');
    await user.type(tempInput, '38.5');

    // Submit the form
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/veterinarian/triage',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
