import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddNewPet from '../add-new-pet';

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

jest.mock('@/lib/auth-client', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://storage/pet.jpg' } }),
      })),
    },
  },
}));

jest.mock('@/lib/get-safe-url', () => ({
  __esModule: true,
  default: (url: string) => url,
}));

// Radix Select uses pointer capture APIs not available in jsdom — use a native <select> instead
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: any) => (
    <select onChange={(e) => onValueChange?.(e.target.value)}>{children}</select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectValue: ({ placeholder }: any) => <option value="">{placeholder}</option>,
}));

global.fetch = jest.fn();
global.URL.createObjectURL = jest.fn(() => 'blob:mock');
global.URL.revokeObjectURL = jest.fn();

const mockOnPetAdded = jest.fn();

async function openDialog() {
  await user.click(screen.getByRole('button', { name: /add new pet/i }));
  await waitFor(() => screen.getByLabelText('Name'));
}

function submitForm() {
  // fireEvent.submit bypasses Radix Dialog's pointer-events:none on body
  // (fireEvent.click on submit button doesn't auto-submit in jsdom)
  const form = document.querySelector('form');
  if (form) fireEvent.submit(form);
}

describe('AddNewPet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Add New Pet trigger button', () => {
    render(<AddNewPet onPetAdded={mockOnPetAdded} />);
    expect(screen.getByRole('button', { name: /add new pet/i })).toBeInTheDocument();
  });

  it('opens dialog and shows form fields when trigger is clicked', async () => {
    render(<AddNewPet onPetAdded={mockOnPetAdded} />);
    await openDialog();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save pet/i })).toBeInTheDocument();
  });

  it('shows toast error when required fields (name) are missing on submit', async () => {
    render(<AddNewPet onPetAdded={mockOnPetAdded} />);
    await openDialog();
    submitForm();
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Missing Fields' })
      );
    });
  });

  it('shows toast error when species is missing', async () => {
    render(<AddNewPet onPetAdded={mockOnPetAdded} />);
    await openDialog();
    await user.type(screen.getByLabelText('Name'), 'Buddy');
    submitForm();
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Missing Fields' })
      );
    });
  });

  it('does not call API when name is empty', async () => {
    render(<AddNewPet onPetAdded={mockOnPetAdded} />);
    await openDialog();
    submitForm();
    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls onPetAdded after successful pet creation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'pet-1' }),
    });

    render(<AddNewPet onPetAdded={mockOnPetAdded} />);
    await openDialog();

    await user.type(screen.getByLabelText('Name'), 'Buddy');

    // Mocked Select renders as native <select>; two selects: species (index 0), gender (index 1)
    const [speciesSelect] = screen.getAllByRole('combobox');
    fireEvent.change(speciesSelect, { target: { value: 'Dog' } });

    submitForm();

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Pet Added' })
      );
      expect(mockOnPetAdded).toHaveBeenCalled();
    });
  });

  it('shows error toast when API returns an error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    });

    render(<AddNewPet onPetAdded={mockOnPetAdded} />);
    await openDialog();
    await user.type(screen.getByLabelText('Name'), 'Buddy');

    const [speciesSelect] = screen.getAllByRole('combobox');
    fireEvent.change(speciesSelect, { target: { value: 'Dog' } });

    submitForm();

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error', variant: 'destructive' })
      );
    });
  });
});
