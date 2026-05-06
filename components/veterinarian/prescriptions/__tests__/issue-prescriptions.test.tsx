import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IssuePrescription from '../issue-prescriptions';

const user = userEvent.setup({ pointerEventsCheck: 0 });
const mockToast = jest.fn();

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock Select to avoid Radix pointer-capture issues
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <select value={value || ''} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectValue: ({ placeholder }: any) => <option value="">{placeholder}</option>,
}));

global.fetch = jest.fn();

const mockOnPrescriptionIssued = jest.fn();

async function openDialog() {
  await user.click(screen.getByRole('button', { name: /issue prescription/i }));
  await waitFor(() => screen.getByPlaceholderText(/search pet by name/i));
}

describe('IssuePrescription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Issue Prescription trigger button', () => {
    render(<IssuePrescription onPrescriptionIssued={mockOnPrescriptionIssued} />);
    expect(screen.getByRole('button', { name: /issue prescription/i })).toBeInTheDocument();
  });

  it('opens the dialog when button is clicked', async () => {
    render(<IssuePrescription onPrescriptionIssued={mockOnPrescriptionIssued} />);
    await openDialog();
    expect(screen.getByText('Issue New Prescription')).toBeInTheDocument();
  });

  it('renders search input for pets in dialog', async () => {
    render(<IssuePrescription onPrescriptionIssued={mockOnPrescriptionIssued} />);
    await openDialog();
    expect(screen.getByPlaceholderText(/search pet by name/i)).toBeInTheDocument();
  });

  it('performs debounced pet search on input', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'pet-1', name: 'Buddy', species: 'Dog', client_profiles: { first_name: 'Alice', last_name: 'Doe' } }],
    });

    render(<IssuePrescription onPrescriptionIssued={mockOnPrescriptionIssued} />);
    await openDialog();
    await user.type(screen.getByPlaceholderText(/search pet by name/i), 'Buddy');

    // Wait for the debounce to fire (default 500ms — waitFor retries for 1s)
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search?q=Buddy')
        );
      },
      { timeout: 2000 }
    );
  });

  it('shows pet search results in dropdown', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'pet-1', name: 'Buddy', species: 'Dog', client_profiles: { first_name: 'Alice', last_name: 'Doe' } }],
    });

    render(<IssuePrescription onPrescriptionIssued={mockOnPrescriptionIssued} />);
    await openDialog();
    await user.type(screen.getByPlaceholderText(/search pet by name/i), 'Buddy');

    await waitFor(
      () => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('renders medication name and dosage fields', async () => {
    render(<IssuePrescription onPrescriptionIssued={mockOnPrescriptionIssued} />);
    await openDialog();
    expect(screen.getByPlaceholderText(/e\.g\. amoxicillin/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. 50mg/i)).toBeInTheDocument();
  });

  it('shows toast error when required fields are missing on submit', async () => {
    render(<IssuePrescription onPrescriptionIssued={mockOnPrescriptionIssued} />);
    await openDialog();

    // Submit without selecting a pet or medical record
    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringMatching(/missing/i) })
      );
    });
  });
});
