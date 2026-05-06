import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Themes from '../themes';

const mockSetTheme = jest.fn();
const mockUseTheme = { theme: 'light' as const, setTheme: mockSetTheme, isDark: false };

jest.mock('@/components/veterinarian/theme-provider', () => ({
  useTheme: () => mockUseTheme,
}));

describe('Themes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.theme = 'light';
  });

  it('renders all three theme options', () => {
    render(<Themes />);
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('renders the heading and description', () => {
    render(<Themes />);
    expect(screen.getByText('Themes')).toBeInTheDocument();
    expect(screen.getByText(/customize the appearance/i)).toBeInTheDocument();
  });

  it('calls setTheme with "dark" when Dark button is clicked', async () => {
    render(<Themes />);
    await userEvent.click(screen.getByText('Dark').closest('button')!);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('calls setTheme with "light" when Light button is clicked', async () => {
    render(<Themes />);
    await userEvent.click(screen.getByText('Light').closest('button')!);
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('calls setTheme with "system" when System button is clicked', async () => {
    render(<Themes />);
    await userEvent.click(screen.getByText('System').closest('button')!);
    expect(mockSetTheme).toHaveBeenCalledWith('system');
  });

  it('applies active styling to the current theme button', () => {
    mockUseTheme.theme = 'dark';
    render(<Themes />);
    const darkButton = screen.getByText('Dark').closest('button');
    expect(darkButton?.className).toContain('border-primary');
  });

  it('renders theme descriptions', () => {
    render(<Themes />);
    expect(screen.getByText(/A clean, bright appearance/i)).toBeInTheDocument();
    expect(screen.getByText(/Easier on the eyes/i)).toBeInTheDocument();
    expect(screen.getByText(/Follows your device settings/i)).toBeInTheDocument();
  });
});
