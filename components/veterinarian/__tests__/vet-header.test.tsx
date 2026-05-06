import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VetHeader from '../vet-header';

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockSignOut = jest.fn().mockResolvedValue({ error: null });
const mockGetUser = jest.fn().mockResolvedValue({
  data: { user: { id: 'vet-123', email: 'vet@clinic.com' } },
});

jest.mock('@/lib/auth-client', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
      signOut: () => mockSignOut(),
    },
  },
}));

jest.mock('@/components/veterinarian/theme-provider', () => ({
  useTheme: () => ({ theme: 'light', setTheme: jest.fn(), isDark: false }),
}));

jest.mock('@/components/veterinarian/notifications/vet-notification-bell', () => ({
  VetNotificationBell: ({ userId }: { userId: string }) => (
    <div data-testid="notification-bell" data-userid={userId} />
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: any) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

describe('VetHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header element', async () => {
    render(<VetHeader />);
    await act(async () => {});
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    jest.useFakeTimers();
    render(<VetHeader />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('fetches user email on mount and displays it in dropdown', async () => {
    render(<VetHeader />);
    await act(async () => {});
    await waitFor(() => {
      expect(screen.getByText('vet@clinic.com')).toBeInTheDocument();
    });
  });

  it('renders the notification bell with userId', async () => {
    render(<VetHeader />);
    await act(async () => {});
    const bell = screen.getByTestId('notification-bell');
    expect(bell).toBeInTheDocument();
  });

  it('renders theme toggle button', async () => {
    render(<VetHeader />);
    await act(async () => {});
    expect(screen.getByTitle('Toggle Theme')).toBeInTheDocument();
  });

  it('calls signOut and redirects on logout click', async () => {
    render(<VetHeader />);
    await act(async () => {});
    const logoutBtn = screen.getByText('Log out').closest('button')!;
    await userEvent.click(logoutBtn);
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('navigates to settings when Settings item clicked', async () => {
    render(<VetHeader />);
    await act(async () => {});
    const settingsBtn = screen.getAllByText('Settings').find(
      (el) => el.tagName === 'SPAN'
    );
    if (settingsBtn) await userEvent.click(settingsBtn);
    expect(mockPush).toHaveBeenCalledWith('/veterinarian/settings');
  });

  it('shows "Veterinarian Account" label in dropdown', async () => {
    render(<VetHeader />);
    await act(async () => {});
    expect(screen.getByText('Veterinarian Account')).toBeInTheDocument();
  });
});
