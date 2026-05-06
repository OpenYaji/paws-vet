import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VetNotificationBell } from '../vet-notification-bell';

// Web Notification API is not in jsdom
Object.defineProperty(global, 'Notification', {
  value: { permission: 'granted', requestPermission: jest.fn().mockResolvedValue('granted') },
  writable: true,
});

// All mock variables inline in factories to avoid TDZ with jest.mock hoisting
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/lib/auth-client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('@/lib/notification-utils', () => ({
  getNotificationIcon: jest.fn(() => <span data-testid="notif-icon" />),
  timeAgo: jest.fn(() => '2m ago'),
}));

function setupMocks() {
  jest.resetAllMocks();
  const useSWR = require('swr').default;
  useSWR.mockImplementation(() => ({ data: [], isLoading: false, mutate: jest.fn() }));

  const { supabase } = require('@/lib/auth-client');
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  });
  const channelMock = { on: jest.fn().mockReturnThis(), subscribe: jest.fn() };
  supabase.channel.mockReturnValue(channelMock);
}

describe('VetNotificationBell', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('renders the bell button', () => {
    render(<VetNotificationBell userId="user-1" />);
    expect(screen.getByRole('button', { name: /vet notifications/i })).toBeInTheDocument();
  });

  it('does not fetch notifications when userId is empty', () => {
    const useSWR = require('swr').default;
    render(<VetNotificationBell userId="" />);
    expect(useSWR).toHaveBeenCalledWith(null, expect.anything(), expect.anything());
  });

  it('fetches notifications when userId is provided', () => {
    const useSWR = require('swr').default;
    render(<VetNotificationBell userId="user-1" />);
    expect(useSWR).toHaveBeenCalledWith(
      '/api/veterinarian/notifications',
      expect.any(Function),
      expect.any(Object)
    );
  });

  it('shows no unread badge when there are no notifications', () => {
    render(<VetNotificationBell userId="user-1" />);
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
  });

  it('shows unread badge when there are unread notifications', () => {
    const useSWR = require('swr').default;
    useSWR.mockReturnValue({
      data: [
        { id: '1', notification_type: 'sms', subject: 'Test', content: 'Hello', is_read: false, sent_at: new Date().toISOString() },
        { id: '2', notification_type: 'email', subject: 'Alert', content: 'World', is_read: false, sent_at: new Date().toISOString() },
      ],
      isLoading: false,
      mutate: jest.fn(),
    });
    render(<VetNotificationBell userId="user-1" />);
    const button = screen.getByRole('button', { name: /vet notifications/i });
    expect(button.querySelector('.bg-red-500')).toBeInTheDocument();
  });

  it('opens popover and shows "No notifications yet" when empty', async () => {
    render(<VetNotificationBell userId="user-1" />);
    await userEvent.click(screen.getByRole('button', { name: /vet notifications/i }));
    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });
  });

  it('shows loading spinner when loading', async () => {
    const useSWR = require('swr').default;
    useSWR.mockReturnValue({ data: [], isLoading: true, mutate: jest.fn() });
    render(<VetNotificationBell userId="user-1" />);
    await userEvent.click(screen.getByRole('button', { name: /vet notifications/i }));
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  it('renders notification list when data is available', async () => {
    const useSWR = require('swr').default;
    useSWR.mockReturnValue({
      data: [
        { id: '1', notification_type: 'sms', subject: 'Reminder', content: 'Your appointment is tomorrow.', is_read: true, sent_at: new Date().toISOString() },
      ],
      isLoading: false,
      mutate: jest.fn(),
    });
    render(<VetNotificationBell userId="user-1" />);
    await userEvent.click(screen.getByRole('button', { name: /vet notifications/i }));
    await waitFor(() => {
      expect(screen.getByText('Reminder')).toBeInTheDocument();
      expect(screen.getByText('Your appointment is tomorrow.')).toBeInTheDocument();
    });
  });

  it('subscribes to realtime channel on mount when userId is set', () => {
    const { supabase } = require('@/lib/auth-client');
    render(<VetNotificationBell userId="user-1" />);
    expect(supabase.channel).toHaveBeenCalledWith('vet-notifications-user-1');
  });

  it('removes channel on unmount', () => {
    const { supabase } = require('@/lib/auth-client');
    const { unmount } = render(<VetNotificationBell userId="user-1" />);
    unmount();
    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});
