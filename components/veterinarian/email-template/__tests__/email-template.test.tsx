import { render, screen } from '@testing-library/react';
import { EmailTemplate } from '../email-template';

describe('EmailTemplate', () => {
  it('renders a welcome heading with the provided firstName', () => {
    render(<EmailTemplate firstName="Alice" />);
    expect(screen.getByRole('heading', { name: /welcome, alice!/i })).toBeInTheDocument();
  });

  it('renders with a different firstName', () => {
    render(<EmailTemplate firstName="Bob" />);
    expect(screen.getByText('Welcome, Bob!')).toBeInTheDocument();
  });
});
