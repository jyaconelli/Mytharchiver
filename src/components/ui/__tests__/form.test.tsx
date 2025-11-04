vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');

  const stateKey = '__formTestState__';
  const state: {
    capturedContexts: unknown[];
    contextCallCount: number;
    formFieldContextRef: unknown;
    formItemContextRef: unknown;
    formFieldHits: number;
  } = (globalThis as any)[stateKey] ?? {
    capturedContexts: [],
    contextCallCount: 0,
    formFieldContextRef: undefined,
    formItemContextRef: undefined,
    formFieldHits: 0,
  };
  (globalThis as any)[stateKey] = state;

  return {
    ...actual,
    createContext: (defaultValue: unknown) => {
      const context = actual.createContext(defaultValue);
      if (!state.formFieldContextRef) {
        state.formFieldContextRef = context;
      } else if (!state.formItemContextRef && state.formFieldContextRef !== context) {
        state.formItemContextRef = context;
      }
      return context;
    },
    useContext: (context: unknown) => {
      state.contextCallCount += 1;
      state.capturedContexts.push(context);

      if (context === state.formFieldContextRef) {
        state.formFieldHits += 1;
        // Simulate missing FormFieldContext while keeping property access safe.
        return '' as unknown;
      }

      if (context === state.formItemContextRef) {
        return { id: 'test-item' } as unknown;
      }

      return actual.useContext(context as never);
    },
  };
});

import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-hook-form@7.55.0', async () => {
  const ReactActual = await vi.importActual<typeof import('react')>('react');

  const getFieldStateMock = vi.fn(() => ({}));

  return {
    Controller: ({ render }: { render?: () => React.ReactNode }) =>
      (typeof render === 'function' ? render({}) : null),
    FormProvider: ({ children }: { children: React.ReactNode }) => (
      <ReactActual.Fragment>{children}</ReactActual.Fragment>
    ),
    useFormContext: () => ({
      getFieldState: getFieldStateMock,
    }),
    useFormState: () => ({}),
  };
});

import { FormMessage } from '../form';

const formTestState = (globalThis as any).__formTestState__ as {
  capturedContexts: unknown[];
  contextCallCount: number;
  formFieldContextRef: unknown;
  formItemContextRef: unknown;
  formFieldHits: number;
};

describe('useFormField', () => {
  it('throws when called without a FormFieldContext provider', () => {
    formTestState.capturedContexts.length = 0;
    formTestState.contextCallCount = 0;
    formTestState.formFieldHits = 0;

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let caughtError: unknown;
    try {
      render(<FormMessage />);
    } catch (error) {
      caughtError = error;
    }

    const errorMessages = consoleErrorSpy.mock.calls.flat().map(String).join(' ');

    expect(formTestState.capturedContexts.length).toBeGreaterThan(0);
    expect(formTestState.formFieldHits).toBeGreaterThan(0);
    expect(errorMessages).toContain('useFormField should be used within <FormField>');
    expect(caughtError).toBeInstanceOf(Error);

    consoleErrorSpy.mockRestore();
  });
});
