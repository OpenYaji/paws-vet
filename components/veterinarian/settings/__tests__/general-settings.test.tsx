import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GeneralSettings from '../general-settings';

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

const mockProfile = {
  email: 'vet@clinic.com',
  first_name: 'Jane',
  last_name: 'Doe',
  phone: '+63 912 345 6789',
  biography: 'Experienced veterinarian.',
};

global.fetch = jest.fn();

describe('GeneralSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockProfile,
    });
  });

  it('shows a loading spinner initially', () => {
    render(<GeneralSettings />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders form fields after loading', async () => {
    render(<GeneralSettings />);
    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Biography')).toBeInTheDocument();
    });
  });

  it('populates form with fetched profile data', async () => {
    render(<GeneralSettings />);
    await waitFor(() => {
      expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Jane');
      expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Doe');
      expect((screen.getByLabelText('Email Address') as HTMLInputElement).value).toBe('vet@clinic.com');
    });
  });

  it('renders heading', async () => {
    render(<GeneralSettings />);
    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeInTheDocument();
    });
  });

  it('form fields are disabled until Edit is clicked', async () => {
    render(<GeneralSettings />);
    await waitFor(() => screen.getByLabelText('Phone Number'));
    expect(screen.getByLabelText('Phone Number')).toBeDisabled();
    expect(screen.getByLabelText('Biography')).toBeDisabled();
  });

  it('enables editable fields when Edit Information is clicked', async () => {
    render(<GeneralSettings />);
    await waitFor(() => screen.getByText('Edit Information'));
    await userEvent.click(screen.getByText('Edit Information'));
    expect(screen.getByLabelText('Phone Number')).not.toBeDisabled();
    expect(screen.getByLabelText('Biography')).not.toBeDisabled();
  });

  it('shows Save Changes and Cancel buttons when editing', async () => {
    render(<GeneralSettings />);
    await waitFor(() => screen.getByText('Edit Information'));
    await userEvent.click(screen.getByText('Edit Information'));
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('hides editing buttons when Cancel is clicked', async () => {
    render(<GeneralSettings />);
    await waitFor(() => screen.getByText('Edit Information'));
    await userEvent.click(screen.getByText('Edit Information'));
    await userEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('shows success message on successful save', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockProfile })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Profile updated.' }) });

    render(<GeneralSettings />);
    await waitFor(() => screen.getByText('Edit Information'));
    await userEvent.click(screen.getByText('Edit Information'));
    await userEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => {
      expect(screen.getByText('Profile updated.')).toBeInTheDocument();
    });
  });

  it('shows error message on failed save', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockProfile })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Update failed.' }) });

    render(<GeneralSettings />);
    await waitFor(() => screen.getByText('Edit Information'));
    await userEvent.click(screen.getByText('Edit Information'));
    await userEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => {
      expect(screen.getByText('Update failed.')).toBeInTheDocument();
    });
  });

  it('renders Notifications section', async () => {
    render(<GeneralSettings />);
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    });
  });
});
