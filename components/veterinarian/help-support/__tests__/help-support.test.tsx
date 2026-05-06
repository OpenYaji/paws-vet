import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HelpSupport from '../help-support';

describe('HelpSupport', () => {
  it('renders the heading and search bar', () => {
    render(<HelpSupport />);
    expect(screen.getByText('Help & Support')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search for help/i)).toBeInTheDocument();
  });

  it('renders suggested topics when search is empty', () => {
    render(<HelpSupport />);
    // Topics appear as buttons; getAllByText handles multiple matches (buttons + category headings)
    expect(screen.getAllByText('Appointments').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pet Records').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Prescriptions').length).toBeGreaterThan(0);
  });

  it('hides suggested topics when searching', async () => {
    render(<HelpSupport />);
    await userEvent.type(screen.getByPlaceholderText(/search for help/i), 'security');
    // The "Billing" topic button should be gone (it's only in suggested topics which are hidden)
    // Use role="button" to target only the topic chip, not any category heading
    expect(screen.queryByRole('button', { name: /^billing$/i })).not.toBeInTheDocument();
  });

  it('filters FAQ articles by search query', async () => {
    render(<HelpSupport />);
    await userEvent.type(screen.getByPlaceholderText(/search for help/i), 'appointment');
    await waitFor(() => {
      expect(screen.getByText(/schedule a new appointment/i)).toBeInTheDocument();
    });
  });

  it('shows result count when searching', async () => {
    render(<HelpSupport />);
    await userEvent.type(screen.getByPlaceholderText(/search for help/i), 'appointment');
    await waitFor(() => {
      expect(screen.getByText(/results? for/i)).toBeInTheDocument();
    });
  });

  it('shows "No results found" for unmatched search query', async () => {
    render(<HelpSupport />);
    await userEvent.type(screen.getByPlaceholderText(/search for help/i), 'xyznonexistent');
    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  it('clears search when "Clear search" is clicked', async () => {
    render(<HelpSupport />);
    const searchInput = screen.getByPlaceholderText(/search for help/i);
    await userEvent.type(searchInput, 'appointment');
    await waitFor(() => screen.getByText(/Clear search/));
    await userEvent.click(screen.getByText(/Clear search/));
    expect((searchInput as HTMLInputElement).value).toBe('');
    expect(screen.getAllByText('Appointments').length).toBeGreaterThan(0);
  });

  it('clicking a suggested topic filters the articles', async () => {
    render(<HelpSupport />);
    const appointmentBtn = screen.getAllByText('Appointments').find(
      (el) => el.tagName !== 'H3'
    );
    await userEvent.click(appointmentBtn!);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search for help/i)).toHaveValue('appointment');
    });
  });

  it('opens the CMS modal when Manage button is clicked', async () => {
    render(<HelpSupport />);
    await userEvent.click(screen.getByText('Manage'));
    await waitFor(() => {
      expect(screen.getByText('Help & Support Management')).toBeInTheDocument();
    });
  });

  it('shows active and archived tabs in CMS modal', async () => {
    render(<HelpSupport />);
    await userEvent.click(screen.getByText('Manage'));
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Archived')).toBeInTheDocument();
    });
  });

  it('opens New Article form from CMS modal', async () => {
    render(<HelpSupport />);
    await userEvent.click(screen.getByText('Manage'));
    await waitFor(() => screen.getByText('New Article'));
    await userEvent.click(screen.getByText('New Article'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/e\.g\. How do I reset my password/i)).toBeInTheDocument();
    });
  });

  it('Add Article button is disabled when form fields are empty', async () => {
    render(<HelpSupport />);
    await userEvent.click(screen.getByText('Manage'));
    await waitFor(() => screen.getByText('New Article'));
    await userEvent.click(screen.getByText('New Article'));
    await waitFor(() => screen.getByText('Add Article'));
    expect(screen.getByText('Add Article')).toBeDisabled();
  });

  it('enables Add Article button when question and answer are filled', async () => {
    render(<HelpSupport />);
    await userEvent.click(screen.getByText('Manage'));
    await waitFor(() => screen.getByText('New Article'));
    await userEvent.click(screen.getByText('New Article'));
    await waitFor(() => screen.getByPlaceholderText(/e\.g\. How do I reset/i));
    await userEvent.type(
      screen.getByPlaceholderText(/e\.g\. How do I reset/i),
      'Test question?'
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Provide a clear and helpful answer/i),
      'Test answer.'
    );
    expect(screen.getByText('Add Article')).not.toBeDisabled();
  });

  it('renders articles grouped by category', () => {
    render(<HelpSupport />);
    expect(screen.getAllByText('Appointments').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pet Records').length).toBeGreaterThan(0);
  });
});
