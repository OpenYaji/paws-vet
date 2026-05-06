import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VetSidebar from '../vet-sidebar';

const mockPush = jest.fn();
const mockPathname = jest.fn(() => '/veterinarian/dashboard');

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('next/link', () => {
  return function MockLink({ href, children, className, onClick }: any) {
    return (
      <a href={href} className={className} onClick={onClick}>
        {children}
      </a>
    );
  };
});

jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage({ src, alt }: any) {
    return <img src={src} alt={alt} />;
  },
}));

jest.mock('@/lib/auth-client', () => ({
  supabase: {
    auth: {
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

const defaultProps = {
  collapsed: false,
  setCollapsed: jest.fn(),
  mobileOpen: false,
  setMobileOpen: jest.fn(),
};

describe('VetSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue('/veterinarian/dashboard');
  });

  it('renders all main menu items (desktop expanded)', () => {
    render(<VetSidebar {...defaultProps} />);
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pet Master File').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Medical Records').length).toBeGreaterThan(0);
    expect(screen.getAllByText('My Appointments').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Quarantine').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Prescriptions').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vaccinations').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reports').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Capture').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Help Support').length).toBeGreaterThan(0);
  });

  it('highlights active menu item when on dashboard', () => {
    mockPathname.mockReturnValue('/veterinarian/dashboard');
    render(<VetSidebar {...defaultProps} />);
    const dashboardLinks = screen.getAllByText('Dashboard').map((el) => el.closest('a'));
    const activeLink = dashboardLinks.find((link) => link?.className?.includes('bg-primary'));
    expect(activeLink).toBeTruthy();
  });

  it('highlights the correct active item for nested routes', () => {
    mockPathname.mockReturnValue('/veterinarian/pets/123');
    render(<VetSidebar {...defaultProps} />);
    const petLinks = screen.getAllByText('Pet Master File').map((el) => el.closest('a'));
    const activeLink = petLinks.find((link) => link?.className?.includes('bg-primary'));
    expect(activeLink).toBeTruthy();
  });

  it('calls setCollapsed(true) when Menu button is clicked (expanded state)', () => {
    const setCollapsed = jest.fn();
    render(<VetSidebar {...defaultProps} setCollapsed={setCollapsed} collapsed={false} />);
    const menuButtons = screen.getAllByRole('button').filter((btn) =>
      btn.querySelector('svg')
    );
    fireEvent.click(menuButtons[0]);
    expect(setCollapsed).toHaveBeenCalled();
  });

  it('renders collapsed sidebar correctly', () => {
    render(<VetSidebar {...defaultProps} collapsed={true} />);
    const logo = screen.getAllByAltText('Logo');
    expect(logo.length).toBeGreaterThan(0);
  });

  it('calls setCollapsed(false) when expand button clicked in collapsed state', () => {
    const setCollapsed = jest.fn();
    render(<VetSidebar {...defaultProps} collapsed={true} setCollapsed={setCollapsed} />);
    const menuButtons = screen.getAllByRole('button').filter((btn) =>
      btn.querySelector('svg')
    );
    fireEvent.click(menuButtons[0]);
    expect(setCollapsed).toHaveBeenCalledWith(false);
  });

  it('renders mobile overlay when mobileOpen is true', () => {
    render(<VetSidebar {...defaultProps} mobileOpen={true} />);
    expect(screen.getByText('PAWS Admin')).toBeInTheDocument();
  });

  it('calls setMobileOpen(false) when overlay clicked', () => {
    const setMobileOpen = jest.fn();
    const { container } = render(
      <VetSidebar {...defaultProps} mobileOpen={true} setMobileOpen={setMobileOpen} />
    );
    const overlay = container.querySelector('.bg-black');
    if (overlay) fireEvent.click(overlay);
    expect(setMobileOpen).toHaveBeenCalledWith(false);
  });
});
