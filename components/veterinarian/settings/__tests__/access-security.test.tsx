import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccessSecurity from '../access-security';

const mockGetSession = jest.fn().mockResolvedValue({
  data: { session: { access_token: 'test-token' } },
});

jest.mock('@/lib/auth-client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

global.fetch = jest.fn();

describe('AccessSecurity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the heading', () => {
    render(<AccessSecurity />);
    expect(screen.getByText('Access & Security')).toBeInTheDocument();
  });

  it('renders password change form fields', () => {
    render(<AccessSecurity />);
    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
  });

  it('shows error when new passwords do not match', async () => {
    render(<AccessSecurity />);
    await userEvent.type(screen.getByLabelText('Current Password'), 'oldpass');
    await userEvent.type(screen.getByLabelText('New Password'), 'newpass1');
    await userEvent.type(screen.getByLabelText('Confirm New Password'), 'newpass2');
    await userEvent.click(screen.getByText('Update Password'));
    await waitFor(() => {
      expect(screen.getByText('New passwords do not match.')).toBeInTheDocument();
    });
  });

  it('shows error when new password is too short', async () => {
    render(<AccessSecurity />);
    await userEvent.type(screen.getByLabelText('Current Password'), 'oldpass');
    await userEvent.type(screen.getByLabelText('New Password'), 'abc');
    await userEvent.type(screen.getByLabelText('Confirm New Password'), 'abc');
    await userEvent.click(screen.getByText('Update Password'));
    await waitFor(() => {
      expect(screen.getByText('New password must be at least 6 characters.')).toBeInTheDocument();
    });
  });

  it('shows success message when password update succeeds', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Password updated successfully.' }),
    });
    render(<AccessSecurity />);
    await userEvent.type(screen.getByLabelText('Current Password'), 'oldpass');
    await userEvent.type(screen.getByLabelText('New Password'), 'newpassword');
    await userEvent.type(screen.getByLabelText('Confirm New Password'), 'newpassword');
    await userEvent.click(screen.getByText('Update Password'));
    await waitFor(() => {
      expect(screen.getByText('Password updated successfully.')).toBeInTheDocument();
    });
  });

  it('shows error message when password update fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Current password is incorrect.' }),
    });
    render(<AccessSecurity />);
    await userEvent.type(screen.getByLabelText('Current Password'), 'wrongpass');
    await userEvent.type(screen.getByLabelText('New Password'), 'newpassword');
    await userEvent.type(screen.getByLabelText('Confirm New Password'), 'newpassword');
    await userEvent.click(screen.getByText('Update Password'));
    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect.')).toBeInTheDocument();
    });
  });

  it('clears form fields on successful password change', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Password updated successfully.' }),
    });
    render(<AccessSecurity />);
    const currentInput = screen.getByLabelText('Current Password') as HTMLInputElement;
    await userEvent.type(currentInput, 'oldpass');
    await userEvent.type(screen.getByLabelText('New Password'), 'newpassword');
    await userEvent.type(screen.getByLabelText('Confirm New Password'), 'newpassword');
    await userEvent.click(screen.getByText('Update Password'));
    await waitFor(() => {
      expect(currentInput.value).toBe('');
    });
  });

  it('renders Two-Factor Authentication section', () => {
    render(<AccessSecurity />);
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    expect(screen.getByText('Enable 2FA')).toBeInTheDocument();
  });

  it('renders Active Sessions section', () => {
    render(<AccessSecurity />);
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    expect(screen.getByText('Current Session')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders "Sign Out All Other Sessions" button', () => {
    render(<AccessSecurity />);
    expect(screen.getByText('Sign Out All Other Sessions')).toBeInTheDocument();
  });

  it('shows not authenticated error when no session', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    render(<AccessSecurity />);
    await userEvent.type(screen.getByLabelText('Current Password'), 'oldpass');
    await userEvent.type(screen.getByLabelText('New Password'), 'newpassword');
    await userEvent.type(screen.getByLabelText('Confirm New Password'), 'newpassword');
    await userEvent.click(screen.getByText('Update Password'));
    await waitFor(() => {
      expect(screen.getByText(/Not authenticated/i)).toBeInTheDocument();
    });
  });
});
