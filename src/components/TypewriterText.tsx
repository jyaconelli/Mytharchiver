import type { CSSProperties, HTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { cn } from './ui/utils';

export interface TypewriterTextProps extends HTMLAttributes<HTMLDivElement> {
  text: string;
  /** Override the number of steps in the typewriter animation (defaults to character count). */
  steps?: number;
  /** Seconds for the typing animation to complete. */
  durationSeconds?: number;
  /** Seconds for a full blink cycle of the cursor. */
  cursorBlinkSeconds?: number;
  /** Hide the cursor element entirely. */
  showCursor?: boolean;
  cursorClassName?: string;
}

export const TypewriterText = forwardRef<HTMLDivElement, TypewriterTextProps>(
  (
    {
      text,
      steps,
      durationSeconds = 4,
      cursorBlinkSeconds = 0.8,
      showCursor = true,
      className,
      cursorClassName,
      style,
      ...rest
    },
    ref,
  ) => {
    const resolvedSteps = Math.max(steps ?? Array.from(text).length, 1);

    const cssVariables: CSSProperties = {
      ['--tw-typewriter-duration' as '--tw-typewriter-duration']: `${durationSeconds}s`,
      ['--tw-typewriter-steps' as '--tw-typewriter-steps']: `${resolvedSteps}`,
    };

    if (showCursor) {
      cssVariables[
        '--tw-typewriter-cursor-duration' as '--tw-typewriter-cursor-duration'
      ] = `${cursorBlinkSeconds}s`;
    }

    return (
      <div
        ref={ref}
        className={cn('inline-flex items-baseline text-current', className)}
        style={{ ...cssVariables, ...style }}
        {...rest}
      >
        <span className="inline-block animate-typewriter overflow-hidden whitespace-pre-wrap">
          {text}
        </span>
        {showCursor ? (
          <span
            aria-hidden="true"
            className={cn(
              'ml-1 inline-block h-[1em] w-px bg-current animate-typewriter-cursor',
              cursorClassName,
            )}
          />
        ) : null}
      </div>
    );
  },
);

TypewriterText.displayName = 'TypewriterText';
