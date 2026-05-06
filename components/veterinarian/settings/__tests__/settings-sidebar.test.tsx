import React from 'react';
import { render, screen } from '@testing-library/react';
import SettingsSidebar from '../settings-sidebar';

const mockPathname = jest.fn(() => '/veterinarian/settings/general-settings');

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

jest.mock('next/link', () => {
  return function MockLink({ href, children, className }: any) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
});

describe('SettingsSidebar', () => {
  it('renders all settings menu items', () => {
    render(<SettingsSidebar />);
    expect(screen.getByText('General Settings')).toBeInTheDocument();
    expect(screen.getByText('Clinic Profile')).toBeInTheDocument();
    expect(screen.getByText('Access & Security')).toBeInTheDocument();
    expect(screen.getByText('Themes')).toBeInTheDocument();
  });

  it('renders "Settings" heading', () => {
    render(<SettingsSidebar />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('applies active styles to the current route', () => {
    mockPathname.mockReturnValue('/veterinarian/settings/general-settings');
    render(<SettingsSidebar />);
    const activeLink = screen.getByText('General Settings').closest('a');
    expect(activeLink?.className).toContain('bg-primary');
    expect(activeLink?.className).toContain('text-primary-foreground');
  });

  it('does not apply active styles to inactive routes', () => {
    mockPathname.mockReturnValue('/veterinarian/settings/general-settings');
    render(<SettingsSidebar />);
    const inactiveLink = screen.getByText('Themes').closest('a');
    expect(inactiveLink?.className).not.toContain('bg-primary');
  });

  it('links point to correct paths', () => {
    render(<SettingsSidebar />);
    expect(screen.getByText('General Settings').closest('a')).toHaveAttribute(
      'href',
      '/veterinarian/settings/general-settings'
    );
    expect(screen.getByText('Themes').closest('a')).toHaveAttribute(
      'href',
      '/veterinarian/settings/themes'
    );
    expect(screen.getByText('Access & Security').closest('a')).toHaveAttribute(
      'href',
      '/veterinarian/settings/access-security'
    );
  });
});
