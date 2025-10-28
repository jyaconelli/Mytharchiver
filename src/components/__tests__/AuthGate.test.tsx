import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';

import { AuthGate } from '../AuthGate';

const { mockSignInWithPassword, mockSignUp } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockSignUp: vi.fn(),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
    },
  },
}));

describe('AuthGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockSignUp.mockResolvedValue({ error: null });
  });

  test('renders initial sign-in view', () => {
    const { container } = render(<AuthGate />);

    expect(screen.getByText(/sign in to continue/i)).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });

  test('submits sign in credentials', async () => {
    const user = userEvent.setup();

    render(<AuthGate />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'hunter2');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'hunter2',
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  test('displays error when sign in fails', async () => {
    const user = userEvent.setup();
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid credentials' },
    });

    render(<AuthGate />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  test('handles sign up success and displays confirmation message', async () => {
    const user = userEvent.setup();

    render(<AuthGate />);

    await user.click(screen.getByRole('button', { name: /create one/i }));

    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/password/i), 'securepass');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'securepass',
    });
    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
  });

  test('shows error when sign up fails', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({
      error: { message: 'Email already registered' },
    });

    render(<AuthGate />);

    await user.click(screen.getByRole('button', { name: /create one/i }));
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
  });
});
