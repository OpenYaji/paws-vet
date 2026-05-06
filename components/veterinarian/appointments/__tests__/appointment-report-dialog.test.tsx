import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import AppointmentReportDialog from '../appointment-report-dialog';

const user = userEvent.setup({ pointerEventsCheck: 0 });

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect, selected }: any) => (
    <button data-testid="mock-calendar" onClick={() => onSelect && onSelect(new Date('2024-06-15'))}>
      Mock Calendar
    </button>
  ),
}));

global.fetch = jest.fn();

const mockOnOpenChange = jest.fn();

const mockReportData = {
  period: { start: '2024-06-09', end: '2024-06-15' },
  total_appointments: 10,
  by_status: { completed: 5, no_show: 1, pending: 2, cancelled: 2 },
  by_type: { checkup: 6, surgery: 4 },
  by_day: { Monday: 2, Tuesday: 3, Wednesday: 5 },
  by_veterinarian: { 'Dr. Smith': 7, 'Dr. Jones': 3 },
  appointments: [],
};

describe('AppointmentReportDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<AppointmentReportDialog open={false} onOpenChange={mockOnOpenChange} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when open', () => {
    render(<AppointmentReportDialog open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the report title and description', () => {
    render(<AppointmentReportDialog open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByText(/weekly appointment report/i)).toBeInTheDocument();
    expect(screen.getByText(/select any date/i)).toBeInTheDocument();
  });

  it('renders the Generate Report button', () => {
    render(<AppointmentReportDialog open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument();
  });

  it('calls fetch and shows report data on Generate Report click', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReportData,
    });

    render(<AppointmentReportDialog open={true} onOpenChange={mockOnOpenChange} />);
    await user.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('appointment-reports'));
    });

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // total_appointments
    });
  });

  it('shows an error message when the API fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    });

    render(<AppointmentReportDialog open={true} onOpenChange={mockOnOpenChange} />);
    await user.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });

  it('shows status summary cards after report is generated', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReportData,
    });

    render(<AppointmentReportDialog open={true} onOpenChange={mockOnOpenChange} />);
    await user.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('No Show')).toBeInTheDocument();
    });
  });

  it('calls onOpenChange when Cancel is clicked', async () => {
    render(<AppointmentReportDialog open={true} onOpenChange={mockOnOpenChange} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
