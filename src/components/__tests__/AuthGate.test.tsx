import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';

import { AuthGate } from '../AuthGate';

const { mockSignInWithPassword, mockSignUp } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockSignUp: vi.fn(),
}));

function createTestImageFile(): File {
  const base64Pixel =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn0B9n/ZX6EAAAAASUVORK5CYII=';
  const binary = Buffer.from(base64Pixel, 'base64');
  return new File([binary], 'avatar.png', { type: 'image/png' });
}

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error - jsdom does not implement ResizeObserver
  global.ResizeObserver = ResizeObserverMock;

  Object.defineProperty(global.Image.prototype, 'src', {
    configurable: true,
    set(value) {
      (this as any)._src = value;
      setTimeout(() => {
        if (this.onload) {
          this.width = 100;
          this.height = 100;
          this.onload(new Event('load'));
        }
      }, 0);
    },
  });

  // @ts-expect-error - jsdom canvas mock
  global.HTMLCanvasElement.prototype.getContext = () => ({
    drawImage: () => {},
  });
  // @ts-expect-error - jsdom canvas mock
  global.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,mocked';
});

const mockProfileUpsert = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('../../lib/supabaseClient', () => {
  const client = {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
    },
    from: vi.fn(() => ({
      upsert: mockProfileUpsert,
    })),
  };
  return {
    getSupabaseClient: () => client,
  };
});

describe('AuthGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: {
          email: 'user@example.com',
          user_metadata: {},
        },
      },
      error: null,
    });
    mockSignUp.mockResolvedValue({
      data: {
        user: {
          email: 'new@example.com',
          user_metadata: {},
        },
      },
      error: null,
    });
    mockProfileUpsert.mockClear();
  });

  test('renders initial sign-in view', () => {
    const { container } = render(<AuthGate />);

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
      data: null,
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

    const file = createTestImageFile();
    await user.upload(screen.getByLabelText(/profile image/i), file);
    const useImageButton = await screen.findByRole('button', { name: /use image/i });
    await user.click(useImageButton);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), {
      timeout: 3000,
    });

    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/display name/i), 'New User');
    await user.type(screen.getByLabelText(/^password$/i), 'SecurePass1');
    await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'SecurePass1',
      options: {
        emailRedirectTo: expect.stringContaining('http://localhost'),
        data: {
          display_name: 'New User',
          avatar_url: expect.stringMatching(/^data:image\/jpeg;base64,/),
        },
      },
    });
    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
  });

  test('shows error when sign up fails', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'Email already registered' },
    });

    render(<AuthGate />);

    await user.click(screen.getByRole('button', { name: /create one/i }));

    const file = createTestImageFile();
    await user.upload(screen.getByLabelText(/profile image/i), file);
    const useImageButton = await screen.findByRole('button', { name: /use image/i });
    await user.click(useImageButton);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), {
      timeout: 3000,
    });

    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/display name/i), 'Existing User');
    await user.type(screen.getByLabelText(/^password$/i), 'SecurePass1');
    await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
  });
});
