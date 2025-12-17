import React from 'react';
import { beforeAll, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider } from '../../../providers/ThemeProvider';

vi.mock('embla-carousel-react@8.6.0', () => {
  const api = {
    scrollPrev: vi.fn(),
    scrollNext: vi.fn(),
    canScrollPrev: vi.fn(() => true),
    canScrollNext: vi.fn(() => true),
    on: vi.fn(),
    off: vi.fn(),
  };

  const useEmblaCarousel = () => {
    const ref = vi.fn();
    return [ref, api] as const;
  };

  return {
    __esModule: true,
    default: useEmblaCarousel,
  };
});

vi.mock('vaul@1.1.2', () => {
  const createComponent =
    (dataSlot: string, element: keyof JSX.IntrinsicElements = 'div') =>
    ({
      children,
      asChild,
      ...props
    }: React.HTMLAttributes<HTMLElement> & { asChild?: boolean }) => {
      const elementProps = { 'data-vaul-slot': dataSlot, ...props } as const;
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, elementProps);
      }
      return React.createElement(element, elementProps, children);
    };

  const DrawerRoot = ({
    children,
    onOpenChange: _onOpenChange,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { onOpenChange?: (open: boolean) => void }) =>
    React.createElement('div', { 'data-vaul-slot': 'root', ...props }, children);

  return {
    __esModule: true,
    Drawer: {
      Root: DrawerRoot,
      Trigger: createComponent('trigger', 'button'),
      Portal: createComponent('portal'),
      Overlay: createComponent('overlay'),
      Content: createComponent('content'),
      Close: createComponent('close', 'button'),
      Title: createComponent('title', 'h2'),
      Description: createComponent('description', 'p'),
    },
  };
});

vi.mock('recharts@2.15.2', () => {
  const createComponent =
    (name: string, element: keyof JSX.IntrinsicElements = 'div') =>
    ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
      React.createElement(element, { [`data-recharts-${name}`]: true, ...props }, children);

  const ResponsiveContainer = ({
    children,
    ...rest
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { 'data-recharts-responsive-container': true, ...rest }, children);

  return {
    __esModule: true,
    ResponsiveContainer,
    Tooltip: createComponent('tooltip'),
    Legend: createComponent('legend'),
  };
});

vi.mock('sonner', () => ({
  Toaster: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { 'data-sonner-toaster': true, ...props }, children),
}));

beforeAll(() => {
  const listeners: Array<() => void> = [];

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: (event: 'change', handler: () => void) => {
        if (event === 'change') {
          listeners.push(handler);
        }
      },
      removeEventListener: (event: 'change', handler: () => void) => {
        if (event === 'change') {
          const index = listeners.indexOf(handler);
          if (index >= 0) {
            listeners.splice(index, 1);
          }
        }
      },
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });

  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    value: 1024,
  });

  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  // @ts-expect-error: jsdom global augmentation for tests.
  global.ResizeObserver = ResizeObserver;

  vi.spyOn(Math, 'random').mockReturnValue(0.5);

  Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
    writable: true,
    value: vi.fn(),
  });
});

export const renderWithTheme = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);
