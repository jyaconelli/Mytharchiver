'use client';

import { CSSProperties } from 'react';
import { Toaster as Sonner, ToasterProps } from 'sonner';

import { useThemePreference } from '../../providers/ThemeProvider';

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useThemePreference();

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
